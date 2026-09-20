package storage

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ExportBackup archives all lessons and application settings into a portable ZIP file
func ExportBackup(destZipPath string) error {
	dataDir := GetDataDir()
	lessonsDir := filepath.Join(dataDir, "lessons")
	storagePath := filepath.Join(dataDir, "storage.json")

	// Ensure destination directory exists
	if err := os.MkdirAll(filepath.Dir(destZipPath), 0755); err != nil {
		return fmt.Errorf("create dest dir failed: %w", err)
	}

	zipFile, err := os.Create(destZipPath)
	if err != nil {
		return fmt.Errorf("create zip file failed: %w", err)
	}
	defer zipFile.Close()

	w := zip.NewWriter(zipFile)
	defer w.Close()

	// 1. Add storage.json if exists
	if _, err := os.Stat(storagePath); err == nil {
		if err := addFileToZip(w, storagePath, "storage.json"); err != nil {
			return fmt.Errorf("add storage.json failed: %w", err)
		}
	}

	// 2. Add all lesson JSON files
	if entries, err := os.ReadDir(lessonsDir); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
				srcFile := filepath.Join(lessonsDir, entry.Name())
				archiveName := filepath.Join("lessons", entry.Name())
				if err := addFileToZip(w, srcFile, archiveName); err != nil {
					return fmt.Errorf("add %s failed: %w", entry.Name(), err)
				}
			}
		}
	}

	return nil
}

// ImportBackup extracts lessons and settings from a backup ZIP file into the current data directory
func ImportBackup(srcZipPath string) (int, error) {
	dataDir := GetDataDir()
	lessonsDir := filepath.Join(dataDir, "lessons")
	_ = os.MkdirAll(lessonsDir, 0755)

	r, err := zip.OpenReader(srcZipPath)
	if err != nil {
		return 0, fmt.Errorf("open backup zip failed: %w", err)
	}
	defer r.Close()

	importedLessons := 0

	for _, f := range r.File {
		cleanName := filepath.Clean(f.Name)
		// Security check: prevent ZipSlip path traversal
		if strings.HasPrefix(cleanName, "..") || filepath.IsAbs(cleanName) {
			continue
		}

		if strings.HasPrefix(cleanName, "lessons"+string(filepath.Separator)) || strings.HasPrefix(cleanName, "lessons/") {
			baseName := filepath.Base(cleanName)
			if !strings.HasSuffix(baseName, ".json") {
				continue
			}
			targetPath := filepath.Join(lessonsDir, baseName)
			if err := extractZipFile(f, targetPath); err != nil {
				return importedLessons, fmt.Errorf("extract lesson %s failed: %w", baseName, err)
			}
			importedLessons++
		} else if cleanName == "storage.json" {
			// Save backup copy of existing storage.json if it exists
			currentStorage := filepath.Join(dataDir, "storage.json")
			if _, err := os.Stat(currentStorage); err == nil {
				backupOld := filepath.Join(dataDir, fmt.Sprintf("storage_before_import_%d.json", time.Now().Unix()))
				_ = copyFile(currentStorage, backupOld)
			}
			_ = extractZipFile(f, currentStorage)
		}
	}

	return importedLessons, nil
}

func addFileToZip(w *zip.Writer, srcPath, archivePath string) error {
	file, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	header.Name = filepath.ToSlash(archivePath)
	header.Method = zip.Deflate

	writer, err := w.CreateHeader(header)
	if err != nil {
		return err
	}

	_, err = io.Copy(writer, file)
	return err
}

func extractZipFile(f *zip.File, targetPath string) error {
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	out, err := os.Create(targetPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, rc)
	return err
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
