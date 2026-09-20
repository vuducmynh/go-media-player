import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileText,
  Code,
  Film,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Lesson, Sentence } from '../../../entities/study/types';
import {
  exportToMarkdown,
  exportToJSON,
  exportToSRT,
  parseImportedScript,
  downloadFile,
} from '../lib/scriptExporter';

interface ScriptExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson;
  onImportLesson: (updatedLesson: Lesson) => Promise<boolean>;
}

export const ScriptExchangeModal: React.FC<ScriptExchangeModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onImportLesson,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Import state
  const [importText, setImportText] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const [previewSentences, setPreviewSentences] = useState<Partial<Sentence>[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  const baseFileName = (lesson.title || 'script')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40);

  // Handle Export Actions
  const handleDownloadMarkdown = () => {
    const content = exportToMarkdown(lesson, 'both');
    downloadFile(content, `${baseFileName}.md`, 'text/markdown;charset=utf-8');
  };

  const handleCopyMarkdown = async () => {
    const content = exportToMarkdown(lesson, 'reading');
    await navigator.clipboard.writeText(content);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadJSON = () => {
    const content = exportToJSON(lesson);
    downloadFile(content, `${baseFileName}_backup.json`, 'application/json;charset=utf-8');
  };

  const handleDownloadSRT = () => {
    const content = exportToSRT(lesson);
    downloadFile(content, `${baseFileName}.srt`, 'text/plain;charset=utf-8');
  };

  // Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setImportText(content);
      const parsed = parseImportedScript(content, file.name);
      if (parsed && parsed.sentences && parsed.sentences.length > 0) {
        setPreviewSentences(parsed.sentences);
      } else {
        setPreviewSentences(null);
        setImportError('Không tìm thấy câu phân đoạn nào hợp lệ trong file này.');
      }
    };
    reader.onerror = () => {
      setImportError('Không thể đọc file đã chọn.');
    };
    reader.readAsText(file);
  };

  // Handle direct text paste
  const handleTextChange = (text: string) => {
    setImportText(text);
    setImportError(null);
    setImportSuccess(false);

    if (!text.trim()) {
      setPreviewSentences(null);
      return;
    }

    const parsed = parseImportedScript(text, importedFileName);
    if (parsed && parsed.sentences && parsed.sentences.length > 0) {
      setPreviewSentences(parsed.sentences);
    } else {
      setPreviewSentences(null);
      setImportError('Không nhận diện được cấu trúc câu hợp lệ.');
    }
  };

  // Execute Import Overwrite
  const handleConfirmImport = async () => {
    if (!previewSentences || previewSentences.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const updatedSentences: Sentence[] = previewSentences.map((s, idx) => ({
        id: s.id || `sent_${idx + 1}_${Date.now()}`,
        index: idx + 1,
        startMs: s.startMs ?? idx * 4000,
        endMs: s.endMs ?? (idx + 1) * 4000,
        transcript: (s.transcript || '').trim(),
        words: s.words,
        starred: s.starred ?? false,
        markedDifficult: s.markedDifficult ?? false,
        bestIndependentScore: s.bestIndependentScore,
        bestAssistedScore: s.bestAssistedScore,
        latestScore: s.latestScore,
        dictationAttempts: s.dictationAttempts || [],
        transcriptRevealed: false,
        shadowCompleted: false,
      }));

      const newLesson: Lesson = {
        ...lesson,
        sentences: updatedSentences,
        updatedAt: new Date().toISOString(),
      };

      const success = await onImportLesson(newLesson);
      if (success) {
        setImportSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportError('Lỗi khi lưu bài học vào hệ thống.');
      }
    } catch (err: any) {
      setImportError('Đã xảy ra lỗi: ' + (err?.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-[#16181d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#191b22]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Xuất & Nhập Script Luyện Nghe
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-[#121317] px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Script (Export)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập Script Ghi Đè (Import)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' ? (
            /* EXPORT OPTIONS */
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Chọn định dạng bạn muốn xuất từ bài học hiện tại (
                <span className="text-white font-medium">{lesson.sentences.length} câu</span>):
              </p>

              {/* Option 1: Markdown (.md) Reading Prose */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Văn Bản Liền Mạch (.md)
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                      Khuyên dùng để đọc
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Nối các câu thành các đoạn văn xuôi mạch lạc, tự nhiên để đọc trôi chảy, kèm
                    bảng mốc thời gian chi tiết.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <button
                    onClick={handleCopyMarkdown}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                    title="Sao chép đoạn văn vào bộ nhớ tạm"
                  >
                    {copiedType === 'markdown' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải .md</span>
                  </button>
                </div>
              </div>

              {/* Option 2: JSON Backup (.json) */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Lưu Trữ Toàn Bộ (.json)
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                      Sao lưu đầy đủ
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Bảo toàn 100% dữ liệu gốc (mốc thời gian từng mili-giây, điểm số, từ vựng, sao)
                    để lưu trữ và phục hồi hoàn hảo.
                  </p>
                </div>
                <button
                  onClick={handleDownloadJSON}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 mt-0.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tải .json</span>
                </button>
              </div>

              {/* Option 3: SRT Subtitle (.srt) */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Phụ Đề Chuẩn (.srt)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Định dạng SubRip tiêu chuẩn, dễ dàng xem cùng các trình phát ngoài hoặc biên
                    tập video.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSRT}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 mt-0.5"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tải .srt</span>
                </button>
              </div>
            </div>
          ) : (
            /* IMPORT OPTIONS */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Lưu ý ghi đè:</span> Nhập script mới sẽ thay thế toàn
                  bộ danh sách câu hiện tại của bài học này và lưu trực tiếp vào hệ thống.
                </div>
              </div>

              {/* File upload input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  1. Chọn file script (.json, .srt, .vtt, .txt, .md):
                </label>
                <input
                  type="file"
                  accept=".json,.srt,.vtt,.txt,.md"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer bg-white/[0.02] border border-white/10 rounded-xl p-1"
                />
              </div>

              {/* Or paste directly */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  2. Hoặc dán trực tiếp nội dung vào đây:
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Dán nội dung JSON, phụ đề SRT, hoặc các dòng văn bản tại đây..."
                  rows={6}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-xs font-mono resize-none"
                />
              </div>

              {/* Status & Preview */}
              {importError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {importError}
                </p>
              )}

              {importSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Đã ghi đè script thành công! Đang tải lại bài học...</span>
                </p>
              )}

              {previewSentences && !importSuccess && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Xem trước kết quả nhận diện:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {previewSentences.length} câu
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-neutral-300 divide-y divide-white/5 pr-1">
                    {previewSentences.slice(0, 5).map((s, idx) => (
                      <div key={idx} className="pt-1 truncate">
                        <span className="font-mono text-neutral-500 mr-2">
                          #{idx + 1}
                        </span>
                        <span>{s.transcript}</span>
                      </div>
                    ))}
                    {previewSentences.length > 5 && (
                      <div className="pt-1 text-neutral-500 text-[10px] italic">
                        ...và {previewSentences.length - 5} câu khác.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              {previewSentences && !importSuccess && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'Đang ghi đè script...'
                      : `Xác nhận ghi đè ${previewSentences.length} câu vào bài học`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
