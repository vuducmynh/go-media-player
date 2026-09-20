import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaFile, AppSettings, FilterCategory, ScanProgress } from './types';
import { WailsBridge } from './services/wailsBridge';
import { Sidebar } from './components/Sidebar';
import { PlayerView } from './components/PlayerView';
import { SettingsModal } from './components/SettingsModal';
import { HotkeysGuideModal } from './components/HotkeysGuideModal';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    folders: [],
    activeFolder: '',
    jumpSeconds: 5.0,
    slowSpeed: 0.5,
    holdSlowKey: 'KeyS',
    defaultSpeed: 1.0,
    autoPlayNext: false,
    autoResume: true,
    theme: 'dark',
    volume: 0.9,
    showSubtitles: true,
    abLoopAutoRestart: true,
  });

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>('');

  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    totalFolders: 0,
    scannedFiles: 0,
    foundMedia: 0,
    currentPath: '',
    isScanning: false,
  });

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState<boolean>(false);
  const [isSlowHeld, setIsSlowHeld] = useState<boolean>(false);

  // Load initial settings and trigger scan
  const loadData = useCallback(async () => {
    try {
      const loadedSettings = await WailsBridge.getSettings();
      setSettings(loadedSettings);

      // Determine active folder
      let currentActive = loadedSettings.activeFolder;
      if (!currentActive && loadedSettings.folders && loadedSettings.folders.length > 0) {
        currentActive = loadedSettings.folders[0];
      }
      setActiveFolder(currentActive || '');

      if (loadedSettings.folders && loadedSettings.folders.length > 0) {
        setScanProgress((prev) => ({ ...prev, isScanning: true }));
        const scannedFiles = await WailsBridge.scanFiles();
        setFiles(scannedFiles);
        setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: scannedFiles.length }));
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setScanProgress((prev) => ({ ...prev, isScanning: false }));
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to real-time scanning progress events from Go backend
    const unbindScanProgress = WailsBridge.onScanProgress((p) => {
      setScanProgress(p);
    });

    return () => {
      unbindScanProgress();
    };
  }, [loadData]);

  // Handle switching active folder
  const handleSelectFolder = async (folderPath: string) => {
    setActiveFolder(folderPath);
    setSettings((prev) => ({ ...prev, activeFolder: folderPath }));
    await WailsBridge.setActiveFolder(folderPath);
  };

  // Handle adding folder
  const handleAddFolder = async () => {
    try {
      const selectedPath = await WailsBridge.selectFolderDialog();
      if (!selectedPath) return;

      const updatedFolders = await WailsBridge.addFolder(selectedPath);
      setSettings((prev) => ({ ...prev, folders: updatedFolders, activeFolder: selectedPath }));
      setActiveFolder(selectedPath);

      // Rescan files
      setScanProgress((prev) => ({ ...prev, isScanning: true }));
      const scannedFiles = await WailsBridge.scanFiles();
      setFiles(scannedFiles);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: scannedFiles.length }));
    } catch (err) {
      console.error('Error adding folder:', err);
    }
  };

  // Handle removing folder
  const handleRemoveFolder = async (folderPath: string) => {
    try {
      const updatedFolders = await WailsBridge.removeFolder(folderPath);
      let newActive = activeFolder;
      if (activeFolder === folderPath) {
        newActive = updatedFolders.length > 0 ? updatedFolders[0] : '';
      }
      setSettings((prev) => ({ ...prev, folders: updatedFolders, activeFolder: newActive }));
      setActiveFolder(newActive);

      // Rescan files
      setScanProgress((prev) => ({ ...prev, isScanning: true }));
      const scannedFiles = await WailsBridge.scanFiles();
      setFiles(scannedFiles);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: scannedFiles.length }));
    } catch (err) {
      console.error('Error removing folder:', err);
    }
  };

  // Rescan all folders
  const handleRescan = async () => {
    try {
      setScanProgress((prev) => ({ ...prev, isScanning: true }));
      const scannedFiles = await WailsBridge.scanFiles();
      setFiles(scannedFiles);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: scannedFiles.length }));

      // If current file exists, refresh its info
      if (currentFile) {
        const matching = scannedFiles.find((f) => f.fingerprint === currentFile.fingerprint);
        if (matching) {
          setCurrentFile(matching);
        }
      }
    } catch (err) {
      console.error('Error rescanning files:', err);
      setScanProgress((prev) => ({ ...prev, isScanning: false }));
    }
  };

  // Select file to play
  const handleSelectFile = (file: MediaFile) => {
    setCurrentFile(file);
  };

  // Update playback progress & sync state
  const handleUpdateFileProgress = useCallback(
    async (
      fingerprint: string,
      position: number,
      duration: number,
      loopA: number,
      loopB: number
    ) => {
      if (!currentFile || currentFile.fingerprint !== fingerprint) return;

      const completed = duration > 0 && position >= duration * 0.95;
      const nowIso = new Date().toISOString();

      // Update backend
      await WailsBridge.savePlaybackProgress(
        fingerprint,
        currentFile.path,
        position,
        duration,
        loopA,
        loopB
      );

      // Update state in memory with timestamp
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.fingerprint === fingerprint
            ? {
                ...f,
                lastPosition: position,
                duration: duration || f.duration,
                completed: completed || f.completed,
                loopA,
                loopB,
                lastPlayedAt: nowIso,
              }
            : f
        )
      );

      setCurrentFile((prev) =>
        prev && prev.fingerprint === fingerprint
          ? {
              ...prev,
              lastPosition: position,
              duration: duration || prev.duration,
              completed: completed || prev.completed,
              loopA,
              loopB,
              lastPlayedAt: nowIso,
            }
          : prev
      );
    },
    [currentFile]
  );

  // Clear progress for a specific file (removes from "Đang nghe")
  const handleClearFileProgress = useCallback(
    async (fingerprint: string) => {
      await WailsBridge.clearPlaybackProgress(fingerprint);

      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.fingerprint === fingerprint
            ? {
                ...f,
                lastPosition: 0,
                completed: false,
                lastPlayedAt: undefined,
              }
            : f
        )
      );

      setCurrentFile((prev) =>
        prev && prev.fingerprint === fingerprint
          ? {
              ...prev,
              lastPosition: 0,
              completed: false,
              lastPlayedAt: undefined,
            }
          : prev
      );
    },
    []
  );

  // Clear all in-progress files
  const handleClearAllProgress = useCallback(async () => {
    await WailsBridge.clearAllPlaybackProgress();

    setFiles((prevFiles) =>
      prevFiles.map((f) => ({
        ...f,
        lastPosition: 0,
        completed: false,
        lastPlayedAt: undefined,
      }))
    );

    setCurrentFile((prev) =>
      prev
        ? {
            ...prev,
            lastPosition: 0,
            completed: false,
            lastPlayedAt: undefined,
          }
        : prev
    );
  }, []);

  // Filtered files within active folder for next/previous navigation
  const activeFolderFiles = useMemo(() => {
    return files.filter((file) => {
      if (activeFolder && activeFolder !== 'ALL' && file.folderRoot !== activeFolder) {
        return false;
      }
      if (activeFilter === 'audio' && file.type !== 'audio') return false;
      if (activeFilter === 'video' && file.type !== 'video') return false;
      if (activeFilter === 'in_progress' && (file.completed || file.lastPosition <= 0)) return false;
      if (activeFilter === 'completed' && !file.completed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = file.name.toLowerCase().includes(q);
        const matchTitle = file.title.toLowerCase().includes(q);
        const matchDir = file.relativeDir.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchDir) return false;
      }
      return true;
    });
  }, [files, activeFolder, activeFilter, searchQuery]);

  const handlePlayNext = () => {
    if (!currentFile || activeFolderFiles.length === 0) return;
    const currentIndex = activeFolderFiles.findIndex(
      (f) => f.fingerprint === currentFile.fingerprint
    );
    if (currentIndex >= 0 && currentIndex < activeFolderFiles.length - 1) {
      setCurrentFile(activeFolderFiles[currentIndex + 1]);
    } else if (activeFolderFiles.length > 0) {
      setCurrentFile(activeFolderFiles[0]); // Loop around to first
    }
  };

  const handlePlayPrev = () => {
    if (!currentFile || activeFolderFiles.length === 0) return;
    const currentIndex = activeFolderFiles.findIndex(
      (f) => f.fingerprint === currentFile.fingerprint
    );
    if (currentIndex > 0) {
      setCurrentFile(activeFolderFiles[currentIndex - 1]);
    } else if (activeFolderFiles.length > 0) {
      setCurrentFile(activeFolderFiles[activeFolderFiles.length - 1]);
    }
  };

  const handleOpenFileFolder = async (filePath: string) => {
    await WailsBridge.openFileInExplorer(filePath);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await WailsBridge.saveSettings(newSettings);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-fluent-bg-darker text-fluent-text-primary">
      {/* Sidebar with isolated Folder Switcher */}
      <Sidebar
        files={files}
        currentFile={currentFile}
        settings={settings}
        scanProgress={scanProgress}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        activeFolder={activeFolder}
        onSelectFile={handleSelectFile}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        onSelectFolder={handleSelectFolder}
        onRescan={handleRescan}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHotkeysGuide={() => setIsHotkeysOpen(true)}
        onOpenFileFolder={handleOpenFileFolder}
        onClearFileProgress={handleClearFileProgress}
        onClearAllProgress={handleClearAllProgress}
      />

      {/* Main Player View (with connected hotkeys) */}
      <PlayerView
        currentFile={currentFile}
        settings={settings}
        onPlayNext={handlePlayNext}
        onPlayPrev={handlePlayPrev}
        onUpdateFileProgress={handleUpdateFileProgress}
        onOpenFileFolder={handleOpenFileFolder}
        isSlowHeld={isSlowHeld}
        setSlowSpeedActive={setIsSlowHeld}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
      />

      <HotkeysGuideModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
        settings={settings}
      />
    </div>
  );
};
export default App;
