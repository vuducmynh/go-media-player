import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  FolderOpen,
  Film,
  Music,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import { MediaFile, AppSettings } from '../types';
import { formatTime } from '../utils/formatters';
import { AudioVisualizer } from './AudioVisualizer';
import { ListeningControls } from './ListeningControls';
import { WailsBridge } from '../services/wailsBridge';

interface PlayerViewProps {
  currentFile: MediaFile | null;
  settings: AppSettings;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onUpdateFileProgress: (
    fingerprint: string,
    position: number,
    duration: number,
    loopA: number,
    loopB: number
  ) => void;
  onOpenFileFolder: (path: string) => void;
  isSlowHeld: boolean;
  setSlowSpeedActive: (active: boolean) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  currentFile,
  settings,
  onPlayNext,
  onPlayPrev,
  onUpdateFileProgress,
  onOpenFileFolder,
  isSlowHeld,
  setSlowSpeedActive,
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(settings.volume ?? 0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(settings.defaultSpeed ?? 1.0);
  const [normalSpeed, setNormalSpeed] = useState<number>(settings.defaultSpeed ?? 1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loopA, setLoopA] = useState<number>(0);
  const [loopB, setLoopB] = useState<number>(0);
  const [isLoopActive, setIsLoopActive] = useState<boolean>(false);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPositionRatio, setHoverPositionRatio] = useState<number>(0);

