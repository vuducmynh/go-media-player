package application

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"go-audio-play/internal/domain/media"
	"go-audio-play/internal/infrastructure/storage"
)

type YouTubeService struct {
	store *storage.Store
}

func NewYouTubeService(store *storage.Store) *YouTubeService {
	return &YouTubeService{
		store: store,
	}
}

// Regex to capture YouTube 11-char Video ID
var (
	ytShortRegex  = regexp.MustCompile(`youtu\.be\/([a-zA-Z0-9_-]{11})`)
	ytWatchRegex  = regexp.MustCompile(`[?&]v=([a-zA-Z0-9_-]{11})`)
	ytEmbedRegex  = regexp.MustCompile(`youtube\.com\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})`)
	ytDirectRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{11}$`)
)

// ExtractVideoID extracts an 11-character YouTube video ID from any format
func (s *YouTubeService) ExtractVideoID(input string) (string, error) {
	clean := strings.TrimSpace(input)
	if clean == "" {
		return "", fmt.Errorf("đường dẫn YouTube không được để trống")
	}

	if ytDirectRegex.MatchString(clean) {
		return clean, nil
	}

	if match := ytShortRegex.FindStringSubmatch(clean); len(match) > 1 {
		return match[1], nil
	}
	if match := ytWatchRegex.FindStringSubmatch(clean); len(match) > 1 {
		return match[1], nil
	}
	if match := ytEmbedRegex.FindStringSubmatch(clean); len(match) > 1 {
		return match[1], nil
	}

	return "", fmt.Errorf("không tìm thấy YouTube Video ID hợp lệ từ liên kết")
}

type oEmbedResponse struct {
	Title        string `json:"title"`
	AuthorName   string `json:"author_name"`
	ThumbnailURL string `json:"thumbnail_url"`
}

// AddYouTubeVideo processes a YouTube URL, retrieves metadata and saves it into library
func (s *YouTubeService) AddYouTubeVideo(rawURL string) (*media.MediaItem, error) {
	videoID, err := s.ExtractVideoID(rawURL)
	if err != nil {
		return nil, err
	}

	canonicalURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	defaultThumb := fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", videoID)

	title := "YouTube Video (" + videoID + ")"
	author := "YouTube"
	thumbnail := defaultThumb

	// Query public YouTube oEmbed API for real title and author
	client := http.Client{Timeout: 4 * time.Second}
	oembedURL := fmt.Sprintf("https://www.youtube.com/oembed?url=%s&format=json", url.QueryEscape(canonicalURL))
	resp, err := client.Get(oembedURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var oembed oEmbedResponse
		if json.NewDecoder(resp.Body).Decode(&oembed) == nil {
			if oembed.Title != "" {
				title = oembed.Title
			}
			if oembed.AuthorName != "" {
				author = oembed.AuthorName
			}
			if oembed.ThumbnailURL != "" {
				thumbnail = oembed.ThumbnailURL
			}
		}
	}

	item := media.YouTubeItem{
		VideoID:   videoID,
		URL:       canonicalURL,
		Title:     title,
		Author:    author,
		Thumbnail: thumbnail,
		AddedAt:   time.Now(),
	}

	if err := s.store.SaveYouTubeVideo(item); err != nil {
		return nil, err
	}

	mediaItem := s.convertYouTubeToMediaItem(item)
	return &mediaItem, nil
}

// GetYouTubeMediaItems returns all saved YouTube videos as MediaItem instances with hydrated progress
func (s *YouTubeService) GetYouTubeMediaItems() []media.MediaItem {
	settings := s.store.GetSettings()
	allStates := s.store.GetAllPlaybackStates()

	var items []media.MediaItem
	for _, y := range settings.YouTubeVideos {
		m := s.convertYouTubeToMediaItem(y)
		if state, exists := allStates[m.Fingerprint]; exists {
			m.LastPosition = state.LastPosition
			m.Duration = state.Duration
			m.Completed = state.Completed
			m.LastPlayedAt = state.LastPlayedAt
			m.LoopA = state.LoopA
			m.LoopB = state.LoopB
		}
		items = append(items, m)
	}

	return items
}

// RemoveYouTubeVideo removes a YouTube video from library
func (s *YouTubeService) RemoveYouTubeVideo(videoID string) error {
	return s.store.RemoveYouTubeVideo(videoID)
}

func (s *YouTubeService) convertYouTubeToMediaItem(y media.YouTubeItem) media.MediaItem {
	fp := "yt_" + y.VideoID
	return media.MediaItem{
		ID:          fp,
		Fingerprint: fp,
		Source:      media.SourceTypeYouTube,
		Path:        y.URL,
		Name:        y.Title,
		Title:       y.Title,
		Ext:         "youtube",
		Type:        media.MediaTypeVideo,
		Size:        0,
		ModTime:     y.AddedAt,
		FolderRoot:  "YouTube",
		RelativeDir: y.Author,
		Duration:    y.Duration,
		StreamURL:   fmt.Sprintf("https://www.youtube-nocookie.com/embed/%s?enablejsapi=1&origin=http://localhost", y.VideoID),
		Thumbnail:   y.Thumbnail,
		YouTubeID:   y.VideoID,
	}
}
