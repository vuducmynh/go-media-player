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
  Youtube,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { MediaFile, AppSettings } from '../types';
import { formatTime } from '../utils/formatters';
import { AudioVisualizer } from './AudioVisualizer';
import { ListeningControls } from './ListeningControls';
import { useHotkeys } from '../hooks/useHotkeys';
import { useYouTubePlayer } from '../shared/hooks/useYouTubePlayer';

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
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

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

  const isYouTube = currentFile?.source === 'youtube' || Boolean(currentFile?.youtubeId);
  const youtubeVideoId = isYouTube ? (currentFile?.youtubeId || currentFile?.id || null) : null;

  // Handle YouTube ended event
  const handleYouTubeEnded = () => {
    if (currentFile && ytPlayer.duration > 0) {
      onUpdateFileProgress(currentFile.fingerprint, ytPlayer.duration, ytPlayer.duration, loopA, loopB);
    }
    if (settings.autoPlayNext) {
      onPlayNext();
    }
  };

  // YouTube deep intervention player hook
  const ytPlayer = useYouTubePlayer({
    containerRef: ytContainerRef,
    videoId: youtubeVideoId,
    initialTime: settings.autoResume && currentFile ? currentFile.lastPosition : 0,
    normalSpeed: normalSpeed,
    slowSpeed: settings.slowSpeed || 0.5,
    isSlowHeld: isSlowHeld,
    loopA: loopA,
    loopB: loopB,
    isLoopActive: isLoopActive,
    onEnded: handleYouTubeEnded,
  });

  // Active playback state dynamically resolving between YouTube and local media
  const activeIsPlaying = isYouTube ? ytPlayer.isPlaying : isPlaying;
  const activeCurrentTime = isYouTube ? ytPlayer.currentTime : currentTime;
  const activeDuration = isYouTube ? ytPlayer.duration : duration;
  const activePlaybackRate = isYouTube ? ytPlayer.playbackRate : playbackRate;
  const activeVolume = isYouTube ? ytPlayer.volume : volume;
  const activeIsMuted = isYouTube ? ytPlayer.isMuted : isMuted;

  // When current file changes, restore saved state and A-B loop points
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

    setLoopA(currentFile.loopA || 0);
    setLoopB(currentFile.loopB || 0);
    setIsLoopActive(Boolean(currentFile.loopA && currentFile.loopB && currentFile.loopB > currentFile.loopA));

    if (!isYouTube) {
      const media = mediaRef.current;
      if (media) {
        media.playbackRate = normalSpeed;
        media.volume = volume;
      }
    }
  }, [currentFile?.fingerprint, isYouTube]);

  // Handle Hold-to-slow effect for local media (YouTube handled internally in useYouTubePlayer)
  useEffect(() => {
    if (isYouTube) return;
    const media = mediaRef.current;
    if (!media) return;

    if (isSlowHeld) {
      media.playbackRate = settings.slowSpeed || 0.5;
      setPlaybackRate(settings.slowSpeed || 0.5);
    } else {
      media.playbackRate = normalSpeed;
      setPlaybackRate(normalSpeed);
    }
  }, [isSlowHeld, normalSpeed, settings.slowSpeed, isYouTube]);

  // Periodic progress saving for local media (every 2 seconds)
  useEffect(() => {
    if (!currentFile || isYouTube || !isPlaying) return;

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
  }, [currentFile, isYouTube, isPlaying, loopA, loopB, onUpdateFileProgress]);

  // Periodic progress saving for YouTube video (every 2 seconds)
  useEffect(() => {
    if (!currentFile || !isYouTube || !ytPlayer.isPlaying) return;

    const interval = setInterval(() => {
      if (ytPlayer.currentTime > 0 && ytPlayer.duration > 0) {
        onUpdateFileProgress(
          currentFile.fingerprint,
          ytPlayer.currentTime,
          ytPlayer.duration,
          loopA,
          loopB
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentFile, isYouTube, ytPlayer.isPlaying, ytPlayer.currentTime, ytPlayer.duration, loopA, loopB, onUpdateFileProgress]);

  // Local Media Event Handlers
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

    // A-B Loop verification for local media
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

  // Unified Playback Controls
  const handleTogglePlay = () => {
    if (!currentFile) return;

    if (isYouTube) {
      ytPlayer.togglePlay();
      if (ytPlayer.isPlaying) {
        onUpdateFileProgress(currentFile.fingerprint, ytPlayer.currentTime, ytPlayer.duration, loopA, loopB);
      }
      return;
    }

    const media = mediaRef.current;
    if (!media) return;

    if (media.paused) {
      media.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      media.pause();
      setIsPlaying(false);
      onUpdateFileProgress(currentFile.fingerprint, media.currentTime, media.duration, loopA, loopB);
    }
  };

  const handleSeekTo = (seconds: number) => {
    if (isYouTube) {
      ytPlayer.seekTo(seconds);
      return;
    }

    const media = mediaRef.current;
    if (!media || isNaN(seconds)) return;
    const maxDur = media.duration && !isNaN(media.duration) ? media.duration : duration || 0;
    const clamped = Math.max(0, maxDur > 0 ? Math.min(seconds, maxDur) : seconds);
    media.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleSeekDelta = (delta: number) => {
    if (isYouTube) {
      ytPlayer.seekDelta(delta);
      return;
    }

    const media = mediaRef.current;
    if (!media) return;
    const cur = !isNaN(media.currentTime) ? media.currentTime : currentTime;
    handleSeekTo(cur + delta);
  };

  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.max(0.25, Math.min(newSpeed, 3.0));
    setNormalSpeed(clamped);
    if (!isSlowHeld) {
      setPlaybackRate(clamped);
      if (isYouTube) {
        ytPlayer.setSpeed(clamped);
      } else if (mediaRef.current) {
        mediaRef.current.playbackRate = clamped;
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(newVol, 1));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    if (isYouTube) {
      ytPlayer.setVolume(clamped);
    } else if (mediaRef.current) {
      mediaRef.current.volume = clamped;
    }
  };

  const handleToggleMute = () => {
    if (isYouTube) {
      ytPlayer.toggleMute();
      return;
    }

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
    const cur = activeCurrentTime;
    setLoopA(cur);
    if (loopB > 0 && loopB > cur) {
      setIsLoopActive(true);
    }
  };

  const setLoopPointB = () => {
    const cur = activeCurrentTime;
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

  // Hook up full keyboard shortcuts directly to player
  useHotkeys(
    {
      togglePlay: handleTogglePlay,
      seekDelta: handleSeekDelta,
      adjustSpeed: (delta) => handleSpeedChange(normalSpeed + delta),
      setSlowSpeedActive,
      setLoopA: setLoopPointA,
      setLoopB: setLoopPointB,
      toggleLoop,
      clearLoop,
      toggleMute: handleToggleMute,
      adjustVolume: (delta) => handleVolumeChange(activeVolume + delta),
      toggleFullscreen,
    },
    settings,
    Boolean(currentFile)
  );

  // Timeline Scrub Hover
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setHoverPositionRatio(ratio);
    setHoverTime(ratio * activeDuration);
    setIsHoveringTimeline(true);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    handleSeekTo(ratio * activeDuration);
  };

  if (!currentFile) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-fluent-bg-darker p-8 text-center select-none">
        <div className="w-24 h-24 rounded-3xl bg-fluent-bg-card border border-white/10 flex items-center justify-center shadow-fluent mb-6">
          <Headphones className="w-12 h-12 text-fluent-accent animate-pulse-subtle" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Chưa chọn nội dung phát</h2>
        <p className="text-sm text-fluent-text-secondary max-w-md mb-6">
          Chọn một file Audio, Video hoặc nhúng video YouTube để bắt đầu nghe & luyện phát âm với các tính năng Hold-to-slow và A-B loop.
        </p>
      </div>
    );
  }

  const progressPercent = activeDuration > 0 ? (activeCurrentTime / activeDuration) * 100 : 0;
  const loopAPercent = activeDuration > 0 ? (loopA / activeDuration) * 100 : 0;
  const loopBPercent = activeDuration > 0 ? (loopB / activeDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full flex flex-col bg-fluent-bg-darker overflow-hidden relative"
    >
      {/* Video Viewport / Audio Visualizer Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* YouTube Viewport Container */}
        <div
          ref={ytContainerRef}
          className={`w-full h-full ${isYouTube ? 'flex items-center justify-center' : 'hidden'}`}
        />

        {/* YouTube Loading Overlay */}
        {isYouTube && ytPlayer.isLoading && !ytPlayer.error && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-10 p-6 animate-fade-in text-center select-none">
            {currentFile.thumbnail && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <img
                  src={currentFile.thumbnail}
                  alt=""
                  className="w-full h-full object-cover scale-110 blur-xl"
                />
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-4 shadow-xl">
                <Youtube className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Đang tải Video YouTube...
                </h3>
              </div>
              <p className="text-xs text-fluent-text-secondary max-w-sm truncate">
                {currentFile.title || currentFile.name}
              </p>
              <span className="mt-3 px-2.5 py-1 rounded-full bg-white/10 text-[10px] text-fluent-text-muted font-mono">
                Ưu tiên chất lượng cao nhất (1080p HD)
              </span>
            </div>
          </div>
        )}

        {/* YouTube Buffering Overlay (Subtle badge, non-blocking) */}
        {isYouTube && ytPlayer.isBuffering && !ytPlayer.isLoading && !ytPlayer.error && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-fluent animate-fade-in pointer-events-none">
            <div className="w-3.5 h-3.5 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white font-medium">Đang nạp đệm...</span>
          </div>
        )}

        {/* YouTube Error Overlay */}
        {isYouTube && ytPlayer.error && (
          <div className="absolute inset-0 bg-fluent-bg-darker/95 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 animate-fade-in text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {ytPlayer.error.isEmbedBlocked ? 'Video bị giới hạn nhúng phát' : 'Không thể phát video YouTube'}
            </h3>
            <p className="text-xs text-fluent-text-secondary max-w-md mb-2">
              {ytPlayer.error.message}
            </p>
            {ytPlayer.error.isEmbedBlocked && (
              <p className="text-[11px] text-amber-300/80 max-w-sm mb-5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                Chủ sở hữu video này đã tắt quyền nhúng ngoài web YouTube. Bạn có thể bấm nút bên dưới để mở nghe trực tiếp.
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={ytPlayer.retry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold transition-all border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Thử tải lại
              </button>
              <button
                onClick={() => onOpenFileFolder(currentFile.path)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-lg shadow-red-600/30"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Mở xem trên YouTube
              </button>
            </div>
          </div>
        )}

        {/* Local Video or Audio */}
        {!isYouTube && (
          currentFile.type === 'video' ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={currentFile.streamUrl}
              className="w-full h-full object-contain cursor-pointer"
              onClick={handleTogglePlay}
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
          )
        )}
      </div>

      {/* Listening Controls (Hold-to-Slow, A-B Repeat Loop, Jump Deltas) */}
      <ListeningControls
        jumpSeconds={settings.jumpSeconds || 5}
        playbackRate={activePlaybackRate}
        isSlowHeld={isSlowHeld}
        slowSpeed={settings.slowSpeed || 0.5}
        holdSlowKey={settings.holdSlowKey || 'KeyS'}
        loopA={loopA}
        loopB={loopB}
        isLoopActive={isLoopActive}
        currentTime={activeCurrentTime}
        duration={activeDuration}
        onSeekDelta={handleSeekDelta}
        onSpeedChange={handleSpeedChange}
        onSetLoopA={setLoopPointA}
        onSetLoopB={setLoopPointB}
        onToggleLoop={toggleLoop}
        onClearLoop={clearLoop}
        onSeekTo={handleSeekTo}
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
              className={`h-full rounded-full transition-[width] duration-75 relative ${
                isYouTube ? 'bg-red-500' : 'bg-fluent-accent'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Loop A & B Markers on Timeline */}
          {loopA > 0 && activeDuration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-10 pointer-events-none rounded"
              style={{ left: `${loopAPercent}%` }}
              title={`Mốc A: ${formatTime(loopA)}`}
            />
          )}
          {loopB > 0 && activeDuration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-purple-400 z-10 pointer-events-none rounded"
              style={{ left: `${loopBPercent}%` }}
              title={`Mốc B: ${formatTime(loopB)}`}
            />
          )}
          {isLoopActive && loopB > loopA && activeDuration > 0 && (
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
            className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg border-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
              isYouTube ? 'border-red-500' : 'border-fluent-accent'
            }`}
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
            <div className="p-2 rounded-xl bg-fluent-bg-card border border-white/5 flex items-center justify-center shrink-0">
              {isYouTube ? (
                <Youtube className="w-5 h-5 text-red-500" />
              ) : currentFile.type === 'video' ? (
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
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-fluent-text-secondary truncate">
                  {isYouTube ? (currentFile.relativeDir || 'YouTube') : currentFile.name}
                </p>
                {isYouTube && (
                  <span
                    className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0"
                    title={`Độ phân giải: ${ytPlayer.currentQuality || '1080p HD'}`}
                  >
                    {ytPlayer.currentQuality === 'hd1080'
                      ? '1080p HD'
                      : ytPlayer.currentQuality === 'hd720'
                      ? '720p HD'
                      : ytPlayer.currentQuality === 'highres'
                      ? 'Gốc HD'
                      : ytPlayer.currentQuality
                      ? `${ytPlayer.currentQuality}`
                      : '1080p HD'}
                  </span>
                )}
              </div>
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
              onClick={handleTogglePlay}
              title={activeIsPlaying ? 'Tạm dừng (Phím Space)' : 'Phát (Phím Space)'}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 hover:scale-105 ${
                isYouTube
                  ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-lg shadow-red-600/30'
                  : 'bg-fluent-accent hover:bg-fluent-accent-hover active:bg-fluent-accent-active text-black shadow-accent-glow'
              }`}
            >
              {activeIsPlaying ? (
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
              <span className="text-white">{formatTime(activeCurrentTime)}</span>
              <span className="mx-1 text-fluent-text-muted">/</span>
              <span>{formatTime(activeDuration)}</span>
            </div>
          </div>

          {/* Right: Volume & Utility Actions */}
          <div className="flex items-center gap-3">
            {/* Volume Control */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={handleToggleMute}
                title={activeIsMuted ? 'Bật âm thanh (Phím M)' : 'Tắt âm thanh (Phím M)'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
              >
                {activeIsMuted || activeVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : activeVolume < 0.5 ? (
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
                value={activeIsMuted ? 0 : activeVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 cursor-pointer"
                title={`Âm lượng: ${Math.round((activeIsMuted ? 0 : activeVolume) * 100)}%`}
              />
            </div>

            {/* Open Containing Folder or YouTube Link */}
            <button
              onClick={() => onOpenFileFolder(currentFile.path)}
              title={isYouTube ? 'Mở video trên trình duyệt' : 'Mở thư mục chứa file trong Explorer'}
              className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-colors"
            >
              {isYouTube ? <ExternalLink className="w-4 h-4 text-red-400" /> : <FolderOpen className="w-4 h-4" />}
            </button>

            {/* Fullscreen (for video & YouTube) */}
            {(currentFile.type === 'video' || isYouTube) && (
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
