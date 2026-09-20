import { useEffect, useRef } from 'react';
import { AppSettings } from '../../entities/media/types';

export interface HotkeyHandlers {
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
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

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

      const currentSettings = settingsRef.current;
      const currentHandlers = handlersRef.current;
      const jump = currentSettings.jumpSeconds > 0 ? currentSettings.jumpSeconds : 5;

      // Check Hold-to-slow key
      const holdKey = currentSettings.holdSlowKey || 'KeyS';
      const isTargetHoldKey =
        e.code === holdKey ||
        (holdKey.includes('Shift') && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) ||
        (holdKey.includes('Control') && (e.code === 'ControlLeft' || e.code === 'ControlRight')) ||
        (holdKey.includes('Alt') && (e.code === 'AltLeft' || e.code === 'AltRight')) ||
        (holdKey.toLowerCase() === 'keys' && e.code === 'KeyS');

      if (isTargetHoldKey) {
        if (!isSlowPressedRef.current && !e.repeat) {
          isSlowPressedRef.current = true;
          currentHandlers.setSlowSpeedActive(true);
        }
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          currentHandlers.togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          currentHandlers.seekDelta(-jump);
          break;

        case 'ArrowRight':
          e.preventDefault();
          currentHandlers.seekDelta(jump);
          break;

        case 'ArrowUp':
          e.preventDefault();
          currentHandlers.adjustVolume(0.05);
          break;

        case 'ArrowDown':
          e.preventDefault();
          currentHandlers.adjustVolume(-0.05);
          break;

        case 'BracketLeft': // [
          e.preventDefault();
          currentHandlers.adjustSpeed(-0.1);
          break;

        case 'BracketRight': // ]
          e.preventDefault();
          currentHandlers.adjustSpeed(0.1);
          break;

        case 'KeyA':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            currentHandlers.setLoopA();
          }
          break;

        case 'KeyB':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            currentHandlers.setLoopB();
          }
          break;

        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            currentHandlers.toggleLoop();
          }
          break;

        case 'KeyC':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            currentHandlers.clearLoop();
          }
          break;

        case 'KeyM':
          e.preventDefault();
          currentHandlers.toggleMute();
          break;

        case 'KeyF':
          if (currentHandlers.toggleFullscreen) {
            e.preventDefault();
            currentHandlers.toggleFullscreen();
          }
          break;

        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const currentSettings = settingsRef.current;
      const currentHandlers = handlersRef.current;
      const holdKey = currentSettings.holdSlowKey || 'KeyS';
      const isTargetHoldKey =
        e.code === holdKey ||
        (holdKey.includes('Shift') && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) ||
        (holdKey.includes('Control') && (e.code === 'ControlLeft' || e.code === 'ControlRight')) ||
        (holdKey.includes('Alt') && (e.code === 'AltLeft' || e.code === 'AltRight')) ||
        (holdKey.toLowerCase() === 'keys' && e.code === 'KeyS');

      if (isTargetHoldKey) {
        isSlowPressedRef.current = false;
        currentHandlers.setSlowSpeedActive(false);
      }
    };

    const handleBlur = () => {
      if (isSlowPressedRef.current) {
        isSlowPressedRef.current = false;
        handlersRef.current.setSlowSpeedActive(false);
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
  }, [enabled]);
}
