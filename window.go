package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	defaultWindowWidth  = 1024
	defaultWindowHeight = 768
	minWindowWidth      = 800
	minWindowHeight     = 600
)

// windowState is the persisted window geometry, restored on launch.
type windowState struct {
	Width  int  `json:"width"`
	Height int  `json:"height"`
	X      int  `json:"x"`
	Y      int  `json:"y"`
	HasPos bool `json:"hasPos"`
}

func windowStatePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "Kompta", "window.json"), nil
}

// loadWindowState returns the saved geometry, falling back to sane
// defaults when the file is missing or unreadable.
func loadWindowState() windowState {
	state := windowState{Width: defaultWindowWidth, Height: defaultWindowHeight}
	path, err := windowStatePath()
	if err != nil {
		return state
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return state
	}
	var saved windowState
	if err := json.Unmarshal(data, &saved); err != nil {
		return state
	}
	if saved.Width < minWindowWidth {
		saved.Width = defaultWindowWidth
	}
	if saved.Height < minWindowHeight {
		saved.Height = defaultWindowHeight
	}
	return saved
}

// saveWindowState persists the geometry best-effort; failures are
// ignored (losing window geometry is harmless).
func saveWindowState(state windowState) {
	path, err := windowStatePath()
	if err != nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	data, err := json.Marshal(state)
	if err != nil {
		return
	}
	_ = os.WriteFile(path, data, 0o644)
}
