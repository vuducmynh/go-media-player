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
		{
			"we advise medium denomin ations .",
			"We advise medium denominations.",
		},
		{
			"colleagues from work, you. Know, in our lunch hour .",
			"Colleagues from work, you know, in our lunch hour.",
		},
		{
			"Australian dollars.us dollars are starting .",
			"Australian dollars. US dollars are starting.",
		},
		{
			"rest of the conversation,. Complete the form",
			"Rest of the conversation, complete the form",
		},
		{
			"What is perhaps slightlyless well-known is this .",
			"What is perhaps slightly less well-known is this.",
		},
		{
			"December is able to supplyless than 5% in winter .",
			"December is able to supply less than 5% in winter.",
		},
		{
			"Yes, it's W- A- D- D- E- L- L.",
			"Yes, it's W-A-D-D-E-L-L.",
		},
		{
			"The card number is 4550-1392. 8309-32 21.",
			"The card number is 4550-1392-8309-3221.",
		},
		{
			"capital, wellington, and mount Narahoe on the transcoastal .",
			"Capital, Wellington, and Mount Narahoe on the Transcoastal.",
		},
		{
			"And that's Nelson, isn't it that's right .",
			"And that's Nelson, isn't it? That's right.",
		},
		{
			"Do you have any information about that oh yes, I've got an illustration .",
			"Do you have any information about that? Oh yes, I've got an illustration.",
		},
		{
			"by May before you hear the rest of the recording, you have some time .",
			"By May. Before you hear the rest of the recording, you have some time.",
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

	// Test 5: Subordinate subject pronoun split ("after the lecture, as I." + "Have a book list here.")
	raw5 := []WhisperSegment{
		{
			Text:    "after the lecture, as I.",
			Offsets: WhisperOffsets{From: 40000, To: 42000},
			Tokens: []WhisperToken{
				{Text: "after", Offsets: WhisperOffsets{From: 40000, To: 40400}},
				{Text: " the", Offsets: WhisperOffsets{From: 40400, To: 40700}},
				{Text: " lecture,", Offsets: WhisperOffsets{From: 40700, To: 41200}},
				{Text: " as", Offsets: WhisperOffsets{From: 41200, To: 41600}},
				{Text: " I.", Offsets: WhisperOffsets{From: 41600, To: 42000}},
			},
		},
		{
			Text:    "Have a book list here.",
			Offsets: WhisperOffsets{From: 42200, To: 44000},
			Tokens: []WhisperToken{
				{Text: "Have", Offsets: WhisperOffsets{From: 42200, To: 42600}},
				{Text: " a", Offsets: WhisperOffsets{From: 42600, To: 42800}},
				{Text: " book", Offsets: WhisperOffsets{From: 42800, To: 43200}},
				{Text: " list", Offsets: WhisperOffsets{From: 43200, To: 43600}},
				{Text: " here.", Offsets: WhisperOffsets{From: 43600, To: 44000}},
			},
		},
	}
	res5 := segmenter.ProcessSegments(raw5)
	if len(res5) != 1 {
		t.Fatalf("Test 5 expected 1 stitched sentence, got %d: %+v", len(res5), res5)
	}
	expected5 := "After the lecture, as I have a book list here."
	if res5[0].Transcript != expected5 {
		t.Errorf("Test 5 transcript = %q, want %q", res5[0].Transcript, expected5)
	}

	// Test 6: Hyphenated compound adjective ("my first five-week." + "Course right.")
	raw6 := []WhisperSegment{
		{
			Text:    "my first five-week.",
			Offsets: WhisperOffsets{From: 50000, To: 52000},
			Tokens: []WhisperToken{
				{Text: "my", Offsets: WhisperOffsets{From: 50000, To: 50400}},
				{Text: " first", Offsets: WhisperOffsets{From: 50400, To: 50900}},
				{Text: " five-week.", Offsets: WhisperOffsets{From: 50900, To: 52000}},
			},
		},
		{
			Text:    "Course right.",
			Offsets: WhisperOffsets{From: 52200, To: 54000},
			Tokens: []WhisperToken{
				{Text: "Course", Offsets: WhisperOffsets{From: 52200, To: 53000}},
				{Text: " right.", Offsets: WhisperOffsets{From: 53000, To: 54000}},
			},
		},
	}
	res6 := segmenter.ProcessSegments(raw6)
	if len(res6) != 1 {
		t.Fatalf("Test 6 expected 1 stitched sentence, got %d: %+v", len(res6), res6)
	}
	expected6 := "My first five-week course right."
	if res6[0].Transcript != expected6 {
		t.Errorf("Test 6 transcript = %q, want %q", res6[0].Transcript, expected6)
	}

	// Test 7: Attributive participle adjective ("in neighbouring." + "Countries require you.")
	raw7 := []WhisperSegment{
		{
			Text:    "in neighbouring.",
			Offsets: WhisperOffsets{From: 60000, To: 61500},
			Tokens: []WhisperToken{
				{Text: "in", Offsets: WhisperOffsets{From: 60000, To: 60300}},
				{Text: " neighbouring.", Offsets: WhisperOffsets{From: 60300, To: 61500}},
			},
		},
		{
			Text:    "Countries require you.",
			Offsets: WhisperOffsets{From: 61700, To: 63500},
			Tokens: []WhisperToken{
				{Text: "Countries", Offsets: WhisperOffsets{From: 61700, To: 62400}},
				{Text: " require", Offsets: WhisperOffsets{From: 62400, To: 63000}},
				{Text: " you.", Offsets: WhisperOffsets{From: 63000, To: 63500}},
			},
		},
	}
	res7 := segmenter.ProcessSegments(raw7)
	if len(res7) != 1 {
		t.Fatalf("Test 7 expected 1 stitched sentence, got %d: %+v", len(res7), res7)
	}
	expected7 := "In neighbouring countries require you."
	if res7[0].Transcript != expected7 {
		t.Errorf("Test 7 transcript = %q, want %q", res7[0].Transcript, expected7)
	}

	// Test 8: Verb taking to-infinitive ("when people start." + "To look a bit stressed.")
	raw8 := []WhisperSegment{
		{
			Text:    "when people start.",
			Offsets: WhisperOffsets{From: 70000, To: 71500},
			Tokens: []WhisperToken{
				{Text: "when", Offsets: WhisperOffsets{From: 70000, To: 70400}},
				{Text: " people", Offsets: WhisperOffsets{From: 70400, To: 70900}},
				{Text: " start.", Offsets: WhisperOffsets{From: 70900, To: 71500}},
			},
		},
		{
			Text:    "To look a bit stressed.",
			Offsets: WhisperOffsets{From: 71700, To: 73500},
			Tokens: []WhisperToken{
				{Text: "To", Offsets: WhisperOffsets{From: 71700, To: 72000}},
				{Text: " look", Offsets: WhisperOffsets{From: 72000, To: 72400}},
				{Text: " a", Offsets: WhisperOffsets{From: 72400, To: 72600}},
				{Text: " bit", Offsets: WhisperOffsets{From: 72600, To: 72900}},
				{Text: " stressed.", Offsets: WhisperOffsets{From: 72900, To: 73500}},
			},
		},
	}
	res8 := segmenter.ProcessSegments(raw8)
	if len(res8) != 1 {
		t.Fatalf("Test 8 expected 1 stitched sentence, got %d: %+v", len(res8), res8)
	}
	expected8 := "When people start to look a bit stressed."
	if res8[0].Transcript != expected8 {
		t.Errorf("Test 8 transcript = %q, want %q", res8[0].Transcript, expected8)
	}

	// Test 9: Transitive verb object split ("mainly because they have." + "An assignment to do.")
	raw9 := []WhisperSegment{
		{
			Text:    "mainly because they have.",
			Offsets: WhisperOffsets{From: 80000, To: 82000},
			Tokens: []WhisperToken{
				{Text: "mainly", Offsets: WhisperOffsets{From: 80000, To: 80500}},
				{Text: " because", Offsets: WhisperOffsets{From: 80500, To: 81000}},
				{Text: " they", Offsets: WhisperOffsets{From: 81000, To: 81400}},
				{Text: " have.", Offsets: WhisperOffsets{From: 81400, To: 82000}},
			},
		},
		{
			Text:    "An assignment to do.",
			Offsets: WhisperOffsets{From: 82200, To: 84000},
			Tokens: []WhisperToken{
				{Text: "An", Offsets: WhisperOffsets{From: 82200, To: 82500}},
				{Text: " assignment", Offsets: WhisperOffsets{From: 82500, To: 83200}},
				{Text: " to", Offsets: WhisperOffsets{From: 83200, To: 83500}},
				{Text: " do.", Offsets: WhisperOffsets{From: 83500, To: 84000}},
			},
		},
	}
	res9 := segmenter.ProcessSegments(raw9)
	if len(res9) != 1 {
		t.Fatalf("Test 9 expected 1 stitched sentence, got %d: %+v", len(res9), res9)
	}
	expected9 := "Mainly because they have an assignment to do."
	if res9[0].Transcript != expected9 {
		t.Errorf("Test 9 transcript = %q, want %q", res9[0].Transcript, expected9)
	}

	// Test 10: Compound noun split ("how to use the library." + "Computer system.")
	raw10 := []WhisperSegment{
		{
			Text:    "how to use the library.",
			Offsets: WhisperOffsets{From: 90000, To: 92000},
			Tokens: []WhisperToken{
				{Text: "how", Offsets: WhisperOffsets{From: 90000, To: 90300}},
				{Text: " to", Offsets: WhisperOffsets{From: 90300, To: 90600}},
				{Text: " use", Offsets: WhisperOffsets{From: 90600, To: 91000}},
				{Text: " the", Offsets: WhisperOffsets{From: 91000, To: 91300}},
				{Text: " library.", Offsets: WhisperOffsets{From: 91300, To: 92000}},
			},
		},
		{
			Text:    "Computer system.",
			Offsets: WhisperOffsets{From: 92200, To: 93800},
			Tokens: []WhisperToken{
				{Text: "Computer", Offsets: WhisperOffsets{From: 92200, To: 93000}},
				{Text: " system.", Offsets: WhisperOffsets{From: 93000, To: 93800}},
			},
		},
	}
	res10 := segmenter.ProcessSegments(raw10)
	if len(res10) != 1 {
		t.Fatalf("Test 10 expected 1 stitched sentence, got %d: %+v", len(res10), res10)
	}
	expected10 := "How to use the library computer system."
	if res10[0].Transcript != expected10 {
		t.Errorf("Test 10 transcript = %q, want %q", res10[0].Transcript, expected10)
	}

	// Test 11: IELTS prompt clause ("As you listen to the rest of the conversation,." + "Complete the form by filling in.")
	raw11 := []WhisperSegment{
		{
			Text:    "As you listen to the rest of the conversation,.",
			Offsets: WhisperOffsets{From: 100000, To: 103000},
			Tokens: []WhisperToken{
				{Text: "As", Offsets: WhisperOffsets{From: 100000, To: 100400}},
				{Text: " you", Offsets: WhisperOffsets{From: 100400, To: 100700}},
				{Text: " listen", Offsets: WhisperOffsets{From: 100700, To: 101200}},
				{Text: " to", Offsets: WhisperOffsets{From: 101200, To: 101500}},
				{Text: " the", Offsets: WhisperOffsets{From: 101500, To: 101800}},
				{Text: " rest", Offsets: WhisperOffsets{From: 101800, To: 102200}},
				{Text: " of", Offsets: WhisperOffsets{From: 102200, To: 102500}},
				{Text: " the", Offsets: WhisperOffsets{From: 102500, To: 102700}},
				{Text: " conversation,.", Offsets: WhisperOffsets{From: 102700, To: 103000}},
			},
		},
		{
			Text:    "Complete the form by filling in the numbered spaces six to ten.",
			Offsets: WhisperOffsets{From: 103200, To: 108000},
			Tokens: []WhisperToken{
				{Text: "Complete", Offsets: WhisperOffsets{From: 103200, To: 104000}},
				{Text: " the", Offsets: WhisperOffsets{From: 104000, To: 104400}},
				{Text: " form", Offsets: WhisperOffsets{From: 104400, To: 104900}},
				{Text: " by", Offsets: WhisperOffsets{From: 104900, To: 105200}},
				{Text: " filling", Offsets: WhisperOffsets{From: 105200, To: 105700}},
				{Text: " in", Offsets: WhisperOffsets{From: 105700, To: 106000}},
				{Text: " the", Offsets: WhisperOffsets{From: 106000, To: 106300}},
				{Text: " numbered", Offsets: WhisperOffsets{From: 106300, To: 106800}},
				{Text: " spaces", Offsets: WhisperOffsets{From: 106800, To: 107300}},
				{Text: " six", Offsets: WhisperOffsets{From: 107300, To: 107600}},
				{Text: " to", Offsets: WhisperOffsets{From: 107600, To: 107800}},
				{Text: " ten.", Offsets: WhisperOffsets{From: 107800, To: 108000}},
			},
		},
	}
	res11 := segmenter.ProcessSegments(raw11)
	if len(res11) != 1 {
		t.Fatalf("Test 11 expected 1 stitched sentence, got %d: %+v", len(res11), res11)
	}
	expected11 := "As you listen to the rest of the conversation, complete the form by filling in the numbered spaces six to ten."
	if res11[0].Transcript != expected11 {
		t.Errorf("Test 11 transcript = %q, want %q", res11[0].Transcript, expected11)
	}

	// Test 12: Long sentence (37 words) ending in linking verb + short orphan (3 words): "...start to look." + "A bit stressed."
	raw12 := []WhisperSegment{
		{
			Text:    "If you look around you at college you will see that during the first weeks of the term everyone looks cheerful and focused, followed by a change around week six, assignment time, when people start to look.",
			Offsets: WhisperOffsets{From: 110000, To: 121000},
			Tokens: []WhisperToken{
				{Text: "If", Offsets: WhisperOffsets{From: 110000, To: 110300}},
				{Text: " you", Offsets: WhisperOffsets{From: 110300, To: 110500}},
				{Text: " look", Offsets: WhisperOffsets{From: 110500, To: 110800}},
				{Text: " around", Offsets: WhisperOffsets{From: 110800, To: 111100}},
				{Text: " you", Offsets: WhisperOffsets{From: 111100, To: 111300}},
				{Text: " at", Offsets: WhisperOffsets{From: 111300, To: 111500}},
				{Text: " college", Offsets: WhisperOffsets{From: 111500, To: 111800}},
				{Text: " you", Offsets: WhisperOffsets{From: 111800, To: 112000}},
				{Text: " will", Offsets: WhisperOffsets{From: 112000, To: 112200}},
				{Text: " see", Offsets: WhisperOffsets{From: 112200, To: 112500}},
				{Text: " that", Offsets: WhisperOffsets{From: 112500, To: 112700}},
				{Text: " during", Offsets: WhisperOffsets{From: 112700, To: 113000}},
				{Text: " the", Offsets: WhisperOffsets{From: 113000, To: 113200}},
				{Text: " first", Offsets: WhisperOffsets{From: 113200, To: 113500}},
				{Text: " weeks", Offsets: WhisperOffsets{From: 113500, To: 113800}},
				{Text: " of", Offsets: WhisperOffsets{From: 113800, To: 114000}},
				{Text: " the", Offsets: WhisperOffsets{From: 114000, To: 114200}},
				{Text: " term", Offsets: WhisperOffsets{From: 114200, To: 114500}},
				{Text: " everyone", Offsets: WhisperOffsets{From: 114500, To: 115000}},
				{Text: " looks", Offsets: WhisperOffsets{From: 115000, To: 115300}},
				{Text: " cheerful", Offsets: WhisperOffsets{From: 115300, To: 115800}},
				{Text: " and", Offsets: WhisperOffsets{From: 115800, To: 116000}},
				{Text: " focused,", Offsets: WhisperOffsets{From: 116000, To: 116500}},
				{Text: " followed", Offsets: WhisperOffsets{From: 116500, To: 117000}},
				{Text: " by", Offsets: WhisperOffsets{From: 117000, To: 117200}},
				{Text: " a", Offsets: WhisperOffsets{From: 117200, To: 117400}},
				{Text: " change", Offsets: WhisperOffsets{From: 117400, To: 117800}},
				{Text: " around", Offsets: WhisperOffsets{From: 117800, To: 118200}},
				{Text: " week", Offsets: WhisperOffsets{From: 118200, To: 118500}},
				{Text: " six,", Offsets: WhisperOffsets{From: 118500, To: 119000}},
				{Text: " assignment", Offsets: WhisperOffsets{From: 119000, To: 119500}},
				{Text: " time,", Offsets: WhisperOffsets{From: 119500, To: 120000}},
				{Text: " when", Offsets: WhisperOffsets{From: 120000, To: 120300}},
				{Text: " people", Offsets: WhisperOffsets{From: 120300, To: 120600}},
				{Text: " start", Offsets: WhisperOffsets{From: 120600, To: 120800}},
				{Text: " to", Offsets: WhisperOffsets{From: 120800, To: 121000}},
				{Text: " look.", Offsets: WhisperOffsets{From: 121000, To: 121500}},
			},
		},
		{
			Text:    "A bit stressed.",
			Offsets: WhisperOffsets{From: 121700, To: 122600},
			Tokens: []WhisperToken{
				{Text: "A", Offsets: WhisperOffsets{From: 121700, To: 121900}},
				{Text: " bit", Offsets: WhisperOffsets{From: 121900, To: 122200}},
				{Text: " stressed.", Offsets: WhisperOffsets{From: 122200, To: 122600}},
			},
		},
	}
	res12 := segmenter.ProcessSegments(raw12)
	if len(res12) != 1 {
		t.Fatalf("Test 12 expected 1 stitched sentence, got %d: %+v", len(res12), res12)
	}
	expected12 := "If you look around you at college you will see that during the first weeks of the term everyone looks cheerful and focused, followed by a change around week six, assignment time, when people start to look a bit stressed."
	if res12[0].Transcript != expected12 {
		t.Errorf("Test 12 transcript = %q, want %q", res12[0].Transcript, expected12)
	}

	// Test 13: 35-word sentence ending in "you." + "Know, in our lunch hour."
	raw13 := []WhisperSegment{
		{
			Text:    "I usually go shopping on my own, but if I want to make it more of a social occasion with friends to have a coffee and things, I often go with colleagues from work, you.",
			Offsets: WhisperOffsets{From: 130000, To: 138000},
			Tokens: []WhisperToken{
				{Text: "I", Offsets: WhisperOffsets{From: 130000, To: 130200}},
				{Text: " usually", Offsets: WhisperOffsets{From: 130200, To: 130500}},
				{Text: " go", Offsets: WhisperOffsets{From: 130500, To: 130700}},
				{Text: " shopping", Offsets: WhisperOffsets{From: 130700, To: 131000}},
				{Text: " on", Offsets: WhisperOffsets{From: 131000, To: 131200}},
				{Text: " my", Offsets: WhisperOffsets{From: 131200, To: 131400}},
				{Text: " own,", Offsets: WhisperOffsets{From: 131400, To: 131700}},
				{Text: " but", Offsets: WhisperOffsets{From: 131700, To: 132000}},
				{Text: " if", Offsets: WhisperOffsets{From: 132000, To: 132200}},
				{Text: " I", Offsets: WhisperOffsets{From: 132200, To: 132400}},
				{Text: " want", Offsets: WhisperOffsets{From: 132400, To: 132700}},
				{Text: " to", Offsets: WhisperOffsets{From: 132700, To: 132900}},
				{Text: " make", Offsets: WhisperOffsets{From: 132900, To: 133200}},
				{Text: " it", Offsets: WhisperOffsets{From: 133200, To: 133400}},
				{Text: " more", Offsets: WhisperOffsets{From: 133400, To: 133700}},
				{Text: " of", Offsets: WhisperOffsets{From: 133700, To: 133900}},
				{Text: " a", Offsets: WhisperOffsets{From: 133900, To: 134100}},
				{Text: " social", Offsets: WhisperOffsets{From: 134100, To: 134400}},
				{Text: " occasion", Offsets: WhisperOffsets{From: 134400, To: 134800}},
				{Text: " with", Offsets: WhisperOffsets{From: 134800, To: 135000}},
				{Text: " friends", Offsets: WhisperOffsets{From: 135000, To: 135400}},
				{Text: " to", Offsets: WhisperOffsets{From: 135400, To: 135600}},
				{Text: " have", Offsets: WhisperOffsets{From: 135600, To: 135800}},
				{Text: " a", Offsets: WhisperOffsets{From: 135800, To: 136000}},
				{Text: " coffee", Offsets: WhisperOffsets{From: 136000, To: 136400}},
				{Text: " and", Offsets: WhisperOffsets{From: 136400, To: 136600}},
				{Text: " things,", Offsets: WhisperOffsets{From: 136600, To: 137000}},
				{Text: " I", Offsets: WhisperOffsets{From: 137000, To: 137200}},
				{Text: " often", Offsets: WhisperOffsets{From: 137200, To: 137400}},
				{Text: " go", Offsets: WhisperOffsets{From: 137400, To: 137600}},
				{Text: " with", Offsets: WhisperOffsets{From: 137600, To: 137800}},
				{Text: " colleagues", Offsets: WhisperOffsets{From: 137800, To: 138100}},
				{Text: " from", Offsets: WhisperOffsets{From: 138100, To: 138300}},
				{Text: " work,", Offsets: WhisperOffsets{From: 138300, To: 138600}},
				{Text: " you.", Offsets: WhisperOffsets{From: 138600, To: 139000}},
			},
		},
		{
			Text:    "Know, in our lunch hour.",
			Offsets: WhisperOffsets{From: 139200, To: 140000},
			Tokens: []WhisperToken{
				{Text: "Know,", Offsets: WhisperOffsets{From: 139200, To: 139500}},
				{Text: " in", Offsets: WhisperOffsets{From: 139500, To: 139600}},
				{Text: " our", Offsets: WhisperOffsets{From: 139600, To: 139700}},
				{Text: " lunch", Offsets: WhisperOffsets{From: 139700, To: 139900}},
				{Text: " hour.", Offsets: WhisperOffsets{From: 139900, To: 140000}},
			},
		},
	}
	res13 := segmenter.ProcessSegments(raw13)
	if len(res13) != 1 {
		t.Fatalf("Test 13 expected 1 stitched sentence, got %d: %+v", len(res13), res13)
	}
	expected13 := "I usually go shopping on my own, but if I want to make it more of a social occasion with friends to have a coffee and things, I often go with colleagues from work, you know, in our lunch hour."
	if res13[0].Transcript != expected13 {
		t.Errorf("Test 13 transcript = %q, want %q", res13[0].Transcript, expected13)
	}

	// Test 14: 38-word sentence ending in "...have a book." + "List here and some other useful materials."
	raw14 := []WhisperSegment{
		{
			Text:    "Hundreds of books have been written about time management, and those of you who are interested in doing some extra reading on the subject are very welcome to see me after the lecture, as I have a book.",
			Offsets: WhisperOffsets{From: 150000, To: 161000},
			Tokens: []WhisperToken{
				{Text: "Hundreds", Offsets: WhisperOffsets{From: 150000, To: 150500}},
				{Text: " of", Offsets: WhisperOffsets{From: 150500, To: 150700}},
				{Text: " books", Offsets: WhisperOffsets{From: 150700, To: 151000}},
				{Text: " have", Offsets: WhisperOffsets{From: 151000, To: 151200}},
				{Text: " been", Offsets: WhisperOffsets{From: 151200, To: 151400}},
				{Text: " written", Offsets: WhisperOffsets{From: 151400, To: 151700}},
				{Text: " about", Offsets: WhisperOffsets{From: 151700, To: 152000}},
				{Text: " time", Offsets: WhisperOffsets{From: 152000, To: 152300}},
				{Text: " management,", Offsets: WhisperOffsets{From: 152300, To: 152800}},
				{Text: " and", Offsets: WhisperOffsets{From: 152800, To: 153000}},
				{Text: " those", Offsets: WhisperOffsets{From: 153000, To: 153300}},
				{Text: " of", Offsets: WhisperOffsets{From: 153300, To: 153500}},
				{Text: " you", Offsets: WhisperOffsets{From: 153500, To: 153700}},
				{Text: " who", Offsets: WhisperOffsets{From: 153700, To: 153900}},
				{Text: " are", Offsets: WhisperOffsets{From: 153900, To: 154100}},
				{Text: " interested", Offsets: WhisperOffsets{From: 154100, To: 154500}},
				{Text: " in", Offsets: WhisperOffsets{From: 154500, To: 154700}},
				{Text: " doing", Offsets: WhisperOffsets{From: 154700, To: 155000}},
				{Text: " some", Offsets: WhisperOffsets{From: 155000, To: 155200}},
				{Text: " extra", Offsets: WhisperOffsets{From: 155200, To: 155500}},
				{Text: " reading", Offsets: WhisperOffsets{From: 155500, To: 155800}},
				{Text: " on", Offsets: WhisperOffsets{From: 155800, To: 156000}},
				{Text: " the", Offsets: WhisperOffsets{From: 156000, To: 156200}},
				{Text: " subject", Offsets: WhisperOffsets{From: 156200, To: 156500}},
				{Text: " are", Offsets: WhisperOffsets{From: 156500, To: 156700}},
				{Text: " very", Offsets: WhisperOffsets{From: 156700, To: 157000}},
				{Text: " welcome", Offsets: WhisperOffsets{From: 157000, To: 157300}},
				{Text: " to", Offsets: WhisperOffsets{From: 157300, To: 157500}},
				{Text: " see", Offsets: WhisperOffsets{From: 157500, To: 157700}},
				{Text: " me", Offsets: WhisperOffsets{From: 157700, To: 157900}},
				{Text: " after", Offsets: WhisperOffsets{From: 157900, To: 158200}},
				{Text: " the", Offsets: WhisperOffsets{From: 158200, To: 158400}},
				{Text: " lecture,", Offsets: WhisperOffsets{From: 158400, To: 158800}},
				{Text: " as", Offsets: WhisperOffsets{From: 158800, To: 159000}},
				{Text: " I", Offsets: WhisperOffsets{From: 159000, To: 159200}},
				{Text: " have", Offsets: WhisperOffsets{From: 159200, To: 159500}},
				{Text: " a", Offsets: WhisperOffsets{From: 159500, To: 159700}},
				{Text: " book.", Offsets: WhisperOffsets{From: 159700, To: 160000}},
			},
		},
		{
			Text:    "List here and some other useful materials.",
			Offsets: WhisperOffsets{From: 160200, To: 164000},
			Tokens: []WhisperToken{
				{Text: "List", Offsets: WhisperOffsets{From: 160200, To: 160500}},
				{Text: " here", Offsets: WhisperOffsets{From: 160500, To: 160800}},
				{Text: " and", Offsets: WhisperOffsets{From: 160800, To: 161000}},
				{Text: " some", Offsets: WhisperOffsets{From: 161000, To: 161300}},
				{Text: " other", Offsets: WhisperOffsets{From: 161300, To: 161600}},
				{Text: " useful", Offsets: WhisperOffsets{From: 161600, To: 162000}},
				{Text: " materials.", Offsets: WhisperOffsets{From: 162000, To: 164000}},
			},
		},
	}
	res14 := segmenter.ProcessSegments(raw14)
	if len(res14) != 1 {
		t.Fatalf("Test 14 expected 1 stitched sentence, got %d: %+v", len(res14), res14)
	}
	expected14 := "Hundreds of books have been written about time management, and those of you who are interested in doing some extra reading on the subject are very welcome to see me after the lecture, as I have a book list here and some other useful materials."
	if res14[0].Transcript != expected14 {
		t.Errorf("Test 14 transcript = %q, want %q", res14[0].Transcript, expected14)
	}

	// Test 15: Relative clause predicate on 36-word sentence ("...in neighbouring countries." + "Require you to provide a letter...")
	raw15 := []WhisperSegment{
		{
			Text:    "Now, for those of you who are intending to take Esnia as part of a longer tour and want to wait till you get to another country, do remember that some Esnian consulates in neighbouring countries.",
			Offsets: WhisperOffsets{From: 170000, To: 181000},
			Tokens: []WhisperToken{
				{Text: "Now,", Offsets: WhisperOffsets{From: 170000, To: 170300}},
				{Text: " for", Offsets: WhisperOffsets{From: 170300, To: 170500}},
				{Text: " those", Offsets: WhisperOffsets{From: 170500, To: 170800}},
				{Text: " of", Offsets: WhisperOffsets{From: 170800, To: 171000}},
				{Text: " you", Offsets: WhisperOffsets{From: 171000, To: 171200}},
				{Text: " who", Offsets: WhisperOffsets{From: 171200, To: 171400}},
				{Text: " are", Offsets: WhisperOffsets{From: 171400, To: 171600}},
				{Text: " intending", Offsets: WhisperOffsets{From: 171600, To: 172000}},
				{Text: " to", Offsets: WhisperOffsets{From: 172000, To: 172200}},
				{Text: " take", Offsets: WhisperOffsets{From: 172200, To: 172500}},
				{Text: " Esnia", Offsets: WhisperOffsets{From: 172500, To: 172800}},
				{Text: " as", Offsets: WhisperOffsets{From: 172800, To: 173000}},
				{Text: " part", Offsets: WhisperOffsets{From: 173000, To: 173300}},
				{Text: " of", Offsets: WhisperOffsets{From: 173300, To: 173500}},
				{Text: " a", Offsets: WhisperOffsets{From: 173500, To: 173700}},
				{Text: " longer", Offsets: WhisperOffsets{From: 173700, To: 174000}},
				{Text: " tour", Offsets: WhisperOffsets{From: 174000, To: 174300}},
				{Text: " and", Offsets: WhisperOffsets{From: 174300, To: 174500}},
				{Text: " want", Offsets: WhisperOffsets{From: 174500, To: 174800}},
				{Text: " to", Offsets: WhisperOffsets{From: 174800, To: 175000}},
				{Text: " wait", Offsets: WhisperOffsets{From: 175000, To: 175300}},
				{Text: " till", Offsets: WhisperOffsets{From: 175300, To: 175500}},
				{Text: " you", Offsets: WhisperOffsets{From: 175500, To: 175700}},
				{Text: " get", Offsets: WhisperOffsets{From: 175700, To: 176000}},
				{Text: " to", Offsets: WhisperOffsets{From: 176000, To: 176200}},
				{Text: " another", Offsets: WhisperOffsets{From: 176200, To: 176500}},
				{Text: " country,", Offsets: WhisperOffsets{From: 176500, To: 176800}},
				{Text: " do", Offsets: WhisperOffsets{From: 176800, To: 177000}},
				{Text: " remember", Offsets: WhisperOffsets{From: 177000, To: 177400}},
				{Text: " that", Offsets: WhisperOffsets{From: 177400, To: 177600}},
				{Text: " some", Offsets: WhisperOffsets{From: 177600, To: 177800}},
				{Text: " Esnian", Offsets: WhisperOffsets{From: 177800, To: 178200}},
				{Text: " consulates", Offsets: WhisperOffsets{From: 178200, To: 178600}},
				{Text: " in", Offsets: WhisperOffsets{From: 178600, To: 178800}},
				{Text: " neighbouring", Offsets: WhisperOffsets{From: 178800, To: 179300}},
				{Text: " countries.", Offsets: WhisperOffsets{From: 179300, To: 180000}},
			},
		},
		{
			Text:    "Require you to provide a letter from your own embassy, just to confirm your nationality.",
			Offsets: WhisperOffsets{From: 180200, To: 185000},
			Tokens: []WhisperToken{
				{Text: "Require", Offsets: WhisperOffsets{From: 180200, To: 180600}},
				{Text: " you", Offsets: WhisperOffsets{From: 180600, To: 180800}},
				{Text: " to", Offsets: WhisperOffsets{From: 180800, To: 181000}},
				{Text: " provide", Offsets: WhisperOffsets{From: 181000, To: 181400}},
				{Text: " a", Offsets: WhisperOffsets{From: 181400, To: 181600}},
				{Text: " letter", Offsets: WhisperOffsets{From: 181600, To: 182000}},
				{Text: " from", Offsets: WhisperOffsets{From: 182000, To: 182200}},
				{Text: " your", Offsets: WhisperOffsets{From: 182200, To: 182400}},
				{Text: " own", Offsets: WhisperOffsets{From: 182400, To: 182600}},
				{Text: " embassy,", Offsets: WhisperOffsets{From: 182600, To: 183000}},
				{Text: " just", Offsets: WhisperOffsets{From: 183000, To: 183300}},
				{Text: " to", Offsets: WhisperOffsets{From: 183300, To: 183500}},
				{Text: " confirm", Offsets: WhisperOffsets{From: 183500, To: 184000}},
				{Text: " your", Offsets: WhisperOffsets{From: 184000, To: 184200}},
				{Text: " nationality.", Offsets: WhisperOffsets{From: 184200, To: 185000}},
			},
		},
	}
	res15 := segmenter.ProcessSegments(raw15)
	if len(res15) != 1 {
		t.Fatalf("Test 15 expected 1 stitched sentence, got %d: %+v", len(res15), res15)
	}
	expected15 := "Now, for those of you who are intending to take Esnia as part of a longer tour and want to wait till you get to another country, do remember that some Esnian consulates in neighbouring countries require you to provide a letter from your own embassy, just to confirm your nationality."
	if res15[0].Transcript != expected15 {
		t.Errorf("Test 15 transcript = %q, want %q", res15[0].Transcript, expected15)
	}
}

