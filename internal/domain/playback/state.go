package playback

import "time"

// PlaybackState represents saved progress for any media fingerprint (Local or YouTube)
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

// ProgressUpdate represents a request to update progress
type ProgressUpdate struct {
	Fingerprint string
	Path        string
	Position    float64
	Duration    float64
	LoopA       float64
	LoopB       float64
}
