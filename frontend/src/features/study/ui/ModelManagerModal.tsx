import React, { useState, useEffect } from 'react';
import { X, Cpu, Download, Check, Sparkles, HardDrive, AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
import { ModelInfo, ModelDownloadProgress, GPUInfo } from '../../../entities/study/types';
import { WailsBridge } from '../../../shared/api/wailsBridge';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModelAndStart: (modelId: string) => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectModelAndStart,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeDownload, setActiveDownload] = useState<ModelDownloadProgress | null>(null);
  const [activeGPUDownload, setActiveGPUDownload] = useState<ModelDownloadProgress | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('large-v3-turbo-q5_0');
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModelsAndHardware = async () => {
    try {
      const [list, gpu] = await Promise.all([
        WailsBridge.getInstalledModels(),
        WailsBridge.getGPUInfo(),
      ]);
      setModels(list);
      setGpuInfo(gpu);

      // Check user's preferred model from localStorage
      const savedPreferred = localStorage.getItem('preferred_whisper_model');
      if (savedPreferred && list.some((m) => m.id === savedPreferred && m.downloaded)) {
        setSelectedModelId(savedPreferred);
      } else {
        const downloaded = list.find((m) => m.downloaded);
        if (downloaded) {
          setSelectedModelId(downloaded.id);
        }
      }
    } catch (e) {
      console.error('Failed to load models or GPU info:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadModelsAndHardware();
    }
  }, [isOpen]);

  useEffect(() => {
    const unbindModel = WailsBridge.onModelDownloadProgress((p) => {
      setActiveDownload(p);
      if (p.status === 'completed') {
        loadModelsAndHardware();
        setActiveDownload(null);
      } else if (p.status === 'error') {
        setError(p.errorMessage || 'Lỗi trong quá trình tải model');
        setActiveDownload(null);
      }
    });

    const unbindGPU = WailsBridge.onGPUDownloadProgress((p) => {
      setActiveGPUDownload(p);
      if (p.status === 'completed') {
        loadModelsAndHardware();
        setActiveGPUDownload(null);
      } else if (p.status === 'error') {
        setError(p.errorMessage || 'Lỗi khi kích hoạt gói GPU CUDA');
        setActiveGPUDownload(null);
      }
    });

    return () => {
      unbindModel();
      unbindGPU();
    };
  }, []);

  if (!isOpen) return null;

  const handleDownload = async (modelId: string) => {
    setError(null);
    try {
      await WailsBridge.downloadModel(modelId);
    } catch (err: any) {
      setError(err?.message || 'Không thể bắt đầu tải model');
    }
  };

  const handleDownloadGPU = async () => {
    setError(null);
    try {
      await WailsBridge.downloadGPUAcceleration();
    } catch (err: any) {
      setError(err?.message || 'Không thể bắt đầu tải gói GPU CUDA');
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('preferred_whisper_model', modelId);
  };

  const handleStart = () => {
    localStorage.setItem('preferred_whisper_model', selectedModelId);
    const chosen = models.find((m) => m.id === selectedModelId);
    if (!chosen?.downloaded) {
      handleDownload(selectedModelId);
      return;
    }
    onSelectModelAndStart(selectedModelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-fluent-bg-subtle/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-fluent-accent/20 border border-fluent-accent/40 flex items-center justify-center text-fluent-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Quản Lý Mô Hình & Hiệu Suất AI Whisper
              </h2>
              <p className="text-[10px] text-fluent-text-muted">
                100% Offline & Riêng Tư • Đa luồng CPU song song & Tăng tốc GPU
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

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Hardware & GPU Acceleration Status Banner */}
          {gpuInfo?.hasNvidiaGpu && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-200">
                      {gpuInfo.gpuName}
                    </span>
                    {gpuInfo.gpuEnabled ? (
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> CUDA Đã Kích Hoạt
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-300/80">
                        (Có thể tăng tốc GPU)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-300/70 truncate">
                    {gpuInfo.gpuEnabled
                      ? 'AI Whisper sẽ sử dụng nhân CUDA trên card đồ họa để nhận diện siêu tốc.'
                      : 'Kích hoạt gói CUDA để AI tận dụng card đồ họa, nhanh hơn 10x-20x so với CPU.'}
                  </p>
                </div>
              </div>

              {!gpuInfo.gpuEnabled && (
                <button
                  onClick={handleDownloadGPU}
                  disabled={activeGPUDownload !== null}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{activeGPUDownload ? 'Đang tải...' : 'Bật CUDA GPU'}</span>
                </button>
              )}
            </div>
          )}

          {/* GPU Download Progress Bar */}
          {activeGPUDownload && (
            <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 animate-bounce" /> Đang tải gói CUDA runtime: {Math.round(activeGPUDownload.percentage)}%
                </span>
                <span className="text-fluent-text-muted font-mono text-[10px]">
                  {(activeGPUDownload.downloadedBytes / (1024 * 1024)).toFixed(0)} / {(activeGPUDownload.totalBytes / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-150"
                  style={{ width: `${activeGPUDownload.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Model Cards */}
          <div className="space-y-2.5">
            {models.map((mod) => {
              const isSelected = selectedModelId === mod.id;
              const isDownloading = activeDownload?.modelId === mod.id;

              return (
                <div
                  key={mod.id}
                  onClick={() => handleSelectModel(mod.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-fluent-accent/15 border-fluent-accent shadow-accent-glow'
                      : 'bg-fluent-bg-card border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{mod.name}</span>
                        {mod.recommended && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Khuyên Dùng Cho IELTS
                          </span>
                        )}
                        {mod.downloaded && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Sẵn Sàng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-fluent-text-muted mt-1 leading-normal">
                        {mod.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs font-mono font-semibold text-fluent-text-secondary">
                        ~{mod.sizeMb} MB
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-fluent-accent font-bold mt-1">
                          ✓ Đang chọn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Download Progress Bar if currently downloading this model */}
                  {isDownloading && activeDownload && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-fluent-accent font-medium flex items-center gap-1">
                          <Download className="w-3 h-3 animate-bounce" /> Đang tải:{' '}
                          {Math.round(activeDownload.percentage)}%
                        </span>
                        <span className="text-fluent-text-muted font-mono text-[10px]">
                          {Math.round(activeDownload.downloadedBytes / (1024 * 1024))} /{' '}
                          {Math.round(activeDownload.totalBytes / (1024 * 1024))} MB (
                          {(activeDownload.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fluent-accent transition-[width] duration-150"
                          style={{ width: `${activeDownload.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-fluent-bg-subtle/60">
          <div className="flex items-center gap-1.5 text-[11px] text-fluent-text-muted">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Lưu tại %APPDATA%/GoAudioPlay/models/</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
            >
              Đóng
            </button>

            {(() => {
              const selectedMod = models.find((m) => m.id === selectedModelId);
              const isSelectedDownloaded = selectedMod?.downloaded;
              const isDownloading = activeDownload !== null || activeGPUDownload !== null;

              return (
                <button
                  onClick={handleStart}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-fluent-accent hover:bg-fluent-accent-hover active:bg-fluent-accent-active text-black font-semibold text-xs shadow-accent-glow transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isDownloading ? (
                    <>Đang tải dữ liệu...</>
                  ) : isSelectedDownloaded ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-current" /> Bắt đầu với model này
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Tải model & Bắt đầu
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
