import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, Sparkles, AudioWaveform, CheckCircle2, XCircle, Cpu, ArrowDown } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  percentage: number;
  statusText?: string;
  sentenceCount?: number;
  recentSentences?: string[];
  activeModelName?: string;
  onCancel?: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  percentage,
  statusText = 'Đang phân tích âm thanh và phân đoạn câu bằng AI...',
  sentenceCount = 0,
  recentSentences = [],
  activeModelName,
  onCancel,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll only when user is already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [recentSentences, isAtBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsAtBottom(isNearBottom);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setIsAtBottom(true);
    }
  };

  if (!isOpen) return null;

  const isHeavyModel = activeModelName?.toLowerCase().includes('1.1') || activeModelName?.toLowerCase().includes('large-v3 q5');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col items-center text-center space-y-4">
        {/* Animated Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-fluent-accent/15 border border-fluent-accent/30 flex items-center justify-center text-fluent-accent shadow-accent-glow">
          <AudioWaveform className="w-8 h-8 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fluent-accent text-black flex items-center justify-center text-[10px] font-bold">
            <Sparkles className="w-3 h-3 fill-current" />
          </div>
        </div>

        {/* Title & Status */}
        <div>
          <h3 className="text-base font-bold text-white mb-1">
            Đang tạo bài luyện nghe
          </h3>
          <p className="text-xs text-fluent-text-secondary max-w-md">
            {statusText}
          </p>
        </div>

        {/* Model Badge */}
        {activeModelName && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-fluent-text-secondary">
            <Cpu className="w-3.5 h-3.5 text-fluent-accent" />
            <span>Mô hình: <strong className="text-white font-semibold">{activeModelName}</strong></span>
          </div>
        )}

        {/* Speed Advice for Heavy Model */}
        {isHeavyModel && (
          <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] text-left flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">💡 Gợi ý:</span>
            <span>
              Bản mô hình lớn (~1.1GB) cần nhiều thời gian xử lý. Để nhận diện nhanh hơn, bạn có thể chọn bản <strong>Whisper Turbo Q5</strong> (~547MB).
            </span>
          </div>
        )}

        {/* Percentage & Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-fluent-text-muted">
            <span className="flex items-center gap-1.5 text-fluent-accent">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Tiến độ
            </span>
            <span className="text-white font-mono">{percentage}%</span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-fluent-accent transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(4, percentage)}%` }}
            />
          </div>
        </div>

        {/* Live Recognized Sentences Stream Preview */}
        {recentSentences && recentSentences.length > 0 && (
          <div className="w-full bg-black/40 rounded-xl border border-white/10 p-3 text-left relative">
            <div className="flex items-center justify-between text-[11px] font-semibold text-fluent-text-muted mb-2 border-b border-white/5 pb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã nhận diện: {sentenceCount} câu</span>
              </span>
              <span className="text-[10px] text-fluent-text-muted font-sans">
                Đã cuộn ({recentSentences.length} câu)
              </span>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-48 overflow-y-auto space-y-1.5 pr-1 font-sans text-xs scrollbar-thin scrollbar-thumb-white/10"
            >
              {recentSentences.map((sentence, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-white/90 flex items-start gap-2 animate-fade-in transition-colors text-xs leading-relaxed"
                  title={sentence}
                >
                  <span className="text-fluent-accent shrink-0 text-[10px] font-mono mt-0.5">▸</span>
                  <span className="break-words select-text">{sentence}</span>
                </div>
              ))}
            </div>

            {/* Scroll to bottom button when user scrolled up */}
            {!isAtBottom && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-fluent-accent text-black text-[11px] font-semibold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Về cuối</span>
              </button>
            )}
          </div>
        )}

        {/* Footer info & Cancel Button */}
        <div className="w-full pt-2 flex items-center justify-between border-t border-white/5">
          <p className="text-[11px] text-fluent-text-muted text-left">
            Xử lý trên máy của bạn. Tự động lưu khi xong.
          </p>

          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Hủy tiến trình"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Hủy</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
