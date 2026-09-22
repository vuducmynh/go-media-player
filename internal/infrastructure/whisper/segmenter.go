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
	subwordPrefixRegex = regexp.MustCompile(`(^|\s)(wr|kn|cl|cr|tr|bl|br|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|sw|wh|ch|Wr|Kn|Cl|Cr|Tr|Bl|Br|Fl|Fr|Gl|Gr|Pl|Pr|Sc|Sk|Sl|Sm|Sn|Sp|Sw|Wh|Ch|[b-hj-z])\s+([a-z]{2,})\b`)
	boundSuffixRegex   = regexp.MustCompile(`(?i)\b([a-zA-Z]{2,})\s+(ing|ed|ly|es|tion|sion|ment|ness|ible|ables|ish|ful|less|ize|ise)\b`)
	specialWordMergers = regexp.MustCompile(`(?i)\b(?:hes\s+itating|can\s+adian|c\s*e\s*f\s*r(?:\s*level)?|circle\s+kand|denomin\s+ations)\b`)
	spacedAcronym4     = regexp.MustCompile(`\b([A-Z])\s+([A-Z])\s+([A-Z])\b`)
	spacedAcronym3     = regexp.MustCompile(`\b([A-Z])\s+([A-Z])\b`)
	acronymNounSplit   = regexp.MustCompile(`\b([A-Z]{2,})([a-z]{2,})\b`)
	danglingWordRegex  = regexp.MustCompile(`(?i)\b(?:my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so|neighbouring|neighboring|surrounding)\.["]?$`)
	numberRangeInline  = regexp.MustCompile(`\b(\d+)\.\s+([tT]o)\s+(\d+)\b`)
	danglingWordInline = regexp.MustCompile(`(?i)\b(my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so|been|has\s+been|have\s+been|will\s+be|would\s+be|without|about|into|through|under|now|will|would|can|could|should|shall|numbered|longer|special|written|cautious|notice|neighbouring|neighboring|surrounding|as\s+i|because\s+they|when\s+we|if\s+you|that\s+i|people\s+start|whether\s+you\s+need|you\s+need)\.\s+([a-zA-Z])`)
	danglingWordTrailing = regexp.MustCompile(`(?i)\b(my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so|neighbouring|neighboring|surrounding|as\s+i|because\s+they|when\s+we|if\s+you|that\s+i|people\s+start|whether\s+you\s+need|you\s+need)\.$`)
	youKnowInlineRegex   = regexp.MustCompile(`(?i)\byou\.\s+[kK]now\b`)
	dollarsUSRegex       = regexp.MustCompile(`(?i)\b(dollars)\.\s*(us\s+dollars)\b`)
	doubleCommaPeriod    = regexp.MustCompile(`,\s*\.`)
	doublePeriodComma    = regexp.MustCompile(`\.\s*,`)

	fusedAdverbLessRegex       = regexp.MustCompile(`\b([a-zA-Z]+ly)(less)\b`)
	fusedSupplyLessRegex       = regexp.MustCompile(`\b(supply)(less)\s+(than)\b`)
	fusedMuchLessRegex         = regexp.MustCompile(`(?i)\b(much|so|far|even)(less)\b`)
	separatedUpdateRegex       = regexp.MustCompile(`(?i)\b(an|the|this|recent|latest|our|their|a)\s+up\s+date\b`)
	noBrainerRegex             = regexp.MustCompile(`(?i)\b(a\s+no)\s+brainer\b`)
	openAIRegex                = regexp.MustCompile(`(?i)\bopen\s+ai\b`)
	elonMuskRegex              = regexp.MustCompile(`(?i)\belon('s|\s+musk)\b`)
	kimiModelRegex             = regexp.MustCompile(`(?i)\b(kimi|kimmy)\s+([kK]\d)\b`)
	versionedModelRegex        = regexp.MustCompile(`(?i)\b(grok|fable|opus|astra)\s+(\d+\.\d+|\bmax\b)`)
	cloudCodeRegex             = regexp.MustCompile(`(?i)\bcloud\s+code\b`)
	grokbotRegex               = regexp.MustCompile(`(?i)\bgrok\s*bot\b`)
	speakingOfTransitionRegex  = regexp.MustCompile(`(?i)\b([a-z0-9]+)\s+and\s+speaking\s+of\s+([a-zA-Z]+)\b`)
	thatJobTransitionRegex     = regexp.MustCompile(`(?i)\b(that's\s+(?:his\s+job|her\s+job|fine|great|good|true|right|okay))\s+that's\b`)
	spellingHyphenRegex        = regexp.MustCompile(`\b([A-Za-z])-\s+([A-Za-z])\b`)
	creditCardInlineRegex      = regexp.MustCompile(`\b(\d{4}-\d{4})\.\s*(\d{4}-\d{2,4})\b`)
	creditCardSpacedRegex      = regexp.MustCompile(`\b(\d{4}-\d{4}-\d{4}-)(\d{2})\s+(\d{2})\b`)
	creditCardBlockRegex       = regexp.MustCompile(`\b\d{4}-\d{4}\.?$`)
	creditCardStartRegex       = regexp.MustCompile(`^\d{4}(?:-\d{2,4}|\s+\d{2,4})\b`)
	tagQuestionTransitionRegex = regexp.MustCompile(`(?i)\b(isn't it|aren't you|doesn't it|don't you|didn't you|won't you|can't you)\s+(that's right|yes|no|exactly|sure)\b`)
	aboutThatOhRegex           = regexp.MustCompile(`(?i)\b(about that)\s+(oh\s+(?:yes|no))\b`)
	mountPrefixRegex           = regexp.MustCompile(`\b([mM]ount)\s+([A-Z][a-z]+)\b`)
	ieltsNarratorPromptRegex   = regexp.MustCompile(`(?i)\b([a-z0-9%]+)\s+before\s+you\s+hear\s+the\s+rest\s+of\s+the\s+(recording|talk|conversation)\b`)

	// Punctuation spacing (selective: avoid inserting space inside numbers like 5.45, 10,000, 5:45)
	punctLetterSpacingRegex  = regexp.MustCompile(`([;?!])([A-Za-z0-9])`)
	colonLetterSpacingRegex  = regexp.MustCompile(`(:)([A-Za-z])`)
	commaLetterSpacingRegex  = regexp.MustCompile(`(,)([A-Za-z])`)
	periodLetterSpacingRegex = regexp.MustCompile(`(\.)([A-Za-z])`)
	periodCurrencyRegex      = regexp.MustCompile(`(\.)\s*([$€£¥₫])`)
	commaCurrencyRegex       = regexp.MustCompile(`([,;:])\s*([$€£¥₫])`)

	// Numbers, domains, and currency formatting
	brokenDecimalRegex   = regexp.MustCompile(`\b(\d+)\.\s+(\d+[a-zA-Z]*)\b`)
	brokenDomainRegex    = regexp.MustCompile(`(?i)\b([a-z0-9_-]+)\.\s*(com|net|org|io|edu|gov|co|uk|us|vn)\b`)
	currencyPrefixRegex  = regexp.MustCompile(`([a-zA-Z0-9])([$€£¥₫])`)
	currencySpacingRegex = regexp.MustCompile(`([$€£¥₫])\s+(\d)`)
	numberCommaSpacing   = regexp.MustCompile(`\b(\d{1,3}),\s+(\d{3})\b`)

	pronounIRegex        = regexp.MustCompile(`(?i)\b(i)(['’](?:m|ve|ll|d))?\b`)
	afterPunctRegex      = regexp.MustCompile(`([.!?]\s+)([a-z])`)
	properNounsRegex     = regexp.MustCompile(`(?i)\b(england|america|american|english|spanish|french|german|colorado|chicago|britain|british|hanoi|vietnam|vietnamese|barack|obama|wellington|auckland|christchurch|queenstown|transcoastal|narahoe|ruapehu|tongariro|zapier|cursor|nvidia|samsung|dropbox|shopify|anthropic)\b`)
	runonTransitionRegex = regexp.MustCompile(`\b([a-z]{2,})\s+((?:Now|It's|Then|So|Today|Here|We're|You're|Let's|This|That|There|Get|Tell|Start)\b)`)
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

		// Ensure sentence ends with terminating punctuation if missing (strip trailing commas/colons first)
		if !sentenceEndRegex.MatchString(text) {
			text = strings.TrimRight(text, " \t\r\n,;:—–-") + "."
			if len(currentWords) > 0 {
				currentWords[len(currentWords)-1].Text = strings.TrimRight(currentWords[len(currentWords)-1].Text, " \t\r\n,;:—–-") + "."
			}
		}

		// Safety check: if sentence is just 1 short word and previous sentence exists, merge with previous
		if len(sentences) > 0 && len(currentWords) <= 2 && (currentEndMs-currentStartMs) < 1200 {
			prevIdx := len(sentences) - 1
			candidate := study.Sentence{
				ID:         generateSentenceID(prevIdx + 1),
				Index:      prevIdx + 1,
				StartMs:    currentStartMs,
				EndMs:      currentEndMs,
				Transcript: text,
				Words:      currentWords,
			}
			sentences[prevIdx] = mergeTwoSentences(sentences[prevIdx], candidate)
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

				isWordStart := strings.HasPrefix(tok.Text, " ") || tokIdx == 0
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
					// Check if this punctuation terminates a sentence (skip if next token is TLD, decimal, or incomplete grammar phrase)
					if isSentenceEnd(cleanToken) && len(currentWords) >= 2 {
						if !isKnownTLD(nextTok) && !isDecimalContinuation(nextTok) && !isNumberRangeContinuation(prevWordText, nextTok) && !isCreditCardContinuation(prevWordText, nextTok) && !isGoingToContinuation(prevWordText, nextTok) && !isDanglingOrIncomplete(currentText.String()) {
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
				} else if !isWordStart && currentText.Len() > 0 && len(currentWords) > 0 && gapMs < 600 &&
					(isDecimalContinuation(cleanToken) || isKnownTLD(cleanToken) || (!sentenceEndRegex.MatchString(prevWordText) && !strings.ContainsAny(prevWordText, ".,;?!") && !(isPrevAcronym && isStandaloneWord))) {
					// BPE sub-word continuation (e.g. "compreh" + "ensible" -> "comprehensible", "vacuum" + "ing" -> "vacuuming", "wr" + "inkly" -> "wrinkly", "5." + "45" -> "5.45")
					currentText.WriteString(cleanToken)
					currentWords[len(currentWords)-1].Text += cleanToken
					currentWords[len(currentWords)-1].EndMs = tok.Offsets.To
					if tok.Prob < currentWords[len(currentWords)-1].Confidence {
						currentWords[len(currentWords)-1].Confidence = tok.Prob
					}
				} else {
					// New word start!
					// If previous word had sentence-ending punctuation, but sentence did NOT finalize
					// (e.g. was rejected because it's dangling or part of a number range):
					if len(currentWords) > 0 {
						prevWord := currentWords[len(currentWords)-1].Text
						if sentenceEndRegex.MatchString(prevWord) && !abbrevRegex.MatchString(prevWord) && !isDecimalContinuation(cleanToken) && !isKnownTLD(cleanToken) {
							cleanPrev := strings.TrimRight(prevWord, " \t\r\n.,;?!\"'")
							currentWords[len(currentWords)-1].Text = cleanPrev

							currStr := strings.TrimRight(currentText.String(), " \t\r\n.,;?!\"'")
							currentText.Reset()
							currentText.WriteString(currStr)

							// Lowercase continuation token if appropriate (avoiding "I", "Keiko", etc.)
							cleanWordOnly := strings.Trim(cleanToken, " \t\r\n.,;?!\"'()[]")
							if shouldLowercaseInContinuation(cleanWordOnly, currStr) {
								runes := []rune(cleanToken)
								if len(runes) > 0 && unicode.IsUpper(runes[0]) {
									runes[0] = unicode.ToLower(runes[0])
									cleanToken = string(runes)
								}
							}
						}
					}

					// Check speech pauses and clause transitions for balanced sentence length
					if len(currentWords) >= 3 {
						currDur := prevEnd - currentStartMs
						isDangling := isDanglingOrIncomplete(currentText.String())

						if !isDangling {
							if gapMs >= 1000 && len(currentWords) >= 4 {
								// 1. Natural strong speech pause boundary (>= 1.0s silence)
								finalizeSentence()
							} else if gapMs >= 500 && isSentenceStartWord(cleanToken) && len(currentWords) >= 4 {
								// 2. Capitalized sentence starter with clear pause (>= 500ms)
								finalizeSentence()
							} else if currDur >= 10000 && gapMs >= 250 && isClauseConnector(cleanToken) {
								// 3. Sentence >= 10s, encountering clause connector (and, so, but, because, when...) with clear pause (>= 250ms)
								finalizeSentence()
							} else if currDur >= 15000 && gapMs >= 450 {
								// 4. Sentence reaching 15s, split at word boundary with breath pause (>= 450ms)
								finalizeSentence()
							} else if currDur >= 25000 || len(currentWords) >= 35 {
								// 5. Hard safety limit: avoid run-ons > 25s or > 35 words in study dictation mode
								finalizeSentence()
							}
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
						if !isKnownTLD(nextTok) && !isDecimalContinuation(nextTok) && !isNumberRangeContinuation(cleanToken, nextTok) && !isCreditCardContinuation(cleanToken, nextTok) && !isGoingToContinuation(cleanToken, nextTok) && !isDanglingOrIncomplete(currentText.String()) {
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

	// Multi-pass sentence stitcher to merge grammatically incomplete sentence fragments
	stitched := s.stitchFragmentedSentences(cleaned)

	// Re-index IDs cleanly and ensure terminating punctuation
	for i := range stitched {
		stitched[i].Index = i + 1
		stitched[i].ID = generateSentenceID(i + 1)
		if !sentenceEndRegex.MatchString(stitched[i].Transcript) {
			stitched[i].Transcript += "."
		}
	}

	return stitched
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

	// 5a. Fix special known word fragment splits first (e.g. CE FR -> CEFR, Circle Kand -> Circle K and, denomin ations -> denominations)
	text = specialWordMergers.ReplaceAllStringFunc(text, func(m string) string {
		lower := strings.ToLower(m)
		switch {
		case strings.Contains(lower, "hes"):
			return "hesitating"
		case strings.Contains(lower, "can"):
			return "Canadian"
		case strings.Contains(lower, "c") && strings.Contains(lower, "e") && strings.Contains(lower, "f") && strings.Contains(lower, "r"):
			if strings.Contains(lower, "level") {
				return "CEFR level"
			}
			return "CEFR"
		case strings.Contains(lower, "circle"):
			return "Circle K and"
		case strings.Contains(lower, "denomin"):
			return "denominations"
		default:
			return m
		}
	})

	// 5a2. Fix spaced acronyms (e.g. "U S A" -> "USA", "P D F" -> "PDF") and split acronyms stuck to nouns (e.g. "CEFRlevel" -> "CEFR level")
	text = spacedAcronym4.ReplaceAllString(text, "$1$2$3$4")
	text = spacedAcronym3.ReplaceAllString(text, "$1$2$3")
	text = acronymNounSplit.ReplaceAllString(text, "$1 $2")

	// 5a3. Fix double/conflicting punctuation marks (e.g. ",." -> ",", ".," -> ",")
	text = doubleCommaPeriod.ReplaceAllString(text, ",")
	text = doublePeriodComma.ReplaceAllString(text, ",")

	// 5a4. Fix discourse markers and conversational filler splits (e.g. "you. Know" -> "you know")
	text = youKnowInlineRegex.ReplaceAllString(text, "you know")

	// 5a5. Fix spelling hyphen spacing (e.g. "W- A- D- D- E- L- L" -> "W-A-D-D-E-L-L")
	for i := 0; i < 4; i++ {
		text = spellingHyphenRegex.ReplaceAllString(text, "$1-$2")
	}

	// 5a6. Fix credit card number periods and group spacing (e.g. "4550-1392. 8309-32 21" -> "4550-1392-8309-3221")
	text = creditCardInlineRegex.ReplaceAllString(text, "$1-$2")
	text = creditCardSpacedRegex.ReplaceAllString(text, "$1$2$3")

	// 5a7. Fix conversational dialogue transitions without punctuation (e.g. "isn't it that's right" -> "isn't it? That's right")
	text = tagQuestionTransitionRegex.ReplaceAllString(text, "$1? $2")
	text = aboutThatOhRegex.ReplaceAllString(text, "$1? $2")

	// 5a8. Fix Mount prefix capitalization (e.g. "mount Narahoe" -> "Mount Narahoe")
	text = mountPrefixRegex.ReplaceAllString(text, "Mount $2")

	// 5a9. Fix narrator prompt run-on transition (e.g. "...by May before you hear..." -> "...by May. Before you hear...")
	text = ieltsNarratorPromptRegex.ReplaceAllString(text, "$1. Before you hear the rest of the $2")
	text = numberRangeInline.ReplaceAllString(text, "$1 to $3")
	text = danglingWordInline.ReplaceAllStringFunc(text, func(m string) string {
		parts := danglingWordInline.FindStringSubmatch(m)
		if len(parts) == 3 {
			if parts[2] == "I" {
				return parts[1] + " I"
			}
			return parts[1] + " " + strings.ToLower(parts[2])
		}
		return m
	})
	text = danglingWordTrailing.ReplaceAllString(text, "$1...")

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

	// 5e. Fix fused adverbs and conjunctions (must run after bound suffixes: "slightlyless" -> "slightly less", "supplyless than" -> "supply less than")
	text = fusedAdverbLessRegex.ReplaceAllString(text, "$1 $2")
	text = fusedSupplyLessRegex.ReplaceAllString(text, "$1 $2 $3")
	text = fusedMuchLessRegex.ReplaceAllString(text, "$1 $2")
	text = separatedUpdateRegex.ReplaceAllString(text, "$1 update")
	text = noBrainerRegex.ReplaceAllString(text, "$1-brainer")

	// 6. Ensure space after punctuation if followed immediately by letter/number (selective to protect numbers & domains)
	text = punctLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = colonLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = commaLetterSpacingRegex.ReplaceAllString(text, "$1 $2")
	text = periodLetterSpacingRegex.ReplaceAllString(text, "$1 $2")

	// 7. Fix currency formatting and spacing (e.g. "was$10, 000" -> "was $10,000", "$ 50" -> "$50", "Yeah,$15" -> "Yeah, $15", "$2.$2?" -> "$2. $2?")
	text = currencyPrefixRegex.ReplaceAllString(text, "$1 $2")
	text = currencySpacingRegex.ReplaceAllString(text, "$1$2")
	text = periodCurrencyRegex.ReplaceAllString(text, "$1 $2")
	text = commaCurrencyRegex.ReplaceAllString(text, "$1 $2")
	for i := 0; i < 3; i++ {
		text = numberCommaSpacing.ReplaceAllString(text, "$1,$2")
	}

	// 8. Fix decimals and measurements (e.g. "5. 45" -> "5.45", "1. 0s" -> "1.0s")
	text = brokenDecimalRegex.ReplaceAllString(text, "$1.$2")

	// 9. Fix web domain formatting (e.g. "volcaenglish. Com" -> "volcaenglish.com")
	text = brokenDomainRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := brokenDomainRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			if strings.EqualFold(parts[1], "dollars") && strings.EqualFold(parts[2], "us") {
				return m
			}
			return parts[1] + "." + strings.ToLower(parts[2])
		}
		return m
	})

	// 9b. Format currency country codes (e.g. "dollars.us dollars" -> "dollars. US dollars")
	text = dollarsUSRegex.ReplaceAllString(text, "$1. US dollars")

	// 9c. Lowercase words mistakenly capitalized after a comma unless "I" or proper noun
	afterCommaRegex := regexp.MustCompile(`(,\s+)([A-Z][a-z]+)`)
	text = afterCommaRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := afterCommaRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			if shouldLowercaseInContinuation(parts[2], "") {
				runes := []rune(parts[2])
				runes[0] = unicode.ToLower(runes[0])
				return parts[1] + string(runes)
			}
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

	// 11. Capitalize common proper nouns, AI tech brands and versioned models
	text = properNounsRegex.ReplaceAllStringFunc(text, func(m string) string {
		runes := []rune(m)
		if len(runes) > 0 && unicode.IsLower(runes[0]) {
			runes[0] = unicode.ToUpper(runes[0])
			return string(runes)
		}
		return m
	})
	text = openAIRegex.ReplaceAllString(text, "OpenAI")
	text = cloudCodeRegex.ReplaceAllString(text, "Cloud Code")
	text = grokbotRegex.ReplaceAllString(text, "Grokbot")
	text = elonMuskRegex.ReplaceAllStringFunc(text, func(m string) string {
		lower := strings.ToLower(m)
		if strings.HasPrefix(lower, "elon's") {
			return "Elon's"
		}
		return "Elon Musk"
	})
	text = kimiModelRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := kimiModelRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			return "Kimi " + strings.ToUpper(parts[2])
		}
		return m
	})
	text = versionedModelRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := versionedModelRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			runes := []rune(strings.ToLower(parts[1]))
			if len(runes) > 0 {
				runes[0] = unicode.ToUpper(runes[0])
			}
			ver := parts[2]
			if strings.EqualFold(ver, "max") {
				ver = "Max"
			}
			return string(runes) + " " + ver
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

	// 12b. Lowercase words mistakenly capitalized after non-terminal abbreviations (e.g. "etc.", "e.g.", "i.e.")
	abbrevFollowRegex := regexp.MustCompile(`(?i)\b(etc|e\.g|i\.e|vs|approx)\.\s+([A-Z][a-z]+)`)
	text = abbrevFollowRegex.ReplaceAllStringFunc(text, func(m string) string {
		parts := abbrevFollowRegex.FindStringSubmatch(m)
		if len(parts) == 3 {
			if shouldLowercaseInContinuation(parts[2], "") {
				runes := []rune(parts[2])
				runes[0] = unicode.ToLower(runes[0])
				return parts[1] + ". " + string(runes)
			}
		}
		return m
	})

	// 13. Split run-on clauses where a lowercase word is followed immediately by a capitalized sentence transition
	text = speakingOfTransitionRegex.ReplaceAllString(text, "$1. And speaking of $2")
	text = thatJobTransitionRegex.ReplaceAllString(text, "$1. That's")
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
	clean := strings.Trim(word, " \t\r\n.,;?!\"'()[]")
	if clean != "" && isDanglingOrIncomplete(clean) {
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

func isNumberRangeContinuation(tok string, nextTok string) bool {
	cleanTok := strings.Trim(tok, " \t\r\n.,;?!\"'")
	cleanNext := strings.ToLower(strings.Trim(nextTok, " \t\r\n.,;?!\"'"))
	if cleanTok == "" || cleanNext == "" {
		return false
	}
	r := []rune(cleanTok)
	if unicode.IsDigit(r[len(r)-1]) && (cleanNext == "to" || cleanNext == "through") {
		return true
	}
	return false
}

func isCreditCardContinuation(tok string, nextTok string) bool {
	cleanTok := strings.Trim(tok, " \t\r\n.,;?!\"'")
	cleanNext := strings.Trim(nextTok, " \t\r\n.,;?!\"'")
	if cleanTok == "" || cleanNext == "" {
		return false
	}
	return creditCardBlockRegex.MatchString(cleanTok) && creditCardStartRegex.MatchString(cleanNext)
}

func isGoingToContinuation(tok string, nextTok string) bool {
	cleanPrev := strings.ToLower(strings.Trim(tok, " \t\r\n.,;?!\"'"))
	cleanNext := strings.ToLower(strings.Trim(nextTok, " \t\r\n.,;?!\"'"))
	return cleanPrev == "going" && (cleanNext == "to" || cleanNext == "towards")
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

var (
	// Prepositions that cannot grammatically conclude an English sentence
	danglingPrepositions = map[string]bool{
		"to": true, "of": true, "in": true, "for": true, "on": true, "with": true,
		"at": true, "by": true, "from": true, "into": true, "about": true, "as": true,
		"than": true, "without": true, "between": true, "through": true, "under": true,
		"toward": true, "towards": true, "within": true, "along": true, "across": true,
		"behind": true, "beyond": true, "during": true, "onto": true, "upon": true,
	}

	// Articles, determiners and possessives
	danglingDeterminers = map[string]bool{
		"the": true, "a": true, "an": true, "this": true, "that": true, "these": true,
		"those": true, "some": true, "any": true, "each": true, "every": true, "another": true,
		"my": true, "your": true, "his": true, "her": true, "its": true, "our": true, "their": true, "whose": true,
	}

	// Coordinating and subordinating conjunctions
	danglingConjunctions = map[string]bool{
		"and": true, "or": true, "but": true, "so": true, "because": true,
		"although": true, "though": true, "while": true, "where": true,
		"if": true, "whether": true, "unless": true, "since": true, "whereas": true,
	}

	// Auxiliaries, copulas and linking verbs
	danglingAuxiliaries = map[string]bool{
		"is": true, "are": true, "was": true, "were": true, "be": true, "been": true,
		"being": true, "am": true, "remain": true, "remains": true, "become": true, "became": true,
		"has been": true, "have been": true, "had been": true, "will be": true, "would be": true,
		"can be": true, "could be": true, "should be": true, "may be": true, "must be": true,
	}

	// Modals and modal adverbs
	danglingModals = map[string]bool{
		"will": true, "would": true, "shall": true, "should": true, "can": true,
		"could": true, "may": true, "might": true, "must": true,
		"will now": true, "would now": true, "can now": true, "could now": true,
		"you will now": true,
	}

	// Negations
	danglingNegations = map[string]bool{
		"not": true, "n't": true, "they're not": true, "we're not": true, "you're not": true,
		"it's not": true, "are not": true, "is not": true, "was not": true, "were not": true,
	}

	// Participles and adjectives expecting nouns
	danglingAdjectives = map[string]bool{
		"numbered": true, "longer": true, "special": true, "written": true,
		"cautious": true, "difficult": true, "higher": true, "lower": true,
		"two written": true, "part of a longer": true, "issues a special": true,
		"provide a": true, "arrange to": true,
		"neighbouring": true, "neighboring": true, "surrounding": true,
		"first five-week": true, "five-week": true,
	}

	// Incomplete verb phrases, idioms and noun modifiers
	danglingPhrasalVerbs = map[string]bool{
		"look at": true, "listen to": true, "turn to": true, "tend to": true,
		"stick to": true, "spend on": true, "reach": true, "reaching": true,
		"achieve": true, "before the talk": true, "is this microphone": true,
		"microphone": true, "listening practice": true, "there": true,
		"people start": true, "they have": true, "because they have": true,
		"as i have": true, "since they have": true, "whether you need": true,
		"you need": true, "you know": true, "of direct": true, "in direct": true,
		"my personal": true, "your personal": true, "our personal": true,
		"their personal": true, "his personal": true, "her personal": true,
	}
)

// isDanglingOrIncomplete checks if a text ends with a word or phrase that cannot grammatically conclude a complete English sentence
func isDanglingOrIncomplete(text string) bool {
	clean := strings.TrimRight(strings.TrimSpace(text), " \t\r\n.,;?!\"'()[]")
	if clean == "" {
		return false
	}
	words := strings.Fields(clean)
	if len(words) == 0 {
		return false
	}

	lastWord := strings.ToLower(strings.Trim(words[len(words)-1], " \t\r\n.,;?!\"'()[]"))

	// Check honorific titles that cannot conclude a sentence
	switch lastWord {
	case "mr", "mrs", "ms", "prof":
		return true
	}

	// Check compound adjectives with hyphen ending in time/measurement words
	if strings.Contains(lastWord, "-") {
		parts := strings.Split(lastWord, "-")
		lastPart := parts[len(parts)-1]
		switch lastPart {
		case "week", "weeks", "day", "days", "year", "years", "month", "months", "hour", "hours", "minute", "minutes", "time", "part", "class", "level", "term":
			return true
		}
	}

	// Check subject pronoun preceded by conjunction/preposition (e.g. "as I", "because they", "when we")
	if len(words) >= 2 {
		wPrev := strings.ToLower(strings.Trim(words[len(words)-2], " \t\r\n.,;?!\"'()[]"))
		if lastWord == "i" || lastWord == "he" || lastWord == "she" || lastWord == "we" || lastWord == "they" {
			switch wPrev {
			case "as", "because", "since", "while", "when", "where", "if", "that", "which", "although", "though", "and", "or", "but", "so", "for", "before", "after", "unless", "until":
				return true
			}
		}
	}

	// 1. Single word checks
	if danglingModals[lastWord] {
		// Special case: "can" preceded by determiner is a noun (e.g. "this can", "a can", "the can")
		if lastWord == "can" && len(words) >= 2 {
			wPrev := strings.ToLower(strings.Trim(words[len(words)-2], " \t\r\n.,;?!\"'()[]"))
			if wPrev != "this" && wPrev != "a" && wPrev != "the" && wPrev != "that" && wPrev != "tin" && wPrev != "trash" {
				return true
			}
		} else {
			return true
		}
	} else if danglingPrepositions[lastWord] ||
		danglingDeterminers[lastWord] ||
		danglingConjunctions[lastWord] ||
		danglingAuxiliaries[lastWord] ||
		danglingNegations[lastWord] ||
		danglingAdjectives[lastWord] ||
		danglingPhrasalVerbs[lastWord] {
		return true
	}

	// 2. Multi-word tails
	if len(words) >= 2 {
		wPrev := strings.ToLower(strings.Trim(words[len(words)-2], " \t\r\n.,;?!\"'()[]"))
		lastTwo := wPrev + " " + lastWord
		if danglingAuxiliaries[lastTwo] ||
			danglingModals[lastTwo] ||
			danglingNegations[lastTwo] ||
			danglingAdjectives[lastTwo] ||
			danglingPhrasalVerbs[lastTwo] {
			return true
		}
		if strings.HasSuffix(lastTwo, " to") {
			return true
		}
	}

	if len(words) >= 3 {
		wPrev2 := strings.ToLower(strings.Trim(words[len(words)-3], " \t\r\n.,;?!\"'()[]"))
		wPrev1 := strings.ToLower(strings.Trim(words[len(words)-2], " \t\r\n.,;?!\"'()[]"))
		lastThree := wPrev2 + " " + wPrev1 + " " + lastWord
		if danglingModals[lastThree] || danglingAdjectives[lastThree] || danglingPhrasalVerbs[lastThree] {
			return true
		}
		// Severed noun clause: "what the [noun]", "how the [noun]", "where the [noun]"
		if (wPrev2 == "what" || wPrev2 == "how" || wPrev2 == "where") && (wPrev1 == "the" || wPrev1 == "a" || wPrev1 == "this" || wPrev1 == "that") {
			return true
		}
	}

	return false
}

// stitchFragmentedSentences merges incomplete sentences across multiple passes
func (s *Segmenter) stitchFragmentedSentences(sentences []study.Sentence) []study.Sentence {
	if len(sentences) <= 1 {
		return sentences
	}

	for pass := 0; pass < 3; pass++ {
		var stitched []study.Sentence
		mergedAny := false

		i := 0
		for i < len(sentences) {
			if i+1 < len(sentences) && shouldStitch(sentences[i], sentences[i+1]) {
				s1 := sentences[i]
				s2 := sentences[i+1]
				merged := mergeTwoSentences(s1, s2)
				stitched = append(stitched, merged)
				mergedAny = true
				i += 2 // Skip both original sentences, now merged
			} else {
				stitched = append(stitched, sentences[i])
				i++
			}
		}

		sentences = stitched
		if !mergedAny {
			break
		}
	}

	return sentences
}

// shouldStitch determines whether two adjacent sentences form a fragmented split that should be unified
func shouldStitch(s1, s2 study.Sentence) bool {
	// 1. Time proximity check (allow contiguous, overlapping, or natural pause up to 2.8s)
	gap := s2.StartMs - s1.EndMs
	if gap > 2800 {
		return false
	}

	w1 := strings.Fields(s1.Transcript)
	w2 := strings.Fields(s2.Transcript)
	if len(w1) == 0 || len(w2) == 0 {
		return false
	}

	// 2. Identify if there is a strong syntactic, grammatical, or phrase link
	isLinked := false
	isShortOrphan := len(w2) <= 7 || (s2.EndMs-s2.StartMs) <= 3200

	// 2a. Primary trigger: s1 ends with dangling or incomplete phrase
	if isDanglingOrIncomplete(s1.Transcript) {
		isLinked = true
	}

	firstWordS2 := strings.ToLower(strings.Trim(w2[0], " \t\r\n.,;?!\"'()[]"))

	// Case A: s2 starts with lowercase letter (clear syntax continuity)
	runesS2 := []rune(strings.TrimSpace(s2.Transcript))
	if len(runesS2) > 0 && unicode.IsLower(runesS2[0]) {
		isLinked = true
	}

	// Case B: s2 starts with copula/auxiliary: "is", "are", "was", "were", "be", "been"
	if firstWordS2 == "is" || firstWordS2 == "are" || firstWordS2 == "was" || firstWordS2 == "were" {
		lastWordS1 := strings.ToLower(strings.Trim(w1[len(w1)-1], " \t\r\n.,;?!\"'()[]"))
		if lastWordS1 == "there" || lastWordS1 == "it" || lastWordS1 == "this" || lastWordS1 == "that" || lastWordS1 == "here" {
			isLinked = true
		}
	}

	// Case C: s2 starts with preposition range or orphan prepositional phrase
	if firstWordS2 == "to" && len(w2) >= 2 {
		r := []rune(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]"))
		if len(r) > 0 && unicode.IsDigit(r[0]) {
			isLinked = true
		}
	}
	if (firstWordS2 == "for" || firstWordS2 == "with" || firstWordS2 == "in" || firstWordS2 == "on" || firstWordS2 == "at" || firstWordS2 == "about" || firstWordS2 == "from") && len(w2) <= 5 {
		isLinked = true
	}

	// Case D: s2 starts with relative clause pronoun: "that", "which", "who", "whom", "whose", "where"
	if firstWordS2 == "that" || firstWordS2 == "which" || firstWordS2 == "whom" {
		isLinked = true
	}

	// Case E: s2 starts with participle: "written", "working", "recording", "continues", "carrying", "cautious"
	switch firstWordS2 {
	case "written", "working", "recording", "continues", "carry", "carrying", "cautious", "notice":
		isLinked = true
	}

	// Case F: s2 starts with verb completing modal/auxiliary in s1
	if firstWordS2 == "have" || firstWordS2 == "check" || firstWordS2 == "answer" {
		lastTwoS1 := ""
		if len(w1) >= 2 {
			lastTwoS1 = strings.ToLower(strings.Trim(w1[len(w1)-2], " \t\r\n.,;?!\"'()[]") + " " + strings.Trim(w1[len(w1)-1], " \t\r\n.,;?!\"'()[]"))
		}
		if strings.HasSuffix(lastTwoS1, " will now") || strings.HasSuffix(lastTwoS1, " would now") || strings.HasSuffix(lastTwoS1, " will") || strings.HasSuffix(lastTwoS1, " would") || strings.HasSuffix(lastTwoS1, " should") {
			isLinked = true
		}
	}

	// Case G: Title/Compound continuation
	lastWordS1 := strings.ToLower(strings.Trim(w1[len(w1)-1], " \t\r\n.,;?!\"'()[]"))
	if (lastWordS1 == "practice" && firstWordS2 == "test") || (lastWordS1 == "transport" && firstWordS2 == "authority") {
		isLinked = true
	}

	// Case H: s1 ends with hyphenated compound adjective (e.g. "my first five-week." + "Course right...")
	if strings.Contains(lastWordS1, "-") {
		parts := strings.Split(lastWordS1, "-")
		lastPart := parts[len(parts)-1]
		switch lastPart {
		case "week", "weeks", "day", "days", "year", "years", "month", "months", "hour", "hours", "minute", "minutes", "time", "part", "class", "level", "term":
			isLinked = true
		}
	}

	// Case I: s1 ends with attributive adjective (e.g. "consulates in neighbouring." + "Countries require...")
	if lastWordS1 == "neighbouring" || lastWordS1 == "neighboring" || lastWordS1 == "surrounding" {
		isLinked = true
	}

	// Case J: s2 starts with to-infinitive following aspectual verbs in s1 (e.g. "...when people start." + "To look a bit stressed.")
	if firstWordS2 == "to" && len(w2) >= 2 {
		switch lastWordS1 {
		case "start", "started", "starting", "begin", "began", "begins", "beginning", "continue", "continued", "tend", "tends", "tended", "manage", "managed", "try", "tried", "plan", "planned", "fail", "failed", "attempt", "attempted", "hope", "hoped":
			isLinked = true
		}
	}

	// Case K: s1 ends with subject + transitive verb needing direct object in s2
	if len(w1) >= 2 && (firstWordS2 == "a" || firstWordS2 == "an" || firstWordS2 == "the" || firstWordS2 == "some" || firstWordS2 == "any") {
		lastTwoS1 := strings.ToLower(strings.Trim(w1[len(w1)-2], " \t\r\n.,;?!\"'()[]") + " " + strings.Trim(w1[len(w1)-1], " \t\r\n.,;?!\"'()[]"))
		switch lastTwoS1 {
		case "they have", "we have", "you have", "i have", "you need", "we need", "they need", "i need", "they require", "we require":
			isLinked = true
		}
	}

	// Case L: Conversational filler "you know" split across sentences
	// e.g. "...colleagues from work, you." + "Know, in our lunch hour."
	if lastWordS1 == "you" && firstWordS2 == "know" {
		isLinked = true
	}

	// Case M: Compound noun continuation (e.g. "...use the library." + "Computer system...", "...have a book." + "List here...")
	if (lastWordS1 == "library" && (firstWordS2 == "computer" || firstWordS2 == "catalog" || firstWordS2 == "catalogue")) ||
		(lastWordS1 == "book" && (firstWordS2 == "list" || firstWordS2 == "lists" || firstWordS2 == "store" || firstWordS2 == "shop")) ||
		(lastWordS1 == "time" && firstWordS2 == "management") {
		isLinked = true
	}

	// Case N: IELTS instructions prompt: "As you listen to ..., complete/answer..."
	s1Lower := strings.ToLower(s1.Transcript)
	if strings.HasPrefix(s1Lower, "as you listen") {
		switch firstWordS2 {
		case "complete", "answer", "fill", "choose", "write", "check":
			isLinked = true
		}
	}

	// Case O: Linking verb predicate complement continuation:
	// e.g. "...when people start to look." + "A bit stressed."
	switch lastWordS1 {
	case "look", "looks", "looking", "looked", "feel", "feels", "feeling", "felt", "seem", "seems", "seemed", "sound", "sounds", "sounded", "become", "becomes", "became":
		switch firstWordS2 {
		case "a", "an", "the", "bit", "very", "quite", "extremely", "stressed", "tired", "happy", "sad", "angry", "different", "difficult", "like":
			isLinked = true
		}
	}

	// Case P: Relative clause / subject predicate continuation:
	// e.g. "...consulates in neighbouring countries." + "Require you to provide a letter..."
	if (lastWordS1 == "countries" || lastWordS1 == "consulates" || lastWordS1 == "embassy" || lastWordS1 == "officers" || lastWordS1 == "students" || lastWordS1 == "people") &&
		(firstWordS2 == "require" || firstWordS2 == "need" || firstWordS2 == "provide" || firstWordS2 == "ask") {
		isLinked = true
	}

	// Case Q: Honorific title continuation (Mr., Mrs., Ms., Dr., Prof.)
	switch lastWordS1 {
	case "mr", "mrs", "ms", "dr", "prof":
		if lastWordS1 == "dr" {
			if len(w2) > 0 && unicode.IsUpper([]rune(w2[0])[0]) {
				isLinked = true
			}
		} else {
			isLinked = true
		}
	}

	// Case R: List abbreviation "etc." preceding a severed predicate verb
	if lastWordS1 == "etc" {
		switch firstWordS2 {
		case "have", "has", "had", "are", "is", "were", "was", "do", "did", "can", "will", "would", "should", "could":
			if !strings.HasSuffix(strings.TrimSpace(s2.Transcript), "?") {
				isLinked = true
			}
		}
	}

	// Case S: Attributive adjective "direct" preceding noun in s2
	if lastWordS1 == "direct" {
		switch firstWordS2 {
		case "sunlight", "light", "heat", "contact", "access", "impact", "flight", "action", "current", "evidence":
			isLinked = true
		}
	}

	// Case T: Incomplete noun clause or severed subject preceding a modal verb without explicit subject in s2
	if firstWordS2 == "will" || firstWordS2 == "would" || firstWordS2 == "can" || firstWordS2 == "could" || firstWordS2 == "should" {
		if len(w2) >= 2 {
			secondWordS2 := strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]"))
			switch secondWordS2 {
			case "do", "make", "be", "have", "cost", "work", "help", "give", "take", "provide", "allow", "enable":
				if !strings.HasSuffix(strings.TrimSpace(s2.Transcript), "?") {
					isLinked = true
				}
			}
		}
	}

	// Case U: Time / opportunity noun followed by to-infinitive IELTS prompt or clause complement
	if lastWordS1 == "time" && firstWordS2 == "to" && len(w2) >= 2 {
		secondWordS2 := strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]"))
		switch secondWordS2 {
		case "look", "read", "answer", "check", "complete", "see", "think", "listen", "prepare":
			isLinked = true
		}
	}

	// Case V: IELTS instruction prompt: "Now, listen and answer." + "Questions X to Y."
	if strings.HasSuffix(strings.ToLower(strings.Trim(s1.Transcript, " \t\r\n.,;?!\"'")), "listen and answer") &&
		firstWordS2 == "questions" {
		isLinked = true
	}

	// Case W: Credit card block sliced by punctuation: e.g. "4550-1392." + "8309-32 21."
	if creditCardBlockRegex.MatchString(strings.TrimRight(s1.Transcript, " \t\r\n.,;?!\"'")) &&
		creditCardStartRegex.MatchString(strings.TrimSpace(s2.Transcript)) {
		isLinked = true
	}

	// Case X: Attributive adjective preceded by possessive determiner (e.g. "...by my personal." + "Usage, that actually...")
	if lastWordS1 == "personal" && len(w1) >= 2 {
		wPrevS1 := strings.ToLower(strings.Trim(w1[len(w1)-2], " \t\r\n.,;?!\"'()[]"))
		switch wPrevS1 {
		case "my", "your", "his", "her", "our", "their":
			isLinked = true
		}
	}

	// Case Y: Semi-modal "going to" severed across sentences (e.g. "...completed is going." + "To be much higher...")
	if lastWordS1 == "going" && firstWordS2 == "to" && !strings.HasSuffix(strings.TrimSpace(s1.Transcript), "?") {
		isLinked = true
	}

	// Case Z: Displaced object pronoun before coordinating conjunction in s2 (e.g. "...whatever I gave." + "It but once again...")
	if firstWordS2 == "it" && len(w2) >= 2 {
		secondWordS2 := strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]"))
		if secondWordS2 == "but" || secondWordS2 == "and" || secondWordS2 == "so" {
			isLinked = true
		}
	}

	if !isLinked {
		return false
	}

	// 3. Dynamic Length Safety Limits based on link nature
	maxWords := 35
	maxDur := int64(28000)

	isDisplacedPronoun := firstWordS2 == "it" && len(w2) >= 2 && (strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]")) == "but" || strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]")) == "and" || strings.ToLower(strings.Trim(w2[1], " \t\r\n.,;?!\"'()[]")) == "so")

	if isShortOrphan || isDisplacedPronoun {
		// When s2 is an orphan fragment (<= 7 words) or displaced pronoun, expand limit to prevent amputating sentence tails
		maxWords = 48
		maxDur = 32000
	} else if isDanglingOrIncomplete(s1.Transcript) || lastWordS1 == "going" || firstWordS2 == "require" || firstWordS2 == "need" || lastWordS1 == "etc" || lastWordS1 == "mr" || lastWordS1 == "mrs" || lastWordS1 == "ms" || lastWordS1 == "prof" {
		// When s1 is dangling or completing a relative clause predicate / title / semi-modal going to
		maxWords = 58
		maxDur = 35000
	}

	if len(w1)+len(w2) > maxWords {
		return false
	}
	combinedDur := s2.EndMs - s1.StartMs
	if combinedDur > maxDur {
		return false
	}

	return true
}

