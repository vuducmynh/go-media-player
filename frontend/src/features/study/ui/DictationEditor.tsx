import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw, AlertTriangle, History, ArrowRight } from 'lucide-react';
import { Sentence, DictationAttempt } from '../../../entities/study/types';
import { computeWordDiff, DiffResult } from '../../../shared/lib/diff';

interface DictationEditorProps {
  sentence: Sentence;
  transcriptRevealed: boolean;
  onSaveAttempt: (attempt: DictationAttempt) => void;
  onReplaySentence: () => void;
  onNextSentence: () => void;
}

export const DictationEditor: React.FC<DictationEditorProps> = ({
  sentence,
  transcriptRevealed,
  onSaveAttempt,
  onReplaySentence,
  onNextSentence,
}) => {
  const [inputAnswer, setInputAnswer] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset when sentence changes
  useEffect(() => {
    setInputAnswer('');
    setDiffResult(null);
    setHasChecked(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [sentence.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter -> Replay current sentence
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      onReplaySentence();
      return;
    }

    // Enter (without shift) -> Check answer if input not empty
    if (!e.shiftKey && e.key === 'Enter' && !hasChecked) {
      e.preventDefault();
      handleCheck();
    }
  };

  const handleCheck = () => {
    if (!inputAnswer.trim()) return;

    const result = computeWordDiff(sentence.transcript, inputAnswer);
    setDiffResult(result);
    setHasChecked(true);

    const attempt: DictationAttempt = {
      id: `att_${Date.now()}`,
      sentenceId: sentence.id,
      answer: inputAnswer.trim(),
      score: result.score,
      matchedWords: result.matchedWords,
      totalWords: result.totalWords,
      transcriptWasVisible: transcriptRevealed,
      assessmentType: transcriptRevealed ? 'assisted' : 'independent',
      diff: result.diff,
      createdAt: new Date().toISOString(),
    };

    onSaveAttempt(attempt);
  };

  const handleTryAgain = () => {
    setHasChecked(false);
    setDiffResult(null);
    onReplaySentence();
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input Area */}
      <div className="bg-fluent-bg-card rounded-2xl border border-white/10 p-4 shadow-sm relative space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-fluent-text-secondary uppercase tracking-wider">
            Câu Trả Lời Của Bạn (Gõ Những Gì Bạn Nghe Được):
          </label>
          <span className="text-[11px] font-mono text-fluent-text-muted">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-semibold">Shift + Enter</kbd> để nghe lại câu
          </span>
        </div>

        <textarea
          ref={inputRef}
          value={inputAnswer}
          onChange={(e) => {
            setInputAnswer(e.target.value);
            if (hasChecked) {
              setHasChecked(false);
              setDiffResult(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu tiếng Anh bạn vừa nghe được tại đây..."
          rows={3}
          className="w-full p-3.5 bg-fluent-bg-darker border border-white/10 rounded-xl text-sm text-white placeholder-fluent-text-muted focus:outline-none focus:border-fluent-accent transition-colors resize-none leading-relaxed"
        />

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onReplaySentence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-fluent-text-secondary hover:text-white text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Nghe lại câu
          </button>

          <div className="flex items-center gap-2">
            {hasChecked && (
              <button
                type="button"
                onClick={handleTryAgain}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                Làm lại câu này
              </button>
            )}

            {!hasChecked ? (
              <button
                type="button"
                onClick={handleCheck}
                disabled={!inputAnswer.trim()}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-fluent-accent hover:bg-fluent-accent-hover text-black font-bold text-xs shadow-accent-glow transition-all disabled:opacity-40"
              >
                <Check className="w-4 h-4" /> Kiểm tra đáp án
              </button>
            ) : (
              <button
                type="button"
                onClick={onNextSentence}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-fluent-accent hover:bg-fluent-accent-hover text-black font-bold text-xs shadow-accent-glow transition-all"
              >
                Câu kế tiếp <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Word-Level Diff Evaluation Card */}
      {hasChecked && diffResult && (
        <div className="bg-fluent-bg-card rounded-2xl border border-white/10 p-5 shadow-sm space-y-4 animate-fade-in">
          {/* Header with Score & Status Badge */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-xl text-sm font-mono font-bold ${
                  diffResult.score >= 90
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : diffResult.score >= 70
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {diffResult.score}%
              </span>
              <span className="text-xs font-semibold text-white">
                Khớp {diffResult.matchedWords} / {diffResult.totalWords} từ
              </span>
            </div>

            {transcriptRevealed ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Đã xem transcript trước đó • Tính điểm hỗ trợ (Assisted)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                Nghe độc lập (Independent score)
              </span>
            )}
          </div>

          {/* Detailed Word-Level Alignment Visualization */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fluent-text-muted block">
              So khớp chi tiết từng từ:
            </span>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-wrap gap-2 text-sm leading-loose font-mono">
              {diffResult.diff.map((item, idx) => {
                if (item.type === 'correct') {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                      title="Chính xác"
                    >
                      {item.reference}
                    </span>
                  );
                }
                if (item.type === 'substitution') {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 flex items-center gap-1"
                    >
                      <span className="text-red-300/60 line-through">{item.answer}</span>
                      <span className="text-red-400 font-bold">→ {item.reference}</span>
                    </span>
                  );
                }
                if (item.type === 'deletion') {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                      title="Từ bị bỏ sót"
                    >
                      [{item.reference}]
                    </span>
                  );
                }
                if (item.type === 'insertion') {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 line-through border border-red-500/20 text-xs"
                      title="Từ thừa"
                    >
                      +{item.answer}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Full Reference Text */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-fluent-text-secondary leading-relaxed">
            <span className="font-semibold text-fluent-accent block mb-0.5">Đáp án chuẩn:</span>
            <span>{sentence.transcript}</span>
          </div>
        </div>
      )}

      {/* Historical Attempts for this sentence */}
      {sentence.dictationAttempts && sentence.dictationAttempts.length > 0 && (
        <div className="p-3 rounded-xl bg-fluent-bg-card/40 border border-white/5 space-y-2">
          <span className="text-[11px] font-bold text-fluent-text-muted flex items-center gap-1.5 uppercase tracking-wider">
            <History className="w-3.5 h-3.5" /> Lịch sử lần làm bài ({sentence.dictationAttempts.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {sentence.dictationAttempts.map((att, i) => (
              <span
                key={att.id || i}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border ${
                  att.score >= 90
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : att.score >= 70
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-red-500/10 text-red-300 border-red-500/20'
                }`}
              >
                Lần {i + 1}: {Math.round(att.score)}%{' '}
                {att.assessmentType === 'assisted' && '(hỗ trợ)'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
