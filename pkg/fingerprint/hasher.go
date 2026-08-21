package fingerprint

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

const (
	ChunkSize = 64 * 1024 // 64KB chunk
)

// ComputeFingerprint computes a fast, robust, unique fingerprint for any file
// based on its exact size and sampled chunks (head, middle, tail).
func ComputeFingerprint(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open file failed: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return "", fmt.Errorf("stat file failed: %w", err)
	}

	size := stat.Size()
	hasher := sha256.New()

	// 1. Write file size to hash
	sizeBuf := make([]byte, 8)
	binary.BigEndian.PutUint64(sizeBuf, uint64(size))
	hasher.Write(sizeBuf)

	// If file is small, read entirely
	if size <= ChunkSize*3 {
		if _, err := io.Copy(hasher, file); err != nil {
			return "", fmt.Errorf("read full file failed: %w", err)
		}
		return "fp_" + hex.EncodeToString(hasher.Sum(nil)), nil
	}

	// 2. Read Head chunk (first 64KB)
	headBuf := make([]byte, ChunkSize)
	if _, err := file.ReadAt(headBuf, 0); err != nil && err != io.EOF {
		return "", fmt.Errorf("read head chunk failed: %w", err)
	}
	hasher.Write(headBuf)

	// 3. Read Middle chunk (64KB at center)
	midOffset := (size - ChunkSize) / 2
	midBuf := make([]byte, ChunkSize)
	if _, err := file.ReadAt(midBuf, midOffset); err != nil && err != io.EOF {
		return "", fmt.Errorf("read mid chunk failed: %w", err)
	}
	hasher.Write(midBuf)

	// 4. Read Tail chunk (last 64KB)
	tailOffset := size - ChunkSize
	tailBuf := make([]byte, ChunkSize)
	if _, err := file.ReadAt(tailBuf, tailOffset); err != nil && err != io.EOF {
		return "", fmt.Errorf("read tail chunk failed: %w", err)
	}
	hasher.Write(tailBuf)

	return "fp_" + hex.EncodeToString(hasher.Sum(nil)), nil
}
