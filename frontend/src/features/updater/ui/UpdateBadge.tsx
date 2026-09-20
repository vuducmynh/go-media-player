import React from 'react';
import { RefreshCw, Sparkles, Download, CheckCircle2 } from 'lucide-react';
import { UpdateStatus } from '../model/useUpdater';
import { UpdateInfo } from '../../../shared/api/wailsBridge';

interface UpdateBadgeProps {
  currentVersion: string;
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadPercent: number;
  justCheckedUpToDate: boolean;
  onCheckUpdate: () => void;
  onStartDownload: () => void;
  onOpenInstallModal: () => void;
}

export const UpdateBadge: React.FC<UpdateBadgeProps> = ({
  currentVersion,
  status,
  updateInfo,
  downloadPercent,
  justCheckedUpToDate,
  onCheckUpdate,
  onStartDownload,
  onOpenInstallModal,
}) => {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Current Version */}
      <span className="text-[10px] text-neutral-500 font-mono tracking-tight font-medium">
        {currentVersion}
      </span>

      {/* State 1: Idle / Up to date */}
      {status === 'idle' && (
        <>
          {justCheckedUpToDate ? (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Đã mới nhất</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCheckUpdate}
              title="Kiểm tra bản cập nhật mới (GitHub)"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </>
      )}

      {/* State 2: Checking */}
      {status === 'checking' && (
        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
          <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
          <span className="text-[9px]">Đang kiểm tra...</span>
        </div>
      )}

      {/* State 3: Update available -> Nút Cập nhật */}
      {status === 'update_available' && (
        <button
          type="button"
          onClick={onStartDownload}
          title={`Có bản cập nhật mới ${updateInfo?.latestVersion || ''}. Bấm để tải về ngay!`}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-2.5 h-2.5 text-emerald-300 animate-pulse" />
          <span>Cập nhật {updateInfo?.latestVersion || ''}</span>
        </button>
      )}

      {/* State 4: Downloading -> Vòng tròn Progress kèm % */}
      {status === 'downloading' && (
        <div
          className="flex items-center gap-1.5"
          title={`Đang tải bản cập nhật: ${downloadPercent}%`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg className="w-5 h-5 -rotate-90">
              <circle
                cx="10"
                cy="10"
                r="7.5"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/15"
                fill="none"
              />
              <circle
                cx="10"
                cy="10"
                r="7.5"
                stroke="currentColor"
                strokeWidth="2"
                className="text-emerald-400 transition-all duration-200"
                fill="none"
                strokeDasharray={2 * Math.PI * 7.5}
                strokeDashoffset={2 * Math.PI * 7.5 * (1 - Math.min(downloadPercent, 100) / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[7px] font-mono font-bold text-white">
              {downloadPercent}
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400/90">{downloadPercent}%</span>
        </div>
      )}

      {/* State 5: Ready to install -> Biểu tượng Install */}
      {status === 'ready_to_install' && (
        <button
          type="button"
          onClick={onOpenInstallModal}
          title="Bản cập nhật đã tải xong! Bấm để cài đặt"
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-[10px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all animate-bounce"
        >
          <Download className="w-2.5 h-2.5 stroke-[2.5]" />
          <span>Cài đặt</span>
        </button>
      )}

      {/* State 6: Installing / Installed */}
      {(status === 'installing' || status === 'installed') && (
        <button
          type="button"
          onClick={onOpenInstallModal}
          className="text-[10px] font-bold text-purple-400 animate-pulse hover:underline"
        >
          {status === 'installing' ? 'Đang cài đặt...' : 'Khởi động lại'}
        </button>
      )}

      {/* State 7: Error */}
      {status === 'error' && (
        <button
          type="button"
          onClick={onCheckUpdate}
          title="Lỗi cập nhật. Bấm để thử lại"
          className="text-[10px] text-rose-400 hover:underline"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};
