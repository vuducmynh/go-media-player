package whisper

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"go-audio-play/internal/domain/study"
)

var (
	progressRegex = regexp.MustCompile(`progress\s*=\s*(\d+)%`)
	sentenceRegex = regexp.MustCompile(`\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]\s*(.+)`)
)

type Engine struct {
	mu           sync.Mutex
	cliPath      string
	binDir       string
	segmenter    *Segmenter
	modelManager *ModelManager
}

// NewEngine initializes the whisper.cpp native engine
func NewEngine(modelManager *ModelManager) (*Engine, error) {
	appDataDir, err := os.UserConfigDir()
	if err != nil {
		appDataDir = "."
	}
	binDir := filepath.Join(appDataDir, "GoAudioPlay", "bin")
	_ = os.MkdirAll(binDir, 0755)

	e := &Engine{
		binDir:       binDir,
		segmenter:    NewSegmenter(),
		modelManager: modelManager,
	}

	// Locate or prepare whisper-cli binary
	_ = e.EnsureCLI()

	return e, nil
}

// EnsureCLI ensures whisper-cli.exe is present, downloading prebuilt release if missing
func (e *Engine) EnsureCLI() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// 1. Check in AppData/GoAudioPlay/bin/
	appDataCLI := filepath.Join(e.binDir, "whisper-cli.exe")
	if _, err := os.Stat(appDataCLI); err == nil {
		e.cliPath = appDataCLI
		return nil
	}

	// 2. Check in current directory or relative bin/
	localCLI := filepath.Join("bin", "whisper-cli.exe")
	if _, err := os.Stat(localCLI); err == nil {
		e.cliPath = localCLI
		return nil
	}

	// 3. Check system PATH
	if path, err := exec.LookPath("whisper-cli"); err == nil {
		e.cliPath = path
		return nil
	}

	// 4. Download prebuilt Windows x64 binary (~8.5 MB)
	zipURL := "https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip"
	tempZip := filepath.Join(e.binDir, "whisper-bin-x64.zip")

	resp, err := http.Get(zipURL)
	if err != nil {
		return fmt.Errorf("download whisper-cli failed: %w", err)
	}
	defer resp.Body.Close()

	out, err := os.Create(tempZip)
	if err != nil {
		return fmt.Errorf("create zip file failed: %w", err)
	}
	_, err = io.Copy(out, resp.Body)
	_ = out.Close()
	if err != nil {
		_ = os.Remove(tempZip)
		return fmt.Errorf("save zip file failed: %w", err)
	}

	// Unzip
	if err := unzip(tempZip, e.binDir); err != nil {
		_ = os.Remove(tempZip)
		return fmt.Errorf("extract whisper zip failed: %w", err)
	}
	_ = os.Remove(tempZip)

	// Check if extracted into a subfolder like Release
	releaseCLI := filepath.Join(e.binDir, "Release", "whisper-cli.exe")
	if _, err := os.Stat(releaseCLI); err == nil {
		files, _ := os.ReadDir(filepath.Join(e.binDir, "Release"))
		for _, f := range files {
			_ = os.Rename(filepath.Join(e.binDir, "Release", f.Name()), filepath.Join(e.binDir, f.Name()))
		}
		_ = os.RemoveAll(filepath.Join(e.binDir, "Release"))
	}

	if _, err := os.Stat(appDataCLI); err == nil {
		e.cliPath = appDataCLI
		return nil
	}

	return fmt.Errorf("whisper-cli.exe could not be installed to %s", appDataCLI)
}

// ConvertTo16kHzWav converts any audio or video container to 16kHz 16-bit mono WAV using ffmpeg
func (e *Engine) ConvertTo16kHzWav(ctx context.Context, inputPath string) (string, error) {
	tempWav := filepath.Join(os.TempDir(), fmt.Sprintf("gap_whisper_%d.wav", time.Now().UnixNano()))

	cmd := exec.CommandContext(ctx, "ffmpeg", "-y", "-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tempWav)
	setHideWindow(cmd)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			_ = os.Remove(tempWav)
			return "", ctx.Err()
		}
		return "", fmt.Errorf("ffmpeg conversion failed: %w, log: %s", err, string(output))
	}

	return tempWav, nil
}

