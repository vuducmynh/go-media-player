import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';
import { UpdateStatus } from '../model/useUpdater';
import { UpdateInfo } from '../../../shared/api/wailsBridge';

interface InstallUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  status: UpdateStatus;
  errorMessage: string | null;
  onApplyUpdate: () => Promise<boolean>;
  onRestartApp: () => Promise<void>;
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
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  if (!isOpen) return null;

  const isInstalling = status === 'installing';
  const isInstalled = status === 'installed';

  const handleRestart = async () => {
    setIsRestarting(true);
    await onRestartApp();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#16181d] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cập nhật ứng dụng</h3>
              <p className="text-xs text-neutral-400">
                Phiên bản {currentVersion} →{' '}
                <span className="text-emerald-400 font-semibold font-mono">
                  {updateInfo?.latestVersion || 'Mới nhất'}
                </span>
              </p>
            </div>
          </div>

          {!isInstalling && !isInstalled && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Progress Checklist */}
          <div className="space-y-2.5 bg-black/40 p-4 rounded-2xl border border-white/5 text-xs">
            {/* Step 1: Download */}
            <div className="flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tải về file cài đặt mới</span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px]">100%</span>
            </div>

            {/* Step 2: Backup old version */}
            <div className="flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-2">
                {isInstalled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isInstalling ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-neutral-600 shrink-0" />
                )}
                <span>Sao lưu an toàn phiên bản cũ (.old)</span>
              </div>
              <span className="text-neutral-500 text-[11px]">
                {isInstalled ? 'Đã sao lưu' : isInstalling ? 'Đang thực hiện' : 'Chờ'}
              </span>
            </div>

            {/* Step 3: Replace executable */}
            <div className="flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-2">
                {isInstalled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isInstalling ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-neutral-600 shrink-0" />
                )}
                <span>Thay thế file thực thi go-audio-player.exe</span>
              </div>
              <span className="text-neutral-500 text-[11px]">
                {isInstalled ? 'Hoàn tất' : isInstalling ? 'Đang thay thế' : 'Chờ'}
              </span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Release Notes Collapsible */}
          {updateInfo?.releaseNotes && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Thông tin bản cập nhật</span>
                </span>
                {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showNotes && (
                <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-black/50 border border-white/5 text-[11px] text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {updateInfo.releaseNotes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-2 border-t border-white/10 flex items-center justify-end gap-3">
          {!isInstalled ? (
            <>
              {!isInstalling && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors"
                >
                  Để sau
                </button>
              )}
              <button
                type="button"
                disabled={isInstalling}
                onClick={onApplyUpdate}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cài đặt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Cài đặt & Thay thế</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isRestarting}
              onClick={handleRestart}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all"
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
  );
};