// mergeTwoSentences fuses two fragmented sentences into a single coherent sentence
func mergeTwoSentences(s1, s2 study.Sentence) study.Sentence {
	s1RawTrimmed := strings.TrimSpace(s1.Transcript)
	s1HadComma := strings.HasSuffix(s1RawTrimmed, ",") || strings.HasSuffix(s1RawTrimmed, ",.") || strings.HasPrefix(strings.ToLower(s1RawTrimmed), "as you listen")

	// Check if s1 ends in an abbreviation that should retain its dot (Mr., Mrs., Ms., Dr., Prof., etc.)
	lastWordLower := ""
	wS1 := strings.Fields(s1RawTrimmed)
	if len(wS1) > 0 {
		lastWordLower = strings.ToLower(strings.Trim(wS1[len(wS1)-1], " \t\r\n.,;?!\"'"))
	}
	isAbbrev := false
	switch lastWordLower {
	case "mr", "mrs", "ms", "dr", "prof", "etc":
		isAbbrev = true
	}

	s1Text := strings.TrimRight(s1RawTrimmed, " \t\r\n.,;?!\"'")
	if isAbbrev && strings.Contains(s1RawTrimmed, ".") {
		s1Text += "."
	}
	s2Text := strings.TrimSpace(s2.Transcript)

	// Clean word timings in s1: strip trailing punctuation from the last word (unless abbreviation)
	words1 := make([]study.WordTiming, len(s1.Words))
	copy(words1, s1.Words)
	if len(words1) > 0 {
		if !isAbbrev {
			words1[len(words1)-1].Text = strings.TrimRight(words1[len(words1)-1].Text, " \t\r\n.,;?!\"'")
		}
	}

	// Prepare words for s2: check if first word should be lowercased
	words2 := make([]study.WordTiming, len(s2.Words))
	copy(words2, s2.Words)

	s2WordsFields := strings.Fields(s2Text)
	if len(s2WordsFields) > 0 {
		firstWordRaw := s2WordsFields[0]
		firstWordClean := strings.Trim(firstWordRaw, " \t\r\n.,;?!\"'()[]")

		// Decide if first word of s2 should be lowercased
		if shouldLowercaseInContinuation(firstWordClean, s1Text) {
			// Lowercase in s2Text
			runes := []rune(firstWordRaw)
			if len(runes) > 0 && unicode.IsUpper(runes[0]) {
				runes[0] = unicode.ToLower(runes[0])
				s2WordsFields[0] = string(runes)
				s2Text = strings.Join(s2WordsFields, " ")
			}
			// Lowercase in words2[0]
			if len(words2) > 0 {
				wRunes := []rune(words2[0].Text)
				if len(wRunes) > 0 && unicode.IsUpper(wRunes[0]) {
					wRunes[0] = unicode.ToLower(wRunes[0])
					words2[0].Text = string(wRunes)
				}
			}
		}
	}

	separator := " "
	if s1HadComma {
		separator = ", "
	}
	mergedText := CleanTranscriptText(s1Text + separator + s2Text)
	mergedWords := append(words1, words2...)

	mergedEndMs := s2.EndMs
	if s1.EndMs > mergedEndMs {
		mergedEndMs = s1.EndMs
	}

	return study.Sentence{
		ID:         s1.ID,
		Index:      s1.Index,
		StartMs:    s1.StartMs,
		EndMs:      mergedEndMs,
		Transcript: mergedText,
		Words:      mergedWords,
	}
}

