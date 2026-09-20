package whisper

import (
	"bufio"
	"context"
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

	"go-audio-play/internal/infrastructure/storage"
)

var (
	ytDownloadPercentRegex = regexp.MustCompile(`\[download\]\s+([0-9.]+)%`)
)

type YtDlpDownloader struct {
	mu sync.Mutex
}

func NewYtDlpDownloader() *YtDlpDownloader {
	return &YtDlpDownloader{}
}

// EnsureYtDlp ensures yt-dlp.exe is available on the host system
func (y *YtDlpDownloader) EnsureYtDlp() (string, error) {
	y.mu.Lock()
	defer y.mu.Unlock()

	// 1. Check existing binary in all search dirs or system PATH
	if p, found := storage.FindExistingBinary("yt-dlp.exe"); found {
		return p, nil
	}
	if p, err := exec.LookPath("yt-dlp.exe"); err == nil {
		return p, nil
	}
	if p, err := exec.LookPath("yt-dlp"); err == nil {
		return p, nil
	}

	// 2. Download official Windows x64 release from GitHub
	binDir := storage.GetPrimaryBinDir()
	_ = os.MkdirAll(binDir, 0755)
	destPath := filepath.Join(binDir, "yt-dlp.exe")
	tempPath := filepath.Join(binDir, "yt-dlp.exe.tmp")

	downloadURL := "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

	client := http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("không thể kết nối để tải yt-dlp: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("tải yt-dlp thất bại: server trả về HTTP %d", resp.StatusCode)
	}

	out, err := os.Create(tempPath)
	if err != nil {
		return "", fmt.Errorf("không thể tạo file tạm yt-dlp: %w", err)
	}

	_, err = io.Copy(out, resp.Body)
	_ = out.Close()
	if err != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("lỗi khi ghi file yt-dlp: %w", err)
	}

	if err := os.Rename(tempPath, destPath); err != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("lỗi khi cài đặt yt-dlp: %w", err)
	}

	return destPath, nil
}

// DownloadAudio extracts best audio from a YouTube video and saves to youtube_audio folder
func (y *YtDlpDownloader) DownloadAudio(
	ctx context.Context,
	videoID string,
	onProgress func(percent int, status string),
) (string, error) {
	audioDir := storage.GetYouTubeAudioDir()
	_ = os.MkdirAll(audioDir, 0755)

	// Check if already downloaded
	matches, _ := filepath.Glob(filepath.Join(audioDir, videoID+".*"))
	for _, m := range matches {
		info, err := os.Stat(m)
		if err == nil && !info.IsDir() && info.Size() > 1024*50 { // Valid audio > 50KB
			if onProgress != nil {
				onProgress(100, "Đã có sẵn tệp âm thanh trong bộ nhớ đệm")
			}
			return m, nil
		}
	}

	ytDlpPath, err := y.EnsureYtDlp()
	if err != nil {
		return "", err
	}

	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	outTemplate := filepath.Join(audioDir, "%(id)s.%(ext)s")

	// yt-dlp command: best audio, format m4a (or fallback), no playlist, non-interactive
	cmd := exec.CommandContext(
		ctx,
		ytDlpPath,
		"--no-playlist",
		"-f", "ba/b",
		"-x",
		"--audio-format", "m4a",
		"--output", outTemplate,
		"--no-warnings",
		"--newline",
		videoURL,
	)
	cmd.Stdin = nil
	setHideWindow(cmd)

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("không thể mở pipe stdout yt-dlp: %w", err)
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("không thể khởi chạy yt-dlp: %w", err)
	}

	scanner := bufio.NewScanner(stdoutPipe)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if match := ytDownloadPercentRegex.FindStringSubmatch(line); len(match) > 1 {
			if pct, err := strconv.ParseFloat(match[1], 64); err == nil && onProgress != nil {
				onProgress(int(pct), fmt.Sprintf("Đang tải âm thanh YouTube... %d%%", int(pct)))
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		if ctx.Err() != nil {
			return "", ctx.Err()
		}
		return "", fmt.Errorf("tải âm thanh YouTube thất bại: %w", err)
	}

	// Locate the downloaded file
	matches, _ = filepath.Glob(filepath.Join(audioDir, videoID+".*"))
	for _, m := range matches {
		info, err := os.Stat(m)
		if err == nil && !info.IsDir() && info.Size() > 1024*50 {
			return m, nil
		}
	}

	return "", fmt.Errorf("không tìm thấy tệp âm thanh sau khi tải từ YouTube")
}

// DeleteAudio deletes cached audio file for a given video ID
func (y *YtDlpDownloader) DeleteAudio(videoID string) {
	audioDir := storage.GetYouTubeAudioDir()
	matches, _ := filepath.Glob(filepath.Join(audioDir, videoID+".*"))
	for _, m := range matches {
		_ = os.Remove(m)
	}
}
