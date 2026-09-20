package whisper

import (
	"regexp"
	"strings"

	"go-audio-play/internal/domain/study"
)

var (
	// Abbreviations to avoid false sentence breaks
	abbrevRegex = regexp.MustCompile(`(?i)\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e|no|u\.s|u\.k|st|approx)\.$`)
	// Sentence ending punctuation
	sentenceEndRegex = regexp.MustCompile(`[.!?]+["']?$`)
)

// WhisperJSONOutput represents the output structure produced by whisper-cli -ojf
type WhisperJSONOutput struct {
	Transcription []WhisperSegment `json:"transcription"`
}

type WhisperSegment struct {
	Text       string         `json:"text"`
	Timestamps WhisperTime    `json:"timestamps"`
	Offsets    WhisperOffsets `json:"offsets"`
	Tokens     []WhisperToken `json:"tokens"`
}

type WhisperTime struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type WhisperOffsets struct {
	From int64 `json:"from"` // milliseconds
	To   int64 `json:"to"`   // milliseconds
}

type WhisperToken struct {
	Text       string         `json:"text"`
	Timestamps WhisperTime    `json:"timestamps"`
	Offsets    WhisperOffsets `json:"offsets"`
	Prob       float64        `json:"p"`
}

// Segmenter processes whisper-cli output segments into high-quality learning sentences
type Segmenter struct{}

func NewSegmenter() *Segmenter {
	return &Segmenter{}
}

// ProcessSegments transforms raw whisper segments into clean, balanced study sentences
func (s *Segmenter) ProcessSegments(rawSegments []WhisperSegment) []study.Sentence {
	if len(rawSegments) == 0 {
		return []study.Sentence{}
	}

	var sentences []study.Sentence
	var currentWords []study.WordTiming
	var currentText strings.Builder
	var currentStartMs int64 = -1
	var currentEndMs int64 = 0

	finalizeSentence := func() {
		text := strings.TrimSpace(currentText.String())
		if text == "" || len(currentWords) == 0 {
			currentWords = nil
			currentText.Reset()
			currentStartMs = -1
			return
		}

		// Ensure valid time bounds
		if currentStartMs < 0 {
			currentStartMs = currentWords[0].StartMs
		}
		if currentEndMs <= currentStartMs {
			currentEndMs = currentWords[len(currentWords)-1].EndMs
		}

		// Safety check: if sentence is just 1 short word and previous sentence exists, merge with previous
		if len(sentences) > 0 && len(currentWords) <= 2 && (currentEndMs-currentStartMs) < 1200 {
			prevIdx := len(sentences) - 1
			sentences[prevIdx].Transcript += " " + text
			sentences[prevIdx].EndMs = currentEndMs
			sentences[prevIdx].Words = append(sentences[prevIdx].Words, currentWords...)
		} else {
			sentenceIndex := len(sentences) + 1
			sentences = append(sentences, study.Sentence{
				ID:         generateSentenceID(sentenceIndex),
				Index:      sentenceIndex,
				StartMs:    currentStartMs,
				EndMs:      currentEndMs,
				Transcript: text,
				Words:      currentWords,
			})
		}

		currentWords = nil
		currentText.Reset()
		currentStartMs = -1
		currentEndMs = 0
	}

	for _, seg := range rawSegments {
		segText := strings.TrimSpace(seg.Text)
		if segText == "" {
			continue
		}

		// If tokens exist with offsets, build words from tokens
		if len(seg.Tokens) > 0 {
			for _, tok := range seg.Tokens {
				cleanToken := strings.TrimSpace(tok.Text)
				if cleanToken == "" || strings.HasPrefix(cleanToken, "[_") {
					continue
				}

				if currentStartMs < 0 {
					currentStartMs = tok.Offsets.From
				}
				currentEndMs = tok.Offsets.To

				if currentText.Len() > 0 && !strings.HasPrefix(tok.Text, " ") && !strings.HasPrefix(tok.Text, "'") {
					currentText.WriteString(" ")
				} else if currentText.Len() > 0 && strings.HasPrefix(tok.Text, " ") {
					currentText.WriteString(" ")
				}
				currentText.WriteString(cleanToken)

				currentWords = append(currentWords, study.WordTiming{
					Text:       cleanToken,
					StartMs:    tok.Offsets.From,
					EndMs:      tok.Offsets.To,
					Confidence: tok.Prob,
				})

				// Check if this token terminates a sentence
				if isSentenceEnd(cleanToken) && len(currentWords) >= 3 {
					finalizeSentence()
				}
			}
		} else {
			// Fallback if tokens array was empty: treat segment as a unit
			if currentStartMs < 0 {
				currentStartMs = seg.Offsets.From
			}
			currentEndMs = seg.Offsets.To
			currentText.WriteString(segText)

			// Simple word approximation
			words := strings.Fields(segText)
			duration := seg.Offsets.To - seg.Offsets.From
			wordDur := duration / int64(max(1, len(words)))
			for i, w := range words {
				wStart := seg.Offsets.From + int64(i)*wordDur
				wEnd := wStart + wordDur
				currentWords = append(currentWords, study.WordTiming{
					Text:    w,
					StartMs: wStart,
					EndMs:   wEnd,
				})
			}

			finalizeSentence()
		}
	}

	// Finalize any trailing sentence
	if currentText.Len() > 0 {
		finalizeSentence()
	}

	// Post-processing: re-index IDs cleanly
	for i := range sentences {
		sentences[i].Index = i + 1
		sentences[i].ID = generateSentenceID(i + 1)
	}

	return sentences
}

func isSentenceEnd(word string) bool {
	if abbrevRegex.MatchString(word) {
		return false
	}
	return sentenceEndRegex.MatchString(word)
}

func generateSentenceID(index int) string {
	return strings.ReplaceAll(strings.TrimSpace(strings.ToLower(
		strings.ReplaceAll(
			strings.ReplaceAll(
				strings.ReplaceAll(
					strings.ReplaceAll(
						strings.ReplaceAll(
							string(rune('s'))+string(rune('_'))+padInt(index, 3),
							" ", ""),
						":", ""),
					"/", ""),
				"\\", ""),
			"-", "_"),
	)), " ", "")
}

func padInt(n int, width int) string {
	s := strings.TrimSpace(strings.ReplaceAll(string(rune('0'+n/100))+string(rune('0'+(n%100)/10))+string(rune('0'+n%10)), "\x00", ""))
	if len(s) < width {
		return strings.Repeat("0", width-len(s)) + s
	}
	return s
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
