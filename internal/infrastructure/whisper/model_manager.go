package whisper

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"go-audio-play/internal/domain/study"
	"go-audio-play/internal/infrastructure/storage"
)

var defaultModels = []study.ModelInfo{
	{
		ID:             "large-v3-turbo-q5_0",
		Name:           "Whisper Large-v3 Turbo Q5 (Khuyên dùng)",
		Description:    "Kiến trúc tối ưu 4 lớp giải mã. Tốc độ siêu nhanh, độ chính xác gần tương đương Large v3 gốc, nhận diện tốt nối âm và ngữ điệu.",
		SizeMB:         547,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
		Recommended:    true,
		RequiredVRAMMB: 2500,
		RequiredRAMMB:  4096,
		Params:         "809M",
		RelativeSpeed:  "~8x",
		AccuracyLevel:  "Xuất sắc (99%)",
	},
	{
		ID:             "base",
		Name:           "Whisper Base (Siêu nhẹ & Nhanh)",
		Description:    "Tốc độ xử lý chớp nhoáng, dung lượng nhỏ gọn, chạy nhẹ nhàng trên mọi máy tính và laptop văn phòng.",
		SizeMB:         142,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
		Recommended:    false,
		RequiredVRAMMB: 800,
		RequiredRAMMB:  2048,
		Params:         "74M",
		RelativeSpeed:  "~16x",
		AccuracyLevel:  "Khá (88%)",
	},
	{
		ID:             "small",
		Name:           "Whisper Small (Cân bằng)",
		Description:    "Cân bằng xuất sắc giữa thời gian giải mã và độ chính xác bắt chữ tiếng Anh thông dụng.",
		SizeMB:         466,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
		Recommended:    false,
		RequiredVRAMMB: 1500,
		RequiredRAMMB:  4096,
		Params:         "244M",
		RelativeSpeed:  "~6x",
		AccuracyLevel:  "Tốt (94%)",
	},
	{
		ID:             "large-v3-q5_0",
		Name:           "Whisper Large-v3 Q5 (Cao cấp)",
		Description:    "Độ chính xác tối đa cho các bài nghe IELTS khó, người nói giọng địa phương hoặc lẫn nhạc nền. Cần GPU rời hoặc CPU khỏe.",
		SizeMB:         1080,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin",
		Recommended:    false,
		RequiredVRAMMB: 5500,
		RequiredRAMMB:  8192,
		Params:         "1550M",
		RelativeSpeed:  "~1x",
		AccuracyLevel:  "Đỉnh cao (99.6%)",
	},
	{
		ID:             "tiny",
		Name:           "Whisper Tiny (Siêu tốc)",
		Description:    "Mô hình nhỏ nhất (~75MB). Tốc độ giải mã nhanh nhất, phù hợp lướt nhanh bài nghe.",
		SizeMB:         75,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
		Recommended:    false,
		RequiredVRAMMB: 400,
		RequiredRAMMB:  1024,
		Params:         "39M",
		RelativeSpeed:  "~32x",
		AccuracyLevel:  "Cơ bản (80%)",
	},
	{
		ID:             "medium",
		Name:           "Whisper Medium (Chuyên sâu)",
		Description:    "Khả năng bắt từ chuyên ngành tốt. Đòi hỏi cấu hình tầm trung trở lên.",
		SizeMB:         1530,
		URL:            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
		Recommended:    false,
		RequiredVRAMMB: 3500,
		RequiredRAMMB:  8192,
		Params:         "769M",
		RelativeSpeed:  "~2x",
		AccuracyLevel:  "Rất cao (97%)",
	},
}

// ModelManager handles downloading, tracking, and locating whisper.cpp models
type ModelManager struct {
	mu           sync.RWMutex
	modelsDir    string
	activeCancel map[string]chan struct{}
}

// NewModelManager initializes the model storage directory using smart path resolution
func NewModelManager() (*ModelManager, error) {
	modelsDir := storage.GetPrimaryModelsDir()
	if err := os.MkdirAll(modelsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create models directory: %w", err)
	}

	return &ModelManager{
		modelsDir:    modelsDir,
		activeCancel: make(map[string]chan struct{}),
	}, nil
}

// GetModels returns the list of supported models with download status and hardware match
func (m *ModelManager) GetModels() []study.ModelInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	hw := DetectHardware(m.modelsDir)

	result := make([]study.ModelInfo, len(defaultModels))
	for i, def := range defaultModels {
		item := def
		fileName := fmt.Sprintf("ggml-%s.bin", def.ID)

		// Check all potential model search locations
		if foundPath, found := storage.FindExistingModel(fileName); found {
			item.Downloaded = true
			item.FilePath = foundPath
		} else {
			item.Downloaded = false
			item.FilePath = ""
		}

		// Dynamically compute hardware compatibility
		match, tip := EvaluateModelMatch(item, hw)
		item.HardwareMatch = match
		item.HardwareTip = tip

		result[i] = item
	}

	return result
}

// GetModelPath returns the local path of a model if it exists
func (m *ModelManager) GetModelPath(modelID string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	fileName := fmt.Sprintf("ggml-%s.bin", modelID)
	if path, found := storage.FindExistingModel(fileName); found {
		return path, nil
	}

	// Try direct modelID if custom file
	if path, found := storage.FindExistingModel(modelID); found {
		return path, nil
	}

	return "", fmt.Errorf("model %s is not downloaded or found", modelID)
}

// DeleteModel removes a downloaded model file to free disk space
func (m *ModelManager) DeleteModel(modelID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	fileName := fmt.Sprintf("ggml-%s.bin", modelID)
	foundPath, found := storage.FindExistingModel(fileName)
	if !found {
		return fmt.Errorf("model file not found")
	}

	return os.Remove(foundPath)
}

// ImportLocalModel imports an existing .bin model from disk into the primary models directory
func (m *ModelManager) ImportLocalModel(srcFilePath string) (*study.ModelInfo, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	info, err := os.Stat(srcFilePath)
	if err != nil || info.IsDir() {
		return nil, fmt.Errorf("invalid model file: %w", err)
	}

	baseName := filepath.Base(srcFilePath)
	targetPath := filepath.Join(m.modelsDir, baseName)

	if srcFilePath != targetPath {
		in, err := os.Open(srcFilePath)
		if err != nil {
			return nil, err
		}
		defer in.Close()

		out, err := os.Create(targetPath)
		if err != nil {
			return nil, err
		}
		defer out.Close()

		if _, err := io.Copy(out, in); err != nil {
			return nil, err
		}
	}

	// Match ID from filename
	modelID := strings.TrimSuffix(baseName, ".bin")
	modelID = strings.TrimPrefix(modelID, "ggml-")

	return &study.ModelInfo{
		ID:          modelID,
		Name:        "Custom: " + baseName,
		Description: fmt.Sprintf("Mô hình tùy chỉnh import từ máy (Dung lượng: %d MB)", info.Size()/(1024*1024)),
		SizeMB:      int(info.Size() / (1024 * 1024)),
		Downloaded:  true,
		FilePath:    targetPath,
	}, nil
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
