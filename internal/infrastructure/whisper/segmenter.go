package whisper

import (
	"regexp"
	"strings"
	"unicode"

	"go-audio-play/internal/domain/study"
)

var (
	// Abbreviations to avoid false sentence breaks
	abbrevRegex = regexp.MustCompile(`(?i)\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e|no|u\.s|u\.k|st|approx)\.$`)
	// Sentence ending punctuation
	sentenceEndRegex = regexp.MustCompile(`[.!?]+["']?$`)

	// Cleaning regexes for Whisper ASR artifacts
	spacesBeforePunctRegex = regexp.MustCompile(`\s+([,.:;?!])`)
	spacesAroundAposRegex  = regexp.MustCompile(`\b([A-Za-z]+)\s+['’]([A-Za-z]+)\b`)
	spacesOrdinalsRegex    = regexp.MustCompile(`(?i)\b(\d+)\s+(st|nd|rd|th)\b`)
	spacesHyphenRegex      = regexp.MustCompile(`\b([A-Za-z]+)\s+-\s+([A-Za-z]+)\b`)

	// Sub-word prefix clusters & bound morphemes
	subwordPrefixRegex = regexp.MustCompile(`(^|\s)(wr|kn|cl|cr|tr|bl|br|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|sw|wh|ch|Wr|Kn|Cl|Cr|Tr|Bl|Br|Fl|Fr|Gl|Gr|Pl|Pr|Sc|Sk|Sl|Sm|Sn|Sp|Sw|Wh|Ch|[b-hj-zB-HJ-Z])\s+([a-z]{2,})\b`)
	boundSuffixRegex   = regexp.MustCompile(`(?i)\b([a-zA-Z]{2,})\s+(ing|ed|ly|es|tion|sion|ment|ness|ible|ables|ish|ful|less|ize|ise)\b`)
	specialWordMergers = regexp.MustCompile(`(?i)\b(?:hes\s+itating|can\s+adian|CE\s+FR|Circle\s+Kand)\b`)
	danglingWordRegex  = regexp.MustCompile(`(?i)\b(?:my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so)\.["]?$`)
	danglingWordInline = regexp.MustCompile(`(?i)\b(my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so)\.\s+([a-zA-Z])`)

	// Punctuation spacing (selective: avoid inserting space inside numbers like 5.45, 10,000, 5:45)
	punctLetterSpacingRegex  = regexp.MustCompile(`([;?!])([A-Za-z0-9])`)
	colonLetterSpacingRegex  = regexp.MustCompile(`(:)([A-Za-z])`)
	commaLetterSpacingRegex  = regexp.MustCompile(`(,)([A-Za-z])`)
	periodLetterSpacingRegex = regexp.MustCompile(`(\.)([A-Za-z])`)
	periodCurrencyRegex      = regexp.MustCompile(`(\.)\s*([$€£¥₫])`)

	// Numbers, domains, and currency formatting
	brokenDecimalRegex   = regexp.MustCompile(`\b(\d+)\.\s+(\d+[a-zA-Z]*)\b`)
	brokenDomainRegex    = regexp.MustCompile(`(?i)\b([a-z0-9_-]+)\.\s*(com|net|org|io|edu|gov|co|uk|us|vn)\b`)
	currencyPrefixRegex  = regexp.MustCompile(`([a-zA-Z0-9])([$€£¥₫])`)
	currencySpacingRegex = regexp.MustCompile(`([$€£¥₫])\s+(\d)`)
	numberCommaSpacing   = regexp.MustCompile(`\b(\d{1,3}),\s+(\d{3})\b`)

	pronounIRegex        = regexp.MustCompile(`(?i)\b(i)(['’](?:m|ve|ll|d))?\b`)
	afterPunctRegex      = regexp.MustCompile(`([.!?]\s+)([a-z])`)
	properNounsRegex     = regexp.MustCompile(`(?i)\b(england|america|american|english|spanish|french|german|colorado|chicago|britain|british|hanoi|vietnam|vietnamese|obama)\b`)
	runonTransitionRegex = regexp.MustCompile(`\b([a-z]{2,})\s+((?:Now|It's|Then|So|Today|Here|We're|You're|Let's|This|That|There)\b)`)
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
		text := CleanTranscriptText(currentText.String())
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

		// Ensure sentence ends with terminating punctuation if missing
		if !sentenceEndRegex.MatchString(text) {
			text += "."
			if len(currentWords) > 0 {
				currentWords[len(currentWords)-1].Text += "."
			}
		}

		// Safety check: if sentence is just 1 short word and previous sentence exists, merge with previous
		if len(sentences) > 0 && len(currentWords) <= 2 && (currentEndMs-currentStartMs) < 1200 {
			prevIdx := len(sentences) - 1
			sentences[prevIdx].Transcript = CleanTranscriptText(sentences[prevIdx].Transcript + " " + text)
			sentences[prevIdx].EndMs = currentEndMs
			sentences[prevIdx].Words = append(sentences[prevIdx].Words, currentWords...)
		} else {
			sentenceIndex := len(sentences) + 1
			s := study.Sentence{
				ID:         generateSentenceID(sentenceIndex),
				Index:      sentenceIndex,
				StartMs:    currentStartMs,
				EndMs:      currentEndMs,
				Transcript: text,
				Words:      currentWords,
			}
			sentences = append(sentences, s)
		}

		currentWords = nil
		currentText.Reset()
		currentStartMs = -1
		currentEndMs = 0
	}

	for segIdx, seg := range rawSegments {
		segText := strings.TrimSpace(seg.Text)
		if segText == "" {
			continue
		}

		// If tokens exist with offsets, assemble BPE tokens into proper whole words
		if len(seg.Tokens) > 0 {
			for tokIdx, tok := range seg.Tokens {
				cleanToken := strings.TrimSpace(tok.Text)
				if cleanToken == "" || strings.HasPrefix(cleanToken, "[_") || strings.HasPrefix(cleanToken, "<|") {
					continue
				}

				nextTok := getNextToken(rawSegments, segIdx, tokIdx)

				if currentStartMs < 0 {
					currentStartMs = tok.Offsets.From
				}
				currentEndMs = tok.Offsets.To

				isWordStart := strings.HasPrefix(tok.Text, " ")
				isPunct := isPunctuationOnly(cleanToken)
				isContr := isContraction(cleanToken)

				prevEnd := int64(0)
				if len(currentWords) > 0 {
					prevEnd = currentWords[len(currentWords)-1].EndMs
				}
				gapMs := tok.Offsets.From - prevEnd

				prevWordText := ""
				if len(currentWords) > 0 {
					prevWordText = currentWords[len(currentWords)-1].Text
				}
				isPrevAcronym := len(prevWordText) > 0 && len(prevWordText) <= 3 && strings.ToUpper(prevWordText) == prevWordText && !isPunctuationOnly(prevWordText)
				isStandaloneWord := isCommonStandaloneWord(cleanToken)

				if isPunct {
					// Punctuation attaches directly without leading space (e.g. "Hello" + "." -> "Hello.")
					currentText.WriteString(cleanToken)
					if len(currentWords) > 0 {
						currentWords[len(currentWords)-1].Text += cleanToken
						currentWords[len(currentWords)-1].EndMs = tok.Offsets.To
					}
					// Check if this punctuation terminates a sentence (skip if next token is TLD or decimal continuation)
					if isSentenceEnd(cleanToken) && len(currentWords) >= 2 {
						if !isKnownTLD(nextTok) && !isDecimalContinuation(nextTok) {
							finalizeSentence()
						}
					}
				} else if isContr {
					// Contraction suffix attaches directly without space (e.g. "I" + "'m" -> "I'm")
					currentText.WriteString(cleanToken)
					if len(currentWords) > 0 {
						currentWords[len(currentWords)-1].Text += cleanToken
						currentWords[len(currentWords)-1].EndMs = tok.Offsets.To
					} else {
						currentWords = append(currentWords, study.WordTiming{
							Text:       cleanToken,
							StartMs:    tok.Offsets.From,
							EndMs:      tok.Offsets.To,
							Confidence: tok.Prob,
						})
					}
				} else if !isWordStart && currentText.Len() > 0 && len(currentWords) > 0 && gapMs < 600 && !(isPrevAcronym && isStandaloneWord) {
					// BPE sub-word continuation (e.g. "compreh" + "ensible" -> "comprehensible", "vacuum" + "ing" -> "vacuuming", "wr" + "inkly" -> "wrinkly")
					currentText.WriteString(cleanToken)
					currentWords[len(currentWords)-1].Text += cleanToken
					currentWords[len(currentWords)-1].EndMs = tok.Offsets.To
					if tok.Prob < currentWords[len(currentWords)-1].Confidence {
						currentWords[len(currentWords)-1].Confidence = tok.Prob
					}
				} else {
					// New word start!
					// Check speech pauses and clause transitions for balanced sentence length
					if len(currentWords) >= 3 {
						currDur := prevEnd - currentStartMs

						if gapMs >= 750 {
							// 1. Natural strong speech pause boundary (>= 750ms silence)
							finalizeSentence()
						} else if gapMs >= 350 && isSentenceStartWord(cleanToken) {
							// 2. Capitalized sentence starter with soft pause (>= 350ms)
							finalizeSentence()
						} else if currDur >= 7000 && gapMs >= 350 {
							// 3. Sentence >= 7s and speaker paused for breath (>= 350ms)
							finalizeSentence()
						} else if currDur >= 9500 && gapMs >= 200 && isClauseConnector(cleanToken) {
							// 4. Sentence >= 9.5s, encountering clause connector (and, so, but, because, when...) with slight pause (>= 200ms)
							finalizeSentence()
						} else if currDur >= 14000 && gapMs >= 200 {
							// 5. Sentence reaching 14s, split at any word boundary with slight pause (>= 200ms)
							finalizeSentence()
						} else if currDur >= 18000 || len(currentWords) >= 25 {
							// 6. Hard safety limit: avoid run-ons > 18s or > 25 words in study dictation mode
							finalizeSentence()
						}
					}

					if currentStartMs < 0 {
						currentStartMs = tok.Offsets.From
					}
					currentEndMs = tok.Offsets.To

					if currentText.Len() > 0 {
						currentText.WriteString(" ")
					}
					currentText.WriteString(cleanToken)
					currentWords = append(currentWords, study.WordTiming{
						Text:       cleanToken,
						StartMs:    tok.Offsets.From,
						EndMs:      tok.Offsets.To,
						Confidence: tok.Prob,
					})

					// Check if this word terminates a sentence (e.g. " 2.", " now.", " world!")
					if isSentenceEnd(cleanToken) && len(currentWords) >= 2 {
						if !isKnownTLD(nextTok) && !isDecimalContinuation(nextTok) {
							finalizeSentence()
						}
					}
				}
			}
		} else {
			// Fallback if tokens array was empty: treat segment as a unit
			cleanSeg := CleanTranscriptText(segText)
			if currentStartMs < 0 {
				currentStartMs = seg.Offsets.From
			}
			currentEndMs = seg.Offsets.To
			currentText.WriteString(cleanSeg)

			// Simple word approximation
			words := strings.Fields(cleanSeg)
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

func isPunctuationOnly(s string) bool {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return false
	}
	for _, r := range trimmed {
		if !unicode.IsPunct(r) && !unicode.IsSymbol(r) {
			return false
		}
	}
	return true
}

func isContraction(s string) bool {
	trimmed := strings.TrimSpace(s)
	return strings.HasPrefix(trimmed, "'") || strings.HasPrefix(trimmed, "’") || strings.EqualFold(trimmed, "n't")
}

// CleanTranscriptText cleans up spacing, punctuation and typography artifacts from ASR transcriptions
func CleanTranscriptText(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}

	// 1. Remove spaces before punctuation (, . ? ! ; : )
	text = spacesBeforePunctRegex.ReplaceAllString(text, "$1")

	// 2. Fix spaces around apostrophes (e.g. "I 'm" -> "I'm", "don 't" -> "don't")
	text = spacesAroundAposRegex.ReplaceAllString(text, "$1'$2")

	// 3. Fix ordinal numbers (e.g. "21 st" -> "21st", "28 th" -> "28th")
	text = spacesOrdinalsRegex.ReplaceAllString(text, "$1$2")

	// 4. Fix hyphenated compound words (e.g. "flip - flops" -> "flip-flops")
	text = spacesHyphenRegex.ReplaceAllString(text, "$1-$2")

	// 5a. Fix special known word fragment splits first (e.g. CE FR -> CEFR, Circle Kand -> Circle K and)
	text = specialWordMergers.ReplaceAllStringFunc(text, func(m string) string {
		lower := strings.ToLower(m)
		switch {
		case strings.Contains(lower, "hes"):
			return "hesitating"
		case strings.Contains(lower, "can"):
			return "Canadian"
		case strings.Contains(lower, "ce"):
			return "CEFR"
		case strings.Contains(lower, "circle"):
			return "Circle K and"
		default:
			return m
		}
	})

	// 5b. Clean dangling possessives/articles with accidental periods (e.g. "my. Hair" -> "my hair", "do you have a. Lot" -> "do you have a lot")
	text = danglingWordInline.ReplaceAllStringFunc(text, func(m string) string {
		parts := danglingWordInline.FindStringSubmatch(m)
		if len(parts) == 3 {
			return parts[1] + " " + strings.ToLower(parts[2])
		}
		return m
	})

	// 5c. Fix detached consonant clusters and single consonant prefixes (e.g. "wr inkly", "kn uckles", "cl ippers", "tr inkets", "m owing", "r ake", "ch ores")
	for i := 0; i < 2; i++ {
		text = subwordPrefixRegex.ReplaceAllStringFunc(text, func(m string) string {
			parts := subwordPrefixRegex.FindStringSubmatch(m)
			if len(parts) == 4 {
				if isCommonStandaloneWord(parts[3]) {
					return m // Do not merge common words like "and", "in", "to"
				}
				return parts[1] + parts[2] + parts[3]
			}
			return m
		})
	}

	// 5d. Fix bound-morpheme suffix detachment (e.g. "budget ed" -> "budgeted", "vacuum ing" -> "vacuuming", "spong es" -> "sponges")
	text = boundSuffixRegex.ReplaceAllString(text, "$1$2")

	// 6. Ensure space after punctuation if followed immediately by letter/number (selective to protect numbers & domains)
	text = punctLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = colonLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = commaLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = periodLetterSpacingRegex.ReplaceAllString(text, "$1 $2")

	// 7. Fix currency formatting and spacing (e.g. "was$10, 000" -> "was $10,000", "$ 50" -> "$50", "$2.$2?" -> "$2. $2?")
	text = currencyPrefixRegex.ReplaceAllString(text, "$1 $2")
	text = currencySpacingRegex.ReplaceAllString(text, "$1$2")
	text = periodCurrencyRegex.ReplaceAllString(text, "$1 $2")
	for i := 0; i < 3; i++ {
		text = numberCommaSpacing.ReplaceAllString(text, "$1,$2")
	}

	// 8. Fix decimals and measurements (e.g. "5. 45" -> "5.45", "1. 0s" -> "1.0s")
	text = brokenDecimalRegex.ReplaceAllString(text, "$1.$2")

	// 9. Fix web domain formatting (e.g. "volcaenglish. Com" -> "volcaenglish.com")
	text = brokenDomainRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := brokenDomainRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			return parts[1] + "." + strings.ToLower(parts[2])
		}
		return m
	})

	// 10. Fix lowercase English pronoun "I" and its contractions (e.g. "i" -> "I", "i'm" -> "I'm")
	text = pronounIRegex.ReplaceAllStringFunc(text, func(m string) string {
		if strings.HasPrefix(m, "i") {
			return "I" + m[1:]
		}
		return m
	})

	// 11. Capitalize common proper nouns
	text = properNounsRegex.ReplaceAllStringFunc(text, func(m string) string {
		runes := []rune(m)
		if len(runes) > 0 && unicode.IsLower(runes[0]) {
			runes[0] = unicode.ToUpper(runes[0])
			return string(runes)
		}
		return m
	})

	// 12. Capitalize letter following sentence punctuation (. ? !)
	text = afterPunctRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := afterPunctRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			return parts[1] + strings.ToUpper(parts[2])
		}
		return m
	})

	// 13. Split run-on clauses where a lowercase word is followed immediately by a capitalized sentence transition
	text = runonTransitionRegex.ReplaceAllString(text, "$1. $2")

	// 14. Collapse any multiple consecutive spaces
	text = strings.Join(strings.Fields(text), " ")

	// 15. Capitalize first letter of sentence if lowercase
	runes := []rune(text)
	if len(runes) > 0 && unicode.IsLower(runes[0]) {
		runes[0] = unicode.ToUpper(runes[0])
		text = string(runes)
	}

	return strings.TrimSpace(text)
}

