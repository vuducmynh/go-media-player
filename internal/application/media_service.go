package application

import (
	"fmt"
	"path/filepath"
	"strings"

	"go-audio-play/internal/domain/library"
	"go-audio-play/internal/domain/media"
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
