import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Star,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Headphones,
  CheckCircle2,
  FileText,
  Sparkles,
  Compass,
  Layers,
} from 'lucide-react';
import {
  Lesson,
  Sentence,
  SentenceFilterMode,
  DictationAttempt,
} from '../../../entities/study/types';
import { DictationEditor } from './DictationEditor';
import { SentenceSidebar } from './SentenceSidebar';
import { GuidedFlow } from './GuidedFlow';
import { formatTime } from '../../../shared/lib/formatters';

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
}

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
}) => {
  const [lesson, setLesson] = useState<Lesson>(initialLesson);
  const [currentSentenceId, setCurrentSentenceId] = useState<string>(
    initialLesson.sentences[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'free' | 'guided'>('free');
  const [freePracticeSubTab, setFreePracticeSubTab] = useState<'listen' | 'dictation'>('listen');
  const [filterMode, setFilterMode] = useState<SentenceFilterMode>('all');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Keep internal state synced if initialLesson updates
  useEffect(() => {
    setLesson(initialLesson);
  }, [initialLesson]);

  const currentSentence =
    lesson.sentences.find((s) => s.id === currentSentenceId) || lesson.sentences[0];

  const currentSentenceIndex = lesson.sentences.findIndex((s) => s.id === currentSentenceId);

  // Play sentence time-window with small padding
  const handlePlaySentence = useCallback(
    (sent: Sentence) => {
      const startSec = Math.max(0, sent.startMs / 1000 - 0.08);
      onSeek(startSec);
      onPlay();
    },
    [onSeek, onPlay]
  );

  // Auto-pause when sentence end is reached
  useEffect(() => {
    if (!isPlaying || !currentSentence) return;
    const endSec = currentSentence.endMs / 1000 + 0.12;
    if (currentTime >= endSec) {
      onPause();
    }
  }, [isPlaying, currentTime, currentSentence, onPause]);

  const handleNextSentence = () => {
    if (currentSentenceIndex < lesson.sentences.length - 1) {
      const next = lesson.sentences[currentSentenceIndex + 1];
      setCurrentSentenceId(next.id);
      handlePlaySentence(next);
    }
  };

  const handlePrevSentence = () => {
    if (currentSentenceIndex > 0) {
      const prev = lesson.sentences[currentSentenceIndex - 1];
      setCurrentSentenceId(prev.id);
      handlePlaySentence(prev);
    }
  };

  const handleToggleStar = async (sentenceId: string) => {
    const updated = await onToggleStar(sentenceId);
    if (updated) setLesson(updated);
  };

  const handleSaveAttempt = async (attempt: DictationAttempt) => {
    const updated = await onSaveAttempt(currentSentence.id, attempt);
    if (updated) setLesson(updated);
  };

  const handleToggleVisibility = async () => {
    const newRevealed = !currentSentence.transcriptRevealed;
    const updated = await onUpdateSentenceVisibility(currentSentence.id, newRevealed);
    if (updated) setLesson(updated);
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    onSetSpeed(spd);
  };

  const bestScore =
    currentSentence?.bestIndependentScore ?? currentSentence?.bestAssistedScore;

  return (
    <div className="flex-1 h-full flex flex-col bg-fluent-bg-darker text-fluent-text-primary overflow-hidden relative select-none">
      {/* Top Navigation Bar */}
      <div className="h-14 px-4 border-b border-white/5 bg-fluent-bg-dark flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Trình phát
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-fluent-accent/15 text-fluent-accent text-xs font-mono font-bold">
              SEG {currentSentence ? currentSentence.index : 0} / {lesson.sentences.length}
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
              {lesson.title}
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Free Practice vs Guided Flow) */}
        <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('free')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'free'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Luyện Tự Do</span>
          </button>
          <button
            onClick={() => setActiveTab('guided')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'guided'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lộ Trình 4 Bước</span>
          </button>
        </div>

        {/* Right: Sentence Metadata & Star */}
        <div className="flex items-center gap-2">
          {bestScore !== undefined && (
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                bestScore >= 90
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : bestScore >= 70
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              best {Math.round(bestScore)}%
            </span>
          )}

          {currentSentence && (
            <button
              onClick={() => handleToggleStar(currentSentence.id)}
              className={`p-2 rounded-xl border transition-colors ${
                currentSentence.starred
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-fluent-text-muted hover:text-white'
              }`}
              title={currentSentence.starred ? 'Bỏ gắn sao' : 'Gắn sao câu khó cần ôn'}
            >
              <Star className={`w-4 h-4 ${currentSentence.starred ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeTab === 'guided' ? (
        <GuidedFlow
          lesson={lesson}
          currentSentence={currentSentence}
          onSelectSentence={(s) => setCurrentSentenceId(s.id)}
          onSaveAttempt={handleSaveAttempt}
          onMarkDifficult={() => onMarkDifficult(Math.round(currentTime * 1000))}
          onPlaySentence={handlePlaySentence}
          onPlayContinuous={onPlay}
          onPause={onPause}
          isPlaying={isPlaying}
          onReplaySentence={() => handlePlaySentence(currentSentence)}
          onNextSentence={handleNextSentence}
          onPrevSentence={handlePrevSentence}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Sentence Workspace (70%) */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            {/* Free Practice Sub-Tabs: Listen vs Dictation */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFreePracticeSubTab('listen')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    freePracticeSubTab === 'listen'
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Headphones className="w-4 h-4" /> 01. Nghe (Listen)
                </button>
                <button
                  onClick={() => setFreePracticeSubTab('dictation')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    freePracticeSubTab === 'dictation'
                      ? 'bg-fluent-accent text-black font-bold shadow-accent-glow'
                      : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" /> 02. Chép chính tả (Dictation)
                </button>
              </div>

              {/* Speed Presets */}
              <div className="flex items-center gap-1 bg-fluent-bg-card p-1 rounded-xl border border-white/5 text-[11px] font-mono">
                {[0.75, 0.8, 0.9, 1.0, 1.1, 1.25].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-2 py-0.5 rounded-lg transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-fluent-accent text-black font-bold'
                        : 'text-fluent-text-muted hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* TAB 1: LISTEN */}
            {freePracticeSubTab === 'listen' && (
              <div className="bg-fluent-bg-card rounded-2xl border border-white/10 p-6 shadow-fluent space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-fluent-text-muted">
                    Văn Bản Phiên Âm (Transcript):
                  </span>
                  <button
                    onClick={handleToggleVisibility}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                  >
                    {currentSentence.transcriptRevealed ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ẩn transcript
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Hiện transcript
                      </>
                    )}
                  </button>
                </div>

                {/* Transcript Reveal Area */}
                {currentSentence.transcriptRevealed ? (
                  <div className="p-6 rounded-2xl bg-black/40 border border-white/5 text-base text-white font-medium leading-loose">
                    {currentSentence.transcript}
                  </div>
                ) : (
                  <div
                    onClick={handleToggleVisibility}
                    className="p-10 rounded-2xl bg-black/30 border border-dashed border-white/15 flex flex-col items-center justify-center text-center cursor-pointer hover:border-fluent-accent/40 group transition-all"
                  >
                    <Eye className="w-8 h-8 text-fluent-text-muted group-hover:text-fluent-accent mb-2 transition-colors" />
                    <span className="text-xs font-bold text-white mb-1">Transcript đang được ẩn</span>
                    <span className="text-[11px] text-fluent-text-muted">
                      Nghe bằng tai trước (Ear First). Nhấp vào đây để xem văn bản sau khi đã cố gắng nghe.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DICTATION */}
            {freePracticeSubTab === 'dictation' && (
              <DictationEditor
                sentence={currentSentence}
                transcriptRevealed={currentSentence.transcriptRevealed}
                onSaveAttempt={handleSaveAttempt}
                onReplaySentence={() => handlePlaySentence(currentSentence)}
                onNextSentence={handleNextSentence}
              />
            )}

            {/* Bottom Sentence Audio Controller Toolbar */}
            <div className="glass-toolbar p-4 rounded-2xl flex items-center justify-between gap-4 mt-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevSentence}
                  className="p-2 rounded-full hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-all"
                  title="Câu trước đó (Mũi tên trái)"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handlePlaySentence(currentSentence)}
                  className="w-12 h-12 rounded-full bg-fluent-accent hover:bg-fluent-accent-hover text-black flex items-center justify-center shadow-accent-glow transition-transform hover:scale-105"
                  title="Phát câu này"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handlePlaySentence(currentSentence)}
                  className="p-2 rounded-full hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-all"
                  title="Nghe lại câu này (Shift + Enter)"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNextSentence}
                  className="p-2 rounded-full hover:bg-white/10 text-fluent-text-secondary hover:text-white transition-all"
                  title="Câu kế tiếp (Mũi tên phải)"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Timestamp Range */}
              <div className="text-xs font-mono text-fluent-text-muted">
                <span className="text-white font-bold">{formatTime(currentTime)}</span> /{' '}
                <span>{formatTime(currentSentence.endMs / 1000)}</span>
              </div>
            </div>
          </div>

          {/* Sticky Sentence Sidebar (30%) */}
          <SentenceSidebar
            sentences={lesson.sentences}
            selectedSentenceId={currentSentenceId}
            onSelectSentence={(s) => {
              setCurrentSentenceId(s.id);
              handlePlaySentence(s);
            }}
            onToggleStar={handleToggleStar}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
          />
        </div>
      )}
    </div>
  );
};
