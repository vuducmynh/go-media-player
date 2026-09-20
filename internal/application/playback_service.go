package application

import (
	"go-audio-play/internal/domain/playback"
	"go-audio-play/internal/infrastructure/storage"
)

type PlaybackService struct {
	store *storage.Store
}

func NewPlaybackService(store *storage.Store) *PlaybackService {
	return &PlaybackService{
		store: store,
	}
}

// SavePlaybackProgress saves playback position, completion status, and A-B loop points
func (s *PlaybackService) SavePlaybackProgress(fingerprint string, path string, position float64, duration float64, loopA float64, loopB float64) error {
	if s.store == nil || fingerprint == "" {
		return nil
	}

	completed := false
	if duration > 0 && position >= (duration*0.95) {
		completed = true
	}

	state := playback.PlaybackState{
		Fingerprint:  fingerprint,
		LastPath:     path,
		LastPosition: position,
		Duration:     duration,
		Completed:    completed,
		LoopA:        loopA,
		LoopB:        loopB,
	}

	return s.store.SavePlaybackState(state)
}

// ClearPlaybackProgress removes playback progress for a fingerprint
func (s *PlaybackService) ClearPlaybackProgress(fingerprint string) error {
	if s.store == nil || fingerprint == "" {
		return nil
	}
	return s.store.DeletePlaybackState(fingerprint)
}

// ClearAllPlaybackProgress removes all playback progress
func (s *PlaybackService) ClearAllPlaybackProgress() error {
	if s.store == nil {
		return nil
	}
	return s.store.ClearAllPlaybackStates()
}