// Transcribe executes whisper-cli on the audio file and segments sentences with cancellation and live sentence streaming
func (e *Engine) Transcribe(
	ctx context.Context,
	audioPath string,
	modelID string,
	onProgress func(p study.TranscribeProgress),
) ([]study.Sentence, error) {
	if err := e.EnsureCLI(); err != nil {
		return nil, fmt.Errorf("whisper engine binary not available: %w", err)
	}

	modelPath, err := e.modelManager.GetModelPath(modelID)
	if err != nil {
		return nil, fmt.Errorf("model not available: %w", err)
	}

	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage: 3,
			Status:     "Đang chuẩn bị và tối ưu hóa tệp âm thanh...",
		})
	}

	// Ensure 16kHz WAV for optimal recognition
	wavPath := audioPath
	needsCleanup := false
	ext := strings.ToLower(filepath.Ext(audioPath))
	if ext != ".wav" {
		converted, err := e.ConvertTo16kHzWav(ctx, audioPath)
		if err != nil {
			return nil, err
		}
		wavPath = converted
		needsCleanup = true
		defer func() {
			if needsCleanup {
				_ = os.Remove(wavPath)
			}
		}()
	}

	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage: 8,
			Status:     "Đang nạp mô hình AI vào bộ nhớ RAM...",
		})
	}

	// Prepare temporary output path for whisper JSON output
	outBase := filepath.Join(os.TempDir(), fmt.Sprintf("whisper_out_%d", time.Now().UnixNano()))
	jsonFile := outBase + ".json"
	defer func() {
		_ = os.Remove(jsonFile)
	}()

	// Determine optimal processors and threads for user's CPU
	numCPU := runtime.NumCPU()
	processors := 1
	threads := numCPU

	if numCPU >= 8 {
		processors = 2
		threads = 4
	} else if numCPU >= 4 {
		processors = 1
		threads = numCPU
	}

	// Construct whisper-cli command:
	// -m: model path
	// -f: input file
	// -l: language (en)
	// -ojf: output full json with token timestamps
	// -of: output file basename
	// -pp: print progress
	// -p: parallel processors (splits audio into parallel chunks)
	// -t: threads per processor
	// -bs 1 -bo 1: greedy decoding (3x-5x faster on CPU than beam search, prevents freezing)
	// -fa: flash attention
	args := []string{
		"-m", modelPath,
		"-f", wavPath,
		"-l", "en",
		"-ojf",
		"-of", outBase,
		"-pp",
		"-p", strconv.Itoa(processors),
		"-t", strconv.Itoa(threads),
		"-bs", "1",
		"-bo", "1",
		"-fa",
	}

	cmd := exec.CommandContext(ctx, e.cliPath, args...)
	setHideWindow(cmd)

	// Combine stdout and stderr into a single pipe to prevent buffer deadlocks
	pr, pw := io.Pipe()
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		_ = pr.Close()
		_ = pw.Close()
		return nil, fmt.Errorf("start whisper-cli failed: %w", err)
	}

	var (
		sentenceCount   int
		recentSentences []string
		latestSentence  string
		currentRawProg  int
	)

	// Custom split function for scanner that splits on BOTH '\n' and '\r'
	splitOnNewlineOrCR := func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		for i, b := range data {
			if b == '\n' || b == '\r' {
				return i + 1, data[:i], nil
			}
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	}

	// Read lines concurrently
	scanDone := make(chan struct{})
	go func() {
		defer close(scanDone)
		scanner := bufio.NewScanner(pr)
		scanner.Split(splitOnNewlineOrCR)

		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}

			// 1. Check progress regex: progress = X%
			if match := progressRegex.FindStringSubmatch(line); len(match) > 1 {
				if p, err := strconv.Atoi(match[1]); err == nil {
					currentRawProg = p
					scaledPercent := 10 + int(float64(p)*0.82)
					if scaledPercent > 92 {
						scaledPercent = 92
					}
					if onProgress != nil {
						status := fmt.Sprintf("Đang nhận diện giọng nói... (%d%%)", p)
						if sentenceCount > 0 {
							status = fmt.Sprintf("Đang nhận diện giọng nói... (%d%% - Đã xong %d câu)", p, sentenceCount)
						}
						onProgress(study.TranscribeProgress{
							Percentage:      scaledPercent,
							Status:          status,
							LatestSentence:  latestSentence,
							SentenceCount:   sentenceCount,
							RecentSentences: recentSentences,
						})
					}
				}
			}

			// 2. Check live recognized sentence: [00:00:00.000 --> 00:00:02.500] Text
			if match := sentenceRegex.FindStringSubmatch(line); len(match) > 1 {
				rawText := strings.TrimSpace(match[1])
				if rawText != "" && !strings.HasPrefix(rawText, "[_") {
					sentenceCount++
					latestSentence = rawText
					item := fmt.Sprintf("%d. %s", sentenceCount, rawText)
					recentSentences = append(recentSentences, item)
					if len(recentSentences) > 8 {
						recentSentences = recentSentences[len(recentSentences)-8:]
					}

					if onProgress != nil {
						scaledPercent := 10 + int(float64(currentRawProg)*0.82)
						if scaledPercent < 12 {
							scaledPercent = 12
						}
						status := fmt.Sprintf("Đang nhận diện: Câu %d", sentenceCount)
						onProgress(study.TranscribeProgress{
							Percentage:      scaledPercent,
							Status:          status,
							LatestSentence:  latestSentence,
							SentenceCount:   sentenceCount,
							RecentSentences: recentSentences,
						})
					}
				}
			}
		}
	}()

	waitErr := cmd.Wait()
	_ = pw.Close()
	<-scanDone
	_ = pr.Close()

	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	if waitErr != nil {
		return nil, fmt.Errorf("whisper-cli execution failed: %w", waitErr)
	}

	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage:      95,
			Status:          "Đang gom nhóm cấu trúc câu học tập...",
			LatestSentence:  latestSentence,
			SentenceCount:   sentenceCount,
			RecentSentences: recentSentences,
		})
	}

	// Read generated JSON
	jsonData, err := os.ReadFile(jsonFile)
	if err != nil {
		return nil, fmt.Errorf("read whisper output json failed: %w", err)
	}

	var whisperOutput WhisperJSONOutput
	if err := json.Unmarshal(jsonData, &whisperOutput); err != nil {
		return nil, fmt.Errorf("parse whisper output json failed: %w", err)
	}

	// Process segments into learning sentences
	sentences := e.segmenter.ProcessSegments(whisperOutput.Transcription)

	if onProgress != nil {
		onProgress(study.TranscribeProgress{
			Percentage:      100,
			Status:          fmt.Sprintf("Hoàn thành! Đã tạo %d câu luyện nghe.", len(sentences)),
			SentenceCount:   len(sentences),
			RecentSentences: recentSentences,
		})
	}

	return sentences, nil
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			_ = outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		_ = outFile.Close()
		_ = rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