func isSentenceEnd(word string) bool {
	if abbrevRegex.MatchString(word) || danglingWordRegex.MatchString(word) {
		return false
	}
	return sentenceEndRegex.MatchString(word)
}

func isCommonStandaloneWord(w string) bool {
	switch strings.ToLower(w) {
	case "and", "or", "but", "to", "in", "on", "at", "for", "with", "is", "are", "was", "were", "it", "the", "a", "an", "all", "of":
		return true
	}
	return false
}

func isKnownTLD(s string) bool {
	lower := strings.ToLower(strings.Trim(s, " \t\r\n,.:;?!\"'"))
	switch lower {
	case "com", "org", "net", "io", "edu", "gov", "co", "uk", "us", "vn", "de", "jp", "cn":
		return true
	}
	return false
}

func isDecimalContinuation(s string) bool {
	trimmed := strings.Trim(s, " \t\r\n,.:;?!\"'")
	if trimmed == "" {
		return false
	}
	r := []rune(trimmed)
	return unicode.IsDigit(r[0])
}

func isClauseConnector(word string) bool {
	lower := strings.ToLower(strings.Trim(word, " \t\r\n,.:;?!\"'"))
	switch lower {
	case "and", "but", "so", "because", "when", "while", "where", "although", "though", "if", "then", "now", "or":
		return true
	}
	return false
}

func getNextToken(segments []WhisperSegment, segIdx int, tokIdx int) string {
	if segIdx < len(segments) {
		if tokIdx+1 < len(segments[segIdx].Tokens) {
			return strings.TrimSpace(segments[segIdx].Tokens[tokIdx+1].Text)
		}
		// Look ahead to next non-empty segment
		for nextSegIdx := segIdx + 1; nextSegIdx < len(segments); nextSegIdx++ {
			for _, t := range segments[nextSegIdx].Tokens {
				trimmed := strings.TrimSpace(t.Text)
				if trimmed != "" && !strings.HasPrefix(trimmed, "[_") && !strings.HasPrefix(trimmed, "<|") {
					return trimmed
				}
			}
		}
	}
	return ""
}

func isSentenceStartWord(word string) bool {
	trimmed := strings.TrimSpace(word)
	if len(trimmed) == 0 {
		return false
	}
	if trimmed == "I" || strings.HasPrefix(trimmed, "I'") || strings.HasPrefix(trimmed, "I’") {
		return false
	}
	r := []rune(trimmed)[0]
	return unicode.IsUpper(r)
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
