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

	// Post-processing: deduplicate adjacent sentences and filter out hallucinations
	cleaned := make([]study.Sentence, 0, len(sentences))
	for _, s := range sentences {
		s.Transcript = strings.TrimSpace(s.Transcript)
		if s.Transcript == "" || s.EndMs <= s.StartMs {
			continue
		}

		if IsHallucination(s.Transcript) {
			continue
		}

		normCurr := NormalizeSentenceText(s.Transcript)
		// 0. Filter out standalone outro words like "thank you" / "thanks" lasting > 2.5s during silence
		if (normCurr == "thank you" || normCurr == "thanks" || normCurr == "thank you very much") && s.EndMs-s.StartMs > 2500 {
			continue
		}

		if len(cleaned) > 0 {
			prev := cleaned[len(cleaned)-1]
			normPrev := NormalizeSentenceText(prev.Transcript)

			// 1. Identical consecutive sentence text -> drop duplicate
			if normCurr != "" && normCurr == normPrev {
				continue
			}

			// 2. Fragment swallowed by previous sentence within 1.5s
			if strings.Contains(normPrev, normCurr) && s.EndMs <= prev.EndMs+1500 && len(strings.Fields(normCurr)) <= 3 {
				continue
			}
		}

		cleaned = append(cleaned, s)
	}

	// Re-index IDs cleanly
	for i := range cleaned {
		cleaned[i].Index = i + 1
		cleaned[i].ID = generateSentenceID(i + 1)
	}

	return cleaned
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

var knownHallucinations = []string{
	"thank you for watching",
	"thanks for watching",
	"thank you very much for watching",
	"please subscribe",
	"like and subscribe",
	"please like and subscribe",
	"don't forget to subscribe",
	"subscribe to my channel",
	"please leave a comment",
	"if you have any questions, please leave a comment",
	"leave a comment",
	"subtitles by",
	"subtitles by the amara.org community",
	"translated by",
	"transcribed by",
	"see you next time",
	"see you in the next video",
	"watch more videos",
	"bye bye",
	"bye-bye",
}

// NormalizeSentenceText removes punctuation and excess spacing for robust comparisons
func NormalizeSentenceText(text string) string {
	lower := strings.ToLower(text)
	var b strings.Builder
	for _, r := range lower {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' {
			b.WriteRune(' ')
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}

// IsHallucination identifies typical Whisper silence hallucination artifacts
func IsHallucination(text string) bool {
	norm := NormalizeSentenceText(text)
	if norm == "" {
		return true
	}

	// 1. Matches or contains known outro/silence hallucination phrases
	for _, h := range knownHallucinations {
		if strings.Contains(norm, NormalizeSentenceText(h)) {
			words := strings.Fields(norm)
			if len(words) <= 16 {
				return true
			}
		}
	}

	// 2. Pure sound tags like [music], (music), [applause]
	trimmed := strings.TrimSpace(text)
	if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
		(strings.HasPrefix(trimmed, "(") && strings.HasSuffix(trimmed, ")")) {
		inner := strings.ToLower(trimmed[1 : len(trimmed)-1])
		if strings.Contains(inner, "music") || strings.Contains(inner, "applause") ||
			strings.Contains(inner, "laughter") || strings.Contains(inner, "cheering") ||
			strings.Contains(inner, "silence") || strings.Contains(inner, "sigh") {
			return true
		}
	}

	// 3. Excessive repetition loop within a single sentence
	words := strings.Fields(norm)
	if len(words) >= 4 {
		// Single word loop: e.g. "bye bye bye bye"
		allSame := true
		for i := 1; i < len(words); i++ {
			if words[i] != words[0] {
				allSame = false
				break
			}
		}
		if allSame {
			return true
		}

		// 2-word phrase loop: e.g. "you know you know you know"
		if len(words)%2 == 0 && len(words) >= 6 {
			is2Loop := true
			w0, w1 := words[0], words[1]
			for i := 2; i < len(words); i += 2 {
				if words[i] != w0 || words[i+1] != w1 {
					is2Loop = false
					break
				}
			}
			if is2Loop {
				return true
			}
		}
	}

	return false
}
