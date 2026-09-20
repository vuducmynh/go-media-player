package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"go-audio-play/internal/domain/study"
)

// LessonStore manages persistent JSON lesson storage on disk
type LessonStore struct {
	mu      sync.RWMutex
	baseDir string
}

// NewLessonStore creates or initializes the lessons directory (portable or AppData)
func NewLessonStore() (*LessonStore, error) {
	baseDir := filepath.Join(GetDataDir(), "lessons")
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create lessons directory: %w", err)
	}

	return &LessonStore{
		baseDir: baseDir,
	}, nil
}

// sanitizeFingerprint ensures the fingerprint can be safely used as a filename
func (ls *LessonStore) sanitizeFingerprint(fingerprint string) string {
	clean := strings.ReplaceAll(fingerprint, ":", "_")
	clean = strings.ReplaceAll(clean, "/", "_")
	clean = strings.ReplaceAll(clean, "\\", "_")
	clean = strings.ReplaceAll(clean, "?", "_")
	clean = strings.ReplaceAll(clean, "*", "_")
	clean = strings.ReplaceAll(clean, "\"", "_")
	clean = strings.ReplaceAll(clean, "<", "_")
	clean = strings.ReplaceAll(clean, ">", "_")
	clean = strings.ReplaceAll(clean, "|", "_")
	return clean
}

// getFilePath returns the primary absolute path for a lesson JSON file
func (ls *LessonStore) getFilePath(fingerprint string) string {
	return filepath.Join(ls.baseDir, ls.sanitizeFingerprint(fingerprint)+".json")
}

// GetLesson retrieves a lesson by its media fingerprint (checking primary and portable locations)
func (ls *LessonStore) GetLesson(fingerprint string) (*study.Lesson, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	fileName := ls.sanitizeFingerprint(fingerprint) + ".json"
	filePath := filepath.Join(ls.baseDir, fileName)

	// Fallback check: if not in primary, check appData or exeDir
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		appDataDir, _ := os.UserConfigDir()
		altCandidate := filepath.Join(appDataDir, "GoAudioPlay", "lessons", fileName)
		if _, err := os.Stat(altCandidate); err == nil {
			filePath = altCandidate
		} else {
			exeCandidate := filepath.Join(GetExeDir(), "lessons", fileName)
			if _, err := os.Stat(exeCandidate); err == nil {
				filePath = exeCandidate
			}
		}
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // Not an error, lesson just hasn't been created yet
		}
		return nil, fmt.Errorf("read lesson file failed: %w", err)
	}

	var lesson study.Lesson
	if err := json.Unmarshal(data, &lesson); err != nil {
		return nil, fmt.Errorf("unmarshal lesson failed: %w", err)
	}

	return &lesson, nil
}

// SaveLesson persists a lesson atomically to disk
func (ls *LessonStore) SaveLesson(lesson *study.Lesson) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	if lesson.Fingerprint == "" {
		return fmt.Errorf("lesson fingerprint cannot be empty")
	}

	lesson.UpdatedAt = time.Now()
	if lesson.CreatedAt.IsZero() {
		lesson.CreatedAt = lesson.UpdatedAt
	}

	data, err := json.MarshalIndent(lesson, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal lesson failed: %w", err)
	}

	targetPath := ls.getFilePath(lesson.Fingerprint)
	tempPath := targetPath + ".tmp"

	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("write temp lesson file failed: %w", err)
	}

	if err := os.Rename(tempPath, targetPath); err != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("atomic rename lesson failed: %w", err)
	}

	return nil
}

// DeleteLesson removes a lesson from disk
func (ls *LessonStore) DeleteLesson(fingerprint string) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	filePath := ls.getFilePath(fingerprint)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete lesson failed: %w", err)
	}

	return nil
}

// ListLessons returns all saved lessons
func (ls *LessonStore) ListLessons() ([]*study.Lesson, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	entries, err := os.ReadDir(ls.baseDir)
	if err != nil {
		return nil, fmt.Errorf("read lessons dir failed: %w", err)
	}

	var lessons []*study.Lesson
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		filePath := filepath.Join(ls.baseDir, entry.Name())
		data, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		var lesson study.Lesson
		if err := json.Unmarshal(data, &lesson); err == nil {
			lessons = append(lessons, &lesson)
		}
	}

	return lessons, nil
}
