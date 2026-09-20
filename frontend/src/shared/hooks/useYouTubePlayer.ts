import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

export interface PlayerError {
  code: number;
  message: string;
  isEmbedBlocked: boolean;
}

interface UseYouTubePlayerProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  containerId?: string;
  videoId: string | null;
  initialTime?: number;
  normalSpeed?: number;
  slowSpeed?: number;
  isSlowHeld?: boolean;
  loopA?: number;
  loopB?: number;
  isLoopActive?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
}

export function useYouTubePlayer({
  containerRef,
  containerId = 'youtube-player-container',
  videoId,
  initialTime = 0,
  normalSpeed = 1.0,
  slowSpeed = 0.5,
  isSlowHeld = false,
  loopA = 0,
  loopB = 0,
  isLoopActive = false,
  onTimeUpdate,
  onEnded,
  onReady,
}: UseYouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(normalSpeed);
  const [volume, setVolumeState] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<PlayerError | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>('hd1080');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [retryCounter, setRetryCounter] = useState(0);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Helper to enforce highest available quality (up to 1080p) once stream is actively playing
  const applyHighestQuality = useCallback((player: any) => {
    if (!player) return;
    try {
      if (typeof player.getAvailableQualityLevels === 'function') {
        const levels: string[] = player.getAvailableQualityLevels() || [];
        if (levels && levels.length > 0) {
          setAvailableQualities(levels);
          const preferredOrder = ['hd1080', 'highres', 'hd720', 'large', 'medium'];
          const target = preferredOrder.find((p) => levels.includes(p)) || levels[0];
          if (target && typeof player.setPlaybackQuality === 'function') {
            player.setPlaybackQuality(target);
            setCurrentQuality(target);
          }
        }
      }
    } catch (e) {}
  }, []);

  // Initialize or update YouTube Player when videoId or retryCounter changes
  useEffect(() => {
    if (!videoId) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      setIsPlayerReady(false);
      setIsLoading(false);
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);
    setError(null);

    const createPlayer = () => {
      if (!isSubscribed || !window.YT || !window.YT.Player) return;

      let targetEl: HTMLElement | null = null;
      if (containerRef && containerRef.current) {
        containerRef.current.innerHTML = '';
        const child = document.createElement('div');
        child.style.width = '100%';
        child.style.height = '100%';
        containerRef.current.appendChild(child);
        targetEl = child;
      } else if (containerId) {
        targetEl = document.getElementById(containerId);
      }

      if (!targetEl) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }

      try {
        playerRef.current = new window.YT.Player(targetEl, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            start: Math.floor(initialTime),
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              setIsPlayerReady(true);
              setIsLoading(false);
              setError(null);

              const dur = typeof event.target.getDuration === 'function' ? event.target.getDuration() : 0;
              if (dur > 0) {
                setDuration(dur);
              }
              if (initialTime > 0 && typeof event.target.seekTo === 'function') {
                event.target.seekTo(initialTime, true);
              }

              if (typeof event.target.setPlaybackRate === 'function') {
                event.target.setPlaybackRate(isSlowHeld ? slowSpeed : normalSpeed);
              }

              try {
                event.target.playVideo();
              } catch (e) {}

              onReady?.();
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              setIsLoading(false);
              const state = event.data;

              if (state === window.YT?.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
                // Dynamically lock to highest resolution when stream begins
                applyHighestQuality(event.target);
              } else if (state === window.YT?.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (state === window.YT?.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (state === window.YT?.PlayerState.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);
                onEnded?.();
              } else if (state === window.YT?.PlayerState.CUED) {
                setIsBuffering(false);
              }
            },
            onPlaybackQualityChange: (event: any) => {
              if (isSubscribed && event.data) {
                setCurrentQuality(event.data);
              }
            },
            onError: (event: any) => {
              if (!isSubscribed) return;
              setIsLoading(false);
              setIsBuffering(false);
              const code = event.data;
              let msg = 'Không thể phát video YouTube này.';
              let isBlocked = false;

              if (code === 2) {
                msg = 'Đường dẫn hoặc Video ID không hợp lệ.';
              } else if (code === 5) {
                msg = 'Lỗi phát HTML5 từ máy chủ YouTube.';
              } else if (code === 100) {
                msg = 'Video không tồn tại, đã bị xóa hoặc được đặt ở chế độ riêng tư.';
              } else if (code === 101 || code === 150) {
                msg = 'Chủ sở hữu video không cho phép phát trên các ứng dụng nhúng ngoài web YouTube.';
                isBlocked = true;
              }

              setError({ code, message: msg, isEmbedBlocked: isBlocked });
            },
          },
        });
      } catch (err: any) {
        setError({
          code: -1,
          message: err?.message || 'Có lỗi xảy ra khi khởi tạo trình phát YouTube.',
          isEmbedBlocked: false,
        });
        setIsLoading(false);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        createPlayer();
      };
    }

    return () => {
      isSubscribed = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      if (containerRef && containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [videoId, containerId, containerRef, retryCounter, applyHighestQuality]);

  // Deep Intervention 1: Instant Hold-to-Slow & Normal Speed
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;

    try {
      const targetRate = isSlowHeld ? slowSpeed : normalSpeed;
      player.setPlaybackRate(targetRate);
      setPlaybackRate(targetRate);
    } catch (e) {}
  }, [isSlowHeld, slowSpeed, normalSpeed, isPlayerReady]);

  // Deep Intervention 2: Realtime Polling Loop for Precision A-B Loop & Scrubber Time
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      try {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== 'function') return;

        const cur = player.getCurrentTime() || 0;
        const dur = (typeof player.getDuration === 'function' ? player.getDuration() : 0) || duration;

        setCurrentTime(cur);
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }

        // A-B Repeat Loop Intervention
        if (isLoopActive && loopB > loopA && loopA >= 0) {
          if (cur >= loopB) {
            player.seekTo(loopA, true);
          }
        }

        onTimeUpdate?.(cur, dur);
      } catch (e) {}
    }, 100);

    return () => clearInterval(interval);
  }, [isPlayerReady, isLoopActive, loopA, loopB, duration, onTimeUpdate]);

  // Player Controls
  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
      if (state === window.YT?.PlayerState.PLAYING) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  }, []);

  // Deep Intervention 3: Instant Seek without buffering lag
  const seekTo = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const dur = (typeof player.getDuration === 'function' ? player.getDuration() : 0) || duration;
        const clamped = Math.max(0, dur > 0 ? Math.min(seconds, dur) : seconds);
        player.seekTo(clamped, true);
        setCurrentTime(clamped);
      } catch (e) {}
    },
    [duration]
  );

  const seekDelta = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const cur = (typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0) || currentTime;
        seekTo(cur + delta);
      } catch (e) {}
    },
    [currentTime, seekTo]
  );

  const setSpeed = useCallback((rate: number) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setPlaybackRate(rate);
      setPlaybackRate(rate);
    } catch (e) {}
  }, []);

  const setVolume = useCallback((vol: number) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const clamped = Math.max(0, Math.min(vol, 1));
      player.setVolume(clamped * 100);
      setVolumeState(clamped);
      setIsMuted(clamped === 0);
    } catch (e) {}
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch (e) {}
  }, [isMuted]);

  const setQuality = useCallback((quality: string) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (typeof player.setPlaybackQuality === 'function') {
        player.setPlaybackQuality(quality);
        setCurrentQuality(quality);
      }
    } catch (e) {}
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCounter((c) => c + 1);
  }, []);

  return {
    isReady: isPlayerReady,
    isLoading,
    isBuffering,
    error,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    currentQuality,
    availableQualities,
    togglePlay,
    seekTo,
    seekDelta,
    setSpeed,
    setVolume,
    toggleMute,
    setQuality,
    retry,
  };
}
