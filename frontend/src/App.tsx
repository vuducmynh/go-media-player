import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaFile, AppSettings, FilterCategory, ScanProgress } from './entities/media/types';
import { WailsBridge } from './shared/api/wailsBridge';
import { Sidebar } from './widgets/sidebar';
import { PlayerView } from './widgets/player-viewport';
import { SettingsModal } from './widgets/settings-modal';
import { HotkeysGuideModal } from './widgets/hotkeys-modal';
import { AddYouTubeModal } from './features/youtube-loader';
import { useUpdater, InstallUpdateModal } from './features/updater';

export const App: React.FC = () => {
  const updater = useUpdater();
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
    volume: 1.0,
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

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('in_progress');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lessonFingerprints, setLessonFingerprints] = useState<Set<string>>(new Set());

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState<boolean>(false);
  const [isAddYouTubeOpen, setIsAddYouTubeOpen] = useState<boolean>(false);
  const [isSlowHeld, setIsSlowHeld] = useState<boolean>(false);

  // Load initial settings and trigger scan
  const loadData = useCallback(async () => {
    try {
      const loadedSettings = await WailsBridge.getSettings();
      setSettings(loadedSettings);

      let currentActive = loadedSettings.activeFolder;
      if (!currentActive && loadedSettings.folders && loadedSettings.folders.length > 0) {
        currentActive = loadedSettings.folders[0];
      }
      setActiveFolder(currentActive || '');

      setScanProgress((prev) => ({ ...prev, isScanning: true }));
      const [lessonFps, scannedFiles, ytVideos] = await Promise.all([
        WailsBridge.getAllLessonFingerprints(),
        WailsBridge.scanFiles(),
        WailsBridge.getYouTubeVideos(),
      ]);

      setLessonFingerprints(new Set(lessonFps));

      const map = new Map<string, MediaFile>();
      [...ytVideos, ...scannedFiles].forEach((f) => map.set(f.fingerprint, f));
      const combined = Array.from(map.values());

      setFiles(combined);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: combined.length }));

      // Restore last played file from session
      const lastFp = localStorage.getItem('last_playing_fingerprint');
      if (lastFp) {
        const found = combined.find((f) => f.fingerprint === lastFp);
        if (found) {
          setCurrentFile(found);
          if (found.source === 'youtube' || Boolean(found.youtubeId)) {
            setActiveFilter('youtube');
          }
        }
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
    if (folderPath !== 'YouTube' && folderPath !== 'ALL') {
      await WailsBridge.setActiveFolder(folderPath);
    }
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
      const [scannedFiles, ytVideos] = await Promise.all([
        WailsBridge.scanFiles(),
        WailsBridge.getYouTubeVideos(),
      ]);
      const map = new Map<string, MediaFile>();
      [...ytVideos, ...scannedFiles].forEach((f) => map.set(f.fingerprint, f));
      const combined = Array.from(map.values());
      setFiles(combined);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: combined.length }));
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
      const [scannedFiles, ytVideos] = await Promise.all([
        WailsBridge.scanFiles(),
        WailsBridge.getYouTubeVideos(),
      ]);
      const map = new Map<string, MediaFile>();
      [...ytVideos, ...scannedFiles].forEach((f) => map.set(f.fingerprint, f));
      const combined = Array.from(map.values());
      setFiles(combined);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: combined.length }));
    } catch (err) {
      console.error('Error removing folder:', err);
    }
  };

  // Rescan all files and YouTube items
  const handleRescan = async () => {
    try {
      setScanProgress((prev) => ({ ...prev, isScanning: true }));
      const [scannedFiles, ytVideos] = await Promise.all([
        WailsBridge.scanFiles(),
        WailsBridge.getYouTubeVideos(),
      ]);
      const map = new Map<string, MediaFile>();
      [...ytVideos, ...scannedFiles].forEach((f) => map.set(f.fingerprint, f));
      const combined = Array.from(map.values());

      setFiles(combined);
      setScanProgress((prev) => ({ ...prev, isScanning: false, foundMedia: combined.length }));

      if (currentFile) {
        const matching = combined.find((f) => f.fingerprint === currentFile.fingerprint);
        if (matching) {
          setCurrentFile(matching);
        }
      }
    } catch (err) {
      console.error('Error rescanning files:', err);
      setScanProgress((prev) => ({ ...prev, isScanning: false }));
    }
  };

  // Add and immediately play YouTube video
  const handleAddAndPlayYouTube = async (url: string): Promise<MediaFile | null> => {
    try {
      const newMedia = await WailsBridge.addYouTubeVideo(url);
      if (!newMedia) return null;

      setFiles((prev) => {
        const exists = prev.some((f) => f.fingerprint === newMedia.fingerprint);
        if (exists) {
          return prev.map((f) => (f.fingerprint === newMedia.fingerprint ? newMedia : f));
        }
        return [newMedia, ...prev];
      });

      // Switch to YouTube tab and remember session
      setActiveFilter('youtube');
      setCurrentFile(newMedia);
      localStorage.setItem('last_playing_fingerprint', newMedia.fingerprint);
      return newMedia;
    } catch (err) {
      console.error('Error adding YouTube video:', err);
      return null;
    }
  };

  // Remove YouTube video from library
  const handleRemoveYouTubeVideo = async (videoIdOrId: string) => {
    try {
      await WailsBridge.removeYouTubeVideo(videoIdOrId);
      setFiles((prev) => prev.filter((f) => f.id !== videoIdOrId && f.youtubeId !== videoIdOrId));
      if (currentFile && (currentFile.id === videoIdOrId || currentFile.youtubeId === videoIdOrId)) {
        setCurrentFile(null);
        localStorage.removeItem('last_playing_fingerprint');
      }
    } catch (err) {
      console.error('Error removing YouTube video:', err);
    }
  };

  // Handle renaming file directly in filesystem or YouTube title
  const handleRenameFile = async (file: MediaFile, newName: string) => {
    const isYt = file.source === 'youtube' || Boolean(file.youtubeId);
    if (isYt) {
      await WailsBridge.renameYouTubeVideo(file.youtubeId || file.id, newName);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id || f.youtubeId === file.youtubeId
            ? { ...f, title: newName }
            : f
        )
      );
      if (currentFile && (currentFile.id === file.id || currentFile.youtubeId === file.youtubeId)) {
        setCurrentFile((prev) => (prev ? { ...prev, title: newName } : null));
      }
    } else {
      const updatedMedia = await WailsBridge.renameMediaFile(file.path, newName);
      setFiles((prev) =>
        prev.map((f) =>
          f.fingerprint === file.fingerprint || f.path === file.path
            ? {
                ...f,
                name: updatedMedia.name,
                path: updatedMedia.path,
                streamUrl: updatedMedia.streamUrl,
              }
            : f
        )
      );
      if (currentFile && (currentFile.fingerprint === file.fingerprint || currentFile.path === file.path)) {
        setCurrentFile((prev) =>
          prev
            ? {
                ...prev,
                name: updatedMedia.name,
                path: updatedMedia.path,
                streamUrl: updatedMedia.streamUrl,
              }
            : null
        );
      }
    }
  };

  // Select file to play
  const handleSelectFile = (file: MediaFile) => {
    setCurrentFile(file);
    localStorage.setItem('last_playing_fingerprint', file.fingerprint);
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

      // Remember session
      localStorage.setItem('last_playing_fingerprint', fingerprint);

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

  // Filtered files within active folder / filter for next/previous navigation
  const activeFolderFiles = useMemo(() => {
    let list = files.filter((file) => {
      const isYt = file.source === 'youtube' || Boolean(file.youtubeId);

      if (activeFolder === 'YouTube') return isYt;

      if (activeFolder && activeFolder !== 'ALL' && file.folderRoot !== activeFolder) {
        return false;
      }
      if (activeFilter === 'in_progress') {
        if (file.completed || file.lastPosition <= 0) return false;
      } else if (activeFilter === 'audio') {
        if (file.type !== 'audio' || isYt) return false;
      } else if (activeFilter === 'youtube') {
        if (!isYt) return false;
      } else if (activeFilter === 'video') {
        if (file.type !== 'video' || isYt) return false;
      } else if (activeFilter === 'completed') {
        if (!file.completed) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = file.name.toLowerCase().includes(q);
        const matchTitle = (file.title || '').toLowerCase().includes(q);
        const matchDir = (file.relativeDir || '').toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchDir) return false;
      }
      return true;
    });

    // Default newest to oldest
    return list.sort((a, b) => {
      const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : (a.modTime ? new Date(a.modTime).getTime() : 0);
      const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : (b.modTime ? new Date(b.modTime).getTime() : 0);
      return timeB - timeA;
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

  const handleResetToHome = () => {
    setCurrentFile(null);
    try {
      localStorage.removeItem('last_playing_fingerprint');
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-fluent-bg-darker text-fluent-text-primary">
      {/* Sidebar with isolated Folder Switcher & YouTube Hub */}
      <Sidebar
        files={files}
        currentFile={currentFile}
        settings={settings}
        scanProgress={scanProgress}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        activeFolder={activeFolder}
        lessonFingerprints={lessonFingerprints}
        onSelectFile={handleSelectFile}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        onSelectFolder={handleSelectFolder}
        onOpenAddYouTube={() => setIsAddYouTubeOpen(true)}
        onRemoveYouTubeVideo={handleRemoveYouTubeVideo}
        onRenameFile={handleRenameFile}
        onRescan={handleRescan}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHotkeysGuide={() => setIsHotkeysOpen(true)}
        onOpenFileFolder={handleOpenFileFolder}
        onClearFileProgress={handleClearFileProgress}
        onClearAllProgress={handleClearAllProgress}
        updater={updater}
        onResetToHome={handleResetToHome}
      />

      {/* Main Player View (with connected hotkeys & YouTube deep listening controls) */}
      <PlayerView
        currentFile={currentFile}
        settings={settings}
        onPlayNext={handlePlayNext}
        onPlayPrev={handlePlayPrev}
        onUpdateFileProgress={handleUpdateFileProgress}
        onOpenFileFolder={handleOpenFileFolder}
        isSlowHeld={isSlowHeld}
        setSlowSpeedActive={setIsSlowHeld}
        onLessonCreated={(fp) => setLessonFingerprints((prev) => new Set([...prev, fp]))}
      />

      {/* Add YouTube Video Modal */}
      <AddYouTubeModal
        isOpen={isAddYouTubeOpen}
        onClose={() => setIsAddYouTubeOpen(false)}
        onAddAndPlay={handleAddAndPlayYouTube}
      />

      {/* Settings & Hotkeys Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        currentVersion={updater.currentVersion}
        onCheckUpdate={() => updater.checkForUpdates(false)}
      />

      <HotkeysGuideModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
        settings={settings}
      />

      {/* Install Update Modal (Freezes App when installing) */}
      <InstallUpdateModal
        isOpen={updater.isInstallModalOpen}
        onClose={updater.closeInstallModal}
        currentVersion={updater.currentVersion}
        updateInfo={updater.updateInfo}
        status={updater.status}
        errorMessage={updater.errorMessage}
        onApplyUpdate={updater.applyUpdate}
        onRestartApp={updater.restartApp}
        onStartDownload={updater.startDownload}
        downloadPercent={updater.downloadPercent}
      />
    </div>
  );
};

export default App;
