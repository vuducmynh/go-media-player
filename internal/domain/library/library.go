package library

import "go-audio-play/internal/domain/media"

// AppSettings represents user-configurable preferences
type AppSettings struct {
	Folders           []string            `json:"folders"`           // Monitored folder directories
	ActiveFolder      string              `json:"activeFolder"`      // Currently selected active folder
	YouTubeVideos     []media.YouTubeItem `json:"youtubeVideos"`     // Saved YouTube videos list
	JumpSeconds       float64             `json:"jumpSeconds"`       // Fast forward / backward delta (default: 5s)
	SlowSpeed         float64             `json:"slowSpeed"`         // Speed when holding key (default: 0.5)
	HoldSlowKey       string              `json:"holdSlowKey"`       // Key to hold (default: "KeyS")
	DefaultSpeed      float64             `json:"defaultSpeed"`      // Default normal playback speed (default: 1.0)
	AutoPlayNext      bool                `json:"autoPlayNext"`      // Auto play next file in playlist
	AutoResume        bool                `json:"autoResume"`        // Auto resume from last position on file load
	Theme             string              `json:"theme"`             // "dark" or "light"
	Volume            float64             `json:"volume"`            // Volume level (0.0 to 1.0)
	ShowSubtitles     bool                `json:"showSubtitles"`     // Enable subtitles if available
	ABLoopAutoRestart bool                `json:"abLoopAutoRestart"` // Loop seamlessly
}

// DefaultSettings returns sensible defaults
func DefaultSettings() AppSettings {
	return AppSettings{
		Folders:           []string{},
		ActiveFolder:      "",
		YouTubeVideos:     []media.YouTubeItem{},
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
