package whisper

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go-audio-play/internal/domain/study"
)

var defaultModels = []study.ModelInfo{
	{
		ID:          "large-v3-turbo-q5_0",
		Name:        "Whisper Large-v3 Turbo Q5 (Khuyên dùng)",
		Description: "Dung lượng ~547 MB. Siêu tốc, độ chính xác cao cho luyện nghe tiếng Anh, nối âm và ngữ điệu.",
		SizeMB:      547,
		URL:         "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
		Recommended: true,
	},
	{
		ID:          "base",
		Name:        "Whisper Base (Siêu nhẹ)",
		Description: "Dung lượng ~142 MB. Tốc độ rất nhanh, phù hợp máy cấu hình khiêm tốn hoặc thử nghiệm.",
		SizeMB:      142,
		URL:         "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
		Recommended: false,
	},
	{
		ID:          "large-v3-q5_0",
		Name:        "Whisper Large-v3 Q5 (Cao cấp)",
		Description: "Dung lượng ~1.1 GB. Độ chính xác tối đa cho mọi accent khó, cần máy có GPU rời hoặc RAM khỏe.",
		SizeMB:      1080,
		URL:         "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin",
		Recommended: false,
	},
}

// ModelManager handles downloading, tracking, and locating whisper.cpp models
type ModelManager struct {
	mu           sync.RWMutex
	modelsDir    string
	activeCancel map[string]chan struct{}
}

// NewModelManager initializes the model storage directory
func NewModelManager() (*ModelManager, error) {
	appDataDir, err := os.UserConfigDir()
	if err != nil {
		appDataDir = "."
	}
	modelsDir := filepath.Join(appDataDir, "GoAudioPlay", "models")
	if err := os.MkdirAll(modelsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create models directory: %w", err)
	}

	return &ModelManager{
		modelsDir:    modelsDir,
		activeCancel: make(map[string]chan struct{}),
	}, nil
}

// GetModels returns the list of supported models with download status
func (m *ModelManager) GetModels() []study.ModelInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]study.ModelInfo, len(defaultModels))
	for i, def := range defaultModels {
		item := def
		expectedPath := filepath.Join(m.modelsDir, fmt.Sprintf("ggml-%s.bin", def.ID))
		info, err := os.Stat(expectedPath)
		if err == nil && info.Size() > 0 {
			item.Downloaded = true
			item.FilePath = expectedPath
		} else {
			item.Downloaded = false
			item.FilePath = ""
		}
		result[i] = item
	}

	return result
}

// GetModelPath returns the local path of a model if it exists
func (m *ModelManager) GetModelPath(modelID string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	path := filepath.Join(m.modelsDir, fmt.Sprintf("ggml-%s.bin", modelID))
	info, err := os.Stat(path)
	if err != nil || info.Size() == 0 {
		return "", fmt.Errorf("model %s is not downloaded", modelID)
	}
	return path, nil
}

// DownloadModel downloads a model file with real-time progress callbacks and cancel support
func (m *ModelManager) DownloadModel(modelID string, onProgress func(study.ModelDownloadProgress)) error {
	var targetModel *study.ModelInfo
	for _, mod := range defaultModels {
		if mod.ID == modelID {
			targetModel = &mod
			break
		}
	}

	if targetModel == nil {
		return fmt.Errorf("unknown model id: %s", modelID)
	}

	m.mu.Lock()
	if _, exists := m.activeCancel[modelID]; exists {
		m.mu.Unlock()
		return fmt.Errorf("download already in progress for model: %s", modelID)
	}
	cancelChan := make(chan struct{})
	m.activeCancel[modelID] = cancelChan
	m.mu.Unlock()

	defer func() {
		m.mu.Lock()
		delete(m.activeCancel, modelID)
		m.mu.Unlock()
	}()

	targetPath := filepath.Join(m.modelsDir, fmt.Sprintf("ggml-%s.bin", modelID))
	partPath := targetPath + ".part"

	// Check existing partial size
	var existingBytes int64 = 0
	if fi, err := os.Stat(partPath); err == nil {
		existingBytes = fi.Size()
	}

	req, err := http.NewRequest("GET", targetModel.URL, nil)
	if err != nil {
		return fmt.Errorf("create download request failed: %w", err)
	}

	if existingBytes > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", existingBytes))
	}

	client := &http.Client{
		Timeout: 0, // No global timeout for large downloads
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		return fmt.Errorf("download server returned HTTP %d", resp.StatusCode)
	}

	totalBytes := resp.ContentLength
	if resp.StatusCode == http.StatusPartialContent {
		totalBytes += existingBytes
	} else if existingBytes > 0 && resp.StatusCode == http.StatusOK {
		// Server didn't honor range, start fresh
		existingBytes = 0
	}

	if totalBytes <= 0 {
		totalBytes = int64(targetModel.SizeMB) * 1024 * 1024
	}

	flags := os.O_CREATE | os.O_WRONLY
	if existingBytes > 0 && resp.StatusCode == http.StatusPartialContent {
		flags |= os.O_APPEND
	} else {
		flags |= os.O_TRUNC
	}

	outFile, err := os.OpenFile(partPath, flags, 0644)
	if err != nil {
		return fmt.Errorf("open target part file failed: %w", err)
	}
	defer outFile.Close()

	// Download loop with rate monitoring
	buf := make([]byte, 64*1024)
	downloaded := existingBytes
	lastReport := time.Now()
	lastBytes := downloaded

	for {
		select {
		case <-cancelChan:
			return fmt.Errorf("download cancelled by user")
		default:
		}

		n, rErr := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := outFile.Write(buf[:n]); wErr != nil {
				return fmt.Errorf("write file failed: %w", wErr)
			}
			downloaded += int64(n)
		}

		now := time.Now()
		elapsed := now.Sub(lastReport)
		if elapsed >= 300*time.Millisecond || rErr != nil {
			speed := int64(float64(downloaded-lastBytes) / elapsed.Seconds())
			percentage := float64(downloaded) / float64(totalBytes) * 100
			if percentage > 100 {
				percentage = 100
			}

			if onProgress != nil {
				onProgress(study.ModelDownloadProgress{
					ModelID:          modelID,
					DownloadedBytes:  downloaded,
					TotalBytes:       totalBytes,
					Percentage:       percentage,
					SpeedBytesPerSec: speed,
					Status:           "downloading",
				})
			}

			lastReport = now
			lastBytes = downloaded
		}

		if rErr != nil {
			if rErr == io.EOF {
				break
			}
			return fmt.Errorf("read stream failed: %w", rErr)
		}
	}

	_ = outFile.Close()

	// Atomic rename to final .bin file
	if err := os.Rename(partPath, targetPath); err != nil {
		return fmt.Errorf("finalize model file failed: %w", err)
	}

	if onProgress != nil {
		onProgress(study.ModelDownloadProgress{
			ModelID:          modelID,
			DownloadedBytes:  totalBytes,
			TotalBytes:       totalBytes,
			Percentage:       100,
			SpeedBytesPerSec: 0,
			Status:           "completed",
		})
	}

	return nil
}

// CancelDownload aborts an ongoing model download
func (m *ModelManager) CancelDownload(modelID string) {
	m.mu.RLock()
	ch, exists := m.activeCancel[modelID]
	m.mu.RUnlock()

	if exists {
		close(ch)
	}
}
