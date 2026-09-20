package scanner

import (
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"go-audio-play/internal/domain/library"
	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/infrastructure/hasher"
	"go-audio-play/internal/infrastructure/storage"
)

var AudioExtensions = map[string]bool{
	".mp3":  true,
	".m4a":  true,
	".wav":  true,
	".aac":  true,
	".flac": true,
	".ogg":  true,
	".opus": true,
	".wma":  true,
	".m4b":  true,
}

var VideoExtensions = map[string]bool{
	".mp4":  true,
	".mkv":  true,
	".webm": true,
	".avi":  true,
	".mov":  true,
	".wmv":  true,
	".flv":  true,
	".m4v":  true,
	".ts":   true,
}

func IsSupportedMedia(ext string) (media.MediaType, bool) {
	lowerExt := strings.ToLower(ext)
	if AudioExtensions[lowerExt] {
		return media.MediaTypeAudio, true
	}
	if VideoExtensions[lowerExt] {
		return media.MediaTypeVideo, true
	}
	return "", false
}

// Scanner handles multi-folder recursive media scanning
type Scanner struct {
	store *storage.Store
}

func NewScanner(store *storage.Store) *Scanner {
	return &Scanner{
		store: store,
	}
}

// ScanFolders scans all registered root folders concurrently and attaches playback metadata
func (s *Scanner) ScanFolders(folders []string, progressCb func(library.ScanProgress)) ([]media.MediaItem, error) {
	var discoveredFiles []struct {
		Path       string
		Name       string
		Ext        string
		Type       media.MediaType
		Size       int64
		ModTime    fs.FileInfo
		FolderRoot string
		RelDir     string
	}

	progress := library.ScanProgress{
		TotalFolders: len(folders),
		ScannedFiles: 0,
		FoundMedia:   0,
		IsScanning:   true,
	}

	for _, folder := range folders {
		folder = filepath.Clean(folder)
		if stat, err := os.Stat(folder); err != nil || !stat.IsDir() {
			continue
		}

		_ = filepath.WalkDir(folder, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}

			name := d.Name()
			if d.IsDir() {
				if strings.HasPrefix(name, ".") || strings.EqualFold(name, "$RECYCLE.BIN") || strings.EqualFold(name, "System Volume Information") {
					return filepath.SkipDir
				}
				return nil
			}

			ext := strings.ToLower(filepath.Ext(path))
			mediaType, ok := IsSupportedMedia(ext)
			if !ok {
				return nil
			}

			info, err := d.Info()
			if err != nil {
				return nil
			}

			relDir, _ := filepath.Rel(folder, filepath.Dir(path))
			if relDir == "." {
				relDir = ""
			}

			discoveredFiles = append(discoveredFiles, struct {
				Path       string
				Name       string
				Ext        string
				Type       media.MediaType
				Size       int64
				ModTime    fs.FileInfo
				FolderRoot string
				RelDir     string
			}{
				Path:       path,
				Name:       name,
				Ext:        ext,
				Type:       mediaType,
				Size:       info.Size(),
				ModTime:    info,
				FolderRoot: folder,
				RelDir:     relDir,
			})

			progress.FoundMedia = len(discoveredFiles)
			progress.CurrentPath = path
			if progressCb != nil && len(discoveredFiles)%20 == 0 {
				progressCb(progress)
			}

			return nil
		})
	}

	workerCount := 8
	jobs := make(chan int, len(discoveredFiles))
	results := make([]media.MediaItem, len(discoveredFiles))
	var wg sync.WaitGroup

	allStates := s.store.GetAllPlaybackStates()

	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range jobs {
				item := discoveredFiles[idx]
				size := item.Size
				modTime := item.ModTime.ModTime()

				fp, cached := s.store.GetCachedFingerprint(item.Path, size, modTime)
				if !cached {
					computedFp, err := hasher.ComputeFingerprint(item.Path)
					if err == nil {
						fp = computedFp
						s.store.SetCachedFingerprint(item.Path, size, modTime, fp)
					} else {
						fp = "fp_fallback_" + item.Path
					}
				}

				title := strings.TrimSuffix(item.Name, item.Ext)

				mf := media.MediaItem{
					ID:          fp,
					Fingerprint: fp,
					Source:      media.SourceTypeLocal,
					Path:        item.Path,
					Name:        item.Name,
					Title:       title,
					Ext:         item.Ext,
					Type:        item.Type,
					Size:        size,
					ModTime:     modTime,
					FolderRoot:  item.FolderRoot,
					RelativeDir: item.RelDir,
				}

				// Hydrate saved playback progress if exists
				if state, exists := allStates[fp]; exists {
					mf.LastPosition = state.LastPosition
					mf.TotalPlayed = state.Duration
					mf.Completed = state.Completed
					mf.LastPlayedAt = state.LastPlayedAt
					mf.LoopA = state.LoopA
					mf.LoopB = state.LoopB
					if mf.Duration == 0 {
						mf.Duration = state.Duration
					}
				}

				results[idx] = mf
			}
		}()
	}

	for i := range discoveredFiles {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	sort.Slice(results, func(i, j int) bool {
		if results[i].FolderRoot != results[j].FolderRoot {
			return results[i].FolderRoot < results[j].FolderRoot
		}
		if results[i].RelativeDir != results[j].RelativeDir {
			return results[i].RelativeDir < results[j].RelativeDir
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})

	progress.IsScanning = false
	progress.ScannedFiles = len(results)
	if progressCb != nil {
		progressCb(progress)
	}

	return results, nil
}
