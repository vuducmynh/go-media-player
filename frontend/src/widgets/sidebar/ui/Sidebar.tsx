import React, { useState, useMemo } from 'react';
import {
  FolderPlus,
  RefreshCw,
  Search,
  Settings,
  Keyboard,
  Music,
  Film,
  CheckCircle2,
  Folder,
  FolderOpen,
  X,
  Play,
  Layers,
  ChevronDown,
  ExternalLink,
  Trash2,
  Clock,
  Youtube,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { MediaFile, FilterCategory, ScanProgress, AppSettings, SortOption } from '../../../entities/media/types';
import { formatTime, formatFileSize, formatDate } from '../../../shared/lib/formatters';
import { UpdateBadge } from '../../../features/updater';
import { useUpdater } from '../../../features/updater';

interface SidebarProps {
  files: MediaFile[];
  currentFile: MediaFile | null;
  settings: AppSettings;
  scanProgress: ScanProgress;
  activeFilter: FilterCategory;
  searchQuery: string;
  activeFolder: string;
  onSelectFile: (file: MediaFile) => void;
  onAddFolder: () => void;
  onRemoveFolder: (folder: string) => void;
  onSelectFolder: (folder: string) => void;
  onOpenAddYouTube: () => void;
  onRemoveYouTubeVideo?: (videoId: string) => void;
  onRescan: () => void;
  onFilterChange: (filter: FilterCategory) => void;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenHotkeysGuide: () => void;
  onOpenFileFolder: (path: string) => void;
  onClearFileProgress?: (fingerprint: string) => void;
  onClearAllProgress?: () => void;
  updater?: ReturnType<typeof useUpdater>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  currentFile,
  settings,
  scanProgress,
  activeFilter,
  searchQuery,
  activeFolder,
  onSelectFile,
  onAddFolder,
  onRemoveFolder,
  onSelectFolder,
  onOpenAddYouTube,
  onRemoveYouTubeVideo,
  onRescan,
  onFilterChange,
  onSearchChange,
  onOpenSettings,
  onOpenHotkeysGuide,
  onOpenFileFolder,
  onClearFileProgress,
  onClearAllProgress,
  updater,
}) => {
  const [isFolderPickerExpanded, setIsFolderPickerExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Total YouTube files across library
  const youtubeFiles = useMemo(() => {
    return files.filter((f) => f.source === 'youtube' || Boolean(f.youtubeId));
  }, [files]);

  // Group files count by root folder
  const folderStats = settings.folders.map((folder) => {
    const folderFiles = files.filter((f) => f.folderRoot === folder);
    const audioCount = folderFiles.filter((f) => f.type === 'audio').length;
    const videoCount = folderFiles.filter((f) => f.type === 'video').length;
    const completedCount = folderFiles.filter((f) => f.completed).length;
    const folderName = folder.split(/[\\/]/).filter(Boolean).pop() || folder;

    return {
      path: folder,
      name: folderName,
      total: folderFiles.length,
      audio: audioCount,
      video: videoCount,
      completed: completedCount,
    };
  });

  // Files belonging to the currently active folder scope
  const filesInActiveFolder = useMemo(() => {
    return files.filter((file) => {
      const isYt = file.source === 'youtube' || Boolean(file.youtubeId);
      if (activeFolder === 'YouTube') return isYt;
      if (activeFolder && activeFolder !== 'ALL') {
        return file.folderRoot === activeFolder;
      }
      return true;
    });
  }, [files, activeFolder]);

  // Tab counts for the current folder scope
  const inProgressCount = useMemo(
    () => filesInActiveFolder.filter((f) => !f.completed && f.lastPosition > 0).length,
    [filesInActiveFolder]
  );
  const audioCount = useMemo(
    () => filesInActiveFolder.filter((f) => f.type === 'audio' && f.source !== 'youtube').length,
    [filesInActiveFolder]
  );
  const youtubeCount = useMemo(
    () => filesInActiveFolder.filter((f) => f.source === 'youtube' || Boolean(f.youtubeId)).length,
    [filesInActiveFolder]
  );
  const videoCount = useMemo(
    () => filesInActiveFolder.filter((f) => f.type === 'video' && f.source !== 'youtube').length,
    [filesInActiveFolder]
  );
  const completedCount = useMemo(
    () => filesInActiveFolder.filter((f) => f.completed).length,
    [filesInActiveFolder]
  );

  // Filter and sort files by active folder, search, category filters, and sort option
  const currentFolderFiles = useMemo(() => {
    let list = filesInActiveFolder.filter((file) => {
      const isYt = file.source === 'youtube' || Boolean(file.youtubeId);

      // Category filter
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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = file.name.toLowerCase().includes(q);
        const matchTitle = (file.title || '').toLowerCase().includes(q);
        const matchDir = (file.relativeDir || '').toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchDir) return false;
      }

      return true;
    });

    // Smart sort files
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : (a.modTime ? new Date(a.modTime).getTime() : 0);
        const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : (b.modTime ? new Date(b.modTime).getTime() : 0);
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.modTime ? new Date(a.modTime).getTime() : (a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0);
        const timeB = b.modTime ? new Date(b.modTime).getTime() : (b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0);
        return timeA - timeB;
      }
      if (sortBy === 'name') {
        const nameA = (a.title || a.name || '').toLowerCase();
        const nameB = (b.title || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'duration') {
        return (b.duration || 0) - (a.duration || 0);
      }
      return 0;
    });

    return list;
  }, [filesInActiveFolder, activeFilter, searchQuery, sortBy]);

  const activeFolderStat = folderStats.find((f) => f.path === activeFolder);
  const currentFolderName =
    activeFolder === 'YouTube'
      ? 'YouTube Collection'
      : activeFolder === 'ALL'
      ? 'Tất cả thư mục'
      : activeFolderStat?.name || (activeFolder.split(/[\\/]/).filter(Boolean).pop() || 'Thư mục');

  return (
    <aside className="w-80 sm:w-96 h-full flex flex-col bg-fluent-bg-dark border-r border-white/5 select-none relative z-30">
      {/* App Header with Brand Logo */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-fluent-bg-subtle/70">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-accent-glow border border-white/15 shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xs text-white tracking-wide leading-none">
                Go Audio Player
              </h1>
              <span className="px-1.5 py-0.2 rounded-full bg-fluent-accent/15 text-fluent-accent text-[9px] font-semibold">
                Win11
              </span>
            </div>
            <span className="text-[10px] text-fluent-text-muted">Listening Master</span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onRescan}
            disabled={scanProgress.isScanning}
            title="Quét lại file"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-fluent-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanProgress.isScanning ? 'animate-spin text-fluent-accent' : ''}`}
            />
          </button>
          <button
            onClick={onOpenHotkeysGuide}
            title="Bảng phím tắt"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Cài đặt"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FOLDER SWITCHER (Dedicated Folder Separation + YouTube Entry) */}
      <div className="p-3 border-b border-white/5 bg-fluent-bg-card/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fluent-text-muted flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-fluent-accent" /> Nguồn phát:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAddYouTube}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-medium transition-all shadow-sm"
              title="Nhúng video YouTube để luyện nghe"
            >
              <Youtube className="w-3 h-3 text-red-400" />
              <span>+ YouTube</span>
            </button>
            <button
              onClick={onAddFolder}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-fluent-accent/15 hover:bg-fluent-accent/25 text-fluent-accent border border-fluent-accent/30 text-[11px] font-medium transition-all shadow-sm"
            >
              <FolderPlus className="w-3 h-3" />
              <span>+ Thêm</span>
            </button>
          </div>
        </div>

        {/* Current Active Folder Banner / Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsFolderPickerExpanded(!isFolderPickerExpanded)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-fluent-bg-card to-fluent-bg-hover border border-fluent-accent/40 shadow-sm hover:border-fluent-accent text-left transition-all group"
          >
            <div className="flex items-center gap-2 truncate flex-1 mr-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                activeFolder === 'YouTube'
                  ? 'bg-red-600/20 border-red-500/40 text-red-400'
                  : 'bg-fluent-accent/20 border-fluent-accent/30 text-fluent-accent'
              }`}>
                {activeFolder === 'YouTube' ? (
                  <Youtube className="w-4 h-4" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate group-hover:text-fluent-accent transition-colors">
                  {currentFolderName}
                </p>
                <p className="text-[10px] text-fluent-text-secondary truncate">
                  {activeFolder === 'YouTube'
                    ? `${youtubeFiles.length} video YouTube đã lưu`
                    : activeFolder === 'ALL'
                    ? `${files.length} media tổng hợp`
                    : activeFolderStat
                    ? `${activeFolderStat.total} file (${activeFolderStat.audio} audio, ${activeFolderStat.video} video)`
                    : activeFolder}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-fluent-text-muted transition-transform shrink-0 ${
                isFolderPickerExpanded ? 'rotate-180 text-fluent-accent' : ''
              }`}
            />
          </button>

          {/* Collapsible Dropdown for Switching Folders */}
          {isFolderPickerExpanded && (
            <div className="mt-2 p-1.5 bg-fluent-bg-darker border border-white/10 rounded-xl shadow-2xl space-y-1 max-h-56 overflow-y-auto z-40">
              {/* YouTube Category Item */}
              {youtubeFiles.length > 0 && (
                <div
                  onClick={() => {
                    onSelectFolder('YouTube');
                    setIsFolderPickerExpanded(false);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                    activeFolder === 'YouTube'
                      ? 'bg-red-600/20 border border-red-500/40 text-red-400 font-semibold'
                      : 'hover:bg-white/5 text-fluent-text-secondary hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>YouTube Library ({youtubeFiles.length} video)</span>
                  </div>
                </div>
              )}

              {/* Local Folder Items */}
              {folderStats.map((fStat) => {
                const isSelected = activeFolder === fStat.path;
                return (
                  <div
                    key={fStat.path}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-fluent-accent/20 border border-fluent-accent/40 text-fluent-accent font-semibold'
                        : 'hover:bg-white/5 text-fluent-text-secondary hover:text-white border border-transparent'
                    }`}
                    onClick={() => {
                      onSelectFolder(fStat.path);
                      setIsFolderPickerExpanded(false);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2" title={fStat.path}>
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-fluent-accent' : ''}`} />
                      <div className="truncate">
                        <span className="truncate block font-medium">{fStat.name}</span>
                        <span className="text-[10px] text-fluent-text-muted font-normal block truncate">
                          {fStat.total} file ({fStat.audio} 🎵, {fStat.video} 🎬)
                        </span>
                      </div>
                    </div>

                    {/* Folder Action buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenFileFolder(fStat.path)}
                        title="Mở thư mục trong Explorer"
                        className="p-1 rounded hover:bg-white/10 text-fluent-text-muted hover:text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemoveFolder(fStat.path)}
                        title="Xóa khỏi danh sách quản lý"
                        className="p-1 rounded hover:bg-red-500/20 text-fluent-text-muted hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* All Folders Option */}
              <div
                onClick={() => {
                  onSelectFolder('ALL');
                  setIsFolderPickerExpanded(false);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all cursor-pointer border-t border-white/5 ${
                  activeFolder === 'ALL'
                    ? 'bg-fluent-accent/20 border-fluent-accent/40 text-fluent-accent font-semibold'
                    : 'hover:bg-white/5 text-fluent-text-muted hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Xem tất cả ({files.length} nội dung)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Scanning Progress Indicator */}
      {scanProgress.isScanning && (
        <div className="px-3 py-2 bg-fluent-accent/10 border-b border-fluent-accent/20 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-fluent-accent font-medium">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Đang quét media...
            </span>
            <span>{scanProgress.foundMedia} file</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-fluent-accent animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Search Bar & Category Filter Tabs */}
      <div className="p-3 border-b border-white/5 bg-fluent-bg-dark">
        {/* Search bar & Sort selector */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-fluent-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Tìm kiếm media...`}
              className="w-full pl-8 pr-7 py-1.5 bg-fluent-bg-card border border-white/5 rounded-lg text-xs text-white placeholder-fluent-text-muted focus:outline-none focus:border-fluent-accent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 text-fluent-text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              title="Tùy chọn sắp xếp"
              className="flex items-center gap-1 px-2 py-1.5 bg-fluent-bg-card hover:bg-white/10 border border-white/5 rounded-lg text-xs text-fluent-text-secondary hover:text-white transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-fluent-accent" />
              <span className="text-[11px] font-medium hidden sm:inline">
                {sortBy === 'newest' && 'Mới nhất'}
                {sortBy === 'oldest' && 'Cũ nhất'}
                {sortBy === 'name' && 'Tên A-Z'}
                {sortBy === 'duration' && 'Thời lượng'}
              </span>
            </button>

            {isSortMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSortMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-36 py-1 bg-fluent-bg-card border border-white/10 rounded-lg shadow-xl z-50 text-xs">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-fluent-text-muted tracking-wider border-b border-white/5">
                    Sắp xếp theo
                  </div>
                  <button
                    onClick={() => {
                      setSortBy('newest');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-white/10 flex items-center justify-between ${
                      sortBy === 'newest' ? 'text-fluent-accent font-semibold' : 'text-fluent-text-secondary'
                    }`}
                  >
                    <span>Mới nhất</span>
                    {sortBy === 'newest' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('oldest');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-white/10 flex items-center justify-between ${
                      sortBy === 'oldest' ? 'text-fluent-accent font-semibold' : 'text-fluent-text-secondary'
                    }`}
                  >
                    <span>Cũ nhất</span>
                    {sortBy === 'oldest' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('name');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-white/10 flex items-center justify-between ${
                      sortBy === 'name' ? 'text-fluent-accent font-semibold' : 'text-fluent-text-secondary'
                    }`}
                  >
                    <span>Tên A-Z</span>
                    {sortBy === 'name' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('duration');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-white/10 flex items-center justify-between ${
                      sortBy === 'duration' ? 'text-fluent-accent font-semibold' : 'text-fluent-text-secondary'
                    }`}
                  >
                    <span>Thời lượng</span>
                    {sortBy === 'duration' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category Filters in strict order: Đang nghe -> Audio -> YouTube -> Video -> Đã xong */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
          <button
            onClick={() => onFilterChange('in_progress')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'in_progress'
                ? 'bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/40 shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" /> Đang nghe ({inProgressCount})
          </button>
          <button
            onClick={() => onFilterChange('audio')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'audio'
                ? 'bg-fluent-accent text-black font-bold shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Music className="w-3 h-3" /> Audio ({audioCount})
          </button>
          <button
            onClick={() => onFilterChange('youtube')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'youtube'
                ? 'bg-red-600 text-white font-bold shadow-sm shadow-red-600/30'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Youtube className="w-3 h-3 text-red-400" /> YouTube ({youtubeCount})
          </button>
          <button
            onClick={() => onFilterChange('video')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'video'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3 h-3" /> Video ({videoCount})
          </button>
          <button
            onClick={() => onFilterChange('completed')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'completed'
                ? 'bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/40 shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã xong ({completedCount})
          </button>
        </div>
      </div>

      {/* In-progress helper banner with Clear All button */}
      {activeFilter === 'in_progress' && (
        <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Đang nghe ({currentFolderFiles.length}) • Gần đây nhất lên đầu</span>
          </span>
          {currentFolderFiles.length > 0 && onClearAllProgress && (
            <button
              onClick={onClearAllProgress}
              className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-semibold transition-colors flex items-center gap-1"
              title="Xóa toàn bộ tiến trình đang nghe"
            >
              <Trash2 className="w-2.5 h-2.5" /> Dọn tất cả
            </button>
          )}
        </div>
      )}

      {/* Media Files List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
        {currentFolderFiles.length === 0 ? (
          <div className="p-8 text-center text-fluent-text-muted text-xs flex flex-col items-center justify-center h-full">
            {activeFilter === 'youtube' ? (
              <>
                <Youtube className="w-10 h-10 text-red-500/20 mb-3" />
                <p>Chưa có video YouTube nào.</p>
                <button
                  onClick={onOpenAddYouTube}
                  className="mt-3 px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs transition-colors"
                >
                  + Nhúng link YouTube ngay
                </button>
              </>
            ) : (
              <>
                <FolderOpen className="w-10 h-10 text-white/10 mb-3" />
                {settings.folders.length === 0 ? (
                  <p>Chưa có thư mục nào. Nhấn "+ Thêm" ở trên để chọn thư mục media.</p>
                ) : activeFilter === 'in_progress' ? (
                  <p>Danh sách đang nghe trống. Bạn chưa nghe dở file nào.</p>
                ) : (
                  <p>Không có file nào trong thư mục này phù hợp với bộ lọc.</p>
                )}
              </>
            )}
          </div>
        ) : (
          currentFolderFiles.map((file) => {
            const isSelected = currentFile?.fingerprint === file.fingerprint;
            const isYt = file.source === 'youtube' || Boolean(file.youtubeId);
            const progressPercent =
              file.duration > 0
                ? Math.min(100, (file.lastPosition / file.duration) * 100)
                : 0;

            return (
              <div
                key={file.fingerprint + file.path}
                onClick={() => onSelectFile(file)}
                className={`p-2.5 flex items-start gap-3 cursor-pointer group transition-all relative ${
                  isSelected
                    ? isYt
                      ? 'bg-red-600/15 border-l-4 border-red-500 shadow-inner'
                      : 'bg-fluent-accent/15 border-l-4 border-fluent-accent shadow-inner'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Thumbnail / Type Icon */}
                {isYt && file.thumbnail ? (
                  <div className="relative w-12 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 mt-0.5">
                    <img
                      src={file.thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                      isSelected
                        ? isYt
                          ? 'bg-red-600 text-white border-red-500 font-bold shadow-lg shadow-red-600/30'
                          : 'bg-fluent-accent text-black border-fluent-accent font-bold shadow-accent-glow'
                        : isYt
                        ? 'bg-red-950/40 text-red-400 border-red-800/40'
                        : file.type === 'video'
                        ? 'bg-purple-950/40 text-purple-400 border-purple-800/40'
                        : 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                    }`}
                  >
                    {isSelected ? (
                      <Play className="w-4 h-4 fill-current" />
                    ) : isYt ? (
                      <Youtube className="w-4 h-4" />
                    ) : file.type === 'video' ? (
                      <Film className="w-4 h-4" />
                    ) : (
                      <Music className="w-4 h-4" />
                    )}
                  </div>
                )}

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-medium truncate ${
                        isSelected
                          ? isYt
                            ? 'text-red-400 font-semibold'
                            : 'text-fluent-accent font-semibold'
                          : 'text-white'
                      }`}
                    >
                      {file.title || file.name}
                    </p>

                    {/* Right action group: Clear button and status/duration */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Delete YouTube item button */}
                      {isYt && onRemoveYouTubeVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveYouTubeVideo(file.youtubeId || file.id);
                          }}
                          title="Xóa video YouTube khỏi danh sách"
                          className="p-1 rounded hover:bg-red-500/20 text-fluent-text-muted hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* Clear progress button for individual file */}
                      {!isYt && file.lastPosition > 0 && onClearFileProgress && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearFileProgress(file.fingerprint);
                          }}
                          title="Dọn dẹp: Xóa khỏi danh sách đang nghe (đặt lại tiến trình)"
                          className="p-1 rounded hover:bg-red-500/20 text-fluent-text-muted hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {file.completed ? (
                        <span title="Đã hoàn thành">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </span>
                      ) : (
                        file.duration > 0 && (
                          <span className="text-[10px] text-fluent-text-muted font-mono shrink-0">
                            {formatTime(file.duration)}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Subfolder relative path / YouTube Channel and last played time */}
                  <div className="flex items-center justify-between text-[10px] text-fluent-text-muted mt-0.5">
                    <p className="truncate flex items-center gap-1 min-w-0 flex-1 mr-1">
                      {isYt ? (
                        <span className="px-1 py-0.2 bg-red-600/15 text-red-400 rounded text-[9px] shrink-0 font-medium">
                          📺 {file.relativeDir || 'YouTube'}
                        </span>
                      ) : (
                        file.relativeDir && (
                          <span className="px-1 py-0.2 bg-white/5 rounded text-[9px] text-fluent-text-secondary shrink-0">
                            📁 {file.relativeDir}
                          </span>
                        )
                      )}
                      <span className="truncate">{file.name}</span>
                    </p>
                    {file.lastPlayedAt && (
                      <span className="text-[9px] text-amber-300/80 font-mono shrink-0">
                        {formatDate(file.lastPlayedAt)}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Saved Info */}
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          file.completed
                            ? 'bg-emerald-400'
                            : isYt
                            ? 'bg-red-500'
                            : 'bg-fluent-accent'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-fluent-text-muted font-mono shrink-0">
                      {isYt ? 'YouTube' : formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="p-2.5 px-3 border-t border-white/5 bg-fluent-bg-darker text-[10px] text-fluent-text-muted flex items-center justify-between">
        {updater ? (
          <UpdateBadge
            currentVersion={updater.currentVersion}
            status={updater.status}
            updateInfo={updater.updateInfo}
            downloadPercent={updater.downloadPercent}
            justCheckedUpToDate={updater.justCheckedUpToDate}
            onCheckUpdate={() => updater.checkForUpdates(false)}
            onStartDownload={updater.startDownload}
            onOpenInstallModal={updater.openInstallModal}
          />
        ) : (
          <span className="text-[10px] text-neutral-500 font-mono">v1.0.0</span>
        )}
        <span className="text-neutral-500 font-mono">{currentFolderFiles.length} mục</span>
      </div>
    </aside>
  );
};
