package application

import (
	"testing"
)

func TestExtractVideoID(t *testing.T) {
	svc := NewYouTubeService(nil)

	tests := []struct {
		input    string
		expected string
		wantErr  bool
	}{
		{"https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ", false},
		{"dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"invalid-link", "", true},
		{"", "", true},
	}

	for _, tc := range tests {
		got, err := svc.ExtractVideoID(tc.input)
		if (err != nil) != tc.wantErr {
			t.Errorf("ExtractVideoID(%q) error = %v, wantErr %v", tc.input, err, tc.wantErr)
			continue
		}
		if got != tc.expected {
			t.Errorf("ExtractVideoID(%q) = %q, expected %q", tc.input, got, tc.expected)
		}
	}
}
