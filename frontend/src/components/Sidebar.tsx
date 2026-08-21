import React, { useState } from 'react';
import {
  FolderPlus,
  RefreshCw,
  Search,
  Settings,
  Keyboard,
  Music,
  Film,
  CheckCircle2,
  Clock,
  Folder,
  X,
  Play,
  ListFilter,
  Check,
  ChevronRight,
} from 'lucide-react';
import { MediaFile, FilterCategory, ScanProgress, AppSettings } from '../types';
import { formatTime, formatFileSize } from '../utils/formatters';

interface SidebarProps {
  files: MediaFile[];
  currentFile: MediaFile | null;
  settings: AppSettings;
  scanProgress: ScanProgress;
  activeFilter: FilterCategory;
  searchQuery: string;
  selectedFolderFilter: string;
  onSelectFile: (file: MediaFile) => void;
  onAddFolder: () => void;
  onRemoveFolder: (folder: string) => void;
  onRescan: () => void;
  onFilterChange: (filter: FilterCategory) => void;
  onSearchChange: (query: string) => void;
  onFolderFilterChange: (folder: string) => void;
  onOpenSettings: () => void;
  onOpenHotkeysGuide: () => void;
  onOpenFileFolder: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  currentFile,
  settings,
  scanProgress,
  activeFilter,
  searchQuery,
  selectedFolderFilter,
  onSelectFile,
  onAddFolder,
  onRemoveFolder,
  onRescan,
  onFilterChange,
  onSearchChange,
  onFolderFilterChange,
  onOpenSettings,
  onOpenHotkeysGuide,
  onOpenFileFolder,
}) => {
  const [showFolderList, setShowFolderList] = useState(false);

  // Filter files
  const filteredFiles = files.filter((file) => {
    // 1. Folder filter
    if (selectedFolderFilter && file.folderRoot !== selectedFolderFilter) {
      return false;
    }

    // 2. Category filter
    if (activeFilter === 'audio' && file.type !== 'audio') return false;
    if (activeFilter === 'video' && file.type !== 'video') return false;
    if (activeFilter === 'in_progress') {
      if (file.completed || file.lastPosition <= 0) return false;
    }
    if (activeFilter === 'completed' && !file.completed) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = file.name.toLowerCase().includes(q);
      const matchTitle = file.title.toLowerCase().includes(q);
      const matchDir = file.relativeDir.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchDir) return false;
    }

    return true;
  });

  const totalAudio = files.filter((f) => f.type === 'audio').length;
  const totalVideo = files.filter((f) => f.type === 'video').length;

  return (
    <aside className="w-80 sm:w-96 h-full flex flex-col bg-fluent-bg-dark border-r border-white/5 select-none relative z-30">
      {/* Top Header */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fluent-accent to-blue-600 flex items-center justify-center shadow-accent-glow">
            <Music className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide leading-none">
              Go Media Player
            </h1>
            <span className="text-[10px] text-fluent-text-muted">Listening Assistant</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onRescan}
            disabled={scanProgress.isScanning}
            title="Quét lại toàn bộ thư mục"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-fluent-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${scanProgress.isScanning ? 'animate-spin text-fluent-accent' : ''}`}
            />
          </button>
          <button
            onClick={onOpenHotkeysGuide}
            title="Bảng phím tắt"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Cài đặt"
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Folders Management Bar */}
      <div className="p-3 border-b border-white/5 bg-fluent-bg-subtle/50">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowFolderList(!showFolderList)}
            className="flex items-center gap-1.5 text-xs font-semibold text-fluent-text-secondary hover:text-white transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-fluent-accent" />
            <span>Thư mục quản lý ({settings.folders.length})</span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showFolderList ? 'rotate-90' : ''}`}
            />
          </button>
          <button
            onClick={onAddFolder}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-fluent-accent/15 hover:bg-fluent-accent/25 active:bg-fluent-accent/35 text-fluent-accent border border-fluent-accent/30 text-xs font-medium transition-all shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Thêm thư mục</span>
          </button>
        </div>

        {/* Collapsible Folder List */}
        {showFolderList && (
          <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {settings.folders.length === 0 ? (
              <p className="text-[11px] text-fluent-text-muted italic py-1 text-center">
                Chưa thêm thư mục nào. Nhấn "+ Thêm thư mục" để bắt đầu quét.
              </p>
            ) : (
              settings.folders.map((folder) => {
                const isFiltered = selectedFolderFilter === folder;
                return (
                  <div
                    key={folder}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] border transition-colors ${
                      isFiltered
                        ? 'bg-fluent-accent/10 border-fluent-accent/30 text-fluent-accent'
                        : 'bg-fluent-bg-card border-white/5 text-fluent-text-secondary'
                    }`}
                  >
                    <button
                      onClick={() =>
                        onFolderFilterChange(isFiltered ? '' : folder)
                      }
                      className="flex items-center gap-1.5 truncate flex-1 text-left"
                      title={folder}
                    >
                      <Folder className="w-3 h-3 shrink-0" />
                      <span className="truncate">{folder}</span>
                    </button>
                    <button
                      onClick={() => onRemoveFolder(folder)}
                      title="Xóa khỏi danh sách quản lý"
                      className="p-1 hover:text-red-400 text-fluent-text-muted transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Scanning Progress Bar Indicator */}
      {scanProgress.isScanning && (
        <div className="px-3 py-2 bg-fluent-accent/10 border-b border-fluent-accent/20 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-fluent-accent font-medium">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Đang quét thư mục...
            </span>
            <span>{scanProgress.foundMedia} file tìm thấy</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-fluent-accent animate-pulse w-full" />
          </div>
          {scanProgress.currentPath && (
            <p className="text-[10px] text-fluent-text-muted truncate">
              {scanProgress.currentPath}
            </p>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-2.5 text-fluent-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên file, thư mục..."
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
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-white/20 text-white font-semibold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Tất cả ({files.length})
          </button>
          <button
            onClick={() => onFilterChange('audio')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'audio'
                ? 'bg-fluent-accent text-black font-bold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Music className="w-3 h-3" /> Audio ({totalAudio})
          </button>
          <button
            onClick={() => onFilterChange('video')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeFilter === 'video'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3 h-3" /> Video ({totalVideo})
          </button>
          <button
            onClick={() => onFilterChange('in_progress')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeFilter === 'in_progress'
                ? 'bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/50'
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

      {/* Media Files List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
        {filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-fluent-text-muted text-xs">
            {files.length === 0 ? (
              <p>Chưa có file nào. Hãy thêm thư mục để quét file audio & video.</p>
            ) : (
              <p>Không tìm thấy file nào phù hợp với bộ lọc.</p>
            )}
          </div>
        ) : (
          filteredFiles.map((file) => {
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
                    ? 'bg-fluent-accent/15 border-l-4 border-fluent-accent'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    isSelected
                      ? 'bg-fluent-accent text-black border-fluent-accent font-bold'
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
                    {file.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      file.duration > 0 && (
                        <span className="text-[10px] text-fluent-text-muted font-mono shrink-0">
                          {formatTime(file.duration)}
                        </span>
                      )
                    )}
                  </div>

                  <p className="text-[10px] text-fluent-text-muted truncate mt-0.5">
                    {file.relativeDir || file.name}
                  </p>

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
        <span>Tổng cộng: {filteredFiles.length} file</span>
        <span>Fingerprint: Chunk-Hash Enabled</span>
      </div>
    </aside>
  );
};
