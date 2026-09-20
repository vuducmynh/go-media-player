package whisper

import (
	"archive/zip"
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"go-audio-play/internal/domain/study"
)

var progressRegex = regexp.MustCompile(`progress\s*=\s*(\d+)%`)

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
func (e *Engine) ConvertTo16kHzWav(inputPath string) (string, error) {
	tempWav := filepath.Join(os.TempDir(), fmt.Sprintf("gap_whisper_%d.wav", time.Now().UnixNano()))

	cmd := exec.Command("ffmpeg", "-y", "-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tempWav)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("ffmpeg conversion failed: %w, log: %s", err, string(output))
	}

	return tempWav, nil
}

// Transcribe executes whisper-cli on the audio file and segments sentences
func (e *Engine) Transcribe(audioPath string, modelID string, onProgress func(percent int)) ([]study.Sentence, error) {
	if err := e.EnsureCLI(); err != nil {
		return nil, fmt.Errorf("whisper engine binary not available: %w", err)
	}

	modelPath, err := e.modelManager.GetModelPath(modelID)
	if err != nil {
		return nil, fmt.Errorf("model not available: %w", err)
	}

	// Ensure 16kHz WAV for optimal recognition
	wavPath := audioPath
	needsCleanup := false
	ext := strings.ToLower(filepath.Ext(audioPath))
	if ext != ".wav" {
		converted, err := e.ConvertTo16kHzWav(audioPath)
		if err == nil {
			wavPath = converted
			needsCleanup = true
			defer func() {
				if needsCleanup {
					_ = os.Remove(wavPath)
				}
			}()
		}
	}

	// Prepare temporary output path for whisper JSON output
	outBase := filepath.Join(os.TempDir(), fmt.Sprintf("whisper_out_%d", time.Now().UnixNano()))
	jsonFile := outBase + ".json"
	defer func() {
		_ = os.Remove(jsonFile)
	}()

	// Construct whisper-cli command
	// -m: model path
	// -f: input file
	// -l: language (en)
	// -ojf: output full json with token timestamps
	// -of: output file basename
	// -pp: print progress
	args := []string{
		"-m", modelPath,
		"-f", wavPath,
		"-l", "en",
		"-ojf",
		"-of", outBase,
		"-pp",
		"-t", "4",
	}

	cmd := exec.Command(e.cliPath, args...)

	// Read progress from stderr/stdout
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("open stderr pipe failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start whisper-cli failed: %w", err)
	}

	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		line := scanner.Text()
		if match := progressRegex.FindStringSubmatch(line); len(match) > 1 {
			if p, err := strconv.Atoi(match[1]); err == nil && onProgress != nil {
				onProgress(p)
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		return nil, fmt.Errorf("whisper-cli execution failed: %w", err)
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