  // When current file changes, load media and restore saved progress
  useEffect(() => {
    if (!currentFile) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setLoopA(0);
      setLoopB(0);
      setIsLoopActive(false);
      return;
    }

    // Restore saved A-B loop points if available
    setLoopA(currentFile.loopA || 0);
    setLoopB(currentFile.loopB || 0);
    setIsLoopActive(Boolean(currentFile.loopA && currentFile.loopB && currentFile.loopB > currentFile.loopA));

    // When media element is ready, resume position
    const media = mediaRef.current;
    if (media) {
      media.playbackRate = normalSpeed;
      media.volume = volume;
    }
  }, [currentFile?.fingerprint]);

  // Handle Hold-to-slow effect
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isSlowHeld) {
      media.playbackRate = settings.slowSpeed || 0.5;
      setPlaybackRate(settings.slowSpeed || 0.5);
    } else {
      media.playbackRate = normalSpeed;
      setPlaybackRate(normalSpeed);
    }
  }, [isSlowHeld, normalSpeed, settings.slowSpeed]);

  // Periodic progress saving (every 2 seconds)
  useEffect(() => {
    if (!currentFile || !isPlaying) return;

    const interval = setInterval(() => {
      const media = mediaRef.current;
      if (media && !isNaN(media.currentTime) && media.duration > 0) {
        onUpdateFileProgress(
          currentFile.fingerprint,
          media.currentTime,
          media.duration,
          loopA,
          loopB
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentFile, isPlaying, loopA, loopB, onUpdateFileProgress]);

  // Media Event Handlers
  const handleLoadedMetadata = () => {
    const media = mediaRef.current;
    if (!media) return;

    const dur = media.duration;
    setDuration(dur);

    // Auto resume if saved position exists
    if (settings.autoResume && currentFile && currentFile.lastPosition > 0) {
      if (currentFile.lastPosition < dur - 2) {
        media.currentTime = currentFile.lastPosition;
        setCurrentTime(currentFile.lastPosition);
      }
    }

    media.playbackRate = isSlowHeld ? settings.slowSpeed : normalSpeed;
    media.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const handleTimeUpdate = () => {
    const media = mediaRef.current;
    if (!media) return;

    const cur = media.currentTime;
    setCurrentTime(cur);

    // A-B Loop verification
    if (isLoopActive && loopB > loopA && loopA >= 0) {
      if (cur >= loopB) {
        media.currentTime = loopA;
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (currentFile && duration > 0) {
      onUpdateFileProgress(currentFile.fingerprint, duration, duration, loopA, loopB);
    }
    if (settings.autoPlayNext) {
      onPlayNext();
    }
  };

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media || !currentFile) return;

    if (media.paused) {
      media.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      media.pause();
      setIsPlaying(false);
      // Save position on pause
      onUpdateFileProgress(currentFile.fingerprint, media.currentTime, media.duration, loopA, loopB);
    }
  };

  const seekTo = (seconds: number) => {
    const media = mediaRef.current;
    if (!media || isNaN(seconds)) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    media.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const seekDelta = (delta: number) => {
    const media = mediaRef.current;
    if (!media) return;
    seekTo(media.currentTime + delta);
  };

  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.max(0.25, Math.min(newSpeed, 3.0));
    setNormalSpeed(clamped);
    if (!isSlowHeld) {
      setPlaybackRate(clamped);
      if (mediaRef.current) {
        mediaRef.current.playbackRate = clamped;
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(newVol, 1));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = clamped;
    }
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (isMuted) {
      media.muted = false;
      setIsMuted(false);
      media.volume = volume || 0.5;
    } else {
      media.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Loop Controls
  const setLoopPointA = () => {
    const cur = currentTime;
    setLoopA(cur);
    if (loopB > 0 && loopB > cur) {
      setIsLoopActive(true);
    }
  };

  const setLoopPointB = () => {
    const cur = currentTime;
    if (cur > loopA) {
      setLoopB(cur);
      setIsLoopActive(true);
    } else {
      setLoopB(cur);
    }
  };

  const toggleLoop = () => {
    if (loopA >= 0 && loopB > loopA) {
      setIsLoopActive(!isLoopActive);
    }
  };

  const clearLoop = () => {
    setLoopA(0);
    setLoopB(0);
    setIsLoopActive(false);
  };

  // Timeline Scrub Hover
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setHoverPositionRatio(ratio);
    setHoverTime(ratio * duration);
    setIsHoveringTimeline(true);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    seekTo(ratio * duration);
  };

  if (!currentFile) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-fluent-bg-darker p-8 text-center select-none">
        <div className="w-24 h-24 rounded-3xl bg-fluent-bg-card border border-white/10 flex items-center justify-center shadow-fluent mb-6">
          <Headphones className="w-12 h-12 text-fluent-accent animate-pulse-subtle" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Chưa chọn nội dung phát</h2>
        <p className="text-sm text-fluent-text-secondary max-w-md mb-6">
          Chọn một file Audio hoặc Video từ danh sách bên trái để bắt đầu nghe & luyện phát âm với các tính năng Hold-to-slow và A-B loop.
        </p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopAPercent = duration > 0 ? (loopA / duration) * 100 : 0;
  const loopBPercent = duration > 0 ? (loopB / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full flex flex-col bg-fluent-bg-darker overflow-hidden relative"
    >
      {/* Video Viewport / Audio Visualizer Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {currentFile.type === 'video' ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={currentFile.streamUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            playsInline
          />
        ) : (
          <>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={currentFile.streamUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />
            <AudioVisualizer
              currentFile={currentFile}
              isPlaying={isPlaying}
              audioRef={mediaRef as React.RefObject<HTMLAudioElement>}
            />
          </>
        )}
      </div>

      {/* Listening Controls (Hold-to-Slow, A-B Repeat Loop, Jump Deltas) */}
      <ListeningControls
        jumpSeconds={settings.jumpSeconds || 5}
        playbackRate={playbackRate}
        isSlowHeld={isSlowHeld}
        slowSpeed={settings.slowSpeed || 0.5}
        holdSlowKey={settings.holdSlowKey || 'KeyS'}
        loopA={loopA}
        loopB={loopB}
        isLoopActive={isLoopActive}
        currentTime={currentTime}
        duration={duration}
        onSeekDelta={seekDelta}
        onSpeedChange={handleSpeedChange}
        onSetLoopA={setLoopPointA}
        onSetLoopB={setLoopPointB}
        onToggleLoop={toggleLoop}
        onClearLoop={clearLoop}
        onSeekTo={seekTo}
      />

      {/* Main Bottom Playback Control Bar */}
      <div className="glass-toolbar px-4 py-3 flex flex-col gap-2 relative z-20 select-none">
        {/* Scrub Timeline */}
        <div
          className="relative w-full h-5 flex items-center cursor-pointer group"
          onMouseMove={handleTimelineMouseMove}
          onMouseEnter={() => setIsHoveringTimeline(true)}
          onMouseLeave={() => setIsHoveringTimeline(false)}
          onClick={handleTimelineClick}
        >
          {/* Track Background */}
          <div className="w-full h-1.5 bg-white/10 group-hover:h-2 rounded-full overflow-hidden transition-all relative">
            {/* Progress Fill */}
            <div
              className="h-full bg-fluent-accent rounded-full transition-[width] duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Loop A & B Markers on Timeline */}
          {loopA > 0 && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-10 pointer-events-none rounded"
              style={{ left: `${loopAPercent}%` }}
              title={`Mốc A: ${formatTime(loopA)}`}
            />
          )}
          {loopB > 0 && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-purple-400 z-10 pointer-events-none rounded"
              style={{ left: `${loopBPercent}%` }}
              title={`Mốc B: ${formatTime(loopB)}`}
            />
          )}
          {isLoopActive && loopB > loopA && duration > 0 && (
            <div
              className="absolute h-1.5 top-1/2 -translate-y-1/2 bg-purple-500/30 pointer-events-none rounded"
              style={{
                left: `${loopAPercent}%`,
                width: `${loopBPercent - loopAPercent}%`,
              }}
            />
          )}

          {/* Scrubber Thumb */}
          <div
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg border-2 border-fluent-accent -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {isHoveringTimeline && (
            <div
              className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 text-white text-[11px] font-mono -translate-x-1/2 pointer-events-none border border-white/20 shadow-fluent"
              style={{ left: `${hoverPositionRatio * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls Layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Track Info & Path */}
          <div className="flex items-center gap-3 min-w-[200px] max-w-sm truncate">
            <div className="p-2 rounded-xl bg-fluent-bg-card border border-white/5 flex items-center justify-center">
              {currentFile.type === 'video' ? (
                <Film className="w-5 h-5 text-fluent-accent" />
              ) : (
                <Music className="w-5 h-5 text-fluent-accent" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white truncate">
                  {currentFile.title || currentFile.name}
                </span>
                {currentFile.completed && (
                  <span title="Đã hoàn thành">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-fluent-text-secondary truncate">
                {currentFile.name}
              </p>
            </div>
          </div>

          {/* Center: Playback Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={onPlayPrev}
              title="File trước đó"
              className="p-2 rounded-full hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-all active:scale-95"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Main Play/Pause Button */}
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát (Phím Space)'}
              className="w-12 h-12 rounded-full bg-fluent-accent hover:bg-fluent-accent-hover active:bg-fluent-accent-active text-black flex items-center justify-center shadow-accent-glow transition-all active:scale-95 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={onPlayNext}
              title="File kế tiếp"
              className="p-2 rounded-full hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-all active:scale-95"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Time Stamp */}
            <div className="font-mono text-xs text-fluent-text-secondary font-medium ml-2">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="mx-1 text-fluent-text-muted">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Utility Actions */}
          <div className="flex items-center gap-3">
            {/* Volume Control */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={toggleMute}
                title={isMuted ? 'Bật âm thanh (Phím M)' : 'Tắt âm thanh (Phím M)'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 cursor-pointer"
                title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Open Containing Folder */}
            <button
              onClick={() => onOpenFileFolder(currentFile.path)}
              title="Mở thư mục chứa file trong Explorer"
              className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            {/* Fullscreen (for video) */}
            {currentFile.type === 'video' && (
              <button
                onClick={toggleFullscreen}
                title="Toàn màn hình (Phím F hoặc nhấp đúp)"
                className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
