import { useEffect, useRef } from 'react';
import { AppSettings } from '../types';

interface HotkeyHandlers {
  togglePlay: () => void;
  seekDelta: (seconds: number) => void;
  adjustSpeed: (delta: number) => void;
  setSlowSpeedActive: (active: boolean) => void;
  setLoopA: () => void;
  setLoopB: () => void;
  toggleLoop: () => void;
  clearLoop: () => void;
  toggleMute: () => void;
  adjustVolume: (delta: number) => void;
  toggleFullscreen?: () => void;
}

export function useHotkeys(
  handlers: HotkeyHandlers,
  settings: AppSettings,
  enabled: boolean = true
) {
  const isSlowPressedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check Hold-to-slow key
      const holdKey = settings.holdSlowKey || 'KeyS';
      const isTargetHoldKey =
        e.code === holdKey ||
        (holdKey.toLowerCase() === 'shift' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) ||
        (holdKey.toLowerCase() === 'keys' && e.code === 'KeyS');

      if (isTargetHoldKey) {
        if (!isSlowPressedRef.current && !e.repeat) {
          isSlowPressedRef.current = true;
          handlers.setSlowSpeedActive(true);
        }
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlers.togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          handlers.seekDelta(-settings.jumpSeconds);
          break;

        case 'ArrowRight':
          e.preventDefault();
          handlers.seekDelta(settings.jumpSeconds);
          break;

        case 'ArrowUp':
          e.preventDefault();
          handlers.adjustVolume(0.05);
          break;

        case 'ArrowDown':
          e.preventDefault();
          handlers.adjustVolume(-0.05);
          break;

        case 'BracketLeft': // [
          e.preventDefault();
          handlers.adjustSpeed(-0.1);
          break;

        case 'BracketRight': // ]
          e.preventDefault();
          handlers.adjustSpeed(0.1);
          break;

        case 'KeyA':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.setLoopA();
          }
          break;

        case 'KeyB':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.setLoopB();
          }
          break;

        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.toggleLoop();
          }
          break;

        case 'KeyC':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.clearLoop();
          }
          break;

        case 'KeyM':
          e.preventDefault();
          handlers.toggleMute();
          break;

        case 'KeyF':
          if (handlers.toggleFullscreen) {
            e.preventDefault();
            handlers.toggleFullscreen();
          }
          break;

        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const holdKey = settings.holdSlowKey || 'KeyS';
      const isTargetHoldKey =
        e.code === holdKey ||
        (holdKey.toLowerCase() === 'shift' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) ||
        (holdKey.toLowerCase() === 'keys' && e.code === 'KeyS');

      if (isTargetHoldKey) {
        isSlowPressedRef.current = false;
        handlers.setSlowSpeedActive(false);
      }
    };

    const handleBlur = () => {
      if (isSlowPressedRef.current) {
        isSlowPressedRef.current = false;
        handlers.setSlowSpeedActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handlers, settings, enabled]);
}
