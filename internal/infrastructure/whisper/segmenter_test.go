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

func TestProcessSegmentsPauseBoundary(t *testing.T) {
	segmenter := NewSegmenter()

	// Simulating speech without periods where the speaker paused for 1.2s between actions
	raw := []WhisperSegment{
		{
			Text:    "I'm going to shake this can I'm shaking this can",
			Offsets: WhisperOffsets{From: 1000, To: 6000},
			Tokens: []WhisperToken{
				{Text: "I'm", Offsets: WhisperOffsets{From: 1000, To: 1200}},
				{Text: " going", Offsets: WhisperOffsets{From: 1200, To: 1400}},
				{Text: " to", Offsets: WhisperOffsets{From: 1400, To: 1500}},
				{Text: " shake", Offsets: WhisperOffsets{From: 1500, To: 1800}},
				{Text: " this", Offsets: WhisperOffsets{From: 1800, To: 2000}},
				{Text: " can", Offsets: WhisperOffsets{From: 2000, To: 2200}},
				// 1.2s pause (2200 to 3400)
				{Text: " I'm", Offsets: WhisperOffsets{From: 3400, To: 3600}},
				{Text: " shaking", Offsets: WhisperOffsets{From: 3600, To: 3900}},
				{Text: " this", Offsets: WhisperOffsets{From: 3900, To: 4100}},
				{Text: " can", Offsets: WhisperOffsets{From: 4100, To: 4400}},
			},
		},
	}

	result := segmenter.ProcessSegments(raw)
	if len(result) != 2 {
		t.Fatalf("expected 2 sentences split by pause, got %d: %+v", len(result), result)
	}

	if result[0].Transcript != "I'm going to shake this can." {
		t.Errorf("sentence 0 wrong: %q", result[0].Transcript)
	}
	if result[1].Transcript != "I'm shaking this can." {
		t.Errorf("sentence 1 wrong: %q", result[1].Transcript)
	}
}

func TestProcessSegmentsSubwordTokens(t *testing.T) {
	segmenter := NewSegmenter()

	// Simulating raw Whisper BPE tokens where long/rare words are split into subwords
	raw := []WhisperSegment{
		{
			Text:    "What is comprehensible input? I am vacuuming the rug.",
			Offsets: WhisperOffsets{From: 0, To: 6000},
			Tokens: []WhisperToken{
				{Text: "What", Offsets: WhisperOffsets{From: 0, To: 400}},
				{Text: " is", Offsets: WhisperOffsets{From: 400, To: 700}},
				{Text: " compreh", Offsets: WhisperOffsets{From: 700, To: 1200}},
				{Text: "ensible", Offsets: WhisperOffsets{From: 1200, To: 1700}}, // subword continuation
				{Text: " input", Offsets: WhisperOffsets{From: 1700, To: 2200}},
				{Text: "?", Offsets: WhisperOffsets{From: 2200, To: 2400}}, // punctuation token
				{Text: " I", Offsets: WhisperOffsets{From: 2500, To: 2700}},
				{Text: " am", Offsets: WhisperOffsets{From: 2700, To: 3000}},
				{Text: " vacuum", Offsets: WhisperOffsets{From: 3000, To: 3500}},
				{Text: "ing", Offsets: WhisperOffsets{From: 3500, To: 3900}}, // subword continuation
				{Text: " the", Offsets: WhisperOffsets{From: 3900, To: 4200}},
				{Text: " rug", Offsets: WhisperOffsets{From: 4200, To: 4700}},
				{Text: ".", Offsets: WhisperOffsets{From: 4700, To: 4900}},
			},
		},
	}

	result := segmenter.ProcessSegments(raw)
	if len(result) != 2 {
		t.Fatalf("expected 2 sentences, got %d", len(result))
	}

	if result[0].Transcript != "What is comprehensible input?" {
		t.Errorf("sentence 0 wrong: %q, want %q", result[0].Transcript, "What is comprehensible input?")
	}
	if result[1].Transcript != "I am vacuuming the rug." {
		t.Errorf("sentence 1 wrong: %q, want %q", result[1].Transcript, "I am vacuuming the rug.")
	}

	// Verify word timings in sentence 0: "comprehensible" must be 1 unified word!
	var foundComprehensible bool
	for _, w := range result[0].Words {
		if w.Text == "comprehensible" {
			foundComprehensible = true
			if w.StartMs != 700 || w.EndMs != 1700 {
				t.Errorf("comprehensible timing wrong: %d - %d, want 700 - 1700", w.StartMs, w.EndMs)
			}
		}
	}
	if !foundComprehensible {
		t.Errorf("expected unified word 'comprehensible' in WordTimings, got: %+v", result[0].Words)
	}

	// Verify word timings in sentence 1: "vacuuming" must be 1 unified word!
	var foundVacuuming bool
	for _, w := range result[1].Words {
		if w.Text == "vacuuming" {
			foundVacuuming = true
			if w.StartMs != 3000 || w.EndMs != 3900 {
				t.Errorf("vacuuming timing wrong: %d - %d, want 3000 - 3900", w.StartMs, w.EndMs)
			}
		}
	}
	if !foundVacuuming {
		t.Errorf("expected unified word 'vacuuming' in WordTimings, got: %+v", result[1].Words)
	}
}