func TestProcessSegmentsPT2Patterns(t *testing.T) {
	segmenter := NewSegmenter()

	// Test PT2-1: Honorific abbreviation "Mr." followed by person name
	raw1 := []WhisperSegment{
		{
			Text:    "Continuing our theme of business marketing, I have with me today Mr.",
			Offsets: WhisperOffsets{From: 1000, To: 5000},
			Tokens: []WhisperToken{
				{Text: "Continuing", Offsets: WhisperOffsets{From: 1000, To: 1500}},
				{Text: " our", Offsets: WhisperOffsets{From: 1500, To: 1800}},
				{Text: " theme", Offsets: WhisperOffsets{From: 1800, To: 2200}},
				{Text: " of", Offsets: WhisperOffsets{From: 2200, To: 2400}},
				{Text: " business", Offsets: WhisperOffsets{From: 2400, To: 2800}},
				{Text: " marketing,", Offsets: WhisperOffsets{From: 2800, To: 3500}},
				{Text: " I", Offsets: WhisperOffsets{From: 3500, To: 3700}},
				{Text: " have", Offsets: WhisperOffsets{From: 3700, To: 4000}},
				{Text: " with", Offsets: WhisperOffsets{From: 4000, To: 4200}},
				{Text: " me", Offsets: WhisperOffsets{From: 4200, To: 4400}},
				{Text: " today", Offsets: WhisperOffsets{From: 4400, To: 4700}},
				{Text: " Mr.", Offsets: WhisperOffsets{From: 4700, To: 5000}},
			},
		},
		{
			Text:    "Brian Kinsella, who is here to talk about marketing.",
			Offsets: WhisperOffsets{From: 5500, To: 9000},
			Tokens: []WhisperToken{
				{Text: "Brian", Offsets: WhisperOffsets{From: 5500, To: 5900}},
				{Text: " Kinsella,", Offsets: WhisperOffsets{From: 5900, To: 6500}},
				{Text: " who", Offsets: WhisperOffsets{From: 6500, To: 6800}},
				{Text: " is", Offsets: WhisperOffsets{From: 6800, To: 7000}},
				{Text: " here", Offsets: WhisperOffsets{From: 7000, To: 7300}},
				{Text: " to", Offsets: WhisperOffsets{From: 7300, To: 7500}},
				{Text: " talk", Offsets: WhisperOffsets{From: 7500, To: 7800}},
				{Text: " about", Offsets: WhisperOffsets{From: 7800, To: 8200}},
				{Text: " marketing.", Offsets: WhisperOffsets{From: 8200, To: 9000}},
			},
		},
	}
	res1 := segmenter.ProcessSegments(raw1)
	if len(res1) != 1 {
		t.Fatalf("PT2-1 expected 1 stitched sentence, got %d: %+v", len(res1), res1)
	}
	expected1 := "Continuing our theme of business marketing, I have with me today Mr. Brian Kinsella, who is here to talk about marketing."
	if res1[0].Transcript != expected1 {
		t.Errorf("PT2-1 transcript = %q, want %q", res1[0].Transcript, expected1)
	}

	// Test PT2-2: "etc." preceding severed predicate verb "Have not felt..."
	raw2 := []WhisperSegment{
		{
			Text:    "Professionals like lawyers, accountants, etc.",
			Offsets: WhisperOffsets{From: 10000, To: 14000},
			Tokens: []WhisperToken{
				{Text: "Professionals", Offsets: WhisperOffsets{From: 10000, To: 11000}},
				{Text: " like", Offsets: WhisperOffsets{From: 11000, To: 11500}},
				{Text: " lawyers,", Offsets: WhisperOffsets{From: 11500, To: 12200}},
				{Text: " accountants,", Offsets: WhisperOffsets{From: 12200, To: 13200}},
				{Text: " etc.", Offsets: WhisperOffsets{From: 13200, To: 14000}},
			},
		},
		{
			Text:    "Have not felt too comfortable with marketing.",
			Offsets: WhisperOffsets{From: 14500, To: 18000},
			Tokens: []WhisperToken{
				{Text: "Have", Offsets: WhisperOffsets{From: 14500, To: 15000}},
				{Text: " not", Offsets: WhisperOffsets{From: 15000, To: 15300}},
				{Text: " felt", Offsets: WhisperOffsets{From: 15300, To: 15800}},
				{Text: " too", Offsets: WhisperOffsets{From: 15800, To: 16100}},
				{Text: " comfortable", Offsets: WhisperOffsets{From: 16100, To: 17000}},
				{Text: " with", Offsets: WhisperOffsets{From: 17000, To: 17300}},
				{Text: " marketing.", Offsets: WhisperOffsets{From: 17300, To: 18000}},
			},
		},
	}
	res2 := segmenter.ProcessSegments(raw2)
	if len(res2) != 1 {
		t.Fatalf("PT2-2 expected 1 stitched sentence, got %d: %+v", len(res2), res2)
	}
	expected2 := "Professionals like lawyers, accountants, etc. have not felt too comfortable with marketing."
	if res2[0].Transcript != expected2 {
		t.Errorf("PT2-2 transcript = %q, want %q", res2[0].Transcript, expected2)
	}

	// Test PT2-3: "of direct." + "Sunlight such as..."
	raw3 := []WhisperSegment{
		{
			Text:    "Areas that are not exposed to long hours of direct.",
			Offsets: WhisperOffsets{From: 20000, To: 24000},
			Tokens: []WhisperToken{
				{Text: "Areas", Offsets: WhisperOffsets{From: 20000, To: 20500}},
				{Text: " that", Offsets: WhisperOffsets{From: 20500, To: 20800}},
				{Text: " are", Offsets: WhisperOffsets{From: 20800, To: 21000}},
				{Text: " not", Offsets: WhisperOffsets{From: 21000, To: 21300}},
				{Text: " exposed", Offsets: WhisperOffsets{From: 21300, To: 22000}},
				{Text: " to", Offsets: WhisperOffsets{From: 22000, To: 22300}},
				{Text: " long", Offsets: WhisperOffsets{From: 22300, To: 22700}},
				{Text: " hours", Offsets: WhisperOffsets{From: 22700, To: 23200}},
				{Text: " of", Offsets: WhisperOffsets{From: 23200, To: 23500}},
				{Text: " direct.", Offsets: WhisperOffsets{From: 23500, To: 24000}},
			},
		},
		{
			Text:    "Sunlight such as the United Kingdom.",
			Offsets: WhisperOffsets{From: 24200, To: 28000},
			Tokens: []WhisperToken{
				{Text: "Sunlight", Offsets: WhisperOffsets{From: 24200, To: 25000}},
				{Text: " such", Offsets: WhisperOffsets{From: 25000, To: 25400}},
				{Text: " as", Offsets: WhisperOffsets{From: 25400, To: 25700}},
				{Text: " the", Offsets: WhisperOffsets{From: 25700, To: 26000}},
				{Text: " United", Offsets: WhisperOffsets{From: 26000, To: 26500}},
				{Text: " Kingdom.", Offsets: WhisperOffsets{From: 26500, To: 28000}},
			},
		},
	}
	res3 := segmenter.ProcessSegments(raw3)
	if len(res3) != 1 {
		t.Fatalf("PT2-3 expected 1 stitched sentence, got %d: %+v", len(res3), res3)
	}
	expected3 := "Areas that are not exposed to long hours of direct sunlight such as the United Kingdom."
	if res3[0].Transcript != expected3 {
		t.Errorf("PT2-3 transcript = %q, want %q", res3[0].Transcript, expected3)
	}

	// Test PT2-4: Noun clause modal: "what the product." + "Will do for them."
	raw4 := []WhisperSegment{
		{
			Text:    "They can comprehend exactly what the product.",
			Offsets: WhisperOffsets{From: 30000, To: 34000},
			Tokens: []WhisperToken{
				{Text: "They", Offsets: WhisperOffsets{From: 30000, To: 30400}},
				{Text: " can", Offsets: WhisperOffsets{From: 30400, To: 30700}},
				{Text: " comprehend", Offsets: WhisperOffsets{From: 30700, To: 31500}},
				{Text: " exactly", Offsets: WhisperOffsets{From: 31500, To: 32200}},
				{Text: " what", Offsets: WhisperOffsets{From: 32200, To: 32600}},
				{Text: " the", Offsets: WhisperOffsets{From: 32600, To: 33000}},
				{Text: " product.", Offsets: WhisperOffsets{From: 33000, To: 34000}},
			},
		},
		{
			Text:    "Will do for them.",
			Offsets: WhisperOffsets{From: 34200, To: 36000},
			Tokens: []WhisperToken{
				{Text: "Will", Offsets: WhisperOffsets{From: 34200, To: 34600}},
				{Text: " do", Offsets: WhisperOffsets{From: 34600, To: 35000}},
				{Text: " for", Offsets: WhisperOffsets{From: 35000, To: 35400}},
				{Text: " them.", Offsets: WhisperOffsets{From: 35400, To: 36000}},
			},
		},
	}
	res4 := segmenter.ProcessSegments(raw4)
	if len(res4) != 1 {
		t.Fatalf("PT2-4 expected 1 stitched sentence, got %d: %+v", len(res4), res4)
	}
	expected4 := "They can comprehend exactly what the product will do for them."
	if res4[0].Transcript != expected4 {
		t.Errorf("PT2-4 transcript = %q, want %q", res4[0].Transcript, expected4)
	}

	// Test PT2-5: Credit card number severed by period: "The card number is 4550-1392." + "8309-32 21."
	raw5 := []WhisperSegment{
		{
			Text:    "The card number is 4550-1392.",
			Offsets: WhisperOffsets{From: 40000, To: 43000},
			Tokens: []WhisperToken{
				{Text: "The", Offsets: WhisperOffsets{From: 40000, To: 40300}},
				{Text: " card", Offsets: WhisperOffsets{From: 40300, To: 40700}},
				{Text: " number", Offsets: WhisperOffsets{From: 40700, To: 41200}},
				{Text: " is", Offsets: WhisperOffsets{From: 41200, To: 41500}},
				{Text: " 4550-1392.", Offsets: WhisperOffsets{From: 41500, To: 43000}},
			},
		},
		{
			Text:    "8309-32 21.",
			Offsets: WhisperOffsets{From: 43200, To: 46000},
			Tokens: []WhisperToken{
				{Text: "8309-32", Offsets: WhisperOffsets{From: 43200, To: 44500}},
				{Text: " 21.", Offsets: WhisperOffsets{From: 44500, To: 46000}},
			},
		},
	}
	res5 := segmenter.ProcessSegments(raw5)
	if len(res5) != 1 {
		t.Fatalf("PT2-5 expected 1 stitched sentence, got %d: %+v", len(res5), res5)
	}
	expected5 := "The card number is 4550-1392-8309-3221."
	if res5[0].Transcript != expected5 {
		t.Errorf("PT2-5 transcript = %q, want %q", res5[0].Transcript, expected5)
	}

	// Test PT2-6: "you have some time." + "To look at questions 26 to 30."
	raw6 := []WhisperSegment{
		{
			Text:    "Before you hear the rest of the recording, you have some time.",
			Offsets: WhisperOffsets{From: 50000, To: 54000},
			Tokens: []WhisperToken{
				{Text: "Before", Offsets: WhisperOffsets{From: 50000, To: 50500}},
				{Text: " you", Offsets: WhisperOffsets{From: 50500, To: 50800}},
				{Text: " hear", Offsets: WhisperOffsets{From: 50800, To: 51200}},
				{Text: " the", Offsets: WhisperOffsets{From: 51200, To: 51400}},
				{Text: " rest", Offsets: WhisperOffsets{From: 51400, To: 51800}},
				{Text: " of", Offsets: WhisperOffsets{From: 51800, To: 52000}},
				{Text: " the", Offsets: WhisperOffsets{From: 52000, To: 52300}},
				{Text: " recording,", Offsets: WhisperOffsets{From: 52300, To: 53000}},
				{Text: " you", Offsets: WhisperOffsets{From: 53000, To: 53300}},
				{Text: " have", Offsets: WhisperOffsets{From: 53300, To: 53600}},
				{Text: " some", Offsets: WhisperOffsets{From: 53600, To: 53800}},
				{Text: " time.", Offsets: WhisperOffsets{From: 53800, To: 54000}},
			},
		},
		{
			Text:    "To look at questions 26 to 30.",
			Offsets: WhisperOffsets{From: 54200, To: 57000},
			Tokens: []WhisperToken{
				{Text: "To", Offsets: WhisperOffsets{From: 54200, To: 54500}},
				{Text: " look", Offsets: WhisperOffsets{From: 54500, To: 54900}},
				{Text: " at", Offsets: WhisperOffsets{From: 54900, To: 55200}},
				{Text: " questions", Offsets: WhisperOffsets{From: 55200, To: 55800}},
				{Text: " 26", Offsets: WhisperOffsets{From: 55800, To: 56200}},
				{Text: " to", Offsets: WhisperOffsets{From: 56200, To: 56500}},
				{Text: " 30.", Offsets: WhisperOffsets{From: 56500, To: 57000}},
			},
		},
	}
	res6 := segmenter.ProcessSegments(raw6)
	if len(res6) != 1 {
		t.Fatalf("PT2-6 expected 1 stitched sentence, got %d: %+v", len(res6), res6)
	}
	expected6 := "Before you hear the rest of the recording, you have some time to look at questions 26 to 30."
	if res6[0].Transcript != expected6 {
		t.Errorf("PT2-6 transcript = %q, want %q", res6[0].Transcript, expected6)
	}

	// Test PT2-7: "Now, listen and answer." + "Questions one to five."
	raw7 := []WhisperSegment{
		{
			Text:    "Now, listen and answer.",
			Offsets: WhisperOffsets{From: 60000, To: 62000},
			Tokens: []WhisperToken{
				{Text: "Now,", Offsets: WhisperOffsets{From: 60000, To: 60500}},
				{Text: " listen", Offsets: WhisperOffsets{From: 60500, To: 61000}},
				{Text: " and", Offsets: WhisperOffsets{From: 61000, To: 61300}},
				{Text: " answer.", Offsets: WhisperOffsets{From: 61300, To: 62000}},
			},
		},
		{
			Text:    "Questions one to five.",
			Offsets: WhisperOffsets{From: 62200, To: 65000},
			Tokens: []WhisperToken{
				{Text: "Questions", Offsets: WhisperOffsets{From: 62200, To: 63000}},
				{Text: " one", Offsets: WhisperOffsets{From: 63000, To: 63500}},
				{Text: " to", Offsets: WhisperOffsets{From: 63500, To: 64000}},
				{Text: " five.", Offsets: WhisperOffsets{From: 64000, To: 65000}},
			},
		},
	}
	res7 := segmenter.ProcessSegments(raw7)
	if len(res7) != 1 {
		t.Fatalf("PT2-7 expected 1 stitched sentence, got %d: %+v", len(res7), res7)
	}
	expected7 := "Now, listen and answer questions one to five."
	if res7[0].Transcript != expected7 {
		t.Errorf("PT2-7 transcript = %q, want %q", res7[0].Transcript, expected7)
	}
}


