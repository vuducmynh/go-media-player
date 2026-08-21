import React, { useEffect, useRef } from 'react';
import { Music, Disc } from 'lucide-react';
import { MediaFile } from '../types';

interface AudioVisualizerProps {
  currentFile: MediaFile;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  currentFile,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const barCount = 48;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 6;
        if (isPlaying) {
          // Dynamic harmonic wave simulation for smooth zero-latency visuals
          const sin1 = Math.sin(i * 0.25 + phase);
          const sin2 = Math.cos(i * 0.4 - phase * 1.5);
          const sin3 = Math.sin((i / barCount) * Math.PI);
          const raw = (sin1 * 0.5 + sin2 * 0.3 + 0.8) * sin3;
          barHeight = Math.max(6, raw * (height * 0.75));
        }

        const x = i * (barWidth + gap) + gap / 2;
        const y = height / 2 - barHeight / 2;

        // Gradient color from Cyan to Purple
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, '#818cf8');
        gradient.addColorStop(1, '#c084fc');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 3, 3]);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.08;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-fluent-bg-subtle via-fluent-bg-darker to-fluent-bg-darker overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 bg-fluent-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>
      <div className="absolute w-80 h-80 bg-fluent-purple/10 rounded-full blur-3xl pointer-events-none translate-x-24 translate-y-12"></div>

      {/* Album Art / Music Icon spinning disk */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-fluent-bg-card to-fluent-bg-hover border border-white/10 flex items-center justify-center shadow-fluent group">
          {/* Outer ring */}
          <div
            className={`w-full h-full rounded-full border border-fluent-accent/30 flex items-center justify-center transition-all duration-700 ${
              isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''
            }`}
          >
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-fluent-bg-darker border border-white/10 flex items-center justify-center shadow-inner">
              <Disc className="w-16 h-16 sm:w-20 sm:h-20 text-fluent-accent opacity-80" />
            </div>
          </div>
          {/* Center Badge */}
          <div className="absolute w-12 h-12 rounded-full bg-fluent-accent/20 border border-fluent-accent backdrop-blur-md flex items-center justify-center">
            <Music className="w-5 h-5 text-fluent-accent" />
          </div>
        </div>

        {/* Track Title & Metadata */}
        <div className="text-center max-w-xl z-10 px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide truncate mb-1">
            {currentFile.title || currentFile.name}
          </h2>
          <p className="text-xs sm:text-sm text-fluent-text-secondary truncate flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-fluent-accent uppercase text-[10px] font-semibold">
              {currentFile.ext.replace('.', '')}
            </span>
            <span>{currentFile.relativeDir || currentFile.folderRoot}</span>
          </p>
        </div>

        {/* Dynamic Waveform Visualizer Canvas */}
        <div className="w-full max-w-lg h-24 mt-2 px-4 z-10">
          <canvas
            ref={canvasRef}
            width={500}
            height={96}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};