// shouldLowercaseInContinuation decides whether a capitalized word following a merged fragment should be converted to lowercase
func shouldLowercaseInContinuation(word string, prevText string) bool {
	lower := strings.ToLower(word)

	// Never lowercase "I" or contractions of "I"
	if word == "I" || strings.HasPrefix(word, "I'") || strings.HasPrefix(word, "I’") {
		return false
	}

	// Never lowercase person names following honorific titles (Mr., Mrs., Ms., Dr., Prof., Sir, Lady, Lord)
	prevWords := strings.Fields(strings.TrimRight(prevText, " \t\r\n.,;?!\"'"))
	if len(prevWords) > 0 {
		prevLast := strings.ToLower(strings.Trim(prevWords[len(prevWords)-1], " \t\r\n.,;?!\"'"))
		switch prevLast {
		case "mr", "mrs", "ms", "dr", "prof", "sir", "lady", "lord":
			return false
		}
	}

	// Never lowercase recognized proper nouns
	switch lower {
	case "esnia", "esnian", "japanese", "keiko", "yuichini", "willow", "rome", "elizabeth", "circle", "english", "british", "american", "america", "england", "bm-276", "auckland", "wellington", "transcoastal", "zapier", "cursor", "nvidia", "samsung", "dropbox", "shopify", "anthropic", "openai", "elon", "grok", "fable", "opus", "astra", "kimi", "meta", "asana", "gmail", "deepsuite":
		return false
	}

	// In "The Esnian Transport Authority", "Authority" should remain capitalized
	prevLower := strings.ToLower(prevText)
	if lower == "authority" && strings.Contains(prevLower, "transport") {
		return false
	}
	if lower == "section" {
		return false
	}

	return true
}

