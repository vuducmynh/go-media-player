import React, { useState, useMemo } from 'react';
import { Search, Star, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Sentence, SentenceFilterMode } from '../../../entities/study/types';

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
  // By default: ALL sentences have their transcript HIDDEN to avoid spoiling answers!
  const [isAllRevealed, setIsAllRevealed] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const starredCount = useMemo(() => {
    return sentences.filter((s) => s.starred).length;
  }, [sentences]);

  const under90Count = useMemo(() => {
    return sentences.filter((s) => {
      const best = s.bestIndependentScore ?? s.bestAssistedScore;
      return best !== undefined && best < 90;
    }).length;
  }, [sentences]);

  const toggleSentenceReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllReveal = () => {
    if (isAllRevealed) {
      setIsAllRevealed(false);
      setRevealedIds(new Set());
    } else {
      setIsAllRevealed(true);
      setRevealedIds(new Set(sentences.map((s) => s.id)));
    }
  };

  const filteredSentences = useMemo(() => {
    return sentences.filter((s) => {
      if (filterMode === 'starred' && !s.starred) return false;
      if (filterMode === 'under90') {
        const best = s.bestIndependentScore ?? s.bestAssistedScore;
        if (best === undefined || best >= 90) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesIndex = String(s.index).includes(q);
        const matchesText = s.transcript.toLowerCase().includes(q);
        if (!matchesIndex && !matchesText) return false;
      }

      return true;
    });
  }, [sentences, filterMode, searchQuery]);

  return (
    <div className="w-80 h-full flex flex-col bg-[#141519] border-l border-white/5 select-none shrink-0 text-white">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-white/5 bg-[#171920] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
            DANH SÁCH CÂU • {sentences.length}
          </span>

          {/* Toggle Reveal All / Hide All */}
          <button
            type="button"
            onClick={toggleAllReveal}
            className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/5 transition-colors"
            title={isAllRevealed ? 'Ẩn tất cả nội dung câu' : 'Hiện tất cả nội dung câu'}
          >
            {isAllRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ẩn tất cả</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                <span>Hiện tất cả</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Pills (Matches Image 3) */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={() => onFilterModeChange('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
              filterMode === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => onFilterModeChange('starred')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 ${
              filterMode === 'starred'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Star className="w-3 h-3 fill-current text-amber-400" />
            <span>{starredCount}</span>
          </button>
          <button
            onClick={() => onFilterModeChange('under90')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 ${
              filterMode === 'under90'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>&lt;90%</span>
            <span>{under90Count}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số câu hoặc từ khóa..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#1b1d24] border border-white/10 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Sentences List (Matches Image 3) */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
        {filteredSentences.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs flex flex-col items-center justify-center h-full">
            <p>Không có câu nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredSentences.map((sent) => {
            const isSelected = sent.id === selectedSentenceId;
            const bestScore = sent.bestIndependentScore ?? sent.bestAssistedScore;
            const isRevealed = isAllRevealed || revealedIds.has(sent.id);

            return (
              <div
                key={sent.id}
                onClick={() => onSelectSentence(sent)}
                className={`px-3 py-2.5 flex items-start justify-between gap-2.5 cursor-pointer group transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Left: Index + Star + Eye + Text/Placeholder */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {/* Sentence Index */}
                  <span
                    className={`font-mono text-xs font-bold shrink-0 pt-0.5 ${
                      isSelected ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  >
                    {String(sent.index).padStart(2, '0')}
                  </span>

                  {/* Star Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(sent.id);
                    }}
                    className="shrink-0 p-0.5 pt-0.5 text-neutral-600 hover:text-amber-400 transition-colors"
                    title={sent.starred ? 'Bỏ gắn sao' : 'Gắn sao'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        sent.starred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  {/* Eye Toggle for this sentence */}
                  <button
                    type="button"
                    onClick={(e) => toggleSentenceReveal(sent.id, e)}
                    className="shrink-0 p-0.5 pt-0.5 text-neutral-500 hover:text-white transition-colors"
                    title={isRevealed ? 'Ẩn nội dung câu' : 'Xem nội dung câu'}
                  >
                    {isRevealed ? (
                      <Eye className="w-3.5 h-3.5 text-emerald-400/80" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400" />
                    )}
                  </button>

                  {/* Sentence Text or Hidden Placeholder - FULL TEXT WITHOUT TRUNCATION OR 3 DOTS! */}
                  <span
                    className={`text-xs break-words whitespace-normal leading-relaxed flex-1 ${
                      isRevealed
                        ? 'text-neutral-200 font-medium'
                        : 'text-neutral-500 italic font-mono'
                    }`}
                  >
                    {isRevealed ? sent.transcript : `Câu ${sent.index}`}
                  </span>
                </div>

                {/* Right: Best Score Badge */}
                {bestScore !== undefined && (
                  <span
                    className={`text-xs font-mono font-bold shrink-0 pt-0.5 ${
                      bestScore >= 90
                        ? 'text-emerald-400'
                        : bestScore >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {Math.round(bestScore)}%
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
