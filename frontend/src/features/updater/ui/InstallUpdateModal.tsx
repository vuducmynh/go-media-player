import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  X,
  Loader2,
  Download,
  CheckCircle2,
  Layers,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import { UpdateStatus } from '../model/useUpdater';
import { UpdateInfo } from '../../../shared/api/wailsBridge';
import { parseChangelog } from '../lib/changelogParser';

interface InstallUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  status: UpdateStatus;
  errorMessage: string | null;
  onApplyUpdate: () => Promise<boolean>;
  onRestartApp: () => Promise<void>;
  onStartDownload?: () => void;
  downloadPercent?: number;
}

// Helper to render bold text (**text**) and code (`code`)
function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const InstallUpdateModal: React.FC<InstallUpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  updateInfo,
  status,
  errorMessage,
  onApplyUpdate,
  onRestartApp,
  onStartDownload,
  downloadPercent = 0,
}) => {
  const [isRestarting, setIsRestarting] = useState(false);

  // Parse structured changelog notes from release notes
  const parsedNotes = useMemo(() => {
    return parseChangelog(
      updateInfo?.releaseNotes,
      updateInfo?.latestVersion || currentVersion,
      updateInfo?.publishedAt
    );
  }, [updateInfo?.releaseNotes, updateInfo?.latestVersion, updateInfo?.publishedAt, currentVersion]);

  // Accordion open/close states (default open if items exist)
  const [isImprovementsOpen, setIsImprovementsOpen] = useState(true);
  const [isFixesOpen, setIsFixesOpen] = useState(true);
  const [isPatchesOpen, setIsPatchesOpen] = useState(false);

  if (!isOpen) return null;

  const isInstalling = status === 'installing';
  const isInstalled = status === 'installed';
  const isDownloading = status === 'downloading';
  const isReadyToInstall = status === 'ready_to_install';
  const isUpdateAvailable = status === 'update_available';

  const handleRestart = async () => {
    setIsRestarting(true);
    await onRestartApp();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#14161b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 font-mono tracking-wide">
                  {parsedNotes.version}
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-xs text-neutral-400 font-medium">
                  {parsedNotes.date}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Phiên bản hiện tại: <span className="font-mono text-neutral-400">{currentVersion}</span>
              </p>
            </div>
          </div>

          {!isInstalling && !isInstalled && (
            <button
              onClick={onClose}
              title="Đóng cửa sổ"
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body (Scrollable Changelog) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Release Title & Summary */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {parsedNotes.title}
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed font-normal">
              {parsedNotes.description}
            </p>
          </div>

          {/* Installing Status Notice */}
          {isInstalling && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
              <span>Đang sao lưu và cập nhật file thực thi `go-audio-player.exe`... Vui lòng không tắt máy.</span>
            </div>
          )}

          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 3 Categorized Changelog Accordions */}
          <div className="space-y-3 pt-1 border-t border-white/5">
            {/* 1. Improvements (Cải tiến) */}
            <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsImprovementsOpen(!isImprovementsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Cải tiến (Improvements)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {parsedNotes.improvements.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    isImprovementsOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {isImprovementsOpen && (
                <div className="px-5 pb-4 pt-1 border-t border-white/5">
                  {parsedNotes.improvements.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-1">Không có thay đổi trong mục này.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-neutral-300">
                      {parsedNotes.improvements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span>{renderFormattedText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 2. Fixes (Sửa lỗi) */}
            <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsFixesOpen(!isFixesOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Sửa lỗi (Fixes)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {parsedNotes.fixes.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    isFixesOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {isFixesOpen && (
                <div className="px-5 pb-4 pt-1 border-t border-white/5">
                  {parsedNotes.fixes.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-1">Không có lỗi cần khắc phục trong mục này.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-neutral-300">
                      {parsedNotes.fixes.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span>{renderFormattedText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 3. Patches (Bản vá) */}
            <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsPatchesOpen(!isPatchesOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Bản vá (Patches)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {parsedNotes.patches.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    isPatchesOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {isPatchesOpen && (
                <div className="px-5 pb-4 pt-1 border-t border-white/5">
                  {parsedNotes.patches.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-1">Không có bản vá phụ trong mục này.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs text-neutral-300">
                      {parsedNotes.patches.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                          <span>{renderFormattedText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-4 bg-black/40">
          <div>
            {!isInstalling && !isInstalled && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Để sau
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* State: Ready to install */}
            {isReadyToInstall && (
              <button
                type="button"
                disabled={isInstalling}
                onClick={onApplyUpdate}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Cài đặt & Thay thế</span>
              </button>
            )}

            {/* State: Update available (not downloaded yet) */}
            {isUpdateAvailable && onStartDownload && (
              <button
                type="button"
                onClick={onStartDownload}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Tải về & Cài đặt</span>
              </button>
            )}

            {/* State: Downloading */}
            {isDownloading && (
              <div className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải xuống ({downloadPercent}%)...</span>
              </div>
            )}

            {/* State: Installing */}
            {isInstalling && (
              <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-800 text-neutral-400 text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Đang cài đặt...</span>
              </div>
            )}

            {/* State: Installed (Ready to restart) */}
            {isInstalled && (
              <button
                type="button"
                disabled={isRestarting}
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang khởi động lại...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Khởi động lại ngay</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
