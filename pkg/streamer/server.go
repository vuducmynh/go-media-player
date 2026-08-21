package streamer

import (
	"context"
	"fmt"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type StreamServer struct {
	server   *http.Server
	listener net.Listener
	port     int
	mu       sync.RWMutex
}

func init() {
	// Register common media MIME types
	_ = mime.AddExtensionType(".mp3", "audio/mpeg")
	_ = mime.AddExtensionType(".m4a", "audio/mp4")
	_ = mime.AddExtensionType(".wav", "audio/wav")
	_ = mime.AddExtensionType(".aac", "audio/aac")
	_ = mime.AddExtensionType(".flac", "audio/flac")
	_ = mime.AddExtensionType(".ogg", "audio/ogg")
	_ = mime.AddExtensionType(".opus", "audio/opus")
	_ = mime.AddExtensionType(".webm", "video/webm")
	_ = mime.AddExtensionType(".mp4", "video/mp4")
	_ = mime.AddExtensionType(".mkv", "video/x-matroska")
	_ = mime.AddExtensionType(".avi", "video/x-msvideo")
	_ = mime.AddExtensionType(".mov", "video/quicktime")
	_ = mime.AddExtensionType(".wmv", "video/x-ms-wmv")
}

// NewStreamServer creates and starts the internal streaming server
func NewStreamServer() (*StreamServer, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("listen localhost failed: %w", err)
	}

	port := listener.Addr().(*net.TCPAddr).Port

	ss := &StreamServer{
		listener: listener,
		port:     port,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/stream", ss.handleStream)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	ss.server = &http.Server{
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // Streaming needs no write timeout
	}

	go func() {
		_ = ss.server.Serve(listener)
	}()

	return ss, nil
}

func (ss *StreamServer) handleStream(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for localhost / Wails webview
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Range, Content-Type, Accept")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		http.Error(w, "missing path query param", http.StatusBadRequest)
		return
	}

	// Clean and verify file exists
	filePath = filepath.Clean(filePath)
	fileInfo, err := os.Stat(filePath)
	if err != nil || fileInfo.IsDir() {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "cannot open file", http.StatusForbidden)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(filePath))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Accept-Ranges", "bytes")

	// http.ServeContent handles HTTP Range 206, partial requests, conditional gets, etc.
	http.ServeContent(w, r, fileInfo.Name(), fileInfo.ModTime(), file)
}

// GetStreamURL constructs the local HTTP URL to stream the given file
func (ss *StreamServer) GetStreamURL(filePath string) string {
	encodedPath := url.QueryEscape(filePath)
	return fmt.Sprintf("http://127.0.0.1:%d/stream?path=%s", ss.port, encodedPath)
}

// Stop gracefully shuts down the server
func (ss *StreamServer) Stop() {
	if ss.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = ss.server.Shutdown(ctx)
	}
}
