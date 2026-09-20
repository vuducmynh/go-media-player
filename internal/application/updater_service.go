package application

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	CurrentAppVersion = "v1.1.2"
	GitHubRepo        = "vuducmynh/go-media-player"
	GitHubLatestAPI   = "https://api.github.com/repos/vuducmynh/go-media-player/releases/latest"
)

type UpdateInfo struct {
	HasUpdate      bool   `json:"hasUpdate"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseNotes   string `json:"releaseNotes"`
	AssetURL       string `json:"assetUrl"`
	AssetSize      int64  `json:"assetSize"`
	PublishedAt    string `json:"publishedAt"`
}

type DownloadProgress struct {
	Percent         int   `json:"percent"`
	DownloadedBytes int64 `json:"downloadedBytes"`
	TotalBytes      int64 `json:"totalBytes"`
}

type gitHubReleaseResponse struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	PublishedAt string `json:"published_at"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Size               int64  `json:"size"`
	} `json:"assets"`
}

type UpdaterService struct {
	httpClient *http.Client
}

func NewUpdaterService() *UpdaterService {
	return &UpdaterService{
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (s *UpdaterService) GetCurrentVersion() string {
	return CurrentAppVersion
}

// CompareSemanticVersions returns true if vLatest > vCurrent
func isNewerVersion(current, latest string) bool {
	cleanCur := strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(current), "v"), "V")
	cleanLat := strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(latest), "v"), "V")

	curParts := strings.Split(cleanCur, ".")
	latParts := strings.Split(cleanLat, ".")

	maxLen := len(curParts)
	if len(latParts) > maxLen {
		maxLen = len(latParts)
	}

	for i := 0; i < maxLen; i++ {
		curVal := 0
		if i < len(curParts) {
			curVal, _ = strconv.Atoi(curParts[i])
		}
		latVal := 0
		if i < len(latParts) {
			latVal, _ = strconv.Atoi(latParts[i])
		}

		if latVal > curVal {
			return true
		}
		if latVal < curVal {
			return false
		}
	}

	return false
}

// CheckUpdate checks GitHub Releases for a newer version
func (s *UpdaterService) CheckUpdate(ctx context.Context) (*UpdateInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", GitHubLatestAPI, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "GoAudioPlayer-Updater/"+CurrentAppVersion)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to check github release: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	var release gitHubReleaseResponse
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release json: %w", err)
	}

	hasUpdate := isNewerVersion(CurrentAppVersion, release.TagName)

	var targetAssetURL string
	var targetAssetSize int64

	// Look for go-audio-player.exe or go-audio-play.exe
	for _, asset := range release.Assets {
		lowerName := strings.ToLower(asset.Name)
		if strings.HasSuffix(lowerName, ".exe") && (strings.Contains(lowerName, "go-audio-player") || strings.Contains(lowerName, "go-audio-play")) {
			targetAssetURL = asset.BrowserDownloadURL
			targetAssetSize = asset.Size
			break
		}
	}

	// Fallback to any .exe asset if specific name is not found
	if targetAssetURL == "" {
		for _, asset := range release.Assets {
			if strings.HasSuffix(strings.ToLower(asset.Name), ".exe") {
				targetAssetURL = asset.BrowserDownloadURL
				targetAssetSize = asset.Size
				break
			}
		}
	}

	info := &UpdateInfo{
		HasUpdate:      hasUpdate,
		CurrentVersion: CurrentAppVersion,
		LatestVersion:  release.TagName,
		ReleaseNotes:   release.Body,
		AssetURL:       targetAssetURL,
		AssetSize:      targetAssetSize,
		PublishedAt:    release.PublishedAt,
	}

	return info, nil
}

// DownloadUpdate streams the executable file with progress callback
func (s *UpdaterService) DownloadUpdate(ctx context.Context, assetURL string, onProgress func(p DownloadProgress)) error {
	if assetURL == "" {
		return fmt.Errorf("asset URL is empty")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", assetURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create download request: %w", err)
	}

	req.Header.Set("User-Agent", "GoAudioPlayer-Updater/"+CurrentAppVersion)

	// Use custom client without short timeout for large downloads
	downloadClient := &http.Client{
		Timeout: 30 * time.Minute,
	}

	resp, err := downloadClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download asset: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	totalBytes := resp.ContentLength

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	downloadPath := filepath.Join(filepath.Dir(exePath), "go-audio-player.exe.download")

	// Create destination file
	out, err := os.Create(downloadPath)
	if err != nil {
		return fmt.Errorf("failed to create download temp file: %w", err)
	}
	defer out.Close()

	buffer := make([]byte, 64*1024) // 64KB buffer
	var downloadedBytes int64
	var lastReportedPercent int = -1

	for {
		select {
		case <-ctx.Done():
			out.Close()
			os.Remove(downloadPath)
			return ctx.Err()
		default:
		}

		n, readErr := resp.Body.Read(buffer)
		if n > 0 {
			if _, writeErr := out.Write(buffer[:n]); writeErr != nil {
				return fmt.Errorf("failed to write to file: %w", writeErr)
			}
			downloadedBytes += int64(n)

			if totalBytes > 0 {
				percent := int(float64(downloadedBytes) / float64(totalBytes) * 100)
				if percent != lastReportedPercent {
					lastReportedPercent = percent
					if onProgress != nil {
						onProgress(DownloadProgress{
							Percent:         percent,
							DownloadedBytes: downloadedBytes,
							TotalBytes:      totalBytes,
						})
					}
				}
			}
		}

		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return fmt.Errorf("error reading response stream: %w", readErr)
		}
	}

	// Final 100% progress report
	if onProgress != nil {
		onProgress(DownloadProgress{
			Percent:         100,
			DownloadedBytes: downloadedBytes,
			TotalBytes:      totalBytes,
		})
	}

	return nil
}

// ApplyUpdate renames the running executable to .old and moves .download to current executable
func (s *UpdaterService) ApplyUpdate() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current executable path: %w", err)
	}

	exeDir := filepath.Dir(exePath)
	downloadPath := filepath.Join(exeDir, "go-audio-player.exe.download")

	if _, err := os.Stat(downloadPath); os.IsNotExist(err) {
		return fmt.Errorf("downloaded update file does not exist at %s", downloadPath)
	}

	oldPath := exePath + ".old"
	// Remove any existing .old file
	_ = os.Remove(oldPath)

	// Step 1: Rename current running executable to .old
	if err := os.Rename(exePath, oldPath); err != nil {
		return fmt.Errorf("failed to rename current executable to .old: %w", err)
	}

	// Step 2: Rename downloaded file to original executable name
	if err := os.Rename(downloadPath, exePath); err != nil {
		// Rollback rename if moving downloaded file failed
		_ = os.Rename(oldPath, exePath)
		return fmt.Errorf("failed to replace executable: %w", err)
	}

	return nil
}

// RestartApp launches the new executable and terminates the current process
func (s *UpdaterService) RestartApp() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current executable path: %w", err)
	}

	cmd := exec.Command(exePath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start new app process: %w", err)
	}

	// Give a slight moment for child process to spawn, then exit cleanly
	go func() {
		time.Sleep(200 * time.Millisecond)
		os.Exit(0)
	}()

	return nil
}

// CleanupOldVersion removes any leftover .old files from previous update
func (s *UpdaterService) CleanupOldVersion() {
	exePath, err := os.Executable()
	if err != nil {
		return
	}

	oldPath := exePath + ".old"
	if _, err := os.Stat(oldPath); err == nil {
		_ = os.Remove(oldPath)
	}
}
