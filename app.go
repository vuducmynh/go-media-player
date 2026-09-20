package main

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"go-audio-play/internal/application"
	"go-audio-play/internal/domain/library"
	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/domain/study"
	"go-audio-play/internal/infrastructure/scanner"
	"go-audio-play/internal/infrastructure/storage"
	"go-audio-play/internal/infrastructure/streamer"
	"go-audio-play/internal/infrastructure/whisper"

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
	studySvc     *application.StudyService
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

	lessonStore, err := storage.NewLessonStore()
	if err != nil {
		fmt.Printf("Error initializing lesson store: %v\n", err)
	}
	modelMgr, err := whisper.NewModelManager()
	if err != nil {
		fmt.Printf("Error initializing model manager: %v\n", err)
	}
	whisperEng, err := whisper.NewEngine(modelMgr)
	if err != nil {
		fmt.Printf("Error initializing whisper engine: %v\n", err)
	}
	a.studySvc = application.NewStudyService(lessonStore, modelMgr, whisperEng)
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

// GetLesson retrieves a study lesson by its media fingerprint
func (a *App) GetLesson(fingerprint string) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.GetLesson(fingerprint)
}

// SaveLesson persists or updates a study lesson (e.g. from imported script)
func (a *App) SaveLesson(lesson study.Lesson) error {
	if a.studySvc == nil {
		return fmt.Errorf("study service not initialized")
	}
	return a.studySvc.SaveLesson(&lesson)
}

// GetInstalledModels returns the list of downloadable speech recognition models
func (a *App) GetInstalledModels() []study.ModelInfo {
	if a.studySvc == nil {
		return []study.ModelInfo{}
	}
	return a.studySvc.GetInstalledModels()
}

// DownloadModel initiates a model download and emits progress events
func (a *App) DownloadModel(modelID string) error {
	if a.studySvc == nil {
		return fmt.Errorf("study service not initialized")
	}
	return a.studySvc.DownloadModel(modelID, func(p study.ModelDownloadProgress) {
		wailsRuntime.EventsEmit(a.ctx, "model:download:progress", p)
	})
}

// GetGPUInfo retrieves NVIDIA GPU hardware and acceleration status
func (a *App) GetGPUInfo() study.GPUInfo {
	if a.studySvc == nil {
		return study.GPUInfo{}
	}
	return a.studySvc.GetGPUInfo()
}

// DownloadGPUAcceleration downloads NVIDIA CUDA runtime for ultra-fast GPU transcription
func (a *App) DownloadGPUAcceleration() error {
	if a.studySvc == nil {
		return fmt.Errorf("study service not initialized")
	}
	return a.studySvc.DownloadGPUAcceleration(func(p study.ModelDownloadProgress) {
		wailsRuntime.EventsEmit(a.ctx, "gpu:download:progress", p)
	})
}

// ProcessLesson generates sentence segmentation for a local file using whisper.cpp
func (a *App) ProcessLesson(fingerprint, title, mediaPath, modelID string) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.CreateLessonFromLocalMedia(fingerprint, title, mediaPath, modelID, func(p study.TranscribeProgress) {
		wailsRuntime.EventsEmit(a.ctx, "lesson:transcribe:progress", map[string]interface{}{
			"fingerprint":     fingerprint,
			"percentage":      p.Percentage,
			"status":          p.Status,
			"latestSentence":  p.LatestSentence,
			"sentenceCount":   p.SentenceCount,
			"recentSentences": p.RecentSentences,
		})
	})
}

// CancelLessonProcessing terminates any ongoing transcription process for the given media
func (a *App) CancelLessonProcessing(fingerprint string) bool {
	if a.studySvc == nil {
		return false
	}
	return a.studySvc.CancelLessonProcessing(fingerprint)
}

// ProcessYouTubeLesson extracts captions or transcribes a YouTube video
func (a *App) ProcessYouTubeLesson(fingerprint, title, videoID, modelID string) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.CreateLessonFromYouTube(fingerprint, title, videoID, modelID, func(percent int) {
		wailsRuntime.EventsEmit(a.ctx, "lesson:transcribe:progress", map[string]interface{}{
			"fingerprint":     fingerprint,
			"percentage":      percent,
			"status":          "Đang xử lý phụ đề YouTube...",
			"sentenceCount":   0,
			"recentSentences": []string{},
		})
	})
}

// SaveDictationAttempt records a user's dictation submission
func (a *App) SaveDictationAttempt(fingerprint, sentenceID string, attempt study.DictationAttempt) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.SaveDictationAttempt(fingerprint, sentenceID, attempt)
}

// ToggleSentenceStar toggles the star mark on a sentence
func (a *App) ToggleSentenceStar(fingerprint, sentenceID string) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.ToggleSentenceStar(fingerprint, sentenceID)
}

// MarkSentenceDifficult flags the sentence matching current audio playback timestamp
func (a *App) MarkSentenceDifficult(fingerprint string, currentTimestampMs int64) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.MarkSentenceDifficult(fingerprint, currentTimestampMs)
}

// UpdateSentenceVisibility records whether transcript was revealed before answering
func (a *App) UpdateSentenceVisibility(fingerprint, sentenceID string, revealed bool) (*study.Lesson, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.UpdateSentenceVisibility(fingerprint, sentenceID, revealed)
}

// GetHardwareInfo retrieves complete GPU, CPU, RAM, and storage topology
func (a *App) GetHardwareInfo() study.HardwareInfo {
	if a.studySvc == nil {
		return study.HardwareInfo{}
	}
	return a.studySvc.GetHardwareInfo()
}

// DeleteModel deletes a downloaded model file
func (a *App) DeleteModel(modelID string) error {
	if a.studySvc == nil {
		return fmt.Errorf("study service not initialized")
	}
	return a.studySvc.DeleteModel(modelID)
}

// ImportLocalModel copies or links a user-provided .bin model file
func (a *App) ImportLocalModel(filePath string) (*study.ModelInfo, error) {
	if a.studySvc == nil {
		return nil, fmt.Errorf("study service not initialized")
	}
	return a.studySvc.ImportLocalModel(filePath)
}

// SelectModelFile opens a file picker for the user to select an existing .bin model
func (a *App) SelectModelFile() (string, error) {
	return wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Chọn mô hình AI Whisper (.bin)",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "GGML Whisper Model (*.bin)", Pattern: "*.bin"},
		},
	})
}

// ExportBackupData prompts the user for a destination zip path and exports all lessons and settings
func (a *App) ExportBackupData() (string, error) {
	if a.studySvc == nil {
		return "", fmt.Errorf("study service not initialized")
	}

	destPath, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           "Sao lưu toàn bộ bài học và dữ liệu GoAudioPlay",
		DefaultFilename: fmt.Sprintf("GoAudioPlay_Backup_%s.zip", time.Now().Format("20060102_150405")),
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "Tệp nén ZIP (*.zip)", Pattern: "*.zip"},
		},
	})
	if err != nil || destPath == "" {
		return "", err
	}

	if err := a.studySvc.ExportBackup(destPath); err != nil {
		return "", err
	}

	return destPath, nil
}

// ImportBackupData prompts user to pick a backup zip and imports all lessons and settings
func (a *App) ImportBackupData() (int, error) {
	if a.studySvc == nil {
		return 0, fmt.Errorf("study service not initialized")
	}

	srcPath, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Chọn tệp sao lưu GoAudioPlay (*.zip)",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "Tệp nén ZIP (*.zip)", Pattern: "*.zip"},
		},
	})
	if err != nil || srcPath == "" {
		return 0, err
	}

	return a.studySvc.ImportBackup(srcPath)
}


