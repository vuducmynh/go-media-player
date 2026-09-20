import React, { useState } from 'react';
import { X, Youtube, Play, Plus, AlertCircle, Check } from 'lucide-react';
import { extractYouTubeVideoID, getYouTubeThumbnail } from '../../../shared/lib/youtube';
import { MediaFile } from '../../../entities/media/types';

interface AddYouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAndPlay: (url: string) => Promise<MediaFile | null>;
}

export const AddYouTubeModal: React.FC<AddYouTubeModalProps> = ({
  isOpen,
  onClose,
  onAddAndPlay,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const videoId = extractYouTubeVideoID(urlInput);
  const isValid = Boolean(videoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !videoId) {
      setError('Vui lòng nhập link YouTube hợp lệ (watch?v=, youtu.be, shorts hoặc Video ID)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const added = await onAddAndPlay(urlInput.trim());
      if (added) {
        setUrlInput('');
        onClose();
      } else {
        setError('Không thể lấy thông tin video YouTube. Hãy kiểm tra lại đường dẫn hoặc kết nối internet.');
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi thêm video YouTube');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-fluent-bg-subtle/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Nhúng Video YouTube
              </h2>
              <p className="text-[10px] text-fluent-text-muted">
                Điều khiển chuyên sâu: Tua $\pm 5$s, Hold-to-Slow, A-B Loop, Smart Resume
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-fluent-text-secondary mb-1.5">
              Dán liên kết YouTube:
            </label>
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                className="w-full px-3.5 py-2.5 bg-fluent-bg-card border border-white/10 rounded-xl text-xs text-white placeholder-fluent-text-muted focus:outline-none focus:border-red-500 transition-colors font-mono"
                autoFocus
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fluent-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-fluent-text-muted mt-1.5">
              Hỗ trợ đầy đủ link thường, rút gọn, YouTube Shorts hoặc chỉ cần dán 11 ký tự Video ID.
            </p>
          </div>

          {/* Live Preview Card if videoId extracted */}
          {isValid && videoId && (
            <div className="p-3 bg-fluent-bg-card rounded-xl border border-red-500/30 flex items-center gap-3 animate-fade-in">
              <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                <img
                  src={getYouTubeThumbnail(videoId)}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold mb-0.5">
                  <Check className="w-3.5 h-3.5" /> Link YouTube hợp lệ
                </div>
                <p className="text-xs text-white font-mono truncate">
                  Video ID: <span className="text-fluent-accent">{videoId}</span>
                </p>
                <p className="text-[10px] text-fluent-text-muted truncate mt-0.5">
                  Sẵn sàng nhúng với đầy đủ tính năng luyện nghe
                </p>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>Đang kết nối...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Thêm & Phát ngay
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
