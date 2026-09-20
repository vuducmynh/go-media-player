package application

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/domain/study"
	"go-audio-play/internal/infrastructure/storage"
	"go-audio-play/internal/infrastructure/streamer"
	"go-audio-play/internal/infrastructure/whisper"
	"go-audio-play/internal/infrastructure/youtube"
)

type StudyService struct {
	lessonStore   *storage.LessonStore
	modelManager  *whisper.ModelManager
	whisperEngine *whisper.Engine
	ytCaptions    *youtube.CaptionsExtractor
	ytdlp         *whisper.YtDlpDownloader
	streamer      *streamer.StreamServer
	mu            sync.Mutex
	activeCancels map[string]context.CancelFunc
}

func NewStudyService(
	lessonStore *storage.LessonStore,
	modelManager *whisper.ModelManager,
	whisperEngine *whisper.Engine,
	streamer *streamer.StreamServer,
) *StudyService {
	return &StudyService{
		lessonStore:   lessonStore,
		modelManager:  modelManager,
		whisperEngine: whisperEngine,
		ytCaptions:    youtube.NewCaptionsExtractor(),
		ytdlp:         whisper.NewYtDlpDownloader(),
		streamer:      streamer,
		activeCancels: make(map[string]context.CancelFunc),
	}
}

// GetLesson retrieves an existing lesson by fingerprint
func (s *StudyService) GetLesson(fingerprint string) (*study.Lesson, error) {
	lesson, err := s.lessonStore.GetLesson(fingerprint)
	if err != nil || lesson == nil {
		return nil, err
	}
	if lesson.AudioPath != "" && s.streamer != nil {
		lesson.StreamURL = s.streamer.GetStreamURL(lesson.AudioPath)
	}
	return lesson, nil
}

// SaveLesson persists or updates a full lesson
func (s *StudyService) SaveLesson(lesson *study.Lesson) error {
	return s.lessonStore.SaveLesson(lesson)
}

// GetInstalledModels returns the list of Whisper models with download status
func (s *StudyService) GetInstalledModels() []study.ModelInfo {
	return s.modelManager.GetModels()
}

// DownloadModel downloads a Whisper model with progress callbacks
func (s *StudyService) DownloadModel(modelID string, onProgress func(study.ModelDownloadProgress)) error {
	return s.modelManager.DownloadModel(modelID, onProgress)
}

// GetGPUInfo returns details about NVIDIA GPU and CUDA acceleration status
func (s *StudyService) GetGPUInfo() study.GPUInfo {
	return s.whisperEngine.GetGPUInfo()
}

// DownloadGPUAcceleration downloads and extracts whisper-cublas package for GPU acceleration
func (s *StudyService) DownloadGPUAcceleration(onProgress func(study.ModelDownloadProgress)) error {
	return s.whisperEngine.DownloadGPUAcceleration(onProgress)
}

// CancelLessonProcessing cancels any active transcription process for the given fingerprint
func (s *StudyService) CancelLessonProcessing(fingerprint string) bool {
	s.mu.Lock()
	cancel, ok := s.activeCancels[fingerprint]
	s.mu.Unlock()

	if ok && cancel != nil {
		cancel()
		return true
	}
	return false
}

// CreateLessonFromLocalMedia transcribes and segments a local audio/video file using offline whisper.cpp
func (s *StudyService) CreateLessonFromLocalMedia(
	fingerprint string,
	title string,
	audioPath string,
	modelID string,
	onProgress func(study.TranscribeProgress),
) (*study.Lesson, error) {
	if modelID == "" {
		modelID = "large-v3-turbo-q5_0"
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.activeCancels[fingerprint] = cancel
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.activeCancels, fingerprint)
		s.mu.Unlock()
		cancel()
	}()

	sentences, err := s.whisperEngine.Transcribe(ctx, audioPath, modelID, onProgress)
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("transcription cancelled by user")
		}
		return nil, fmt.Errorf("transcribe local media failed: %w", err)
	}

	if len(sentences) == 0 {
		return nil, fmt.Errorf("no speech sentences detected in audio")
	}

	durationMs := sentences[len(sentences)-1].EndMs

	lesson := &study.Lesson{
		ID:          fingerprint,
		Fingerprint: fingerprint,
		Title:       title,
		Source:      media.SourceTypeLocal,
		DurationMs:  durationMs,
		Sentences:   sentences,
		ProcessedBy: "whisper-" + modelID,
		Progress: study.LessonProgress{
			GuidedStage:       "listen",
			CurrentSentenceID: sentences[0].ID,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save lesson failed: %w", err)
	}

	return lesson, nil
}

