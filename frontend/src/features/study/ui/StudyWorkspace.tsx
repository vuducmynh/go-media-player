import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Star,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ArrowLeft as PrevIcon,
  ArrowRight as NextIcon,
  Headphones,
  Check,
  FileText,
  Layers,
  Zap,
  HelpCircle,
  Pencil,
  ChevronDown,
  X,
  Bookmark,
  Repeat,
  Download,
  Film,
} from 'lucide-react';
import {
  Lesson,
  Sentence,
  SentenceFilterMode,
  DictationAttempt,
} from '../../../entities/study/types';
import { SentenceSidebar } from './SentenceSidebar';
import { formatTime } from '../../../shared/lib/formatters';
import { computeWordDiff, DiffResult } from '../../../shared/lib/diff';
import { ScriptExchangeModal } from './ScriptExchangeModal';
import { WailsBridge } from '../../../shared/api/wailsBridge';

interface StudyWorkspaceProps {
  lesson: Lesson;
  onClose: () => void;
  onSaveAttempt: (sentenceId: string, attempt: DictationAttempt) => Promise<Lesson | null>;
  onToggleStar: (sentenceId: string) => Promise<Lesson | null>;
  onMarkDifficult: (timestampMs: number) => Promise<Lesson | null>;
  onUpdateSentenceVisibility: (sentenceId: string, revealed: boolean) => Promise<Lesson | null>;
  // Audio playback controller passed from PlayerView
  onSeek: (seconds: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
  isPlaying: boolean;
  currentTime: number;
  currentSpeed?: number;
  isSlowHeld?: boolean;
  onSetSlowActive?: (active: boolean) => void;
  slowSpeed?: number;
  holdSlowKey?: string;
  jumpSeconds?: number;
  isVideo?: boolean;
  onRemakeLesson?: () => void;
  playbackSource?: 'video' | 'audio';
  onPlaybackSourceChange?: (source: 'video' | 'audio') => void;
}

const SPEED_PRESETS = [0.5, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0];

export const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({
  lesson: initialLesson,
  onClose,
  onSaveAttempt,
  onToggleStar,
  onMarkDifficult,
  onUpdateSentenceVisibility,
  onSeek,
  onPlay,
  onPause,
  onSetSpeed,
  isPlaying,
  currentTime,
  currentSpeed = 1.0,
  isSlowHeld = false,
  onSetSlowActive,
  slowSpeed = 0.5,
  holdSlowKey = 'KeyS',
  jumpSeconds = 5.0,
  isVideo = false,
  onRemakeLesson,
  playbackSource = 'video',
  onPlaybackSourceChange,
}) => {
  const [lesson, setLesson] = useState<Lesson>(initialLesson);
  const [currentSentenceId, setCurrentSentenceId] = useState<string>(
    initialLesson.sentences[0]?.id || ''
  );
  // Default to Dictation tab as requested!
  const [activeTab, setActiveTab] = useState<'dictation' | 'listen'>('dictation');
  const [filterMode, setFilterMode] = useState<SentenceFilterMode>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  // Playback bindings unified with parent PlayerView
  const effectiveCurrentTime = currentTime;
  const effectiveIsPlaying = isPlaying;
  const handleActiveSeek = onSeek;
  const handleActivePlay = onPlay;
  const handleActivePause = onPause;

  const handleSwitchPlaybackSource = (newSource: 'video' | 'audio') => {
    if (newSource === playbackSource) return;
    onPlaybackSourceChange?.(newSource);
  };

  // A-B Loop state
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // Dictation state per sentence
  const [userAnswer, setUserAnswer] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isTranscriptRevealed, setIsTranscriptRevealed] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);
  const helpModalRef = useRef<HTMLDivElement | null>(null);

  // Sync internal lesson if initialLesson changes
  useEffect(() => {
    setLesson(initialLesson);
  }, [initialLesson]);

  const currentSentence =
    lesson.sentences.find((s) => s.id === currentSentenceId) || lesson.sentences[0];
  const currentSentenceIndex = lesson.sentences.findIndex((s) => s.id === currentSentenceId);

  // Close speed menu and help modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
      if (helpModalRef.current && !helpModalRef.current.contains(e.target as Node)) {
        setShowHelpModal(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSpeedMenu(false);
        setShowHelpModal(false);
      }
    };
    if (showSpeedMenu || showHelpModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSpeedMenu, showHelpModal]);

  // Audio range calculations for current sentence
  const startSec = Math.max(0, (currentSentence?.startMs ?? 0) / 1000 - 0.08);
  const endSec = (currentSentence?.endMs ?? 0) / 1000 + 0.12;
  const sentenceDuration = Math.max(0.1, ((currentSentence?.endMs ?? 0) - (currentSentence?.startMs ?? 0)) / 1000);
  const sentenceElapsed = Math.max(
    0,
    Math.min(effectiveCurrentTime - (currentSentence?.startMs ?? 0) / 1000, sentenceDuration)
  );
  const sentenceProgressPercent = Math.max(
    0,
    Math.min((sentenceElapsed / sentenceDuration) * 100, 100)
  );

  // A-B Loop / Auto-pause when sentence end or loop end is reached
  useEffect(() => {
    if (!effectiveIsPlaying) return;
    if (isLoopActive && loopA !== null && loopB !== null && loopB > loopA) {
      if (effectiveCurrentTime >= loopB) {
        handleActiveSeek(loopA);
        return;
      }
    } else if (currentSentence && effectiveCurrentTime >= endSec) {
      handleActivePause();
    }
  }, [effectiveIsPlaying, effectiveCurrentTime, isLoopActive, loopA, loopB, endSec, handleActivePause, handleActiveSeek, currentSentence]);

  // A-B Loop handlers
  const handleSetLoopA = useCallback(() => {
    setLoopA(effectiveCurrentTime);
    if (loopB !== null && effectiveCurrentTime >= loopB) {
      setLoopB(null);
      setIsLoopActive(false);
    }
  }, [effectiveCurrentTime, loopB]);

  const handleSetLoopB = useCallback(() => {
    if (loopA !== null && effectiveCurrentTime > loopA) {
      setLoopB(effectiveCurrentTime);
      setIsLoopActive(true);
    } else {
      const a = Math.max(0, (currentSentence?.startMs ?? 0) / 1000);
      setLoopA(a);
      setLoopB(effectiveCurrentTime);
      setIsLoopActive(true);
    }
  }, [effectiveCurrentTime, loopA, currentSentence]);

  const handleToggleLoop = useCallback(() => {
    if (loopA !== null && loopB !== null && loopB > loopA) {
      setIsLoopActive((prev) => !prev);
    }
  }, [loopA, loopB]);

  const handleClearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
    setIsLoopActive(false);
  }, []);

  // Jump handlers (honors global jumpSeconds)
  const handleJumpBackward = useCallback(() => {
    handleActiveSeek(Math.max(0, effectiveCurrentTime - jumpSeconds));
  }, [effectiveCurrentTime, jumpSeconds, handleActiveSeek]);

  const handleJumpForward = useCallback(() => {
    handleActiveSeek(effectiveCurrentTime + jumpSeconds);
  }, [effectiveCurrentTime, jumpSeconds, handleActiveSeek]);

  // Import lesson handler
  const handleImportLesson = useCallback(
    async (importedLesson: Lesson): Promise<boolean> => {
      const success = await WailsBridge.saveLesson(importedLesson);
      if (success) {
        setLesson(importedLesson);
        if (importedLesson.sentences.length > 0) {
          setCurrentSentenceId(importedLesson.sentences[0].id);
        }
        return true;
      }
      return false;
    },
    []
  );

  // Play sentence from start
  const handlePlaySentence = useCallback(
    (sent: Sentence) => {
      const s = Math.max(0, sent.startMs / 1000 - 0.08);
      handleActiveSeek(s);
      handleActivePlay();
    },
    [handleActiveSeek, handleActivePlay]
  );

  // Replay current sentence from start
  const handleReplaySentence = useCallback(() => {
    if (!currentSentence) return;
    handlePlaySentence(currentSentence);
  }, [currentSentence, handlePlaySentence]);

  // Play/Pause toggle button handler
  const handleTogglePlay = useCallback(() => {
    if (effectiveIsPlaying) {
      handleActivePause();
    } else {
      if (!currentSentence) return;
      // If we are currently paused inside this sentence and not right at the end, resume
      if (effectiveCurrentTime >= startSec && effectiveCurrentTime < endSec - 0.15) {
        handleActivePlay();
      } else {
        handlePlaySentence(currentSentence);
      }
    }
  }, [effectiveIsPlaying, handleActivePause, handleActivePlay, currentSentence, effectiveCurrentTime, startSec, endSec, handlePlaySentence]);

  // Sentence Navigation
  const selectSentence = useCallback(
    (nextSent: Sentence) => {
      setCurrentSentenceId(nextSent.id);
      setUserAnswer('');
      setHasChecked(false);
      setDiffResult(null);
      setIsTranscriptRevealed(false);
      handlePlaySentence(nextSent);
      if (activeTab === 'dictation') {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 80);
      }
    },
    [activeTab, handlePlaySentence]
  );

  const handleNextSentence = useCallback(() => {
    if (currentSentenceIndex < lesson.sentences.length - 1) {
      selectSentence(lesson.sentences[currentSentenceIndex + 1]);
    }
  }, [currentSentenceIndex, lesson.sentences, selectSentence]);

  const handlePrevSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      selectSentence(lesson.sentences[currentSentenceIndex - 1]);
    }
  }, [currentSentenceIndex, lesson.sentences, selectSentence]);

  // Check dictation answer
  const handleCheckAnswer = useCallback(async () => {
    if (!userAnswer.trim() || !currentSentence) return;

    const result = computeWordDiff(currentSentence.transcript, userAnswer);
    setDiffResult(result);
    setHasChecked(true);

    const attempt: DictationAttempt = {
      id: `att_${Date.now()}`,
      sentenceId: currentSentence.id,
      answer: userAnswer.trim(),
      score: result.score,
      matchedWords: result.matchedWords,
      totalWords: result.totalWords,
      transcriptWasVisible: isTranscriptRevealed,
      assessmentType: isTranscriptRevealed ? 'assisted' : 'independent',
      diff: result.diff,
      createdAt: new Date().toISOString(),
    };

    const updated = await onSaveAttempt(currentSentence.id, attempt);
    if (updated) {
      setLesson(updated);
    }
  }, [userAnswer, currentSentence, isTranscriptRevealed, onSaveAttempt]);

  // Reveal transcript
  const handleShowTranscript = useCallback(async () => {
    if (!currentSentence) return;
    setIsTranscriptRevealed(true);
    const updated = await onUpdateSentenceVisibility(currentSentence.id, true);
    if (updated) {
      setLesson(updated);
    }
  }, [currentSentence, onUpdateSentenceVisibility]);

  // Toggle star
  const handleToggleStar = useCallback(
    async (sentenceId: string) => {
      const updated = await onToggleStar(sentenceId);
      if (updated) {
        setLesson(updated);
      }
    },
    [onToggleStar]
  );

  // Scrubber drag / click
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSentence) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const target = startSec + ratio * (endSec - startSec);
    handleActiveSeek(target);
  };

  // Keyboard shortcuts handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Shift + Enter -> Replay current sentence (works globally, even inside textarea)
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleReplaySentence();
        return;
      }

      // 2. Ctrl / Alt shortcuts (WORK EVERYWHERE, EVEN INSIDE TEXTAREA WITHOUT TOUCHING MOUSE!)
      const hasModifier = e.ctrlKey || e.altKey;

      if (hasModifier) {
        // Ctrl/Alt + Space -> Toggle Play / Pause
        if (e.code === 'Space') {
          e.preventDefault();
          handleTogglePlay();
          return;
        }

        // Ctrl/Alt + S -> Toggle Slow Speed
        if ((e.code === 'KeyS' || e.key.toLowerCase() === 's') && !e.shiftKey) {
          e.preventDefault();
          onSetSlowActive?.(!isSlowHeld);
          return;
        }

        // Ctrl/Alt + Shift + S -> Toggle Star
        if ((e.code === 'KeyS' || e.key.toLowerCase() === 's') && e.shiftKey) {
          e.preventDefault();
          if (currentSentence) {
            handleToggleStar(currentSentence.id);
          }
          return;
        }

        // Ctrl/Alt + ArrowLeft -> Previous sentence
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          handlePrevSentence();
          return;
        }

        // Ctrl/Alt + ArrowRight -> Next sentence
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          handleNextSentence();
          return;
        }

        // Ctrl/Alt + H -> Toggle Show / Hide transcript
        if (e.code === 'KeyH' || e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setIsTranscriptRevealed((prev) => !prev);
          return;
        }
      }

      // 3. Inside textarea:
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        // Enter without modifiers:
        if (!e.shiftKey && !e.ctrlKey && !e.altKey && e.key === 'Enter') {
          if (!hasChecked && userAnswer.trim()) {
            e.preventDefault();
            handleCheckAnswer();
          } else if (hasChecked || isTranscriptRevealed) {
            e.preventDefault();
            handleNextSentence();
          }
        }
        return;
      }

      // 4. Outside textarea (Single key shortcuts):
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSentence();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextSentence();
      } else if (e.code === 'KeyH' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsTranscriptRevealed((prev) => !prev);
      } else if (e.code === holdSlowKey || (holdSlowKey === 'KeyS' && e.code === 'KeyS')) {
        if (!e.repeat) {
          onSetSlowActive?.(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === holdSlowKey || (holdSlowKey === 'KeyS' && e.code === 'KeyS')) {
        onSetSlowActive?.(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleReplaySentence,
    hasChecked,
    userAnswer,
    handleCheckAnswer,
    handleNextSentence,
    handlePrevSentence,
    handleTogglePlay,
    holdSlowKey,
    onSetSlowActive,
    isSlowHeld,
    isTranscriptRevealed,
    currentSentence,
    handleToggleStar,
  ]);

  // Best score for current sentence
  const bestScore =
    currentSentence?.bestIndependentScore ?? currentSentence?.bestAssistedScore;

  const holdKeyDisplayName =
    holdSlowKey === 'KeyS'
      ? 'S'
      : holdSlowKey.replace('Key', '').replace('Left', '').replace('Right', '');

  return (
    <div className="flex-1 h-full flex flex-col bg-[#111215] text-fluent-text-primary overflow-hidden relative select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-5 border-b border-white/5 bg-[#141519] flex items-center justify-between z-20 shrink-0">
        {/* Left: Back button + SEG index + Best Score + Star + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* Segment Index */}
          <span className="text-xs font-mono font-bold text-emerald-400">
            CÂU {String(currentSentence ? currentSentence.index : 1).padStart(2, '0')}/
            {lesson.sentences.length}
          </span>

          {/* Best Score Badge */}
          {bestScore !== undefined ? (
            <span className="text-xs font-mono font-medium text-emerald-400/90">
              cao nhất {Math.round(bestScore)}%
            </span>
          ) : (
            <span className="text-xs font-mono font-medium text-neutral-500">chưa làm</span>
          )}

          {/* Star Button */}
          {currentSentence && (
            <button
              onClick={() => handleToggleStar(currentSentence.id)}
              className="p-1 text-neutral-400 hover:text-amber-400 transition-colors"
              title={currentSentence.starred ? 'Bỏ gắn sao' : 'Gắn sao câu này'}
            >
              <Star
                className={`w-4 h-4 ${
                  currentSentence.starred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-neutral-500 hover:text-amber-400'
                }`}
              />
            </button>
          )}

          {/* Lesson Title */}
          <span className="text-xs font-medium text-neutral-400 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {lesson.title}
          </span>
        </div>

        {/* Right: Remake + Export/Import + Sidebar Toggle + Tab Selector [Listen | Dictation] */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Remake Lesson Button */}
          {onRemakeLesson && (
            <button
              onClick={onRemakeLesson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Phân tích lại bài học bằng mô hình AI Whisper để nâng cao độ chính xác hoặc đổi mô hình"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Tạo lại</span>
            </button>
          )}

          {/* Export / Import Button */}
          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
            title="Xuất hoặc nhập dữ liệu bài học"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Xuất / Nhập</span>
          </button>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
              isSidebarOpen
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
            }`}
            title="Danh sách các câu"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Dual Source Toggle for YouTube with offline audio */}
          {lesson.source === 'youtube' && lesson.streamUrl && (
            <div className="flex items-center p-1 bg-black/50 rounded-xl border border-white/10">
              <button
                onClick={() => handleSwitchPlaybackSource('video')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  playbackSource === 'video'
                    ? 'bg-red-600/30 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Phát video YouTube có hình ảnh"
              >
                <Film className="w-3 h-3 text-red-400" />
                <span className="hidden md:inline">Video</span>
              </button>
              <button
                onClick={() => handleSwitchPlaybackSource('audio')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  playbackSource === 'audio'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Phát âm thanh offline (tua lặp mượt, không cần mạng)"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="hidden md:inline">Audio offline</span>
              </button>
            </div>
          )}

          {/* Tab Selector: Listen vs Dictation */}
          <div className="flex items-center p-1 bg-black/50 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('listen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'listen'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Luyện nghe</span>
            </button>
            <button
              onClick={() => setActiveTab('dictation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dictation'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Chép chính tả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Study Container */}
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-2xl space-y-6">
            {/* 1. TRANSCRIPT CARD */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-400">Nội dung câu</span>

              <div className="w-full min-h-[140px] rounded-2xl bg-[#16181d] border border-white/10 p-6 relative flex flex-col justify-between overflow-hidden shadow-lg">
                {/* State A: Hidden Transcript (Not Revealed & Not Checked) */}
                {!isTranscriptRevealed && !hasChecked && (
                  <div className="relative w-full h-full min-h-[90px] flex items-center justify-center">
                    {/* Blurred silhouette text in background */}
                    <div className="absolute inset-0 select-none pointer-events-none filter blur-md opacity-25 text-white text-base leading-relaxed line-clamp-3">
                      {currentSentence?.transcript || 'Nội dung câu đang ẩn để bạn luyện nghe...'}
                    </div>

                    {/* Center Button: Show transcript */}
                    <button
                      type="button"
                      onClick={handleShowTranscript}
                      className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 hover:bg-black border border-white/20 hover:border-white/40 text-white font-semibold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-neutral-300" />
                      <span>Hiện câu mẫu</span>
                    </button>
                  </div>
                )}

                {/* State B: Revealed by Clicking "Show transcript" (Reference answer) */}
                {isTranscriptRevealed && !hasChecked && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        Đáp án mẫu
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTranscriptRevealed(false)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs transition-colors"
                        title="Ẩn câu mẫu để nghe lại"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ẩn câu mẫu</span>
                      </button>
                    </div>
                    <div className="text-base text-white font-medium leading-relaxed break-words whitespace-normal">
                      {currentSentence?.transcript}
                    </div>
                    <div className="text-[11px] text-neutral-500 pt-1">
                      Đã xem transcript trước đó • Đây là lượt luyện tập có trợ giúp.
                    </div>
                  </div>
                )}

                {/* State C: Checked (Compare your answer with Word Diff Highlight) */}
                {hasChecked && diffResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Đối chiếu đáp án
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-neutral-400">
                          {diffResult.matchedWords}/{diffResult.totalWords} từ chính xác •{' '}
                          {diffResult.score}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHasChecked(false);
                            setDiffResult(null);
                            setIsTranscriptRevealed(false);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs transition-colors"
                          title="Ẩn đối chiếu để gõ thử lại"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ẩn</span>
                        </button>
                      </div>
                    </div>

                    {/* Word-level diff display: Correct words in normal white; missing/wrong words in gentle amber */}
                    <div className="text-base font-medium leading-loose flex flex-wrap items-baseline gap-x-1.5 gap-y-1 w-full break-words whitespace-normal">
                      {diffResult.diff.map((item, idx) => {
                        if (item.type === 'correct') {
                          return (
                            <span key={idx} className="text-white">
                              {item.reference}
                            </span>
                          );
                        }
                        if (item.type === 'substitution') {
                          return (
                            <span
                              key={idx}
                              className="text-amber-400 font-semibold underline decoration-amber-500"
                              title={item.answer ? `Bạn gõ sai: "${item.answer}"` : 'Từ này sai'}
                            >
                              {item.reference}
                            </span>
                          );
                        }
                        if (item.type === 'deletion') {
                          return (
                            <span
                              key={idx}
                              className="text-amber-300/85 font-medium"
                              title="Từ này bị thiếu trong câu trả lời"
                            >
                              {item.reference}
                            </span>
                          );
                        }
                        if (item.type === 'insertion') {
                          return (
                            <span
                              key={idx}
                              className="line-through text-rose-400/80 text-sm font-normal"
                              title="Từ thừa bạn đã gõ"
                            >
                              {item.answer}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <div className="text-[11px] text-neutral-500 pt-1">
                      {isTranscriptRevealed
                        ? 'Đã xem transcript trước đó • Đây là lượt luyện tập có trợ giúp.'
                        : `Điểm tự luyện: ${diffResult.score}% • ${
                            diffResult.score >= 80 ? 'Xuất sắc!' : 'Hãy tiếp tục cố gắng nhé!'
                          }`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. SENTENCE TIMELINE SCRUBBER */}
            <div className="flex items-center gap-3 w-full py-1">
              <span className="text-xs font-mono text-neutral-500 w-10 text-right">
                {formatTime(currentSentence ? currentSentence.startMs / 1000 : 0)}
              </span>

              <div
                className="flex-1 relative h-6 flex items-center cursor-pointer group"
                onClick={handleScrubberClick}
              >
                <div className="w-full h-1.5 bg-neutral-800 group-hover:h-2 rounded-full overflow-hidden transition-all relative">
                  <div
                    className="h-full bg-emerald-500 transition-all rounded-full"
                    style={{ width: `${sentenceProgressPercent}%` }}
                  />
                  {/* Loop range highlight band */}
                  {loopA !== null && loopB !== null && loopB > loopA && (
                    <div
                      className={`absolute top-0 bottom-0 rounded-full transition-all pointer-events-none ${
                        isLoopActive
                          ? 'bg-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                          : 'bg-purple-500/30'
                      }`}
                      style={{
                        left: `${Math.max(0, Math.min(((loopA - startSec) / sentenceDuration) * 100, 100))}%`,
                        width: `${Math.max(0, Math.min(((loopB - loopA) / sentenceDuration) * 100, 100))}%`,
                      }}
                    />
                  )}
                </div>

                {/* Loop A Marker */}
                {loopA !== null && loopA >= startSec && loopA <= endSec && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-purple-400 rounded-sm pointer-events-none z-10"
                    style={{
                      left: `${Math.max(0, Math.min(((loopA - startSec) / sentenceDuration) * 100, 100))}%`,
                    }}
                    title={`Mốc A: ${formatTime(loopA)}`}
                  />
                )}

                {/* Loop B Marker */}
                {loopB !== null && loopB >= startSec && loopB <= endSec && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-purple-400 rounded-sm pointer-events-none z-10"
                    style={{
                      left: `${Math.max(0, Math.min(((loopB - startSec) / sentenceDuration) * 100, 100))}%`,
                    }}
                    title={`Mốc B: ${formatTime(loopB)}`}
                  />
                )}

                {/* Scrubber Knob */}
                <div
                  className="absolute w-3.5 h-3.5 bg-emerald-400 rounded-full shadow-md -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125"
                  style={{ left: `${sentenceProgressPercent}%` }}
                />
              </div>

              <span className="text-xs font-mono text-neutral-500 w-10">
                {formatTime(currentSentence ? currentSentence.endMs / 1000 : 0)}
              </span>
            </div>

            {/* 3. AUDIO CONTROLS ROW */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 relative py-2">
              {/* Playback Speed Selector */}
              <div className="relative" ref={speedMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-semibold transition-colors"
                  title="Tốc độ phát âm thanh"
                >
                  <span>{currentSpeed}x</span>
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>

                {/* Speed Dropdown Menu */}
                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-32 p-1.5 rounded-xl bg-[#1b1d24] border border-white/15 shadow-2xl z-30 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-400 px-2 py-0.5 uppercase tracking-wider">
                      Tốc độ phát
                    </span>
                    {SPEED_PRESETS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          onSetSpeed(spd);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-left flex items-center justify-between transition-colors ${
                          currentSpeed === spd
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'text-neutral-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{spd}x</span>
                        {currentSpeed === spd && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hold-to-Slow Button */}
              <button
                type="button"
                onMouseDown={() => onSetSlowActive?.(true)}
                onMouseUp={() => onSetSlowActive?.(false)}
                onMouseLeave={() => isSlowHeld && onSetSlowActive?.(false)}
                onTouchStart={() => onSetSlowActive?.(true)}
                onTouchEnd={() => onSetSlowActive?.(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs select-none transition-all ${
                  isSlowHeld
                    ? 'bg-purple-950/90 text-purple-200 border-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.6)] animate-pulse font-bold'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:border-purple-500/30'
                }`}
                title={`Giữ chuột hoặc giữ phím '${holdKeyDisplayName}' để nghe chậm ${slowSpeed}x`}
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    isSlowHeld ? 'text-purple-400 fill-purple-400' : 'text-purple-400'
                  }`}
                />
                <span className="font-mono text-[11px]">
                  {isSlowHeld ? `CHẬM ${slowSpeed}x` : `Chậm ${slowSpeed}x`}
                </span>
              </button>

              {/* Jump Backward Button (-jumpSeconds) */}
              <button
                type="button"
                onClick={handleJumpBackward}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white transition-colors group"
                title={`Tua lùi ${jumpSeconds}s`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400 group-hover:-rotate-45 transition-transform" />
                <span className="font-semibold text-xs font-mono">-{jumpSeconds}s</span>
              </button>

              {/* Sentence Replay Button (quay ngược) */}
              <button
                type="button"
                onClick={handleReplaySentence}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
                title="Nghe lại câu này (Shift + Enter)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Previous Sentence Button */}
              <button
                type="button"
                onClick={handlePrevSentence}
                disabled={currentSentenceIndex <= 0}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Câu trước đó (Ctrl + Mũi tên Trái)"
              >
                <PrevIcon className="w-4 h-4" />
              </button>

              {/* Large Green Circular Play/Pause Button (56px) */}
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black flex items-center justify-center shadow-lg hover:shadow-emerald-500/25 transition-all"
                title={isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát câu này (Phím Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Next Sentence Button */}
              <button
                type="button"
                onClick={handleNextSentence}
                disabled={currentSentenceIndex >= lesson.sentences.length - 1}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Câu tiếp theo (Ctrl + Mũi tên Phải)"
              >
                <NextIcon className="w-4 h-4" />
              </button>

              {/* Jump Forward Button (+jumpSeconds) */}
              <button
                type="button"
                onClick={handleJumpForward}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white transition-colors group"
                title={`Tua tiến ${jumpSeconds}s`}
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
                <span className="font-semibold text-xs font-mono">+{jumpSeconds}s</span>
              </button>

              {/* Help / Shortcuts Button */}
              <div className="relative" ref={helpModalRef}>
                <button
                  type="button"
                  onClick={() => setShowHelpModal((prev) => !prev)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Phím tắt & Trợ giúp"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {showHelpModal && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-2xl bg-[#1b1d24] border border-white/15 shadow-2xl z-30 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-bold text-white">Phím tắt luyện nghe</span>
                      <button
                        onClick={() => setShowHelpModal(false)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-neutral-300 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>Phát / Tạm dừng:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Ctrl + Space
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Nghe lại câu này:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Shift + Enter
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Nghe chậm (0.5x):</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Ctrl + S
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Câu trước / sau:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Ctrl + ← / →
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ẩn / Hiện Transcript:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Ctrl + H
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Gắn / Bỏ sao:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Ctrl + Shift + S
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Kiểm tra / Tiếp theo:</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                          Enter
                        </kbd>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3.5 A-B LOOP CONTROLS ROW */}
            <div className="flex items-center justify-center gap-2 py-0.5 select-none">
              <div className="flex items-center gap-1.5 bg-[#16181d] px-2.5 py-1.5 rounded-xl border border-white/10 shadow-sm">
                <span className="text-[11px] font-semibold text-neutral-400 px-1 flex items-center gap-1">
                  <Repeat className="w-3 h-3 text-purple-400" /> A-B Loop:
                </span>

                {/* Set Point A */}
                <button
                  type="button"
                  onClick={handleSetLoopA}
                  title="Đặt mốc A tại thời điểm hiện tại"
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all ${
                    loopA !== null
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>A: {loopA !== null ? formatTime(loopA) : 'Mốc A'}</span>
                </button>

                {/* Set Point B */}
                <button
                  type="button"
                  onClick={handleSetLoopB}
                  title="Đặt mốc B tại thời điểm hiện tại"
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all ${
                    loopB !== null
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>B: {loopB !== null ? formatTime(loopB) : 'Mốc B'}</span>
                </button>

                {/* Toggle Loop Active & Clear */}
                {(loopA !== null || loopB !== null) && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleLoop}
                      disabled={loopA === null || loopB === null || loopB <= loopA}
                      title={isLoopActive ? 'Tắt lặp đoạn A-B' : 'Bật lặp đoạn A-B'}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all disabled:opacity-40 ${
                        isLoopActive
                          ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] font-bold'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      <Repeat className="w-3 h-3" />
                      <span>{isLoopActive ? 'Đang Lặp A-B' : 'Bật Lặp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearLoop}
                      title="Xóa mốc A-B"
                      className="p-1 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 4. DICTATION SECTION (Only present in Dictation Tab) */}
            {activeTab === 'dictation' && (
              <div className="space-y-3 pt-1">
                <span className="text-xs font-medium text-neutral-400">Câu trả lời của bạn</span>

                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      if (hasChecked) {
                        setHasChecked(false);
                        setDiffResult(null);
                      }
                    }}
                    placeholder="Nhập lại những gì bạn nghe được..."
                    rows={4}
                    className="w-full p-4 rounded-2xl bg-[#16181d] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none text-base leading-relaxed"
                  />
                </div>

                {/* Footer Controls: Left = replay shortcut badge | Right = Check / Next button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {hasChecked && (
                      <button
                        type="button"
                        onClick={() => {
                          setHasChecked(false);
                          setDiffResult(null);
                          inputRef.current?.focus();
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Chỉnh sửa lại câu trả lời"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/10 text-neutral-400 text-xs font-mono">
                      <span>Shift ↵</span>
                      <span>Nghe lại</span>
                    </div>
                  </div>

                  {/* Right Button: Toggle between "Kiểm tra đáp án" and "Câu tiếp theo" */}
                  {!hasChecked && !isTranscriptRevealed ? (
                    <button
                      type="button"
                      onClick={handleCheckAnswer}
                      disabled={!userAnswer.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Check className="w-4 h-4" />
                      <span>Kiểm tra đáp án</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextSentence}
                      disabled={currentSentenceIndex >= lesson.sentences.length - 1}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs shadow-md transition-all disabled:opacity-40"
                    >
                      <span>Câu tiếp theo</span>
                      <NextIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Sticky Sentence Sidebar */}
        {isSidebarOpen && (
          <SentenceSidebar
            sentences={lesson.sentences}
            selectedSentenceId={currentSentenceId}
            onSelectSentence={selectSentence}
            onToggleStar={handleToggleStar}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
          />
        )}
      </div>

      {/* Script Exchange Modal (Import / Export) */}
      <ScriptExchangeModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        lesson={lesson}
        onImportLesson={handleImportLesson}
      />
    </div>
  );
};
