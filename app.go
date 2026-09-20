package main

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"go-audio-play/pkg/models"
	"go-audio-play/pkg/scanner"
	"go-audio-play/pkg/storage"
	"go-audio-play/pkg/streamer"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx      context.Context
	store    *storage.Store
	scanner  *scanner.Scanner
	streamer *streamer.StreamServer
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
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

	a.scanner = scanner.NewScanner(a.store)
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
	if folderPath == "" {
		return nil, fmt.Errorf("folder path cannot be empty")
	}

	cleanPath := filepath.Clean(folderPath)
	settings := a.store.GetSettings()

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

	// Set as active folder
	settings.ActiveFolder = cleanPath

	if err := a.store.SaveSettings(settings); err != nil {
		return nil, err
	}

	return settings.Folders, nil
}

// RemoveFolder removes a directory from managed folders
func (a *App) RemoveFolder(folderPath string) ([]string, error) {
	cleanPath := filepath.Clean(folderPath)
	settings := a.store.GetSettings()

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

	if err := a.store.SaveSettings(settings); err != nil {
		return nil, err
	}

	return settings.Folders, nil
}

// SetActiveFolder sets and persists current active folder
func (a *App) SetActiveFolder(folderPath string) error {
	settings := a.store.GetSettings()
	if folderPath != "" {
		settings.ActiveFolder = filepath.Clean(folderPath)
	} else {
		settings.ActiveFolder = ""
	}
	return a.store.SaveSettings(settings)
}

// GetSettings returns current application preferences
func (a *App) GetSettings() models.AppSettings {
	if a.store == nil {
		return models.DefaultSettings()
	}
	return a.store.GetSettings()
}

// SaveSettings persists updated application preferences
func (a *App) SaveSettings(settings models.AppSettings) error {
	if a.store == nil {
		return fmt.Errorf("store not initialized")
	}
	return a.store.SaveSettings(settings)
}

// ScanFiles scans all configured folders recursively and returns all media files
func (a *App) ScanFiles() ([]models.MediaFile, error) {
	if a.scanner == nil || a.store == nil {
		return nil, fmt.Errorf("scanner not initialized")
	}

	settings := a.store.GetSettings()
	if len(settings.Folders) == 0 {
		return []models.MediaFile{}, nil
	}

	files, err := a.scanner.ScanFolders(settings.Folders, func(p models.ScanProgress) {
		wailsRuntime.EventsEmit(a.ctx, "scan:progress", p)
	})
	if err != nil {
		return nil, err
	}

	// Populate Stream URLs
	if a.streamer != nil {
		for i := range files {
			files[i].StreamURL = a.streamer.GetStreamURL(files[i].Path)
		}
	}

	return files, nil
}

// SavePlaybackProgress saves playback position, completion status, and A-B loop points
func (a *App) SavePlaybackProgress(fingerprint string, path string, position float64, duration float64, loopA float64, loopB float64) error {
	if a.store == nil || fingerprint == "" {
		return nil
	}

	completed := false
	if duration > 0 && position >= (duration*0.95) {
		completed = true
	}

	state := models.PlaybackState{
		Fingerprint:  fingerprint,
		LastPath:     path,
		LastPosition: position,
		Duration:     duration,
		Completed:    completed,
		LoopA:        loopA,
		LoopB:        loopB,
	}

	return a.store.SavePlaybackState(state)
}

// ClearPlaybackProgress removes playback progress for a fingerprint
func (a *App) ClearPlaybackProgress(fingerprint string) error {
	if a.store == nil || fingerprint == "" {
		return nil
	}
	return a.store.DeletePlaybackState(fingerprint)
}

// ClearAllPlaybackProgress removes all playback progress
func (a *App) ClearAllPlaybackProgress() error {
	if a.store == nil {
		return nil
	}
	return a.store.ClearAllPlaybackStates()
}

// GetStreamURL returns the streamable HTTP URL for a specific file
func (a *App) GetStreamURL(filePath string) string {
	if a.streamer == nil {
		return ""
	}
	return a.streamer.GetStreamURL(filePath)
}

// OpenFileInExplorer reveals the file in Windows Explorer
func (a *App) OpenFileInExplorer(filePath string) error {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("explorer.exe", "/select,", filepath.Clean(filePath))
		return cmd.Start()
	}
	return nil
}