// CreateLessonFromYouTube creates a lesson from a YouTube video using yt-dlp + Whisper AI
func (s *StudyService) CreateLessonFromYouTube(
	fingerprint string,
	title string,
	videoID string,
	modelID string,
	onProgress func(p study.TranscribeProgress),
) (*study.Lesson, error) {
	if modelID == "" {
		modelID = "large-v3-turbo-q5_0"
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.activeCancels[fingerprint] = cancel
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.activeCancels, fingerprint)
		s.mu.Unlock()
		cancel()
	}()

	// Stage 1: Download audio stream via yt-dlp (0% - 30%)
	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage: 2,
			Status:     "Đang chuẩn bị tải âm thanh từ YouTube...",
		})
	}

	audioPath, err := s.ytdlp.DownloadAudio(ctx, videoID, func(percent int, status string) {
		if onProgress != nil {
			mappedPct := 2 + int(float64(percent)*0.28)
			onProgress(study.TranscribeProgress{
				Percentage: mappedPct,
				Status:     status,
			})
		}
	})
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("transcription cancelled by user")
		}
		return nil, fmt.Errorf("không thể tải âm thanh từ YouTube: %w", err)
	}

	// Stage 2: Transcribe using Whisper AI (30% - 100%)
	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage: 30,
			Status:     "Đang nhận diện giọng nói bằng AI Whisper...",
		})
	}

	sentences, err := s.whisperEngine.Transcribe(ctx, audioPath, modelID, func(p study.TranscribeProgress) {
		if onProgress != nil {
			mappedPct := 30 + int(float64(p.Percentage)*0.70)
			if mappedPct > 100 {
				mappedPct = 100
			}
			p.Percentage = mappedPct
			onProgress(p)
		}
	})
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("transcription cancelled by user")
		}
		return nil, fmt.Errorf("nhận diện giọng nói YouTube thất bại: %w", err)
	}

	if len(sentences) == 0 {
		return nil, fmt.Errorf("không phát hiện được giọng nói trong video YouTube")
	}

	durationMs := sentences[len(sentences)-1].EndMs
	streamURL := ""
	if s.streamer != nil {
		streamURL = s.streamer.GetStreamURL(audioPath)
	}

	lesson := &study.Lesson{
		ID:          fingerprint,
		Fingerprint: fingerprint,
		Title:       title,
		Source:      media.SourceTypeYouTube,
		DurationMs:  durationMs,
		Sentences:   sentences,
		ProcessedBy: "whisper-" + modelID,
		AudioPath:   audioPath,
		StreamURL:   streamURL,
		Progress: study.LessonProgress{
			GuidedStage:       "listen",
			CurrentSentenceID: sentences[0].ID,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save lesson failed: %w", err)
	}

	return lesson, nil
}

// DeleteYouTubeAudio deletes cached audio files for a YouTube video
func (s *StudyService) DeleteYouTubeAudio(videoID string) {
	s.ytdlp.DeleteAudio(videoID)
}

// SaveDictationAttempt records a dictation submission and updates sentence scoring metrics
func (s *StudyService) SaveDictationAttempt(
	fingerprint string,
	sentenceID string,
	attempt study.DictationAttempt,
) (*study.Lesson, error) {
	lesson, err := s.lessonStore.GetLesson(fingerprint)
	if err != nil || lesson == nil {
		return nil, fmt.Errorf("lesson not found: %w", err)
	}

	attempt.CreatedAt = time.Now()

	found := false
	for i := range lesson.Sentences {
		sent := &lesson.Sentences[i]
		if sent.ID == sentenceID {
			found = true
			sent.DictationAttempts = append(sent.DictationAttempts, attempt)
			sent.LatestScore = &attempt.Score

			if attempt.AssessmentType == "independent" {
				if sent.BestIndependentScore == nil || attempt.Score > *sent.BestIndependentScore {
					sent.BestIndependentScore = &attempt.Score
				}
			} else {
				if sent.BestAssistedScore == nil || attempt.Score > *sent.BestAssistedScore {
					sent.BestAssistedScore = &attempt.Score
				}
			}

			break
		}
	}

	if !found {
		return nil, fmt.Errorf("sentence %s not found in lesson", sentenceID)
	}

	lesson.UpdatedAt = time.Now()
	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save updated lesson failed: %w", err)
	}

	return lesson, nil
}

