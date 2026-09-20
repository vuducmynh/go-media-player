package whisper

import (
	"testing"
)

func TestIsHallucination(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"Thank you for watching.", true},
		{"thanks for watching!", true},
		{"Please like and subscribe to my channel.", true},
		{"If you have any questions, please leave a comment.", true},
		{"[Music]", true},
		{"(Applause)", true},
		{"bye bye bye bye", true},
		{"you know you know you know you know", true},
		{"Section 3. In this section, you will hear a discussion about shopping habits.", false},
		{"Can anybody hear me? Is this microphone working?", false},
		{"Large denominations increase the likelihood of theft.", false},
	}

	for _, tt := range tests {
		got := IsHallucination(tt.input)
		if got != tt.expected {
			t.Errorf("IsHallucination(%q) = %v; want %v", tt.input, got, tt.expected)
		}
	}
}

func TestProcessSegmentsDeduplication(t *testing.T) {
	segmenter := NewSegmenter()

	raw := []WhisperSegment{
		{
			Text:    "That is the end of section 2.",
			Offsets: WhisperOffsets{From: 600000, To: 603000},
			Tokens: []WhisperToken{
				{Text: "That", Offsets: WhisperOffsets{From: 600000, To: 600500}},
				{Text: " is", Offsets: WhisperOffsets{From: 600500, To: 601000}},
				{Text: " the", Offsets: WhisperOffsets{From: 601000, To: 601500}},
				{Text: " end", Offsets: WhisperOffsets{From: 601500, To: 602000}},
				{Text: " of", Offsets: WhisperOffsets{From: 602000, To: 602500}},
				{Text: " section", Offsets: WhisperOffsets{From: 602500, To: 602800}},
				{Text: " 2.", Offsets: WhisperOffsets{From: 602800, To: 603000}},
			},
		},
		// Hallucination during pause
		{
			Text:    "Thank you for watching.",
			Offsets: WhisperOffsets{From: 610000, To: 620000},
			Tokens: []WhisperToken{
				{Text: "Thank", Offsets: WhisperOffsets{From: 610000, To: 612000}},
				{Text: " you", Offsets: WhisperOffsets{From: 612000, To: 614000}},
				{Text: " for", Offsets: WhisperOffsets{From: 614000, To: 616000}},
				{Text: " watching.", Offsets: WhisperOffsets{From: 616000, To: 620000}},
			},
		},
		// Repeated hallucination
		{
			Text:    "Thank you for watching.",
			Offsets: WhisperOffsets{From: 630000, To: 640000},
			Tokens: []WhisperToken{
				{Text: "Thank", Offsets: WhisperOffsets{From: 630000, To: 632000}},
				{Text: " you", Offsets: WhisperOffsets{From: 632000, To: 634000}},
				{Text: " for", Offsets: WhisperOffsets{From: 634000, To: 636000}},
				{Text: " watching.", Offsets: WhisperOffsets{From: 636000, To: 640000}},
			},
		},
		// Real speech begins
		{
			Text:    "Section 3 begins now.",
			Offsets: WhisperOffsets{From: 650000, To: 653000},
			Tokens: []WhisperToken{
				{Text: "Section", Offsets: WhisperOffsets{From: 650000, To: 651000}},
				{Text: " 3", Offsets: WhisperOffsets{From: 651000, To: 651800}},
				{Text: " begins", Offsets: WhisperOffsets{From: 651800, To: 652500}},
				{Text: " now.", Offsets: WhisperOffsets{From: 652500, To: 653000}},
			},
		},
		// Duplicate real speech accidentally repeated
		{
			Text:    "Section 3 begins now.",
			Offsets: WhisperOffsets{From: 653000, To: 656000},
			Tokens: []WhisperToken{
				{Text: "Section", Offsets: WhisperOffsets{From: 653000, To: 654000}},
				{Text: " 3", Offsets: WhisperOffsets{From: 654000, To: 654800}},
				{Text: " begins", Offsets: WhisperOffsets{From: 654800, To: 655500}},
				{Text: " now.", Offsets: WhisperOffsets{From: 655500, To: 656000}},
			},
		},
		// Next valid sentence
		{
			Text:    "Can anybody hear me?",
			Offsets: WhisperOffsets{From: 660000, To: 662000},
			Tokens: []WhisperToken{
				{Text: "Can", Offsets: WhisperOffsets{From: 660000, To: 660500}},
				{Text: " anybody", Offsets: WhisperOffsets{From: 660500, To: 661000}},
				{Text: " hear", Offsets: WhisperOffsets{From: 661000, To: 661500}},
				{Text: " me?", Offsets: WhisperOffsets{From: 661500, To: 662000}},
			},
		},
		// Trailing silence outro hallucination (lasting 20 seconds)
		{
			Text:    "Thank you.",
			Offsets: WhisperOffsets{From: 1284940, To: 1305890},
			Tokens: []WhisperToken{
				{Text: "Thank", Offsets: WhisperOffsets{From: 1284940, To: 1297060}},
				{Text: " you.", Offsets: WhisperOffsets{From: 1297060, To: 1305890}},
			},
		},
	}

	result := segmenter.ProcessSegments(raw)

	if len(result) != 3 {
		t.Fatalf("expected 3 clean sentences, got %d", len(result))
	}

	if result[0].Transcript != "That is the end of section 2." {
		t.Errorf("sentence 0 wrong: %s", result[0].Transcript)
	}
	if result[1].Transcript != "Section 3 begins now." {
		t.Errorf("sentence 1 wrong: %s", result[1].Transcript)
	}
	if result[2].Transcript != "Can anybody hear me?" {
		t.Errorf("sentence 2 wrong: %s", result[2].Transcript)
	}

	if result[0].ID != "s_001" || result[1].ID != "s_002" || result[2].ID != "s_003" {
		t.Errorf("sentence IDs wrong: %s, %s, %s", result[0].ID, result[1].ID, result[2].ID)
	}
}
