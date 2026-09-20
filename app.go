package main

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"go-audio-play/internal/application"
	"go-audio-play/internal/domain/library"
	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/infrastructure/scanner"
	"go-audio-play/internal/infrastructure/storage"
	"go-audio-play/internal/infrastructure/streamer"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct acts as the IPC Facade Controller connecting Wails UI to Application Services
type App struct {
	ctx          context.Context
	store        *storage.Store
	streamer     *streamer.StreamServer
	mediaSvc     *application.MediaService
	playbackSvc  *application.PlaybackService
	youtubeSvc   *application.YouTubeService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	store, err := storage.NewStore()
	if err != nil {
		fmt.Printf("Error initializing store: %v\n", err)
	}
	a.store = store

	streamerSrv, err := streamer.NewStreamServer()
	if err != nil {
		fmt.Printf("Error starting streamer server: %v\n", err)
	}
	a.streamer = streamerSrv

	scannerSrv := scanner.NewScanner(a.store)

	a.mediaSvc = application.NewMediaService(a.store, scannerSrv, a.streamer)
	a.playbackSvc = application.NewPlaybackService(a.store)
	a.youtubeSvc = application.NewYouTubeService(a.store)
}

// shutdown is called when the app terminates
func (a *App) shutdown(ctx context.Context) {
	if a.streamer != nil {
		a.streamer.Stop()
	}
}

// SelectFolderDialog opens a native Windows folder picker
func (a *App) SelectFolderDialog() (string, error) {
	folder, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Chọn thư mục chứa Video/Audio để quản lý",
	})
	if err != nil {
		return "", err
	}
	return folder, nil
}

// AddFolder adds a new directory to managed folders
func (a *App) AddFolder(folderPath string) ([]string, error) {
	if a.mediaSvc == nil {
		return nil, fmt.Errorf("media service not initialized")
	}
	return a.mediaSvc.AddFolder(folderPath)
}

// RemoveFolder removes a directory from managed folders
func (a *App) RemoveFolder(folderPath string) ([]string, error) {
	if a.mediaSvc == nil {
		return nil, fmt.Errorf("media service not initialized")
	}
	return a.mediaSvc.RemoveFolder(folderPath)
}

// SetActiveFolder sets and persists current active folder
func (a *App) SetActiveFolder(folderPath string) error {
	if a.mediaSvc == nil {
		return fmt.Errorf("media service not initialized")
	}
	return a.mediaSvc.SetActiveFolder(folderPath)
}

// GetSettings returns current application preferences
func (a *App) GetSettings() library.AppSettings {
	if a.store == nil {
		return library.DefaultSettings()
	}
	return a.store.GetSettings()
}

// SaveSettings persists updated application preferences
func (a *App) SaveSettings(settings library.AppSettings) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.SaveSettings(settings)
}

// ScanFiles scans all configured folders recursively and includes saved YouTube videos
func (a *App) ScanFiles() ([]media.MediaItem, error) {
	if a.mediaSvc == nil {
		return nil, fmt.Errorf("media service not initialized")
	}

	files, err := a.mediaSvc.ScanFiles(func(p library.ScanProgress) {
		wailsRuntime.EventsEmit(a.ctx, "scan:progress", p)
	})
	if err != nil {
		return nil, err
	}

	// Append saved YouTube items as MediaItem
	if a.youtubeSvc != nil {
		ytItems := a.youtubeSvc.GetYouTubeMediaItems()
		files = append(files, ytItems...)
	}

	return files, nil
}

// AddYouTubeVideo adds a YouTube video by URL or Video ID
func (a *App) AddYouTubeVideo(rawURL string) (*media.MediaItem, error) {
	if a.youtubeSvc == nil {
		return nil, fmt.Errorf("youtube service not initialized")
	}
	return a.youtubeSvc.AddYouTubeVideo(rawURL)
}

// GetYouTubeVideos returns all saved YouTube items
func (a *App) GetYouTubeVideos() []media.MediaItem {
	if a.youtubeSvc == nil {
		return []media.MediaItem{}
	}
	return a.youtubeSvc.GetYouTubeMediaItems()
}

// RemoveYouTubeVideo removes a YouTube video from library
func (a *App) RemoveYouTubeVideo(videoID string) error {
	if a.youtubeSvc == nil {
		return fmt.Errorf("youtube service not initialized")
	}
	return a.youtubeSvc.RemoveYouTubeVideo(videoID)
}

// SavePlaybackProgress saves playback position, completion status, and A-B loop points
func (a *App) SavePlaybackProgress(fingerprint string, path string, position float64, duration float64, loopA float64, loopB float64) error {
	if a.playbackSvc == nil {
		return nil
	}
	return a.playbackSvc.SavePlaybackProgress(fingerprint, path, position, duration, loopA, loopB)
}

// ClearPlaybackProgress removes playback progress for a fingerprint
func (a *App) ClearPlaybackProgress(fingerprint string) error {
	if a.playbackSvc == nil {
		return nil
	}
	return a.playbackSvc.ClearPlaybackProgress(fingerprint)
}

// ClearAllPlaybackProgress removes all playback progress
func (a *App) ClearAllPlaybackProgress() error {
	if a.playbackSvc == nil {
		return nil
	}
	return a.playbackSvc.ClearAllPlaybackProgress()
}

// GetStreamURL returns the streamable HTTP URL for a specific file
func (a *App) GetStreamURL(filePath string) string {
	if a.streamer == nil {
		return ""
	}
	return a.streamer.GetStreamURL(filePath)
}

// OpenFileInExplorer reveals the file in Windows Explorer or opens URL in default browser
func (a *App) OpenFileInExplorer(filePath string) error {
	if runtime.GOOS == "windows" {
		if strings.HasPrefix(filePath, "http://") || strings.HasPrefix(filePath, "https://") {
			cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", filePath)
			return cmd.Start()
		}
		cmd := exec.Command("explorer.exe", "/select,", filepath.Clean(filePath))
		return cmd.Start()
	}
	return nil
}
