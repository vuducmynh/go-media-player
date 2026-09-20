package youtube

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"go-audio-play/internal/domain/study"
)

var (
	captionTracksRegex = regexp.MustCompile(`"captionTracks":\s*(\[[^\]]+\])`)
	abbrevRegex        = regexp.MustCompile(`(?i)\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e|no|u\.s|u\.k|st|approx)\.$`)
	sentenceEndRegex   = regexp.MustCompile(`[.!?]+["']?$`)
)

type CaptionTrack struct {
	BaseURL      string `json:"baseUrl"`
	LanguageCode string `json:"languageCode"`
	Kind         string `json:"kind"`
}

type YouTubeTimedTextJSON struct {
	Events []TimedTextEvent `json:"events"`
}

type TimedTextEvent struct {
	TStartMs    int64            `json:"tStartMs"`
	DDurationMs int64            `json:"dDurationMs"`
	Segs        []TimedTextSeg   `json:"segs"`
	WWinID      int              `json:"wWinId"`
}

type TimedTextSeg struct {
	Utf8      string `json:"utf8"`
	TOffsetMs int64  `json:"tOffsetMs"`
}

type CaptionsExtractor struct {
	client *http.Client
}

func NewCaptionsExtractor() *CaptionsExtractor {
	return &CaptionsExtractor{
		client: &http.Client{Timeout: 6 * time.Second},
	}
}

// ExtractCaptions attempts to fetch real-time English timed captions for a YouTube video
func (e *CaptionsExtractor) ExtractCaptions(videoID string) ([]study.Sentence, error) {
	watchURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	req, err := http.NewRequest("GET", watchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch watch page failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read watch page failed: %w", err)
	}

	html := string(bodyBytes)
	match := captionTracksRegex.FindStringSubmatch(html)
	if len(match) < 2 {
		return nil, fmt.Errorf("no caption tracks found for video %s", videoID)
	}

	rawTracksJSON := match[1]
	// Unescape possible unicode escape sequences
	rawTracksJSON = strings.ReplaceAll(rawTracksJSON, `\u0026`, "&")

	var tracks []CaptionTrack
	if err := json.Unmarshal([]byte(rawTracksJSON), &tracks); err != nil {
		return nil, fmt.Errorf("parse caption tracks json failed: %w", err)
	}

	if len(tracks) == 0 {
		return nil, fmt.Errorf("caption tracks list is empty")
	}

	// Select best English track (manual 'en' preferred over automatic 'asr')
	var selectedTrack *CaptionTrack
	for _, t := range tracks {
		if strings.HasPrefix(t.LanguageCode, "en") {
			if selectedTrack == nil || t.Kind != "asr" {
				selectedTrack = &t
			}
		}
	}

	// If no English, take first available track
	if selectedTrack == nil {
		selectedTrack = &tracks[0]
	}

	captionURL := selectedTrack.BaseURL
	if !strings.Contains(captionURL, "fmt=json3") {
		if strings.Contains(captionURL, "?") {
			captionURL += "&fmt=json3"
		} else {
			captionURL += "?fmt=json3"
		}
	}

	// Decode any HTML encoded characters
	captionURL = strings.ReplaceAll(captionURL, "&amp;", "&")

	cReq, err := http.NewRequest("GET", captionURL, nil)
	if err != nil {
		return nil, err
	}
	cReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	cResp, err := e.client.Do(cReq)
	if err != nil {
		return nil, fmt.Errorf("fetch timedtext failed: %w", err)
	}
	defer cResp.Body.Close()

	if cResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("timedtext returned HTTP %d", cResp.StatusCode)
	}

	var timedText YouTubeTimedTextJSON
	if err := json.NewDecoder(cResp.Body).Decode(&timedText); err != nil {
		return nil, fmt.Errorf("decode timedtext json failed: %w", err)
	}

	return e.buildSentencesFromTimedText(timedText)
}

func (e *CaptionsExtractor) buildSentencesFromTimedText(data YouTubeTimedTextJSON) ([]study.Sentence, error) {
	var sentences []study.Sentence
	var currentWords []study.WordTiming
	var currentText strings.Builder
	var currentStartMs int64 = -1
	var currentEndMs int64 = 0

	finalizeSentence := func() {
		text := strings.TrimSpace(currentText.String())
		// Clean up newline entities
		text = strings.ReplaceAll(text, "\n", " ")
		text = strings.Join(strings.Fields(text), " ")

		if text == "" || len(currentWords) == 0 {
			currentWords = nil
			currentText.Reset()
			currentStartMs = -1
			return
		}

		if currentStartMs < 0 {
			currentStartMs = currentWords[0].StartMs
		}
		if currentEndMs <= currentStartMs {
			currentEndMs = currentWords[len(currentWords)-1].EndMs
		}

		sentenceIndex := len(sentences) + 1
		sentences = append(sentences, study.Sentence{
			ID:         fmt.Sprintf("s_%03d", sentenceIndex),
			Index:      sentenceIndex,
			StartMs:    currentStartMs,
			EndMs:      currentEndMs,
			Transcript: text,
			Words:      currentWords,
		})

		currentWords = nil
		currentText.Reset()
		currentStartMs = -1
		currentEndMs = 0
	}

	for _, event := range data.Events {
		if len(event.Segs) == 0 {
			continue
		}

		eventBaseStart := event.TStartMs
		eventEnd := eventBaseStart + event.DDurationMs

		for _, seg := range event.Segs {
			segText := strings.TrimSpace(seg.Utf8)
			if segText == "" || segText == "\n" {
				continue
			}

			// Seg word offset
			wordStart := eventBaseStart + seg.TOffsetMs
			wordEnd := wordStart + 400
			if wordEnd > eventEnd {
				wordEnd = eventEnd
			}

			if currentStartMs < 0 {
				currentStartMs = wordStart
			}
			currentEndMs = wordEnd

			// Split segment into individual words if it contains spaces
			words := strings.Fields(seg.Utf8)
			for _, w := range words {
				if currentText.Len() > 0 {
					currentText.WriteString(" ")
				}
				currentText.WriteString(w)

				currentWords = append(currentWords, study.WordTiming{
					Text:    w,
					StartMs: wordStart,
					EndMs:   wordEnd,
				})

				// Check if word ends sentence
				if isSentenceEnd(w) && len(currentWords) >= 3 {
					finalizeSentence()
				}
			}
		}
	}

	if currentText.Len() > 0 {
		finalizeSentence()
	}

	return sentences, nil
}

func isSentenceEnd(word string) bool {
	if abbrevRegex.MatchString(word) {
		return false
	}
	return sentenceEndRegex.MatchString(word)
}
