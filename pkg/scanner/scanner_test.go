package scanner

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"go-audio-play/pkg/models"
	"go-audio-play/pkg/storage"
)

func TestScannerAndStorage(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "scanner_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create nested directories
	subDir1 := filepath.Join(tempDir, "English", "Lessons")
	subDir2 := filepath.Join(tempDir, "Podcasts", "Tech", "2026")
	_ = os.MkdirAll(subDir1, 0755)
	_ = os.MkdirAll(subDir2, 0755)

	// Write dummy media files
	file1 := filepath.Join(subDir1, "lesson_01.mp3")
	file2 := filepath.Join(subDir2, "podcast_ep10.mp4")
	file3 := filepath.Join(tempDir, "notes.txt") // non-media, should be ignored

	_ = os.WriteFile(file1, []byte("dummy audio content 123456789"), 0644)
	_ = os.WriteFile(file2, []byte("dummy video content 987654321"), 0644)
	_ = os.WriteFile(file3, []byte("plain text notes"), 0644)

	store, err := storage.NewStore()
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	sc := NewScanner(store)
	files, err := sc.ScanFolders([]string{tempDir}, nil)
	if err != nil {
		t.Fatalf("scan folders failed: %v", err)
	}

	if len(files) != 2 {
		t.Fatalf("expected 2 media files found, got %d", len(files))
	}

	foundAudio := false
	foundVideo := false
	for _, f := range files {
		if f.Type == models.MediaTypeAudio && f.Name == "lesson_01.mp3" {
			foundAudio = true
		}
		if f.Type == models.MediaTypeVideo && f.Name == "podcast_ep10.mp4" {
			foundVideo = true
		}
	}

	if !foundAudio || !foundVideo {
		t.Fatalf("failed to discover both audio and video files in nested folders")
	}

	// Test saving and retrieving playback state
	targetFP := files[0].Fingerprint
	err = store.SavePlaybackState(models.PlaybackState{
		Fingerprint:  targetFP,
		LastPath:     files[0].Path,
		LastPosition: 42.5,
		Duration:     120.0,
		Completed:    false,
		LastPlayedAt: time.Now(),
		LoopA:        10.0,
		LoopB:        25.0,
	})
	if err != nil {
		t.Fatalf("save playback state failed: %v", err)
	}

	// Re-scan and check that state is hydrated
	filesHydrated, err := sc.ScanFolders([]string{tempDir}, nil)
	if err != nil {
		t.Fatalf("second scan failed: %v", err)
	}

	foundState := false
	for _, f := range filesHydrated {
		if f.Fingerprint == targetFP {
			if f.LastPosition == 42.5 && f.LoopA == 10.0 && f.LoopB == 25.0 {
				foundState = true
			}
		}
	}

	if !foundState {
		t.Fatalf("expected hydrated playback progress for file %s", targetFP)
	}
}
