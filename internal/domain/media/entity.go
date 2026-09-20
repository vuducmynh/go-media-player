package media

import "time"

// SourceType defines where the media originates from
type SourceType string

const (
	SourceTypeLocal   SourceType = "local"
	SourceTypeYouTube SourceType = "youtube"
)

// MediaType represents either audio or video
type MediaType string

const (
	MediaTypeAudio MediaType = "audio"
	MediaTypeVideo MediaType = "video"
)

// MediaItem represents a unified media entity (Local file or YouTube video)
type MediaItem struct {
	ID          string     `json:"id"`          // Unique identifier / Fingerprint
	Fingerprint string     `json:"fingerprint"` // Chunk-hash for local, yt_<id> for YouTube
	Source      SourceType `json:"source"`      // "local" or "youtube"
	Path        string     `json:"path"`        // Absolute file path or YouTube URL
	Name        string     `json:"name"`        // Filename or video title
	Title       string     `json:"title"`       // Display title
	Ext         string     `json:"ext"`         // Extension (e.g. .mp3, .mp4, yt)
	Type        MediaType  `json:"type"`        // "audio" or "video"
	Size        int64      `json:"size"`        // Size in bytes (0 for online streams)
	ModTime     time.Time  `json:"modTime"`     // Last modified or added time
	FolderRoot  string     `json:"folderRoot"`  // The root folder or "YouTube"
	RelativeDir string     `json:"relativeDir"` // Relative path inside root folder
	Duration    float64    `json:"duration"`    // Duration in seconds
	StreamURL   string     `json:"streamUrl"`   // HTTP stream URL or YouTube embed URL
	Thumbnail   string     `json:"thumbnail"`   // Thumbnail URL (especially for YouTube)
	YouTubeID   string     `json:"youtubeId"`   // YouTube Video ID (11 chars)

	// Playback State (hydrated from persistence)
	LastPosition float64   `json:"lastPosition"` // Last played position (seconds)
	TotalPlayed  float64   `json:"totalPlayed"`  // Total duration when saved
	Completed    bool      `json:"completed"`    // Whether completed (>95%)
	LastPlayedAt time.Time `json:"lastPlayedAt"` // Timestamp when last played
	LoopA        float64   `json:"loopA"`        // Saved Loop A marker
	LoopB        float64   `json:"loopB"`        // Saved Loop B marker
}

// YouTubeItem represents a saved YouTube bookmark/video
type YouTubeItem struct {
	VideoID     string    `json:"videoId"`     // YouTube 11-char ID
	URL         string    `json:"url"`         // Original URL
	Title       string    `json:"title"`       // Video Title
	Author      string    `json:"author"`      // Channel / Author name
	Thumbnail   string    `json:"thumbnail"`   // Thumbnail image URL
	Duration    float64   `json:"duration"`    // Duration in seconds
	AddedAt     time.Time `json:"addedAt"`     // Timestamp added
}