func TestCleanTranscriptText(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			"Hello . Are you ready to improve your English ?",
			"Hello. Are you ready to improve your English?",
		},
		{
			"It is August 21 st , okay ? And August 28 th is my birthday .",
			"It is August 21st, okay? And August 28th is my birthday.",
		},
		{
			"I 'm not going to do chores , don 't worry .",
			"I'm not going to do chores, don't worry.",
		},
		{
			"flip - flops are great for summer .",
			"Flip-flops are great for summer.",
		},
		{
			"I am m owing the lawn with my lawn m ower .",
			"I am mowing the lawn with my lawn mower.",
		},
		{
			"The first one is to r ake . I am r aking leaves .",
			"The first one is to rake. I am raking leaves.",
		},
		{
			"because the dogs i don't know where their mouths have been so they're probably dirty i'm going to shake this can",
			"Because the dogs I don't know where their mouths have been so they're probably dirty I'm going to shake this can",
		},
		{
			"queen from england no Elizabeth II. so this is the queen's wave",
			"Queen from England no Elizabeth II. So this is the queen's wave",
		},
		{
			"build skyscrapers prisons schools Now I'm gonna hang my hat",
			"Build skyscrapers prisons schools. Now I'm gonna hang my hat",
		},
		{
			"I've lifted the sofa It's also very common",
			"I've lifted the sofa. It's also very common",
		},
		{
			"What is it ? it is a dog .",
			"What is it? It is a dog.",
		},
		{
			"It is 5. 45 in the afternoon .",
			"It is 5.45 in the afternoon.",
		},
		{
			"The delay was 1. 0s exactly .",
			"The delay was 1.0s exactly.",
		},
		{
			"visit volcaenglish. Com for more lessons .",
			"Visit volcaenglish.com for more lessons.",
		},
		{
			"The laptop was$10, 000 in total .",
			"The laptop was $10,000 in total.",
		},
		{
			"It costs $ 500 each .",
			"It costs $500 each.",
		},
		{
			"My fingers are wr inkly and my kn uckles hurt .",
			"My fingers are wrinkly and my knuckles hurt.",
		},
		{
			"Use the nail cl ippers for tr inkets .",
			"Use the nail clippers for trinkets.",
		},
		{
			"Stop hes itating and learn CE FR level English .",
			"Stop hesitating and learn CEFR level English.",
		},
		{
			"That was so can adian and we budget ed 3, 000 dollars .",
			"That was so Canadian and we budgeted 3,000 dollars.",
		},
		{
			"We stopped at Circle Kand bought a hat for $2.$2?",
			"We stopped at Circle K and bought a hat for $2. $2?",
		},
		{
			"I have hair my. Hair is wet and do you have a. Lot of hair",
			"I have hair my hair is wet and do you have a lot of hair",
		},
		{
			"Study at C E F Rlevel and practice with PDFfile .",
			"Study at CEFR level and practice with PDF file.",
		},
		{
			"Yeah,$15 to $20 for dinner with barack obama .",
			"Yeah, $15 to $20 for dinner with Barack Obama.",
		},
		{
			"I'm going to start with the.",
			"I'm going to start with the...",
		},
	}

	for _, tt := range tests {
		got := CleanTranscriptText(tt.input)
		if got != tt.expected {
			t.Errorf("CleanTranscriptText(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

func TestProcessSegmentsDecimalsAndDomains(t *testing.T) {
	segmenter := NewSegmenter()

	raw := []WhisperSegment{
		{
			Text:    "It is 5.45 and visit volcaenglish.com.",
			Offsets: WhisperOffsets{From: 1000, To: 6000},
			Tokens: []WhisperToken{
				{Text: "It", Offsets: WhisperOffsets{From: 1000, To: 1200}},
				{Text: " is", Offsets: WhisperOffsets{From: 1200, To: 1400}},
				{Text: " 5.", Offsets: WhisperOffsets{From: 1400, To: 1700}},
				{Text: "45", Offsets: WhisperOffsets{From: 1700, To: 2000}},
				{Text: " and", Offsets: WhisperOffsets{From: 2000, To: 2300}},
				{Text: " visit", Offsets: WhisperOffsets{From: 2300, To: 2600}},
				{Text: " volcaenglish.", Offsets: WhisperOffsets{From: 2600, To: 3200}},
				{Text: "com", Offsets: WhisperOffsets{From: 3200, To: 3500}},
				{Text: ".", Offsets: WhisperOffsets{From: 3500, To: 3600}},
			},
		},
	}

	result := segmenter.ProcessSegments(raw)
	if len(result) != 1 {
		t.Fatalf("expected 1 sentence, got %d: %+v", len(result), result)
	}

	expected := "It is 5.45 and visit volcaenglish.com."
	if result[0].Transcript != expected {
		t.Errorf("transcript wrong: got %q, want %q", result[0].Transcript, expected)
	}
}

func TestProcessSegmentsClauseConnectorSplit(t *testing.T) {
	segmenter := NewSegmenter()

	// Simulating rapid speech lasting > 10s where speaker says "...better audio" (at 10s) followed by "and" (at 10.3s)
	raw := []WhisperSegment{
		{
			Text:    "I bought a brand new microphone because I needed better audio and when I went outside it was windy",
			Offsets: WhisperOffsets{From: 0, To: 16000},
			Tokens: []WhisperToken{
				{Text: "I", Offsets: WhisperOffsets{From: 0, To: 500}},
				{Text: " bought", Offsets: WhisperOffsets{From: 500, To: 1200}},
				{Text: " a", Offsets: WhisperOffsets{From: 1200, To: 1500}},
				{Text: " brand", Offsets: WhisperOffsets{From: 1500, To: 2200}},
				{Text: " new", Offsets: WhisperOffsets{From: 2200, To: 3000}},
				{Text: " microphone", Offsets: WhisperOffsets{From: 3000, To: 4500}},
				{Text: " because", Offsets: WhisperOffsets{From: 4500, To: 5500}},
				{Text: " I", Offsets: WhisperOffsets{From: 5500, To: 6200}},
				{Text: " needed", Offsets: WhisperOffsets{From: 6200, To: 7500}},
				{Text: " better", Offsets: WhisperOffsets{From: 7500, To: 8800}},
				{Text: " audio", Offsets: WhisperOffsets{From: 8800, To: 10000}},
				// 300ms pause at 10s (>= 9500ms duration and >= 200ms gap before clause connector "and")
				{Text: " and", Offsets: WhisperOffsets{From: 10300, To: 10600}},
				{Text: " when", Offsets: WhisperOffsets{From: 10600, To: 11200}},
				{Text: " I", Offsets: WhisperOffsets{From: 11200, To: 11800}},
				{Text: " went", Offsets: WhisperOffsets{From: 11800, To: 12500}},
				{Text: " outside", Offsets: WhisperOffsets{From: 12500, To: 13800}},
				{Text: " it", Offsets: WhisperOffsets{From: 13800, To: 14500}},
				{Text: " was", Offsets: WhisperOffsets{From: 14500, To: 15200}},
				{Text: " windy", Offsets: WhisperOffsets{From: 15200, To: 16000}},
			},
		},
	}

	result := segmenter.ProcessSegments(raw)
	if len(result) != 2 {
		t.Fatalf("expected 2 sentences split at clause connector, got %d: %+v", len(result), result)
	}

	if result[0].Transcript != "I bought a brand new microphone because I needed better audio." {
		t.Errorf("sentence 0 wrong: %q", result[0].Transcript)
	}
	if result[1].Transcript != "And when I went outside it was windy." {
		t.Errorf("sentence 1 wrong: %q", result[1].Transcript)
	}
}

func TestProcessSegmentsSentenceStitcher(t *testing.T) {
	segmenter := NewSegmenter()

	// Test 1: Auxiliary split ("has been." + "Written on the form.")
	raw1 := []WhisperSegment{
		{
			Text:    "so that has been.",
			Offsets: WhisperOffsets{From: 1000, To: 3000},
			Tokens: []WhisperToken{
				{Text: "so", Offsets: WhisperOffsets{From: 1000, To: 1300}},
				{Text: " that", Offsets: WhisperOffsets{From: 1300, To: 1800}},
				{Text: " has", Offsets: WhisperOffsets{From: 1800, To: 2300}},
				{Text: " been.", Offsets: WhisperOffsets{From: 2300, To: 3000}},
			},
		},
		{
			Text:    "Written on the form.",
			Offsets: WhisperOffsets{From: 3100, To: 5000},
			Tokens: []WhisperToken{
				{Text: "Written", Offsets: WhisperOffsets{From: 3100, To: 3700}},
				{Text: " on", Offsets: WhisperOffsets{From: 3700, To: 4100}},
				{Text: " the", Offsets: WhisperOffsets{From: 4100, To: 4500}},
				{Text: " form.", Offsets: WhisperOffsets{From: 4500, To: 5000}},
			},
		},
	}

	res1 := segmenter.ProcessSegments(raw1)
	if len(res1) != 1 {
		t.Fatalf("Test 1 expected 1 stitched sentence, got %d: %+v", len(res1), res1)
	}
	expected1 := "So that has been written on the form."
	if res1[0].Transcript != expected1 {
		t.Errorf("Test 1 transcript = %q, want %q", res1[0].Transcript, expected1)
	}

	// Test 2: Multi-pass 3-way split ("You will now." + "Have half a minute to check your." + "Answers.")
	raw2 := []WhisperSegment{
		{
			Text:    "You will now.",
			Offsets: WhisperOffsets{From: 10000, To: 12000},
			Tokens: []WhisperToken{
				{Text: "You", Offsets: WhisperOffsets{From: 10000, To: 10500}},
				{Text: " will", Offsets: WhisperOffsets{From: 10500, To: 11200}},
				{Text: " now.", Offsets: WhisperOffsets{From: 11200, To: 12000}},
			},
		},
		{
			Text:    "Have half a minute to check your.",
			Offsets: WhisperOffsets{From: 12200, To: 15000},
			Tokens: []WhisperToken{
				{Text: "Have", Offsets: WhisperOffsets{From: 12200, To: 12700}},
				{Text: " half", Offsets: WhisperOffsets{From: 12700, To: 13200}},
				{Text: " a", Offsets: WhisperOffsets{From: 13200, To: 13400}},
				{Text: " minute", Offsets: WhisperOffsets{From: 13400, To: 14000}},
				{Text: " to", Offsets: WhisperOffsets{From: 14000, To: 14300}},
				{Text: " check", Offsets: WhisperOffsets{From: 14300, To: 14600}},
				{Text: " your.", Offsets: WhisperOffsets{From: 14600, To: 15000}},
			},
		},
		{
			Text:    "Answers.",
			Offsets: WhisperOffsets{From: 15200, To: 16500},
			Tokens: []WhisperToken{
				{Text: "Answers.", Offsets: WhisperOffsets{From: 15200, To: 16500}},
			},
		},
	}

	res2 := segmenter.ProcessSegments(raw2)
	if len(res2) != 1 {
		t.Fatalf("Test 2 expected 1 stitched sentence, got %d: %+v", len(res2), res2)
	}
	expected2 := "You will now have half a minute to check your answers."
	if res2[0].Transcript != expected2 {
		t.Errorf("Test 2 transcript = %q, want %q", res2[0].Transcript, expected2)
	}

	// Test 3: Dangling preposition ("change without." + "Notice during the tour.")
	raw3 := []WhisperSegment{
		{
			Text:    "change without.",
			Offsets: WhisperOffsets{From: 20000, To: 22000},
			Tokens: []WhisperToken{
				{Text: "change", Offsets: WhisperOffsets{From: 20000, To: 20800}},
				{Text: " without.", Offsets: WhisperOffsets{From: 20800, To: 22000}},
			},
		},
		{
			Text:    "Notice during the tour.",
			Offsets: WhisperOffsets{From: 22200, To: 24500},
			Tokens: []WhisperToken{
				{Text: "Notice", Offsets: WhisperOffsets{From: 22200, To: 22800}},
				{Text: " during", Offsets: WhisperOffsets{From: 22800, To: 23300}},
				{Text: " the", Offsets: WhisperOffsets{From: 23300, To: 23700}},
				{Text: " tour.", Offsets: WhisperOffsets{From: 23700, To: 24500}},
			},
		},
	}

	res3 := segmenter.ProcessSegments(raw3)
	if len(res3) != 1 {
		t.Fatalf("Test 3 expected 1 stitched sentence, got %d: %+v", len(res3), res3)
	}
	expected3 := "Change without notice during the tour."
	if res3[0].Transcript != expected3 {
		t.Errorf("Test 3 transcript = %q, want %q", res3[0].Transcript, expected3)
	}

	// Test 4: Number range split ("questions 15." + "To 20.")
	raw4 := []WhisperSegment{
		{
			Text:    "questions 15.",
			Offsets: WhisperOffsets{From: 30000, To: 31500},
			Tokens: []WhisperToken{
				{Text: "questions", Offsets: WhisperOffsets{From: 30000, To: 30800}},
				{Text: " 15.", Offsets: WhisperOffsets{From: 30800, To: 31500}},
			},
		},
		{
			Text:    "To 20.",
			Offsets: WhisperOffsets{From: 31700, To: 32500},
			Tokens: []WhisperToken{
				{Text: "To", Offsets: WhisperOffsets{From: 31700, To: 32000}},
				{Text: " 20.", Offsets: WhisperOffsets{From: 32000, To: 32500}},
			},
		},
	}

	res4 := segmenter.ProcessSegments(raw4)
	if len(res4) != 1 {
		t.Fatalf("Test 4 expected 1 stitched sentence, got %d: %+v", len(res4), res4)
	}
	expected4 := "Questions 15 to 20."
	if res4[0].Transcript != expected4 {
		t.Errorf("Test 4 transcript = %q, want %q", res4[0].Transcript, expected4)
	}
}

