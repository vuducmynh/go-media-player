package application

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go-audio-play/internal/domain/library"
	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/infrastructure/hasher"
	"go-audio-play/internal/infrastructure/scanner"
	"go-audio-play/internal/infrastructure/storage"
	"go-audio-play/internal/infrastructure/streamer"
)

type MediaService struct {
	store    *storage.Store
	scanner  *scanner.Scanner
	streamer *streamer.StreamServer
}

func NewMediaService(store *storage.Store, scanner *scanner.Scanner, streamer *streamer.StreamServer) *MediaService {
	return &MediaService{
		store:    store,
		scanner:  scanner,
		streamer: streamer,
	}
}

// AddFolder adds a new directory to managed folders
func (s *MediaService) AddFolder(folderPath string) ([]string, error) {
	if folderPath == "" {
		return nil, fmt.Errorf("folder path cannot be empty")
	}

	cleanPath := filepath.Clean(folderPath)
	settings := s.store.GetSettings()

	alreadyExists := false
	for _, f := range settings.Folders {
		if strings.EqualFold(filepath.Clean(f), cleanPath) {
			alreadyExists = true
			break
		}
	}

	if !alreadyExists {
		settings.Folders = append(settings.Folders, cleanPath)
	}

	settings.ActiveFolder = cleanPath

	if err := s.store.SaveSettings(settings); err != nil {
		return nil, err
	}

	return settings.Folders, nil
}

// RemoveFolder removes a directory from managed folders
func (s *MediaService) RemoveFolder(folderPath string) ([]string, error) {
	cleanPath := filepath.Clean(folderPath)
	settings := s.store.GetSettings()

	var updated []string
	for _, f := range settings.Folders {
		if !strings.EqualFold(filepath.Clean(f), cleanPath) {
			updated = append(updated, f)
		}
	}

	settings.Folders = updated
	if strings.EqualFold(settings.ActiveFolder, cleanPath) {
		if len(updated) > 0 {
			settings.ActiveFolder = updated[0]
		} else {
			settings.ActiveFolder = ""
		}
	}

	if err := s.store.SaveSettings(settings); err != nil {
		return nil, err
	}

	return settings.Folders, nil
}

// SetActiveFolder sets and persists current active folder
func (s *MediaService) SetActiveFolder(folderPath string) error {
	settings := s.store.GetSettings()
	if folderPath != "" {
		settings.ActiveFolder = filepath.Clean(folderPath)
	} else {
		settings.ActiveFolder = ""
	}
	return s.store.SaveSettings(settings)
}

// ScanFiles scans all configured folders recursively and returns all media files
func (s *MediaService) ScanFiles(progressCb func(library.ScanProgress)) ([]media.MediaItem, error) {
	settings := s.store.GetSettings()
	if len(settings.Folders) == 0 {
		return []media.MediaItem{}, nil
	}

	files, err := s.scanner.ScanFolders(settings.Folders, progressCb)
	if err != nil {
		return nil, err
	}

	if s.streamer != nil {
		for i := range files {
			files[i].StreamURL = s.streamer.GetStreamURL(files[i].Path)
		}
	}

	return files, nil
}

// RenameMediaFile renames a local audio or video file directly in the filesystem
func (s *MediaService) RenameMediaFile(oldPath string, newName string) (*media.MediaItem, error) {
	if oldPath == "" {
		return nil, fmt.Errorf("đường dẫn tệp không được để trống")
	}
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return nil, fmt.Errorf("tên tệp mới không được để trống")
	}

	// Check forbidden characters in Windows filenames: \ / : * ? " < > |
	forbidden := `\/:*?"<>|`
	for _, char := range forbidden {
		if strings.ContainsRune(newName, char) {
			return nil, fmt.Errorf("tên tệp không được chứa các ký tự: \\ / : * ? \" < > |")
		}
	}

	cleanOldPath := filepath.Clean(oldPath)
	fileInfo, err := os.Stat(cleanOldPath)
	if err != nil {
		return nil, fmt.Errorf("tệp gốc không tồn tại: %w", err)
	}
	if fileInfo.IsDir() {
		return nil, fmt.Errorf("đối tượng là thư mục, không thể đổi tên")
	}

	dir := filepath.Dir(cleanOldPath)
	oldExt := filepath.Ext(cleanOldPath)

	// Preserve or normalize extension
	finalName := newName
	if !strings.EqualFold(filepath.Ext(newName), oldExt) {
		finalName = newName + oldExt
	}

	newPath := filepath.Join(dir, finalName)
	if strings.EqualFold(cleanOldPath, newPath) && cleanOldPath != newPath {
		// Case-only rename on Windows: e.g. "test.mp3" -> "Test.mp3"
	} else if _, err := os.Stat(newPath); err == nil && !strings.EqualFold(cleanOldPath, newPath) {
		return nil, fmt.Errorf("tệp với tên '%s' đã tồn tại trong thư mục", finalName)
	}

	// Perform physical filesystem rename
	if err := os.Rename(cleanOldPath, newPath); err != nil {
		return nil, fmt.Errorf("không thể đổi tên tệp: %w", err)
	}

	// Update store (file cache & playback states)
	_ = s.store.UpdateFilePath(cleanOldPath, newPath)

	// Construct and return updated MediaItem
	newStat, err := os.Stat(newPath)
	if err != nil {
		newStat = fileInfo
	}

	mediaType, _ := scanner.IsSupportedMedia(oldExt)
	streamURL := ""
	if s.streamer != nil {
		streamURL = s.streamer.GetStreamURL(newPath)
	}

	// Get existing fingerprint from cache or compute
	fp, found := s.store.GetCachedFingerprint(newPath, newStat.Size(), newStat.ModTime())
	if !found {
		if oldFp, oldFound := s.store.GetCachedFingerprint(cleanOldPath, fileInfo.Size(), fileInfo.ModTime()); oldFound {
			fp = oldFp
			s.store.SetCachedFingerprint(newPath, newStat.Size(), newStat.ModTime(), fp)
		} else {
			computedFp, err := hasher.ComputeFingerprint(newPath)
			if err == nil {
				fp = computedFp
				s.store.SetCachedFingerprint(newPath, newStat.Size(), newStat.ModTime(), fp)
			}
		}
	}

	// Attach playback state if any
	playbackState := s.store.GetPlaybackState(fp)
	lastPosition := 0.0
	completed := false
	loopA := 0.0
	loopB := 0.0
	var lastPlayedAt time.Time
	if playbackState != nil {
		lastPosition = playbackState.LastPosition
		completed = playbackState.Completed
		loopA = playbackState.LoopA
		loopB = playbackState.LoopB
		lastPlayedAt = playbackState.LastPlayedAt
	}

	item := &media.MediaItem{
		ID:           fp,
		Fingerprint:  fp,
		Name:         finalName,
		Path:         newPath,
		Type:         mediaType,
		Size:         newStat.Size(),
		ModTime:      newStat.ModTime(),
		StreamURL:    streamURL,
		LastPosition: lastPosition,
		Duration:     0,
		Completed:    completed,
		LoopA:        loopA,
		LoopB:        loopB,
		LastPlayedAt: lastPlayedAt,
	}

	return item, nil
}

// RenameYouTubeVideo updates the display title of a saved YouTube item
func (s *MediaService) RenameYouTubeVideo(videoID string, newTitle string) error {
	newTitle = strings.TrimSpace(newTitle)
	if newTitle == "" {
		return fmt.Errorf("tiêu đề video không được để trống")
	}
	return s.store.UpdateYouTubeTitle(videoID, newTitle)
}

