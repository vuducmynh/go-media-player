import React from 'react';
import { X, Keyboard, Zap, Repeat, Play, Volume2 } from 'lucide-react';
import { AppSettings } from '../../../entities/media/types';

interface HotkeysGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const HotkeysGuideModal: React.FC<HotkeysGuideModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const holdKeyName =
    settings.holdSlowKey === 'KeyS'
      ? 'S'
      : settings.holdSlowKey === 'ShiftLeft'
      ? 'Shift'
      : settings.holdSlowKey === 'ControlLeft'
      ? 'Ctrl'
      : settings.holdSlowKey.replace('Key', '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-fluent-bg-subtle/50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-fluent-accent" />
            <h2 className="text-base font-bold text-white">Phím tắt</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Group 1: Listening & Smart Slow */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-purple-500/20 shadow-sm">
            <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider mb-3">
              <Zap className="w-4 h-4 text-purple-400" /> Luyện nghe & Lặp đoạn
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Nhấn giữ để nghe chậm</span>
                <kbd className="px-2 py-1 rounded bg-purple-950/80 border border-purple-500/50 text-purple-200 font-mono text-[11px] shadow-sm">
                  Giữ [{holdKeyName}] ({settings.slowSpeed}x)
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Điểm bắt đầu lặp</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [A]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Điểm kết thúc lặp</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [B]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Bật / Tắt lặp đoạn</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [L]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white font-medium">Hủy lặp đoạn</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [C]
                </kbd>
              </div>
            </div>
          </div>

          {/* Group 2: Playback Controls */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5">
            <h3 className="text-xs font-bold text-fluent-accent flex items-center gap-1.5 uppercase tracking-wider mb-3">
              <Play className="w-4 h-4 text-fluent-accent" /> Phát & Tua
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Phát / Tạm dừng</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [Space]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Tua lùi ({settings.jumpSeconds}s)</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [←]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Tua tới ({settings.jumpSeconds}s)</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [→]
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Tăng / Giảm tốc độ</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                    [
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                    ]
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white font-medium">Bật / Tắt toàn màn hình</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [F] hoặc nhấp đúp
                </kbd>
              </div>
            </div>
          </div>

          {/* Group 3: Volume */}
          <div className="bg-fluent-bg-card p-4 rounded-xl border border-white/5">
            <h3 className="text-xs font-bold text-fluent-text-secondary flex items-center gap-1.5 uppercase tracking-wider mb-3">
              <Volume2 className="w-4 h-4 text-fluent-text-secondary" /> Âm lượng
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white font-medium">Tăng / Giảm âm lượng</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                    [↑]
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                    [↓]
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white font-medium">Bật / Tắt tiếng</span>
                <kbd className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono text-[11px]">
                  [M]
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-fluent-bg-subtle/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-fluent-accent text-black font-semibold text-xs shadow-accent-glow hover:bg-fluent-accent-hover transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