// ToggleSentenceStar toggles the star flag for a sentence
func (s *StudyService) ToggleSentenceStar(fingerprint string, sentenceID string) (*study.Lesson, error) {
	lesson, err := s.lessonStore.GetLesson(fingerprint)
	if err != nil || lesson == nil {
		return nil, fmt.Errorf("lesson not found: %w", err)
	}

	for i := range lesson.Sentences {
		if lesson.Sentences[i].ID == sentenceID {
			lesson.Sentences[i].Starred = !lesson.Sentences[i].Starred
			break
		}
	}

	lesson.UpdatedAt = time.Now()
	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save updated lesson failed: %w", err)
	}

	return lesson, nil
}

// MarkSentenceDifficult tags the sentence matching the current playback time
func (s *StudyService) MarkSentenceDifficult(fingerprint string, currentTimestampMs int64) (*study.Lesson, error) {
	lesson, err := s.lessonStore.GetLesson(fingerprint)
	if err != nil || lesson == nil {
		return nil, fmt.Errorf("lesson not found: %w", err)
	}

	for i := range lesson.Sentences {
		sent := &lesson.Sentences[i]
		if currentTimestampMs >= sent.StartMs && currentTimestampMs <= sent.EndMs {
			sent.MarkedDifficult = true
			break
		}
	}

	lesson.UpdatedAt = time.Now()
	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save updated lesson failed: %w", err)
	}

	return lesson, nil
}

// UpdateSentenceVisibility records whether the student has revealed the transcript
func (s *StudyService) UpdateSentenceVisibility(fingerprint string, sentenceID string, revealed bool) (*study.Lesson, error) {
	lesson, err := s.lessonStore.GetLesson(fingerprint)
	if err != nil || lesson == nil {
		return nil, fmt.Errorf("lesson not found: %w", err)
	}

	for i := range lesson.Sentences {
		if lesson.Sentences[i].ID == sentenceID {
			lesson.Sentences[i].TranscriptRevealed = revealed
			break
		}
	}

	lesson.UpdatedAt = time.Now()
	if err := s.lessonStore.SaveLesson(lesson); err != nil {
		return nil, fmt.Errorf("save updated lesson failed: %w", err)
	}

	return lesson, nil
}

// GetHardwareInfo returns multi-vendor hardware topology and storage details
func (s *StudyService) GetHardwareInfo() study.HardwareInfo {
	return s.whisperEngine.GetHardwareInfo()
}

// DeleteModel removes a downloaded model file
func (s *StudyService) DeleteModel(modelID string) error {
	return s.modelManager.DeleteModel(modelID)
}

// ImportLocalModel imports an existing .bin model from disk
func (s *StudyService) ImportLocalModel(filePath string) (*study.ModelInfo, error) {
	return s.modelManager.ImportLocalModel(filePath)
}

// ExportBackup archives all lessons and settings into a ZIP file
func (s *StudyService) ExportBackup(destZipPath string) error {
	return storage.ExportBackup(destZipPath)
}

// ImportBackup extracts lessons and settings from a backup ZIP file
func (s *StudyService) ImportBackup(srcZipPath string) (int, error) {
	return storage.ImportBackup(srcZipPath)
}

// CancelAll aborts all running background transcription or download tasks
func (s *StudyService) CancelAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, cancel := range s.activeCancels {
		if cancel != nil {
			cancel()
		}
	}
	s.activeCancels = make(map[string]context.CancelFunc)
}

// GetAllLessonFingerprints returns all fingerprints that have an existing lesson
func (s *StudyService) GetAllLessonFingerprints() []string {
	fps, err := s.lessonStore.ListLessonFingerprints()
	if err != nil {
		return []string{}
	}
	return fps
}


