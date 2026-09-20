package storage

import (
	"os"
	"path/filepath"
	"sync"
)

var (
	pathsOnce       sync.Once
	isPortableMode  bool
	cachedDataDir   string
	cachedExeDir    string
	cachedModelsDir string
	cachedBinDir    string
)

func initPaths() {
	exePath, err := os.Executable()
	if err != nil {
		exePath = "."
	}
	cachedExeDir = filepath.Dir(exePath)

	// Check for portable markers in application directory
	portableData := filepath.Join(cachedExeDir, "data")
	portableMarker := filepath.Join(cachedExeDir, "portable.txt")
	portableModels := filepath.Join(cachedExeDir, "models")

	if _, err := os.Stat(portableData); err == nil {
		isPortableMode = true
		cachedDataDir = portableData
	} else if _, err := os.Stat(portableMarker); err == nil {
		isPortableMode = true
		cachedDataDir = portableData
		_ = os.MkdirAll(cachedDataDir, 0755)
	} else {
		// Default system AppData
		appDataDir, err := os.UserConfigDir()
		if err != nil {
			appDataDir = "."
		}
		cachedDataDir = filepath.Join(appDataDir, "GoAudioPlay")
	}

	_ = os.MkdirAll(cachedDataDir, 0755)

	// Primary models directory: if portable models exist in exe dir, prefer it
	if isPortableMode || dirExists(portableModels) {
		cachedModelsDir = portableModels
	} else {
		cachedModelsDir = filepath.Join(cachedDataDir, "models")
	}
	_ = os.MkdirAll(cachedModelsDir, 0755)

	// Primary bin directory
	portableBin := filepath.Join(cachedExeDir, "bin")
	if isPortableMode || dirExists(portableBin) {
		cachedBinDir = portableBin
	} else {
		cachedBinDir = filepath.Join(cachedDataDir, "bin")
	}
	_ = os.MkdirAll(cachedBinDir, 0755)
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// GetDataDir returns the active storage root directory (portable or AppData)
func GetDataDir() string {
	pathsOnce.Do(initPaths)
	return cachedDataDir
}

// GetExeDir returns the directory containing the executable
func GetExeDir() string {
	pathsOnce.Do(initPaths)
	return cachedExeDir
}

// IsPortable returns true if running in portable mode
func IsPortable() bool {
	pathsOnce.Do(initPaths)
	return isPortableMode
}

// GetPrimaryModelsDir returns the directory where new models are downloaded
func GetPrimaryModelsDir() string {
	pathsOnce.Do(initPaths)
	return cachedModelsDir
}

// GetPrimaryBinDir returns the directory where binary and acceleration files are stored
func GetPrimaryBinDir() string {
	pathsOnce.Do(initPaths)
	return cachedBinDir
}

// GetAllModelSearchDirs returns all potential locations where models might exist
func GetAllModelSearchDirs() []string {
	pathsOnce.Do(initPaths)
	dirs := []string{
		cachedModelsDir,
		filepath.Join(cachedExeDir, "models"),
		filepath.Join(cachedDataDir, "models"),
	}

	appDataDir, err := os.UserConfigDir()
	if err == nil {
		dirs = append(dirs, filepath.Join(appDataDir, "GoAudioPlay", "models"))
	}

	// Deduplicate preserving order
	seen := make(map[string]bool)
	unique := make([]string, 0, len(dirs))
	for _, d := range dirs {
		clean := filepath.Clean(d)
		if !seen[clean] {
			seen[clean] = true
			unique = append(unique, clean)
		}
	}
	return unique
}

// GetAllBinSearchDirs returns all potential locations where whisper-cli & DLLs might exist
func GetAllBinSearchDirs() []string {
	pathsOnce.Do(initPaths)
	dirs := []string{
		cachedBinDir,
		filepath.Join(cachedExeDir, "bin"),
		filepath.Join(cachedDataDir, "bin"),
	}

	appDataDir, err := os.UserConfigDir()
	if err == nil {
		dirs = append(dirs, filepath.Join(appDataDir, "GoAudioPlay", "bin"))
	}

	seen := make(map[string]bool)
	unique := make([]string, 0, len(dirs))
	for _, d := range dirs {
		clean := filepath.Clean(d)
		if !seen[clean] {
			seen[clean] = true
			unique = append(unique, clean)
		}
	}
	return unique
}

// FindExistingModel checks all search directories for a given model filename
func FindExistingModel(filename string) (string, bool) {
	for _, dir := range GetAllModelSearchDirs() {
		candidate := filepath.Join(dir, filename)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() && info.Size() > 1024*1024 {
			return candidate, true
		}
	}
	return "", false
}

// FindExistingBinary checks all bin search directories for a given executable/dll
func FindExistingBinary(filename string) (string, bool) {
	for _, dir := range GetAllBinSearchDirs() {
		candidate := filepath.Join(dir, filename)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() && info.Size() > 0 {
			return candidate, true
		}
	}
	return "", false
}
