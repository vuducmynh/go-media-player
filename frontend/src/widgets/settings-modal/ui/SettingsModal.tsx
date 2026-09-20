import React, { useState } from 'react';
import {
  X,
  Save,
  RotateCcw,
  FolderPlus,
  Folder,
  Trash2,
  Zap,
  Gauge,
  FastForward,
  BookmarkCheck,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '../../../entities/media/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  onAddFolder: () => void;
  onRemoveFolder: (folder: string) => void;
  currentVersion?: string;
  onCheckUpdate?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onAddFolder,
  onRemoveFolder,
  currentVersion,
  onCheckUpdate,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });

  if (!isOpen) return null;

  const handleChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleResetDefaults = () => {
    setFormData({
      folders: formData.folders,
      activeFolder: formData.activeFolder || '',
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
  };

  const currentHoldKeyLabel =
    formData.holdSlowKey === 'KeyS'
      ? 'Phím S'
      : formData.holdSlowKey === 'ShiftLeft'
      ? 'Phím Shift'
      : formData.holdSlowKey === 'ControlLeft'
      ? 'Phím Ctrl'
      : formData.holdSlowKey === 'AltLeft'
      ? 'Phím Alt'
      : formData.holdSlowKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-fluent-bg-subtle/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-fluent-accent/15 text-fluent-accent">
              <Gauge className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Cài đặt ứng dụng & Bộ điều khiển
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Section 1: Hold-to-Slow feature (Unified and completely clear) */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-purple-500/25 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                1. Tính năng Giữ phím để giảm tốc (Hold-to-Slow)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                Luyện Listening
              </span>
            </div>

            <p className="text-[11px] text-fluent-text-secondary leading-relaxed">
              Khi nghe đoạn khó hoặc câu phát âm nhanh, bạn chỉ cần <strong className="text-white">nhấn giữ một phím</strong> để audio/video chạy chậm lại. Khi <strong className="text-white">thả phím</strong> ra, tốc độ sẽ lập tức quay trở lại bình thường.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Hold Key Selection */}
              <div className="bg-fluent-bg-dark/80 p-2.5 rounded-lg border border-white/5">
                <label className="block text-fluent-text-secondary font-medium mb-1.5">
                  Phím dùng để nhấn giữ:
                </label>
                <select
                  value={formData.holdSlowKey}
                  onChange={(e) => handleChange('holdSlowKey', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-fluent-bg-card border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="KeyS">Phím S (Khuyên dùng)</option>
                  <option value="ShiftLeft">Phím Shift</option>
                  <option value="ControlLeft">Phím Ctrl</option>
                  <option value="AltLeft">Phím Alt</option>
                </select>
              </div>

              {/* Slow Speed Selection */}
              <div className="bg-fluent-bg-dark/80 p-2.5 rounded-lg border border-white/5">
                <label className="block text-fluent-text-secondary font-medium mb-1.5">
                  Mức tốc độ khi đang giữ phím:
                </label>
                <select
                  value={formData.slowSpeed}
                  onChange={(e) =>
                    handleChange('slowSpeed', parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 bg-fluent-bg-card border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="0.25">0.25x (Rất chậm - 1/4 tốc độ)</option>
                  <option value="0.4">0.4x (Chậm)</option>
                  <option value="0.5">0.5x (Chuẩn luyện nghe - 1/2 tốc độ)</option>
                  <option value="0.6">0.6x (Vừa phải)</option>
                  <option value="0.75">0.75x (Chậm nhẹ)</option>
                  <option value="0.8">0.8x</option>
                </select>
              </div>
            </div>

            {/* Quick summary badge */}
            <div className="flex items-center gap-1.5 text-[11px] text-purple-300/90 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/20 font-mono">
              <span>👉 Thiết lập hiện tại:</span>
              <span className="font-bold text-white">Giữ {currentHoldKeyLabel}</span>
              <span>sẽ giảm tốc về</span>
              <span className="font-bold text-purple-300">{formData.slowSpeed}x</span>
            </div>
          </div>

          {/* Section 2: Normal Speed & Jump Seconds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jump Seconds */}
            <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5 space-y-2">
              <h3 className="text-xs font-bold text-fluent-accent uppercase tracking-wider flex items-center gap-1.5">
                <FastForward className="w-4 h-4 text-fluent-accent" />
                2. Khoảng thời gian tua (giây)
              </h3>
              <p className="text-[10px] text-fluent-text-muted">
                Số giây nhảy khi bấm phím Mũi tên Trái / Phải (← / →):
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.jumpSeconds}
                  onChange={(e) =>
                    handleChange('jumpSeconds', parseFloat(e.target.value) || 5)
                  }
                  className="w-16 px-2.5 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-fluent-accent text-center font-bold"
                />
                <span className="text-fluent-text-secondary text-xs">giây</span>
                <div className="flex gap-1 ml-auto">
                  {[3, 5, 10, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleChange('jumpSeconds', sec)}
                      className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                        formData.jumpSeconds === sec
                          ? 'bg-fluent-accent text-black font-bold border-fluent-accent shadow-sm'
                          : 'bg-white/5 text-fluent-text-secondary border-white/10 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Default Playback Speed */}
            <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5 space-y-2">
              <h3 className="text-xs font-bold text-fluent-accent uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-fluent-accent" />
                3. Tốc độ phát thông thường
              </h3>
              <p className="text-[10px] text-fluent-text-muted">
                Tốc độ phát gốc khi mở bài mới (bình thường là 1.0x):
              </p>
              <div className="pt-1">
                <select
                  value={formData.defaultSpeed}
                  onChange={(e) =>
                    handleChange('defaultSpeed', parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-fluent-accent cursor-pointer"
                >
                  <option value="0.75">0.75x (Nghe chậm toàn bài)</option>
                  <option value="1.0">1.0x (Tốc độ gốc chuẩn)</option>
                  <option value="1.25">1.25x (Nhanh hơn 25%)</option>
                  <option value="1.5">1.5x (Nhanh hơn 50%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Smart Resume & Auto Play */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-fluent-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-fluent-accent" />
              4. Ghi nhớ tiến trình phát
            </h3>
            <div className="space-y-2.5 divide-y divide-white/5">
              <label className="flex items-center justify-between cursor-pointer pt-1">
                <div>
                  <span className="font-medium text-white block text-xs">
                    Smart Resume (Nhận diện file qua Fingerprint)
                  </span>
                  <span className="text-[10px] text-fluent-text-muted">
                    Tự động nhớ vị trí đang nghe dở, kể cả khi đổi tên file hoặc chuyển thư mục.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoResume}
                  onChange={(e) => handleChange('autoResume', e.target.checked)}
                  className="w-4 h-4 rounded text-fluent-accent accent-fluent-accent cursor-pointer ml-3"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2.5">
                <div>
                  <span className="font-medium text-white block text-xs">
                    Tự động phát tiếp file kế tiếp
                  </span>
                  <span className="text-[10px] text-fluent-text-muted">
                    Khi một file phát hết, tự động chuyển sang file tiếp theo trong danh sách.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoPlayNext}
                  onChange={(e) => handleChange('autoPlayNext', e.target.checked)}
                  className="w-4 h-4 rounded text-fluent-accent accent-fluent-accent cursor-pointer ml-3"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Managed Folders */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-fluent-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-fluent-accent" />
                5. Vị trí thư mục media ({formData.folders.length})
              </h3>
              <button
                type="button"
                onClick={onAddFolder}
                className="flex items-center gap-1 text-[11px] text-fluent-accent hover:underline font-medium"
              >
                <FolderPlus className="w-3.5 h-3.5" /> + Thêm thư mục
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {formData.folders.length === 0 ? (
                <p className="text-[11px] text-fluent-text-muted italic py-2 text-center">
                  Chưa có thư mục nào được thêm.
                </p>
              ) : (
                formData.folders.map((folder) => (
                  <div
                    key={folder}
                    className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg-dark border border-white/5 text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <Folder className="w-3.5 h-3.5 text-fluent-accent shrink-0" />
                      <span className="text-fluent-text-secondary truncate font-mono">
                        {folder}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveFolder(folder)}
                      className="p-1 hover:text-red-400 text-fluent-text-muted transition-colors shrink-0"
                      title="Xóa thư mục khỏi quản lý"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 5: App Version & Updates */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-fluent-text-secondary uppercase tracking-wider">
                5. Phiên bản ứng dụng
              </h3>
              <p className="text-[11px] text-fluent-text-muted mt-0.5">
                Go Audio & Video Player (Windows 11) •{' '}
                <span className="text-emerald-400 font-mono font-semibold">
                  {currentVersion || 'v1.0.0'}
                </span>
              </p>
            </div>
            {onCheckUpdate && (
              <button
                type="button"
                onClick={onCheckUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kiểm tra cập nhật</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-fluent-bg-subtle/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-black font-semibold text-xs shadow-accent-glow transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Lưu cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
