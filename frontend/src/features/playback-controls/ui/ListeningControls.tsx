import React from 'react';
import {
  RotateCcw,
  RotateCw,
  Gauge,
  Repeat,
  Zap,
  Bookmark,
  X,
} from 'lucide-react';
import { formatTime } from '../../../shared/lib/formatters';

export interface ListeningControlsProps {
  jumpSeconds: number;
  playbackRate: number;
  isSlowHeld: boolean;
  slowSpeed: number;
  holdSlowKey: string;
  loopA: number;
  loopB: number;
  isLoopActive: boolean;
  currentTime: number;
  duration: number;
  onSeekDelta: (seconds: number) => void;
  onSpeedChange: (speed: number) => void;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onToggleLoop: () => void;
  onClearLoop: () => void;
  onSeekTo: (position: number) => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const ListeningControls: React.FC<ListeningControlsProps> = ({
  jumpSeconds,
  playbackRate,
  isSlowHeld,
  slowSpeed,
  holdSlowKey,
  loopA,
  loopB,
  isLoopActive,
  onSeekDelta,
  onSpeedChange,
  onSetLoopA,
  onSetLoopB,
  onToggleLoop,
  onClearLoop,
}) => {
  const hasLoop = loopA > 0 || loopB > 0;
  const holdKeyName =
    holdSlowKey === 'KeyS'
      ? 'S'
      : holdSlowKey === 'ShiftLeft' || holdSlowKey === 'ShiftRight'
      ? 'Shift'
      : holdSlowKey.replace('Key', '');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-fluent-bg-darker/60 border-t border-white/5 text-xs text-fluent-text-secondary select-none">
      {/* Left: Jump Controls & Hold-to-slow status */}
      <div className="flex items-center gap-2">
        {/* Jump Backward */}
        <button
          onClick={() => onSeekDelta(-jumpSeconds)}
          title={`Tua lùi ${jumpSeconds}s (←)`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-fluent-bg-card hover:bg-fluent-bg-hover active:bg-fluent-bg-active text-fluent-text-primary border border-white/5 transition-all shadow-sm group"
        >
          <RotateCcw className="w-3.5 h-3.5 text-fluent-accent group-hover:-rotate-45 transition-transform" />
          <span className="font-semibold text-[11px]">-{jumpSeconds}s</span>
        </button>

        {/* Jump Forward */}
        <button
          onClick={() => onSeekDelta(jumpSeconds)}
          title={`Tua tới ${jumpSeconds}s (→)`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-fluent-bg-card hover:bg-fluent-bg-hover active:bg-fluent-bg-active text-fluent-text-primary border border-white/5 transition-all shadow-sm group"
        >
          <RotateCw className="w-3.5 h-3.5 text-fluent-accent group-hover:rotate-45 transition-transform" />
          <span className="font-semibold text-[11px]">+{jumpSeconds}s</span>
        </button>

        {/* Hold to Slow Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            isSlowHeld
              ? 'bg-purple-950/80 text-purple-200 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)] animate-pulse'
              : 'bg-fluent-bg-card text-fluent-text-secondary border-white/5 hover:border-purple-500/30'
          }`}
          title={`Giữ phím ${holdKeyName} để nghe chậm ${slowSpeed}x`}
        >
          <Zap
            className={`w-3.5 h-3.5 ${
              isSlowHeld ? 'text-purple-400 fill-purple-400' : 'text-purple-400'
            }`}
          />
          <span className="text-[11px] font-medium">
            {isSlowHeld ? (
              <span className="font-bold text-purple-300">
                Chậm {slowSpeed}x (Đang giữ)
              </span>
            ) : (
              <span>
                Giữ <kbd className="px-1 py-0.5 rounded bg-black/40 text-purple-300 font-mono text-[10px]">{holdKeyName}</kbd> nghe chậm ({slowSpeed}x)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Center: A-B Repeat Section for Listening practice */}
      <div className="flex items-center gap-1.5 bg-fluent-bg-card/70 p-1 rounded-xl border border-white/5">
        <span className="text-[11px] font-semibold text-fluent-text-muted px-2 flex items-center gap-1">
          <Repeat className="w-3 h-3 text-fluent-accent" /> Lặp đoạn:
        </span>

        {/* Set Point A */}
        <button
          onClick={onSetLoopA}
          title="Điểm đầu (A)"
          className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all ${
            loopA > 0
              ? 'bg-fluent-accent/20 text-fluent-accent border border-fluent-accent/40 font-mono'
              : 'bg-white/5 hover:bg-white/10 text-fluent-text-primary'
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span>A: {loopA > 0 ? formatTime(loopA) : 'Điểm A'}</span>
        </button>

        {/* Set Point B */}
        <button
          onClick={onSetLoopB}
          title="Điểm cuối (B)"
          className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all ${
            loopB > 0
              ? 'bg-fluent-purple/20 text-purple-300 border border-purple-500/40 font-mono'
              : 'bg-white/5 hover:bg-white/10 text-fluent-text-primary'
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span>B: {loopB > 0 ? formatTime(loopB) : 'Điểm B'}</span>
        </button>

        {/* Toggle Loop Active */}
        {hasLoop && (
          <>
            <button
              onClick={onToggleLoop}
              title={isLoopActive ? 'Tắt lặp đoạn (L)' : 'Bật lặp đoạn (L)'}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all ${
                isLoopActive
                  ? 'bg-fluent-accent text-black shadow-accent-glow font-bold'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>{isLoopActive ? 'Đang lặp' : 'Bật lặp'}</span>
            </button>

            <button
              onClick={onClearLoop}
              title="Hủy lặp (C)"
              className="p-1 rounded-lg hover:bg-red-500/20 text-fluent-text-muted hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Right: Speed Adjustment Presets */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 text-[11px] text-fluent-text-muted">
          <Gauge className="w-3.5 h-3.5 text-fluent-accent" /> Tốc độ:
        </span>
        <div className="flex items-center bg-fluent-bg-card p-0.5 rounded-lg border border-white/5">
          {SPEED_PRESETS.map((spd) => {
            const isCurrent = Math.abs(playbackRate - spd) < 0.01;
            return (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                  isCurrent
                    ? 'bg-fluent-accent text-black font-bold shadow-sm'
                    : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
