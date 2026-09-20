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
} from 'lucide-react';
import { MediaFile, FilterCategory, ScanProgress, AppSettings } from '../types';
import { formatTime, formatFileSize, formatDate } from '../utils/formatters';

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
  onRescan: () => void;
  onFilterChange: (filter: FilterCategory) => void;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenHotkeysGuide: () => void;
  onOpenFileFolder: (path: string) => void;
  onClearFileProgress?: (fingerprint: string) => void;
  onClearAllProgress?: () => void;
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
  onRescan,
  onFilterChange,
  onSearchChange,
  onOpenSettings,
  onOpenHotkeysGuide,
  onOpenFileFolder,
  onClearFileProgress,
  onClearAllProgress,
}) => {
  const [isFolderPickerExpanded, setIsFolderPickerExpanded] = useState(false);

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

  // Filter and sort files by active folder, search, and category filters
  const currentFolderFiles = useMemo(() => {
    let list = files.filter((file) => {
      // If an activeFolder is selected, ONLY show files from this folder
      if (activeFolder && activeFolder !== 'ALL') {
        if (file.folderRoot !== activeFolder) {
          return false;
        }
      }

      // Category filter
      if (activeFilter === 'audio' && file.type !== 'audio') return false;
      if (activeFilter === 'video' && file.type !== 'video') return false;
      if (activeFilter === 'in_progress') {
        if (file.completed || file.lastPosition <= 0) return false;
      }
      if (activeFilter === 'completed' && !file.completed) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = file.name.toLowerCase().includes(q);
        const matchTitle = file.title.toLowerCase().includes(q);
        const matchDir = file.relativeDir.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchDir) return false;
      }

      return true;
    });

    // When in "Đang nghe" (in_progress) tab, sort by most recently played first!
    if (activeFilter === 'in_progress') {
      list = [...list].sort((a, b) => {
        const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
        const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return list;
  }, [files, activeFolder, activeFilter, searchQuery]);

  const activeFolderStat = folderStats.find((f) => f.path === activeFolder);
  const currentFolderName =
    activeFolder === 'ALL'
      ? 'Tất cả thư mục'
      : activeFolderStat?.name || (activeFolder.split(/[\\/]/).filter(Boolean).pop() || 'Thư mục');

  const totalAudioInActive = currentFolderFiles.filter((f) => f.type === 'audio').length;
  const totalVideoInActive = currentFolderFiles.filter((f) => f.type === 'video').length;

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

      {/* FOLDER SWITCHER (Dedicated Folder Separation) */}
      <div className="p-3 border-b border-white/5 bg-fluent-bg-card/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fluent-text-muted flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-fluent-accent" /> Thư mục đang mở:
          </span>
          <button
            onClick={onAddFolder}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-fluent-accent/15 hover:bg-fluent-accent/25 text-fluent-accent border border-fluent-accent/30 text-[11px] font-medium transition-all shadow-sm"
          >
            <FolderPlus className="w-3 h-3" />
            <span>+ Thêm</span>
          </button>
        </div>

        {/* Current Active Folder Banner / Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsFolderPickerExpanded(!isFolderPickerExpanded)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-fluent-bg-card to-fluent-bg-hover border border-fluent-accent/40 shadow-sm hover:border-fluent-accent text-left transition-all group"
          >
            <div className="flex items-center gap-2 truncate flex-1 mr-2">
              <div className="w-7 h-7 rounded-lg bg-fluent-accent/20 border border-fluent-accent/30 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-fluent-accent" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate group-hover:text-fluent-accent transition-colors">
                  {currentFolderName}
                </p>
                <p className="text-[10px] text-fluent-text-secondary truncate">
                  {activeFolder === 'ALL'
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
              {settings.folders.length === 0 ? (
                <div className="p-3 text-center text-fluent-text-muted text-[11px]">
                  Chưa có thư mục nào. Nhấn "+ Thêm" để chọn thư mục.
                </div>
              ) : (
                <>
                  {/* Folder Items */}
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
                  {settings.folders.length > 1 && (
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
                      <span>Xem tất cả thư mục ({files.length} file)</span>
                    </div>
                  )}
                </>
              )}
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
        <div className="relative flex items-center mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-fluent-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Tìm trong ${currentFolderName}...`}
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

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-white/20 text-white font-semibold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Tất cả ({currentFolderFiles.length})
          </button>
          <button
            onClick={() => onFilterChange('audio')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'audio'
                ? 'bg-fluent-accent text-black font-bold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Music className="w-3 h-3" /> Audio ({totalAudioInActive})
          </button>
          <button
            onClick={() => onFilterChange('video')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'video'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3 h-3" /> Video ({totalVideoInActive})
          </button>
          <button
            onClick={() => onFilterChange('in_progress')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'in_progress'
                ? 'bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/50 shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Đang nghe
          </button>
          <button
            onClick={() => onFilterChange('completed')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'completed'
                ? 'bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/50'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Đã xong
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
            <FolderOpen className="w-10 h-10 text-white/10 mb-3" />
            {settings.folders.length === 0 ? (
              <p>Chưa có thư mục nào. Nhấn "+ Thêm" ở trên để chọn thư mục media.</p>
            ) : activeFilter === 'in_progress' ? (
              <p>Danh sách đang nghe trống. Bạn chưa nghe dở file nào.</p>
            ) : (
              <p>Không có file nào trong thư mục này phù hợp với bộ lọc.</p>
            )}
          </div>
        ) : (
          currentFolderFiles.map((file) => {
            const isSelected = currentFile?.fingerprint === file.fingerprint;
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
                    ? 'bg-fluent-accent/15 border-l-4 border-fluent-accent shadow-inner'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    isSelected
                      ? 'bg-fluent-accent text-black border-fluent-accent font-bold shadow-accent-glow'
                      : file.type === 'video'
                      ? 'bg-purple-950/40 text-purple-400 border-purple-800/40'
                      : 'bg-blue-950/40 text-blue-400 border-blue-800/40'
                  }`}
                >
                  {isSelected ? (
                    <Play className="w-4 h-4 fill-current" />
                  ) : file.type === 'video' ? (
                    <Film className="w-4 h-4" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs font-medium truncate ${
                        isSelected ? 'text-fluent-accent font-semibold' : 'text-white'
                      }`}
                    >
                      {file.title || file.name}
                    </p>

                    {/* Right action group: Clear button and status/duration */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Clear progress button for individual file */}
                      {file.lastPosition > 0 && onClearFileProgress && (
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

                  {/* Subfolder relative path and last played time */}
                  <div className="flex items-center justify-between text-[10px] text-fluent-text-muted mt-0.5">
                    <p className="truncate flex items-center gap-1 min-w-0 flex-1 mr-1">
                      {file.relativeDir && (
                        <span className="px-1 py-0.2 bg-white/5 rounded text-[9px] text-fluent-text-secondary shrink-0">
                          📁 {file.relativeDir}
                        </span>
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
                          file.completed ? 'bg-emerald-400' : 'bg-fluent-accent'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-fluent-text-muted font-mono shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="p-2.5 border-t border-white/5 bg-fluent-bg-darker text-[10px] text-fluent-text-muted flex items-center justify-between">
        <span>{currentFolderFiles.length} file trong thư mục</span>
        <span className="text-fluent-accent/70">Smart Fingerprint</span>
      </div>
    </aside>
  );
};
