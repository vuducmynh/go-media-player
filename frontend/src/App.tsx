import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaFile, AppSettings, FilterCategory, ScanProgress } from './types';
import { WailsBridge } from './services/wailsBridge';
import { Sidebar } from './components/Sidebar';
import { PlayerView } from './components/PlayerView';
import { SettingsModal } from './components/SettingsModal';
import { HotkeysGuideModal } from './components/HotkeysGuideModal';
import { useHotkeys } from './hooks/useHotkeys';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    folders: [],
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
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    totalFolders: 0,
    scannedFiles: 0,
    foundMedia: 0,
    currentPath: '',
    isScanning: false,
  });

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('');

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState<boolean>(false);
  const [isSlowHeld, setIsSlowHeld] = useState<boolean>(false);

  // Load initial settings and trigger scan
  const loadData = useCallback(async () => {
    try {
      const loadedSettings = await WailsBridge.getSettings();
      setSettings(loadedSettings);

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

  // Handle adding folder
  const handleAddFolder = async () => {
    try {
      const selectedPath = await WailsBridge.selectFolderDialog();
      if (!selectedPath) return;

      const updatedFolders = await WailsBridge.addFolder(selectedPath);
      setSettings((prev) => ({ ...prev, folders: updatedFolders }));

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
      setSettings((prev) => ({ ...prev, folders: updatedFolders }));

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

      // Update backend
      await WailsBridge.savePlaybackProgress(
        fingerprint,
        currentFile.path,
        position,
        duration,
        loopA,
        loopB
      );

      // Update state in memory
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
            }
          : prev
      );
    },
    [currentFile]
  );

  // Filtered files for next/previous navigation
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (selectedFolderFilter && file.folderRoot !== selectedFolderFilter) return false;
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
  }, [files, selectedFolderFilter, activeFilter, searchQuery]);

  const handlePlayNext = () => {
    if (!currentFile || filteredFiles.length === 0) return;
    const currentIndex = filteredFiles.findIndex(
      (f) => f.fingerprint === currentFile.fingerprint
    );
    if (currentIndex >= 0 && currentIndex < filteredFiles.length - 1) {
      setCurrentFile(filteredFiles[currentIndex + 1]);
    } else if (filteredFiles.length > 0) {
      setCurrentFile(filteredFiles[0]); // Loop around to first
    }
  };

  const handlePlayPrev = () => {
    if (!currentFile || filteredFiles.length === 0) return;
    const currentIndex = filteredFiles.findIndex(
      (f) => f.fingerprint === currentFile.fingerprint
    );
    if (currentIndex > 0) {
      setCurrentFile(filteredFiles[currentIndex - 1]);
    } else if (filteredFiles.length > 0) {
      setCurrentFile(filteredFiles[filteredFiles.length - 1]);
    }
  };

  const handleOpenFileFolder = async (filePath: string) => {
    await WailsBridge.openFileInExplorer(filePath);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await WailsBridge.saveSettings(newSettings);
  };

  // Hotkey Handlers
  useHotkeys(
    {
      togglePlay: () => {
        // Handled directly inside PlayerView via ref/events or hotkey
      },
      seekDelta: (seconds: number) => {},
      adjustSpeed: (delta: number) => {},
      setSlowSpeedActive: (active: boolean) => {
        setIsSlowHeld(active);
      },
      setLoopA: () => {},
      setLoopB: () => {},
      toggleLoop: () => {},
      clearLoop: () => {},
      toggleMute: () => {},
      adjustVolume: () => {},
    },
    settings,
    true
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-fluent-bg-darker text-fluent-text-primary">
      {/* Sidebar */}
      <Sidebar
        files={files}
        currentFile={currentFile}
        settings={settings}
        scanProgress={scanProgress}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        selectedFolderFilter={selectedFolderFilter}
        onSelectFile={handleSelectFile}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        onRescan={handleRescan}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearchQuery}
        onFolderFilterChange={setSelectedFolderFilter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHotkeysGuide={() => setIsHotkeysOpen(true)}
        onOpenFileFolder={handleOpenFileFolder}
      />

      {/* Main Player View */}
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
