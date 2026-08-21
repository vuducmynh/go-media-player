import React, { useState } from 'react';
import { X, Save, RotateCcw, FolderPlus, Folder, Trash2 } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  onAddFolder: () => void;
  onRemoveFolder: (folder: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onAddFolder,
  onRemoveFolder,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-fluent-bg-subtle/50">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            ⚙️ Cài đặt ứng dụng & Bộ phím
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Section: Listening Settings */}
          <div>
            <h3 className="text-xs font-semibold text-fluent-accent uppercase tracking-wider mb-3">
              Cấu hình luyện nghe (Listening)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-fluent-bg-card p-4 rounded-xl border border-white/5">
              {/* Jump Seconds */}
              <div>
                <label className="block text-fluent-text-secondary font-medium mb-1">
                  Khoảng thời gian tua (giây):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.jumpSeconds}
                    onChange={(e) =>
                      handleChange('jumpSeconds', parseFloat(e.target.value) || 5)
                    }
                    className="w-20 px-3 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-fluent-accent"
                  />
                  <div className="flex gap-1">
                    {[3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleChange('jumpSeconds', sec)}
                        className={`px-2 py-1 rounded border text-[11px] font-mono ${
                          formData.jumpSeconds === sec
                            ? 'bg-fluent-accent text-black font-bold border-fluent-accent'
                            : 'bg-white/5 text-fluent-text-secondary border-white/10 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-fluent-text-muted mt-1">
                  Số giây nhảy khi bấm phím Mũi tên Trái / Phải.
                </p>
              </div>

              {/* Slow Speed */}
              <div>
                <label className="block text-fluent-text-secondary font-medium mb-1">
                  Tốc độ khi giữ phím (Hold-to-Slow):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.slowSpeed}
                    onChange={(e) =>
                      handleChange('slowSpeed', parseFloat(e.target.value))
                    }
                    className="px-3 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-fluent-accent"
                  >
                    <option value="0.25">0.25x (Rất chậm)</option>
                    <option value="0.4">0.4x</option>
                    <option value="0.5">0.5x (Mặc định)</option>
                    <option value="0.6">0.6x</option>
                    <option value="0.75">0.75x</option>
                    <option value="0.8">0.8x</option>
                  </select>
                </div>
                <p className="text-[10px] text-fluent-text-muted mt-1">
                  Tốc độ giảm ngay tức thì khi nhấn giữ phím slow.
                </p>
              </div>

              {/* Hold Slow Key */}
              <div>
                <label className="block text-fluent-text-secondary font-medium mb-1">
                  Phím giữ giảm tốc (Hold Key):
                </label>
                <select
                  value={formData.holdSlowKey}
                  onChange={(e) => handleChange('holdSlowKey', e.target.value)}
                  className="w-full px-3 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-fluent-accent"
                >
                  <option value="KeyS">Phím S (Mặc định)</option>
                  <option value="ShiftLeft">Phím Shift</option>
                  <option value="ControlLeft">Phím Ctrl</option>
                  <option value="AltLeft">Phím Alt</option>
                </select>
              </div>

              {/* Default Speed */}
              <div>
                <label className="block text-fluent-text-secondary font-medium mb-1">
                  Tốc độ phát mặc định:
                </label>
                <select
                  value={formData.defaultSpeed}
                  onChange={(e) =>
                    handleChange('defaultSpeed', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-1.5 bg-fluent-bg-dark border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-fluent-accent"
                >
                  <option value="0.75">0.75x</option>
                  <option value="1.0">1.0x (Bình thường)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Playback Behavior */}
          <div>
            <h3 className="text-xs font-semibold text-fluent-accent uppercase tracking-wider mb-3">
              Hành vi phát & Ghi nhớ tiến trình
            </h3>
            <div className="space-y-3 bg-fluent-bg-card p-4 rounded-xl border border-white/5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-white block">
                    Tự động nhớ và khôi phục vị trí (Smart Resume)
                  </span>
                  <span className="text-[10px] text-fluent-text-muted">
                    Dựa vào Chunk-Hash Fingerprint để nhận diện file chính xác ngay cả khi đổi tên/thư mục.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoResume}
                  onChange={(e) => handleChange('autoResume', e.target.checked)}
                  className="w-4 h-4 rounded text-fluent-accent accent-fluent-accent cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-white block">
                    Tự động chuyển tiếp file tiếp theo khi hết bài
                  </span>
                  <span className="text-[10px] text-fluent-text-muted">
                    Tự động phát bài kế tiếp trong danh sách thư mục.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoPlayNext}
                  onChange={(e) => handleChange('autoPlayNext', e.target.checked)}
                  className="w-4 h-4 rounded text-fluent-accent accent-fluent-accent cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section: Managed Folders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-fluent-accent uppercase tracking-wider">
                Quản lý vị trí thư mục
              </h3>
              <button
                type="button"
                onClick={onAddFolder}
                className="flex items-center gap-1 text-[11px] text-fluent-accent hover:underline"
              >
                <FolderPlus className="w-3.5 h-3.5" /> + Thêm thư mục
              </button>
            </div>
            <div className="bg-fluent-bg-card p-3 rounded-xl border border-white/5 space-y-1.5 max-h-36 overflow-y-auto">
              {formData.folders.length === 0 ? (
                <p className="text-[11px] text-fluent-text-muted italic py-1 text-center">
                  Chưa có thư mục nào.
                </p>
              ) : (
                formData.folders.map((folder) => (
                  <div
                    key={folder}
                    className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg-dark border border-white/5 text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5 text-fluent-accent shrink-0" />
                      <span className="text-fluent-text-secondary truncate">{folder}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveFolder(folder)}
                      className="p-1 hover:text-red-400 text-fluent-text-muted transition-colors"
                      title="Xóa thư mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-fluent-bg-subtle/50 flex items-center justify-between">
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-black font-semibold text-xs shadow-accent-glow transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Lưu cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
