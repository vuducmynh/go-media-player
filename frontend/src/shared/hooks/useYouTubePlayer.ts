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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(normalSpeed);
  const [volume, setVolumeState] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or update YouTube Player when videoId changes
  useEffect(() => {
    if (!videoId) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      setIsPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    let isSubscribed = true;

    const createPlayer = () => {
      if (!isSubscribed || !window.YT || !window.YT.Player) return;

      let targetEl: HTMLElement | null = null;
      if (containerRef && containerRef.current) {
        containerRef.current.innerHTML = '';
        const child = document.createElement('div');
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
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (!isSubscribed) return;
            setIsPlayerReady(true);
            const dur = event.target.getDuration();
            setDuration(dur);
            if (initialTime > 0) {
              event.target.seekTo(initialTime, true);
            }
            event.target.setPlaybackRate(isSlowHeld ? slowSpeed : normalSpeed);
            event.target.playVideo();
            onReady?.();
          },
          onStateChange: (event: any) => {
            if (!isSubscribed) return;
            const state = event.data;
            if (state === window.YT?.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (
              state === window.YT?.PlayerState.PAUSED ||
              state === window.YT?.PlayerState.BUFFERING
            ) {
              setIsPlaying(false);
            } else if (state === window.YT?.PlayerState.ENDED) {
              setIsPlaying(false);
              onEnded?.();
            }
          },
        },
      });
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
  }, [videoId, containerId, containerRef]);

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
    if (!player || !isPlayerReady) return;

    try {
      const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
      if (state === window.YT?.PlayerState.PLAYING || (state === -1 && isPlaying)) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  }, [isPlayerReady, isPlaying]);

  // Deep Intervention 3: Instant Seek without buffering lag
  const seekTo = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player || !isPlayerReady) return;

      try {
        const dur = (typeof player.getDuration === 'function' ? player.getDuration() : 0) || duration;
        const clamped = Math.max(0, dur > 0 ? Math.min(seconds, dur) : seconds);
        player.seekTo(clamped, true);
        setCurrentTime(clamped);
      } catch (e) {}
    },
    [isPlayerReady, duration]
  );

  const seekDelta = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      if (!player || !isPlayerReady) return;

      try {
        const cur = (typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0) || currentTime;
        seekTo(cur + delta);
      } catch (e) {}
    },
    [isPlayerReady, currentTime, seekTo]
  );

  const setSpeed = useCallback(
    (rate: number) => {
      const player = playerRef.current;
      if (!player || !isPlayerReady) return;

      try {
        player.setPlaybackRate(rate);
        setPlaybackRate(rate);
      } catch (e) {}
    },
    [isPlayerReady]
  );

  const setVolume = useCallback(
    (vol: number) => {
      const player = playerRef.current;
      if (!player || !isPlayerReady) return;

      try {
        const clamped = Math.max(0, Math.min(vol, 1));
        player.setVolume(clamped * 100);
        setVolumeState(clamped);
        setIsMuted(clamped === 0);
      } catch (e) {}
    },
    [isPlayerReady]
  );

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;

    try {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch (e) {}
  }, [isPlayerReady, isMuted]);

  return {
    isReady: isPlayerReady,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    togglePlay,
    seekTo,
    seekDelta,
    setSpeed,
    setVolume,
    toggleMute,
  };
}
