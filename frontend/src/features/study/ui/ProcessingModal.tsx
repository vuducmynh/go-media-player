import React from 'react';
import { RefreshCw, Sparkles, AudioWaveform } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  percentage: number;
  statusText?: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  percentage,
  statusText = 'Đang phân tích âm thanh và phân đoạn câu bằng AI...',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col items-center text-center space-y-5">
        <div className="relative w-16 h-16 rounded-2xl bg-fluent-accent/15 border border-fluent-accent/30 flex items-center justify-center text-fluent-accent shadow-accent-glow">
          <AudioWaveform className="w-8 h-8 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fluent-accent text-black flex items-center justify-center text-[10px] font-bold">
            <Sparkles className="w-3 h-3 fill-current" />
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-white mb-1">
            Đang Xử Lý Phân Đoạn Câu
          </h3>
          <p className="text-xs text-fluent-text-secondary max-w-sm">
            {statusText}
          </p>
        </div>

        {/* Percentage & Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-fluent-text-muted">
            <span className="flex items-center gap-1.5 text-fluent-accent">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Tiến độ nhận diện
            </span>
            <span className="text-white font-mono">{percentage}%</span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-fluent-accent transition-[width] duration-200"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-fluent-text-muted">
          Quá trình này chạy offline 100% trên máy. Khi hoàn thành bài học sẽ tự động mở.
        </p>
      </div>
    </div>
  );
};
