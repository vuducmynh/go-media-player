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
  Sliders,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import { MediaFile, AppSettings } from '../types';
import { formatTime } from '../utils/formatters';
import { AudioVisualizer } from './AudioVisualizer';
import { ListeningControls } from './ListeningControls';
import { useHotkeys } from '../hooks/useHotkeys';
import { useYouTubePlayer, getQualityDisplayName } from '../shared/hooks/useYouTubePlayer';
import { StudyWorkspace } from '../features/study/ui/StudyWorkspace';
import { ModelManagerModal } from '../features/study/ui/ModelManagerModal';
import { ProcessingModal } from '../features/study/ui/ProcessingModal';
import { WailsBridge } from '../shared/api/wailsBridge';
import { Lesson, DictationAttempt } from '../entities/study/types';

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

  // ListenSlice Study Mode State
  const [isStudyModeOpen, setIsStudyModeOpen] = useState<boolean>(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState<boolean>(false);
  const [isProcessingLesson, setIsProcessingLesson] = useState<boolean>(false);
  const [processingPercentage, setProcessingPercentage] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('Đang phân tích âm thanh và phân đoạn câu...');
  const [processingSentenceCount, setProcessingSentenceCount] = useState<number>(0);
  const [processingRecentSentences, setProcessingRecentSentences] = useState<string[]>([]);

  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState<boolean>(false);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setIsQualityMenuOpen(false);
      }
    };
    if (isQualityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQualityMenuOpen]);

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
    setIsStudyModeOpen(false);
    setCurrentLesson(null);

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

  // Listen to study processing progress updates from Wails
  useEffect(() => {
    const unbind = WailsBridge.onStudyProcessingProgress((progress) => {
      setProcessingPercentage(progress.percentage);
      if (progress.status) {
        setProcessingStatus(progress.status);
      }
      if (typeof progress.sentenceCount === 'number') {
        setProcessingSentenceCount(progress.sentenceCount);
      }
      if (progress.recentSentences) {
        setProcessingRecentSentences(progress.recentSentences);
      }
    });
    return () => {
      unbind();
    };
  }, []);

  // Study playback helpers
  const handleStudyPlay = () => {
    if (!currentFile) return;
    if (isYouTube) {
      ytPlayer.play();
    } else {
      mediaRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleStudyPause = () => {
    if (!currentFile) return;
    if (isYouTube) {
      ytPlayer.pause();
    } else {
      mediaRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleCancelLessonProcessing = async () => {
    if (!currentFile) return;
    try {
      await WailsBridge.cancelLessonProcessing(currentFile.fingerprint);
    } catch (e) {
      console.warn('Cancel error:', e);
    } finally {
      setIsProcessingLesson(false);
      setProcessingPercentage(0);
      setProcessingSentenceCount(0);
      setProcessingRecentSentences([]);
    }
  };

  const handleStartTranscription = async (modelId: string) => {
    if (!currentFile) return;
    setIsModelManagerOpen(false);
    setIsProcessingLesson(true);
    setProcessingPercentage(0);
    setProcessingSentenceCount(0);
    setProcessingRecentSentences([]);
    setProcessingStatus('Đang khởi động AI Whisper và phân đoạn câu...');

    try {
      const newLesson = await WailsBridge.processLesson(
        currentFile.fingerprint,
        currentFile.title || currentFile.name,
        currentFile.path,
        modelId
      );
      if (newLesson && newLesson.sentences && newLesson.sentences.length > 0) {
        setCurrentLesson(newLesson);
        setIsStudyModeOpen(true);
      } else {
        alert('Không tìm thấy câu phân đoạn nào trong audio.');
      }
    } catch (err: any) {
      console.error('Lỗi khi phân đoạn câu bằng Whisper:', err);
      alert('Lỗi nhận diện âm thanh: ' + (err?.message || err));
    } finally {
      setIsProcessingLesson(false);
    }
  };

  const handleOpenStudyMode = async () => {
    if (!currentFile) return;

    // Check if lesson already exists in store
    try {
      const existingLesson = await WailsBridge.getLesson(currentFile.fingerprint);
      if (existingLesson && existingLesson.sentences && existingLesson.sentences.length > 0) {
        setCurrentLesson(existingLesson);
        setIsStudyModeOpen(true);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch existing lesson:', e);
    }

    // If YouTube video, try fast automatic captions extraction first
    if (isYouTube) {
      setIsProcessingLesson(true);
      setProcessingPercentage(30);
      setProcessingStatus('Đang lấy phụ đề tự động từ YouTube...');

      try {
        const videoId = currentFile.youtubeId || currentFile.id || currentFile.path;
        const ytLesson = await WailsBridge.processYouTubeLesson(
          currentFile.fingerprint,
          currentFile.title || currentFile.name,
          videoId,
          ''
        );
        if (ytLesson && ytLesson.sentences && ytLesson.sentences.length > 0) {
          setCurrentLesson(ytLesson);
          setIsStudyModeOpen(true);
          setIsProcessingLesson(false);
          return;
        }
      } catch (err: any) {
        console.warn('YouTube caption fetch failed, falling back to offline Whisper:', err);
      }
      setIsProcessingLesson(false);
    }

    // For local files or YouTube without captions: Check if any Whisper model is downloaded
    try {
      const models = await WailsBridge.getInstalledModels();
      const downloadedModel = models.find((m) => m.downloaded);
      if (downloadedModel) {
        handleStartTranscription(downloadedModel.id);
      } else {
        setIsModelManagerOpen(true);
      }
    } catch (e) {
      setIsModelManagerOpen(true);
    }
  };

  const handleSaveAttempt = async (sentenceId: string, attempt: DictationAttempt) => {
    if (!currentFile) return null;
    try {
      const updated = await WailsBridge.saveDictationAttempt(currentFile.fingerprint, sentenceId, attempt);
      setCurrentLesson(updated);
      return updated;
    } catch (e) {
      console.error('Failed to save dictation attempt:', e);
      return null;
    }
  };

  const handleToggleStar = async (sentenceId: string) => {
    if (!currentFile) return null;
    try {
      const updated = await WailsBridge.toggleSentenceStar(currentFile.fingerprint, sentenceId);
      setCurrentLesson(updated);
      return updated;
    } catch (e) {
      console.error('Failed to toggle star:', e);
      return null;
    }
  };

  const handleMarkDifficult = async (timestampMs: number) => {
    if (!currentFile) return null;
    try {
      const updated = await WailsBridge.markSentenceDifficult(currentFile.fingerprint, timestampMs);
      setCurrentLesson(updated);
      return updated;
    } catch (e) {
      console.error('Failed to mark difficult:', e);
      return null;
    }
  };

  const handleUpdateSentenceVisibility = async (sentenceId: string, revealed: boolean) => {
    if (!currentFile) return null;
    try {
      const updated = await WailsBridge.updateSentenceVisibility(currentFile.fingerprint, sentenceId, revealed);
      setCurrentLesson(updated);
      return updated;
    } catch (e) {
      console.error('Failed to update sentence visibility:', e);
      return null;
    }
  };

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
        {/* YouTube Viewport Container: always visible and fully interactive when isYouTube is true */}
        <div
          ref={ytContainerRef}
          className={`w-full h-full ${isYouTube ? 'flex items-center justify-center' : 'hidden'}`}
        />

        {/* YouTube Loading Indicator (Non-blocking pill in top-left) */}
        {isYouTube && ytPlayer.isLoading && (
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs shadow-lg animate-fade-in">
            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải video YouTube...</span>
          </div>
        )}

        {/* YouTube Buffering Indicator (Non-blocking pill in top-right) */}
        {isYouTube && ytPlayer.isBuffering && !ytPlayer.isLoading && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs shadow-lg animate-fade-in">
            <div className="w-3.5 h-3.5 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
            <span>Đang nạp đệm...</span>
          </div>
        )}

        {/* YouTube Error Notification Banner (Bottom floating alert, does not cover entire screen) */}
        {isYouTube && ytPlayer.error && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between gap-3 p-3 rounded-xl bg-red-950/90 backdrop-blur-md border border-red-500/40 text-white shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="truncate text-xs">
                <p className="font-semibold text-red-200 truncate">{ytPlayer.error.message}</p>
                {ytPlayer.error.isEmbedBlocked && (
                  <p className="text-[11px] text-red-300/80">Bạn có thể bấm nút bên phải để mở xem trực tiếp trên YouTube.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={ytPlayer.retry}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs text-white transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Thử lại
              </button>
              <button
                onClick={() => onOpenFileFolder(currentFile.path)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-xs text-white font-medium transition-all shadow-lg shadow-red-600/30"
              >
                <ExternalLink className="w-3 h-3" /> Mở trên YouTube
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
                  <div className="relative" ref={qualityMenuRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQualityMenuOpen(!isQualityMenuOpen);
                      }}
                      className="px-1.5 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 active:scale-95 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Chất lượng video: Nhấp để xem các mức khả dụng và chọn độ phân giải"
                    >
                      <Sliders className="w-2.5 h-2.5 text-red-400" />
                      <span>{getQualityDisplayName(ytPlayer.currentQuality)}</span>
                      <ChevronDown
                        className={`w-2.5 h-2.5 transition-transform ${
                          isQualityMenuOpen ? 'rotate-180 text-red-300' : ''
                        }`}
                      />
                    </button>

                    {/* Quality Popup Menu */}
                    {isQualityMenuOpen && (
                      <div className="absolute bottom-full mb-2 left-0 w-48 bg-fluent-bg-darker border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in text-xs">
                        <div className="px-2 py-1 text-[9px] font-semibold text-fluent-text-muted uppercase tracking-wider border-b border-white/5 mb-1 flex items-center justify-between">
                          <span>Độ phân giải video</span>
                          <span className="text-red-400 font-normal">Tối ưu 1080p</span>
                        </div>
                        {ytPlayer.availableQualities.length === 0 ? (
                          <div className="px-2 py-1.5 text-[10px] text-fluent-text-muted">
                            {getQualityDisplayName(ytPlayer.currentQuality)} (Tự động)
                          </div>
                        ) : (
                          ytPlayer.availableQualities.map((q) => {
                            const isCurrent = ytPlayer.currentQuality === q;
                            return (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  ytPlayer.setQuality(q);
                                  setIsQualityMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-colors ${
                                  isCurrent
                                    ? 'bg-red-600/20 text-red-400 font-bold border border-red-500/30'
                                    : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span>{getQualityDisplayName(q)}</span>
                                {isCurrent && <Check className="w-3.5 h-3.5 text-red-400" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
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
            {/* Luyện sâu (ListenSlice) Action Button */}
            <button
              onClick={handleOpenStudyMode}
              title="Luyện nghe sâu theo câu (ListenSlice: Listen / Dictation / Shadow / Review)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-fluent-accent/20 to-purple-500/20 hover:from-fluent-accent/30 hover:to-purple-500/30 text-fluent-accent border border-fluent-accent/40 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Luyện sâu</span>
            </button>

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

      {/* Intensive Study Mode Overlay (ListenSlice) */}
      {isStudyModeOpen && currentLesson && (
        <div className="absolute inset-0 z-40 bg-fluent-bg-darker flex flex-col animate-fade-in">
          <StudyWorkspace
            lesson={currentLesson}
            onClose={() => setIsStudyModeOpen(false)}
            onSaveAttempt={handleSaveAttempt}
            onToggleStar={handleToggleStar}
            onMarkDifficult={handleMarkDifficult}
            onUpdateSentenceVisibility={handleUpdateSentenceVisibility}
            onSeek={handleSeekTo}
            onPlay={handleStudyPlay}
            onPause={handleStudyPause}
            onSetSpeed={handleSpeedChange}
            isPlaying={activeIsPlaying}
            currentTime={activeCurrentTime}
          />
        </div>
      )}

      {/* Whisper Model Downloader Modal */}
      <ModelManagerModal
        isOpen={isModelManagerOpen}
        onClose={() => setIsModelManagerOpen(false)}
        onSelectModelAndStart={handleStartTranscription}
      />

      {/* Sentence Segmentation Progress Modal */}
      <ProcessingModal
        isOpen={isProcessingLesson}
        percentage={processingPercentage}
        statusText={processingStatus}
        sentenceCount={processingSentenceCount}
        recentSentences={processingRecentSentences}
        onCancel={handleCancelLessonProcessing}
      />
    </div>
  );
};