// GetGPUInfo detects NVIDIA GPU and checks if CUDA acceleration files are present
func (e *Engine) GetGPUInfo() study.GPUInfo {
	info := study.GPUInfo{}
	if runtime.GOOS != "windows" {
		return info
	}

	cmd := exec.Command("nvidia-smi", "--query-gpu=name", "--format=csv,noheader")
	setHideWindow(cmd)
	out, err := cmd.Output()
	if err == nil {
		name := strings.TrimSpace(string(out))
		if name != "" {
			info.HasNvidiaGPU = true
			info.GPUName = name
		}
	}

	// Check if CUDA DLLs or CUDA whisper-cli is installed in binDir
	cudaDLL := filepath.Join(e.binDir, "ggml-cuda.dll")
	cublasDLL := filepath.Join(e.binDir, "cublas64_12.dll")
	if _, err := os.Stat(cudaDLL); err == nil {
		info.GPUEnabled = true
	} else if _, err := os.Stat(cublasDLL); err == nil {
		info.GPUEnabled = true
	}

	return info
}

// DownloadGPUAcceleration downloads and extracts whisper-cublas-12.4.0-bin-x64.zip
func (e *Engine) DownloadGPUAcceleration(onProgress func(study.ModelDownloadProgress)) error {
	zipURL := "https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-cublas-12.4.0-bin-x64.zip"
	tempZip := filepath.Join(e.binDir, "whisper-cublas-12.4.0-bin-x64.zip")

	resp, err := http.Get(zipURL)
	if err != nil {
		return fmt.Errorf("download GPU package failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status: %s", resp.Status)
	}

	totalSize := resp.ContentLength
	out, err := os.Create(tempZip)
	if err != nil {
		return fmt.Errorf("create temp file failed: %w", err)
	}
	defer out.Close()

	var downloaded int64
	buf := make([]byte, 128*1024)
	lastUpdate := time.Now()
	var lastBytes int64

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := out.Write(buf[:n])
			if writeErr != nil {
				return fmt.Errorf("write error: %w", writeErr)
			}
			downloaded += int64(n)

			if time.Since(lastUpdate) >= 300*time.Millisecond && onProgress != nil {
				elapsed := time.Since(lastUpdate).Seconds()
				speed := int64(float64(downloaded-lastBytes) / elapsed)
				percent := float64(0)
				if totalSize > 0 {
					percent = float64(downloaded) / float64(totalSize) * 100
				}
				onProgress(study.ModelDownloadProgress{
					ModelID:          "gpu-cuda",
					DownloadedBytes:  downloaded,
					TotalBytes:       totalSize,
					Percentage:       percent,
					SpeedBytesPerSec: speed,
					Status:           "downloading",
				})
				lastUpdate = time.Now()
				lastBytes = downloaded
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return fmt.Errorf("download error: %w", readErr)
		}
	}

	_ = out.Close()

	if onProgress != nil {
		onProgress(study.ModelDownloadProgress{
			ModelID:     "gpu-cuda",
			Percentage:  100,
			Status:      "verifying",
		})
	}

	// Extract zip into binDir
	if err := unzip(tempZip, e.binDir); err != nil {
		_ = os.Remove(tempZip)
		return fmt.Errorf("extract GPU package failed: %w", err)
	}
	_ = os.Remove(tempZip)

	// Clean subfolder if extracted into Release/
	releaseDir := filepath.Join(e.binDir, "Release")
	if entries, err := os.ReadDir(releaseDir); err == nil {
		for _, entry := range entries {
			_ = os.Rename(filepath.Join(releaseDir, entry.Name()), filepath.Join(e.binDir, entry.Name()))
		}
		_ = os.RemoveAll(releaseDir)
	}

	if onProgress != nil {
		onProgress(study.ModelDownloadProgress{
			ModelID:    "gpu-cuda",
			Percentage: 100,
			Status:     "completed",
		})
	}

	return nil
}
