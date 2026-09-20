import React, { useState, useMemo } from 'react';
import {
  Headphones,
  FileText,
  Mic,
  RotateCw,
  Play,
  Pause,
  RotateCcw,
  BookmarkPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Star,
  AlertCircle,
} from 'lucide-react';
import { Lesson, Sentence, GuidedStage, DictationAttempt } from '../../../entities/study/types';
import { DictationEditor } from './DictationEditor';

interface GuidedFlowProps {
  lesson: Lesson;
  currentSentence: Sentence;
  onSelectSentence: (sentence: Sentence) => void;
  onSaveAttempt: (attempt: DictationAttempt) => void;
  onMarkDifficult: () => void;
  onPlaySentence: (sentence: Sentence) => void;
  onPlayContinuous: () => void;
  onPause: () => void;
  isPlaying: boolean;
  onReplaySentence: () => void;
  onNextSentence: () => void;
  onPrevSentence: () => void;
}

export const GuidedFlow: React.FC<GuidedFlowProps> = ({
  lesson,
  currentSentence,
  onSelectSentence,
  onSaveAttempt,
  onMarkDifficult,
  onPlaySentence,
  onPlayContinuous,
  onPause,
  isPlaying,
  onReplaySentence,
  onNextSentence,
  onPrevSentence,
}) => {
  const [currentStage, setCurrentStage] = useState<GuidedStage>('listen');
  const [markedCount, setMarkedCount] = useState(0);

  const reviewSentences = useMemo(() => {
    return lesson.sentences.filter((s) => {
      const best = s.bestIndependentScore ?? s.bestAssistedScore;
      return s.starred || s.markedDifficult || (best !== undefined && best < 90);
    });
  }, [lesson.sentences]);

  const handleMarkDifficult = () => {
    onMarkDifficult();
    setMarkedCount((prev) => prev + 1);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-fluent-bg-darker overflow-y-auto">
      {/* 4-Step Guided Stage Indicator */}
      <div className="p-4 border-b border-white/5 bg-fluent-bg-card/60 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setCurrentStage('listen')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentStage === 'listen'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>01 Nghe tổng thể</span>
          </button>

          <button
            onClick={() => setCurrentStage('dictation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentStage === 'dictation'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>02 Chép chính tả</span>
          </button>

          <button
            onClick={() => setCurrentStage('shadow')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentStage === 'shadow'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>03 Luyện Shadowing</span>
          </button>

          <button
            onClick={() => setCurrentStage('review')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentStage === 'review'
                ? 'bg-fluent-accent text-black shadow-accent-glow'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>04 Ôn tập câu yếu ({reviewSentences.length})</span>
          </button>
        </div>
      </div>

      {/* Main Guided Content per Stage */}
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center space-y-6">
        {/* STAGE 1: LISTEN */}
        {currentStage === 'listen' && (
          <div className="bg-fluent-bg-card rounded-3xl border border-white/10 p-8 shadow-fluent text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent mx-auto flex items-center justify-center shadow-accent-glow">
              <Headphones className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">01. Nghe Nắm Bắt Ý Chính</h2>
              <p className="text-xs text-fluent-text-secondary max-w-md mx-auto leading-relaxed">
                Nghe trọn vẹn toàn bộ đoạn âm thanh từ đầu đến cuối mà không nhìn phụ đề (Ear First - Text Second). 
                Khi phát hiện đoạn không hiểu, bấm <strong>Đánh dấu câu khó</strong> hoặc phím tắt <strong>M</strong>.
              </p>
            </div>

            {/* Play Controls & Mark Button */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={isPlaying ? onPause : onPlayContinuous}
                className="w-14 h-14 rounded-full bg-fluent-accent hover:bg-fluent-accent-hover active:bg-fluent-accent-active text-black flex items-center justify-center shadow-accent-glow transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
              </button>

              <button
                onClick={handleMarkDifficult}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition-all shadow-sm"
              >
                <BookmarkPlus className="w-4 h-4" /> Đánh dấu câu vừa nghe là khó (Phím M)
                {markedCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold text-[10px]">
                    {markedCount}
                  </span>
                )}
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-end">
              <button
                onClick={() => setCurrentStage('dictation')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fluent-accent text-black font-bold text-xs shadow-accent-glow hover:bg-fluent-accent-hover transition-all"
              >
                Tiếp tục: Bước 02 Chép chính tả <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: DICTATION */}
        {currentStage === 'dictation' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-fluent-bg-card p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-fluent-accent">
                  CÂU {currentSentence.index} / {lesson.sentences.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevSentence}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  title="Câu trước"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPlaySentence(currentSentence)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fluent-accent text-black font-bold text-xs shadow-accent-glow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Phát câu này
                </button>
                <button
                  onClick={onNextSentence}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  title="Câu sau"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <DictationEditor
              sentence={currentSentence}
              transcriptRevealed={currentSentence.transcriptRevealed}
              onSaveAttempt={onSaveAttempt}
              onReplaySentence={onReplaySentence}
              onNextSentence={onNextSentence}
            />

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentStage('listen')}
                className="text-xs text-fluent-text-muted hover:text-white transition-colors"
              >
                ← Quay lại Bước 01
              </button>

              <button
                onClick={() => setCurrentStage('shadow')}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-fluent-accent text-black font-bold text-xs shadow-accent-glow hover:bg-fluent-accent-hover transition-all"
              >
                Xong Dictation: Sang Bước 03 Shadow <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: SHADOW */}
        {currentStage === 'shadow' && (
          <div className="bg-fluent-bg-card rounded-3xl border border-white/10 p-8 shadow-fluent text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center">
              <Mic className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">03. Luyện Nói Nhại (Shadowing)</h2>
              <p className="text-xs text-fluent-text-secondary max-w-md mx-auto leading-relaxed">
                Nghe từng câu và nhại lại to rõ ràng. Chú ý tới ngữ điệu (intonation), nhịp điệu (rhythm),
                và các hiện tượng nối âm (connected speech).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-sm font-medium text-white max-w-xl mx-auto leading-relaxed">
              {currentSentence.transcript}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onPrevSentence}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => onPlaySentence(currentSentence)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Nghe & Nhại Lại Câu {currentSentence.index}
              </button>

              <button
                onClick={onNextSentence}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => setCurrentStage('dictation')}
                className="text-xs text-fluent-text-muted hover:text-white transition-colors"
              >
                ← Quay lại Bước 02
              </button>

              <button
                onClick={() => setCurrentStage('review')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fluent-accent text-black font-bold text-xs shadow-accent-glow hover:bg-fluent-accent-hover transition-all"
              >
                Tiếp tục: Bước 04 Ôn tập câu yếu <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: REVIEW */}
        {currentStage === 'review' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-fluent-bg-card p-6 rounded-2xl border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-fluent-accent" /> Hàng Đợi Ôn Tập Tập Trung
              </h2>
              <p className="text-xs text-fluent-text-secondary leading-relaxed">
                Các câu xuất hiện ở đây được tổng hợp tự động từ những câu bạn đã <strong>gắn sao</strong>, 
                được <strong>đánh dấu khó</strong> trong lúc nghe, hoặc có điểm chép chính tả <strong>dưới 90%</strong>.
              </p>
            </div>

            {reviewSentences.length === 0 ? (
              <div className="p-12 text-center text-fluent-text-muted bg-fluent-bg-card rounded-2xl border border-white/10 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Xuất sắc! Bạn không có câu yếu nào.</p>
                <p className="text-xs text-fluent-text-muted max-w-sm mx-auto">
                  Tất cả các câu đều đạt điểm trên 90% hoặc bạn chưa đánh dấu câu khó nào.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {reviewSentences.map((sent) => (
                  <div
                    key={sent.id}
                    onClick={() => {
                      onSelectSentence(sent);
                      setCurrentStage('dictation');
                    }}
                    className="p-3.5 rounded-xl bg-fluent-bg-card border border-white/5 hover:border-fluent-accent/40 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <span className="w-7 h-7 rounded-lg bg-white/5 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {sent.index}
                      </span>
                      <p className="text-xs text-white truncate font-medium">{sent.transcript}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {sent.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                      {sent.markedDifficult && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                          Khó
                        </span>
                      )}
                      {(sent.bestIndependentScore ?? sent.bestAssistedScore) !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-xs font-bold">
                          {Math.round(sent.bestIndependentScore ?? sent.bestAssistedScore!)}%
                        </span>
                      )}
                      <span className="text-[11px] text-fluent-accent group-hover:underline">Luyện lại →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
