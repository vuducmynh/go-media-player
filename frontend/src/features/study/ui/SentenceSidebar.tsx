import React, { useState, useMemo } from 'react';
import { Search, Star, AlertCircle, Layers, CheckCircle2 } from 'lucide-react';
import { Sentence, SentenceFilterMode } from '../../../entities/study/types';
import { formatTime } from '../../../shared/lib/formatters';

interface SentenceSidebarProps {
  sentences: Sentence[];
  selectedSentenceId: string;
  onSelectSentence: (sentence: Sentence) => void;
  onToggleStar: (sentenceId: string) => void;
  filterMode: SentenceFilterMode;
  onFilterModeChange: (mode: SentenceFilterMode) => void;
}

export const SentenceSidebar: React.FC<SentenceSidebarProps> = ({
  sentences,
  selectedSentenceId,
  onSelectSentence,
  onToggleStar,
  filterMode,
  onFilterModeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const starredCount = useMemo(() => {
    return sentences.filter((s) => s.starred).length;
  }, [sentences]);

  const under90Count = useMemo(() => {
    return sentences.filter((s) => {
      const best = s.bestIndependentScore ?? s.bestAssistedScore;
      return best !== undefined && best < 90;
    }).length;
  }, [sentences]);

  const filteredSentences = useMemo(() => {
    return sentences.filter((s) => {
      if (filterMode === 'starred' && !s.starred) return false;
      if (filterMode === 'under90') {
        const best = s.bestIndependentScore ?? s.bestAssistedScore;
        if (best === undefined || best >= 90) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.transcript.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [sentences, filterMode, searchQuery]);

  return (
    <div className="w-80 h-full flex flex-col bg-fluent-bg-dark border-l border-white/5 select-none shrink-0">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-white/5 bg-fluent-bg-card/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-fluent-accent" /> Danh Sách Câu ({sentences.length})
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-fluent-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo từ khóa trong câu..."
            className="w-full pl-8 pr-3 py-1.5 bg-fluent-bg-card border border-white/10 rounded-lg text-xs text-white placeholder-fluent-text-muted focus:outline-none focus:border-fluent-accent transition-colors"
          />
        </div>

        {/* Query Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
          <button
            onClick={() => onFilterModeChange('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-white/20 text-white font-semibold'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Tất cả ({sentences.length})
          </button>
          <button
            onClick={() => onFilterModeChange('starred')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
              filterMode === 'starred'
                ? 'bg-amber-500 text-black font-bold shadow-sm'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className="w-3 h-3 fill-current" /> Đã gắn sao ({starredCount})
          </button>
          <button
            onClick={() => onFilterModeChange('under90')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
              filterMode === 'under90'
                ? 'bg-red-500/30 text-red-300 font-semibold border border-red-500/50'
                : 'text-fluent-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertCircle className="w-3 h-3" /> &lt;90% ({under90Count})
          </button>
        </div>
      </div>

      {/* Sentences List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
        {filteredSentences.length === 0 ? (
          <div className="p-8 text-center text-fluent-text-muted text-xs flex flex-col items-center justify-center h-full">
            <p>Không có câu nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredSentences.map((sent) => {
            const isSelected = sent.id === selectedSentenceId;
            const bestScore = sent.bestIndependentScore ?? sent.bestAssistedScore;
            const durationSec = (sent.endMs - sent.startMs) / 1000;

            return (
              <div
                key={sent.id}
                onClick={() => onSelectSentence(sent)}
                className={`p-3 flex items-start gap-2.5 cursor-pointer group transition-all relative ${
                  isSelected
                    ? 'bg-fluent-accent/15 border-l-4 border-fluent-accent shadow-inner'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Index Pill */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5 border ${
                    isSelected
                      ? 'bg-fluent-accent text-black border-fluent-accent shadow-accent-glow'
                      : 'bg-fluent-bg-card border-white/5 text-fluent-text-secondary'
                  }`}
                >
                  {sent.index}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-fluent-text-muted">
                      {formatTime(sent.startMs / 1000)} - {formatTime(sent.endMs / 1000)} (
                      {durationSec.toFixed(1)}s)
                    </span>

                    {/* Star toggle button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(sent.id);
                      }}
                      className={`p-1 rounded hover:bg-white/10 transition-colors ${
                        sent.starred ? 'text-amber-400' : 'text-fluent-text-muted hover:text-white'
                      }`}
                      title={sent.starred ? 'Bỏ gắn sao' : 'Gắn sao câu cần ôn lại'}
                    >
                      <Star className={`w-3.5 h-3.5 ${sent.starred ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Transcript snippet */}
                  <p
                    className={`text-xs line-clamp-2 leading-relaxed ${
                      isSelected ? 'text-white font-medium' : 'text-fluent-text-secondary'
                    }`}
                  >
                    {sent.transcript}
                  </p>

                  {/* Status / Score Bar */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    {bestScore !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            bestScore >= 90
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : bestScore >= 70
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {Math.round(bestScore)}%
                        </span>
                        {sent.bestAssistedScore !== undefined &&
                          sent.bestIndependentScore === undefined && (
                            <span className="text-[9px] text-fluent-text-muted italic">
                              (đã xem đáp án)
                            </span>
                          )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-fluent-text-muted italic">
                        Chưa làm dictation
                      </span>
                    )}

                    {sent.markedDifficult && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[9px] font-semibold">
                        Khó
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
