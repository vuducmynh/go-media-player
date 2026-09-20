package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go-audio-play/pkg/models"
)

type FileCacheEntry struct {
	Fingerprint string    `json:"fingerprint"`
	Size        int64     `json:"size"`
	ModTime     time.Time `json:"modTime"`
}

type StoreData struct {
	Settings       models.AppSettings                  `json:"settings"`
	PlaybackStates map[string]*models.PlaybackState    `json:"playbackStates"`
	FileCache      map[string]FileCacheEntry           `json:"fileCache"` // path -> cache entry
}

type Store struct {
	mu       sync.RWMutex
	filePath string
	data     StoreData
}

// NewStore initializes or loads persistent JSON storage from AppData
func NewStore() (*Store, error) {
	appDataDir, err := os.UserConfigDir()
	if err != nil {
		appDataDir = "."
	}
	appDir := filepath.Join(appDataDir, "GoAudioPlay")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, fmt.Errorf("create app data dir failed: %w", err)
	}

	dataFilePath := filepath.Join(appDir, "storage.json")
	store := &Store{
		filePath: dataFilePath,
		data: StoreData{
			Settings:       models.DefaultSettings(),
			PlaybackStates: make(map[string]*models.PlaybackState),
			FileCache:      make(map[string]FileCacheEntry),
		},
	}

	if _, err := os.Stat(dataFilePath); err == nil {
		content, err := os.ReadFile(dataFilePath)
		if err == nil {
			var loaded StoreData
			if err := json.Unmarshal(content, &loaded); err == nil {
				if loaded.PlaybackStates == nil {
					loaded.PlaybackStates = make(map[string]*models.PlaybackState)
				}
				if loaded.FileCache == nil {
					loaded.FileCache = make(map[string]FileCacheEntry)
				}
				// Default values if missing
				if loaded.Settings.JumpSeconds <= 0 {
					loaded.Settings.JumpSeconds = 5.0
				}
				if loaded.Settings.SlowSpeed <= 0 {
					loaded.Settings.SlowSpeed = 0.5
				}
				if loaded.Settings.HoldSlowKey == "" {
					loaded.Settings.HoldSlowKey = "KeyS"
				}
				if loaded.Settings.DefaultSpeed <= 0 {
					loaded.Settings.DefaultSpeed = 1.0
				}
				if loaded.Settings.Volume <= 0 {
					loaded.Settings.Volume = 0.9
				}
				store.data = loaded
			}
		}
	} else {
		// Save initial default settings
		_ = store.saveLocked()
	}

	return store, nil
}

func (s *Store) saveLocked() error {
	bytes, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal data failed: %w", err)
	}

	tempFile := s.filePath + ".tmp"
	if err := os.WriteFile(tempFile, bytes, 0644); err != nil {
		return fmt.Errorf("write temp storage file failed: %w", err)
	}

	if err := os.Rename(tempFile, s.filePath); err != nil {
		return fmt.Errorf("replace storage file failed: %w", err)
	}

	return nil
}

// GetSettings retrieves current user settings
func (s *Store) GetSettings() models.AppSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Settings
}

// SaveSettings persists updated settings
func (s *Store) SaveSettings(settings models.AppSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.Settings = settings
	return s.saveLocked()
}

// GetPlaybackState returns saved state for a fingerprint
func (s *Store) GetPlaybackState(fingerprint string) *models.PlaybackState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if state, exists := s.data.PlaybackStates[fingerprint]; exists {
		cpy := *state
		return &cpy
	}
	return nil
}

// GetAllPlaybackStates returns all saved states
func (s *Store) GetAllPlaybackStates() map[string]*models.PlaybackState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make(map[string]*models.PlaybackState, len(s.data.PlaybackStates))
	for k, v := range s.data.PlaybackStates {
		cpy := *v
		result[k] = &cpy
	}
	return result
}

// SavePlaybackState persists playback state for a fingerprint
func (s *Store) SavePlaybackState(state models.PlaybackState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	state.LastPlayedAt = time.Now()
	s.data.PlaybackStates[state.Fingerprint] = &state
	return s.saveLocked()
}

// DeletePlaybackState removes saved playback progress for a fingerprint
func (s *Store) DeletePlaybackState(fingerprint string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.data.PlaybackStates, fingerprint)
	return s.saveLocked()
}

// ClearAllPlaybackStates removes all saved playback progress
func (s *Store) ClearAllPlaybackStates() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.data.PlaybackStates = make(map[string]*models.PlaybackState)
	return s.saveLocked()
}

// GetCachedFingerprint checks if we already hashed this file with matching size & modtime
func (s *Store) GetCachedFingerprint(path string, size int64, modTime time.Time) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, exists := s.data.FileCache[path]
	if !exists {
		return "", false
	}
	if entry.Size == size && entry.ModTime.Equal(modTime) {
		return entry.Fingerprint, true
	}
	return "", false
}

// SetCachedFingerprint records the hashed fingerprint for a file path
func (s *Store) SetCachedFingerprint(path string, size int64, modTime time.Time, fp string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.FileCache[path] = FileCacheEntry{
		Fingerprint: fp,
		Size:        size,
		ModTime:     modTime,
	}
	// Debounced or direct save
	_ = s.saveLocked()
}
