// Package web provides embedded frontend assets and SPA serving capabilities.
// This allows the entire React frontend to be compiled into the Go binary.
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

// Embed the entire dist directory.
//
//go:embed all:dist
var FS embed.FS

// DistFS returns the embedded filesystem rooted at "dist"
func DistFS() (fs.FS, error) {
	return fs.Sub(FS, "dist")
}

// SPAHandler serves the embedded React SPA.
type SPAHandler struct {
	fileServer http.Handler
	fs         fs.FS
}

// NewSPAHandler creates a new SPA handler with the embedded filesystem.
func NewSPAHandler() (*SPAHandler, error) {
	distFS, err := DistFS()
	if err != nil {
		return nil, err
	}

	return &SPAHandler{
		fileServer: http.FileServer(http.FS(distFS)),
		fs:         distFS,
	}, nil
}

// HasFile checks if a file (and not a directory) exists in the embedded static asset filesystem.
func (h *SPAHandler) HasFile(urlPath string) bool {
	filePath := strings.TrimPrefix(urlPath, "/")
	if filePath == "" {
		filePath = "index.html"
	}
	stat, err := fs.Stat(h.fs, filePath)
	return err == nil && !stat.IsDir()
}

// ServeHTTP implements http.Handler for the SPA.
func (h *SPAHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Clean the URL path
	urlPath := r.URL.Path
	if urlPath == "/" {
		urlPath = "/index.html"
	}

	// Remove leading slash for fs.Open
	filePath := strings.TrimPrefix(urlPath, "/")

	// Check if the file exists
	file, err := h.fs.Open(filePath)
	if err != nil {
		// File doesn't exist, serve index.html for SPA routing
		h.serveIndex(w, r)
		return
	}
	_ = file.Close()

	// Check if it's a file (not a directory)
	stat, err := fs.Stat(h.fs, filePath)
	if err != nil || stat.IsDir() {
		// It's a directory or error, serve index.html
		h.serveIndex(w, r)
		return
	}

	// Disable caching of the UI and assets to prevent stale resources
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Serve the file
	h.fileServer.ServeHTTP(w, r)
}

// serveIndex serves the index.html file for SPA routing.
func (h *SPAHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	indexFile, err := h.fs.Open("index.html")
	if err != nil {
		http.Error(w, "Index not found", http.StatusNotFound)
		return
	}
	defer func() {
		_ = indexFile.Close()
	}()

	stat, err := indexFile.Stat()
	if err != nil {
		http.Error(w, "Error reading index", http.StatusInternalServerError)
		return
	}

	// Set headers for HTML
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Read and serve the file
	data, err := fs.ReadFile(h.fs, "index.html")
	if err != nil {
		http.Error(w, "Error reading index", http.StatusInternalServerError)
		return
	}

	http.ServeContent(w, r, "index.html", stat.ModTime(), strings.NewReader(string(data)))
}

// IsFrontendBundled returns true if the frontend is embedded.
func IsFrontendBundled() bool {
	_, err := FS.ReadFile("dist/index.html")
	return err == nil
}
