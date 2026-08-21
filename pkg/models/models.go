package models

import "time"

// MediaType represents either audio or video
type MediaType string

const (
	MediaTypeAudio MediaType = "audio"
	MediaTypeVideo MediaType = "video"
)

// MediaFile represents a discovered media file
type MediaFile struct {
	ID          string    `json:"id"`          // Unique identifier / Fingerprint
	Fingerprint string    `json:"fingerprint"` // Chunk-hash based unique fingerprint
	Path        string    `json:"path"`        // Absolute file path
	Name        string    `json:"name"`        // Filename with extension
	Title       string    `json:"title"`       // Display title
	Ext         string    `json:"ext"`         // File extension (e.g. .mp3, .mp4)
	Type        MediaType `json:"type"`        // "audio" or "video"
	Size        int64     `json:"size"`        // Size in bytes
	ModTime     time.Time `json:"modTime"`     // Last modified time
	FolderRoot  string    `json:"folderRoot"`  // The root folder it was scanned from
	RelativeDir string    `json:"relativeDir"` // Relative path inside root folder
	Duration    float64   `json:"duration"`    // Duration in seconds (if parsed/cached)
	StreamURL   string    `json:"streamUrl"`   // HTTP stream URL from internal server

	// Playback State (populated from database)
	LastPosition float64   `json:"lastPosition"` // Last played position (seconds)
	TotalPlayed  float64   `json:"totalPlayed"`  // Total duration when saved
	Completed    bool      `json:"completed"`    // Whether user completed >95%
	LastPlayedAt time.Time `json:"lastPlayedAt"` // Timestamp when last played
	LoopA        float64   `json:"loopA"`        // Saved Loop A marker
	LoopB        float64   `json:"loopB"`        // Saved Loop B marker
}

// PlaybackState represents saved progress for a fingerprint
type PlaybackState struct {
	Fingerprint  string    `json:"fingerprint"`
	LastPath     string    `json:"lastPath"`
	LastPosition float64   `json:"lastPosition"`
	Duration     float64   `json:"duration"`
	Completed    bool      `json:"completed"`
	LastPlayedAt time.Time `json:"lastPlayedAt"`
	LoopA        float64   `json:"loopA"`
	LoopB        float64   `json:"loopB"`
}

// AppSettings represents user-configurable preferences
type AppSettings struct {
	Folders           []string `json:"folders"`           // Monitored folder directories
	JumpSeconds       float64  `json:"jumpSeconds"`       // Fast forward / backward delta (default: 5s)
	SlowSpeed         float64  `json:"slowSpeed"`         // Speed when holding key (default: 0.5)
	HoldSlowKey       string   `json:"holdSlowKey"`       // Key to hold (default: "KeyS" or "ShiftLeft")
	DefaultSpeed      float64  `json:"defaultSpeed"`      // Default normal playback speed (default: 1.0)
	AutoPlayNext      bool     `json:"autoPlayNext"`      // Auto play next file in playlist
	AutoResume        bool     `json:"autoResume"`        // Auto resume from last position on file load
	Theme             string   `json:"theme"`             // "dark" or "light"
	Volume            float64  `json:"volume"`            // Volume level (0.0 to 1.0)
	ShowSubtitles     bool     `json:"showSubtitles"`     // Enable subtitles if available
	ABLoopAutoRestart bool     `json:"abLoopAutoRestart"` // Loop seamlessly
}

// DefaultSettings returns sensible defaults
func DefaultSettings() AppSettings {
	return AppSettings{
		Folders:           []string{},
		JumpSeconds:       5.0,
		SlowSpeed:         0.5,
		HoldSlowKey:       "KeyS",
		DefaultSpeed:      1.0,
		AutoPlayNext:      false,
		AutoResume:        true,
		Theme:             "dark",
		Volume:            0.9,
		ShowSubtitles:     true,
		ABLoopAutoRestart: true,
	}
}

// ScanProgress represents real-time scanning progress
type ScanProgress struct {
	TotalFolders int    `json:"totalFolders"`
	ScannedFiles int    `json:"scannedFiles"`
	FoundMedia   int    `json:"foundMedia"`
	CurrentPath  string `json:"currentPath"`
	IsScanning   bool   `json:"isScanning"`
}
