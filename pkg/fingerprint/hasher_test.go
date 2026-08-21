package fingerprint

import (
	"os"
	"path/filepath"
	"testing"
)

func TestComputeFingerprint(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "hasher_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create dummy test file with 200KB content
	file1Path := filepath.Join(tempDir, "sample_audio.mp3")
	data := make([]byte, 200*1024)
	for i := range data {
		data[i] = byte(i % 256)
	}
	if err := os.WriteFile(file1Path, data, 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	fp1, err := ComputeFingerprint(file1Path)
	if err != nil {
		t.Fatalf("failed to compute fingerprint 1: %v", err)
	}
	if fp1 == "" {
		t.Fatal("expected non-empty fingerprint")
	}

	// Rename / copy to a different name and directory
	file2Path := filepath.Join(tempDir, "renamed_track_in_other_subfolder.mp4")
	if err := os.WriteFile(file2Path, data, 0644); err != nil {
		t.Fatalf("failed to write test file 2: %v", err)
	}

	fp2, err := ComputeFingerprint(file2Path)
	if err != nil {
		t.Fatalf("failed to compute fingerprint 2: %v", err)
	}

	if fp1 != fp2 {
		t.Fatalf("expected identical fingerprints for identical file contents even with different names, got fp1=%s, fp2=%s", fp1, fp2)
	}

	// Test with modified content
	dataModified := make([]byte, 200*1024)
	copy(dataModified, data)
	dataModified[10] = 99 // modify a byte in head chunk
	file3Path := filepath.Join(tempDir, "modified.mp3")
	if err := os.WriteFile(file3Path, dataModified, 0644); err != nil {
		t.Fatalf("failed to write modified file: %v", err)
	}

	fp3, err := ComputeFingerprint(file3Path)
	if err != nil {
		t.Fatalf("failed to compute fingerprint 3: %v", err)
	}

	if fp1 == fp3 {
		t.Fatal("expected different fingerprints for modified file content")
	}
}
