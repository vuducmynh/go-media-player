package study

import (
	"time"

	"go-audio-play/internal/domain/media"
)

// Lesson represents an entire study lesson segmented into learning sentences
type Lesson struct {
	ID          string           `json:"id"`
	Fingerprint string           `json:"fingerprint"`
	Title       string           `json:"title"`
	Source      media.SourceType `json:"source"`
	DurationMs  int64            `json:"durationMs"`
	Sentences   []Sentence       `json:"sentences"`
	ProcessedBy string           `json:"processedBy"`
	Progress    LessonProgress   `json:"progress"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

// Sentence represents a single sentence learning unit
type Sentence struct {
	ID                   string             `json:"id"`
	Index                int                `json:"index"`
	StartMs              int64              `json:"startMs"`
	EndMs                int64              `json:"endMs"`
	Transcript           string             `json:"transcript"`
	Words                []WordTiming       `json:"words,omitempty"`
	Starred              bool               `json:"starred"`
	MarkedDifficult      bool               `json:"markedDifficult"`
	BestIndependentScore *float64           `json:"bestIndependentScore,omitempty"`
	BestAssistedScore    *float64           `json:"bestAssistedScore,omitempty"`
	LatestScore          *float64           `json:"latestScore,omitempty"`
	DictationAttempts    []DictationAttempt `json:"dictationAttempts,omitempty"`
	TranscriptRevealed   bool               `json:"transcriptRevealed"`
	ShadowCompleted      bool               `json:"shadowCompleted"`
}

// WordTiming represents word-level timestamp information from ASR
type WordTiming struct {
	Text       string  `json:"text"`
	StartMs    int64   `json:"startMs"`
	EndMs      int64   `json:"endMs"`
	Confidence float64 `json:"confidence,omitempty"`
}

// DictationAttempt represents a student's attempt to transcribe a sentence
type DictationAttempt struct {
	ID                  string     `json:"id"`
	SentenceID          string     `json:"sentenceId"`
	Answer              string     `json:"answer"`
	Score               float64    `json:"score"`
	MatchedWords        int        `json:"matchedWords"`
	TotalWords          int        `json:"totalWords"`
	TranscriptWasVisible bool       `json:"transcriptWasVisible"`
	AssessmentType      string     `json:"assessmentType"` // "independent" or "assisted"
	Diff                []WordDiff `json:"diff,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
}

// WordDiff represents word-level comparison between reference and user input
type WordDiff struct {
	Type      string `json:"type"` // "correct", "substitution", "deletion", "insertion"
	Reference string `json:"reference,omitempty"`
	Answer    string `json:"answer,omitempty"`
}

// LessonProgress tracks guided learning state and position
type LessonProgress struct {
	GuidedStage          string   `json:"guidedStage"` // "listen", "dictation", "shadow", "review"
	CurrentSentenceID    string   `json:"currentSentenceId"`
	SessionStartIndex    int      `json:"sessionStartIndex"`
	SessionEndIndex      int      `json:"sessionEndIndex"`
	CompletedSentenceIDs []string `json:"completedSentenceIds"`
}

// ModelInfo describes a downloadable speech recognition model
type ModelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	SizeMB      int    `json:"sizeMb"`
	Downloaded  bool   `json:"downloaded"`
	FilePath    string `json:"filePath,omitempty"`
	URL         string `json:"url"`
	Recommended bool   `json:"recommended"`
}

// ModelDownloadProgress reports download percentage in real-time
type ModelDownloadProgress struct {
	ModelID          string  `json:"modelId"`
	DownloadedBytes  int64   `json:"downloadedBytes"`
	TotalBytes       int64   `json:"totalBytes"`
	Percentage       float64 `json:"percentage"`
	SpeedBytesPerSec int64   `json:"speedBytesPerSec"`
	Status           string  `json:"status"` // "downloading", "verifying", "completed", "error"
	ErrorMessage     string  `json:"errorMessage,omitempty"`
}

// TranscribeProgress reports speech recognition percentage and live recognized sentences
type TranscribeProgress struct {
	Percentage      int      `json:"percentage"`
	Status          string   `json:"status"`
	LatestSentence  string   `json:"latestSentence,omitempty"`
	SentenceCount   int      `json:"sentenceCount"`
	RecentSentences []string `json:"recentSentences,omitempty"`
}

