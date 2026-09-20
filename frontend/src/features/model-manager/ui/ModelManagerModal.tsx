import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Download,
  Check,
  Sparkles,
  HardDrive,
  AlertCircle,
  Zap,
  CheckCircle2,
  Trash2,
  FolderOpen,
  Upload,
  ShieldCheck,
  Gauge,
  Layers,
  Loader2,
} from 'lucide-react';
import { ModelInfo, ModelDownloadProgress, HardwareInfo } from '../../../entities/study/types';
import { WailsBridge } from '../../../shared/api/wailsBridge';

// Module-level cache so reopening modal is instantaneous (0ms)
let cachedModels: ModelInfo[] | null = null;
let cachedHardware: HardwareInfo | null = null;

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
  const [models, setModels] = useState<ModelInfo[]>(cachedModels || []);
  const [activeDownload, setActiveDownload] = useState<ModelDownloadProgress | null>(null);
  const [activeGPUDownload, setActiveGPUDownload] = useState<ModelDownloadProgress | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('large-v3-turbo-q5_0');
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(cachedHardware || null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedModels || cachedModels.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadModelsAndHardware = async (showLoading = false) => {
    if (showLoading || !cachedModels) {
      setIsLoading(true);
    }
    try {
      const [list, hw] = await Promise.all([
        WailsBridge.getInstalledModels(),
        WailsBridge.getHardwareInfo(),
      ]);
      cachedModels = list;
      cachedHardware = hw;
      setModels(list);
      setHardwareInfo(hw);

      // Check user's preferred model from localStorage
      const savedPreferred = localStorage.getItem('preferred_whisper_model');
      if (savedPreferred && list.some((m: ModelInfo) => m.id === savedPreferred)) {
        setSelectedModelId(savedPreferred);
      } else {
        const downloaded = list.find((m: ModelInfo) => m.downloaded);
        if (downloaded) {
          setSelectedModelId(downloaded.id);
        } else {
          const rec = list.find((m: ModelInfo) => m.recommended);
          if (rec) setSelectedModelId(rec.id);
        }
      }
    } catch (e) {
      console.error('Failed to load models or hardware info:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      loadModelsAndHardware(!cachedModels || cachedModels.length === 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const unbindModel = WailsBridge.onModelDownloadProgress((p) => {
      setActiveDownload(p);
      if (p.status === 'completed') {
        loadModelsAndHardware();
        setActiveDownload(null);
        setSuccessMsg(`Tải mô hình ${p.modelId} thành công!`);
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
        setSuccessMsg('Kích hoạt gói tăng tốc phần cứng thành công!');
      } else if (p.status === 'error') {
        setError(p.errorMessage || 'Lỗi khi kích hoạt gói tăng tốc phần cứng');
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
    setSuccessMsg(null);
    try {
      await WailsBridge.downloadModel(modelId);
    } catch (err: any) {
      setError(err?.message || 'Không thể bắt đầu tải model');
    }
  };

  const handleDownloadAcceleration = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      await WailsBridge.downloadGPUAcceleration();
    } catch (err: any) {
      setError(err?.message || 'Không thể bắt đầu tải gói tăng tốc');
    }
  };

  const handleDeleteModel = async (e: React.MouseEvent, modelId: string, modelName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa mô hình "${modelName}" để giải phóng dung lượng ổ cứng?`)) {
      return;
    }
    try {
      await WailsBridge.deleteModel(modelId);
      await loadModelsAndHardware();
      setSuccessMsg(`Đã xóa mô hình ${modelName} thành công.`);
    } catch (err: any) {
      setError(err?.message || 'Không thể xóa mô hình');
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('preferred_whisper_model', modelId);
  };

  const handleImportLocalModel = async () => {
    try {
      const selectedPath = await WailsBridge.selectModelFile();
      if (!selectedPath) return;

      const imported = await WailsBridge.importLocalModel(selectedPath);
      await loadModelsAndHardware();
      if (imported) {
        setSelectedModelId(imported.id);
        setSuccessMsg(`Đã nạp thành công mô hình: ${imported.name}`);
      }
    } catch (err: any) {
      setError('Không thể nạp mô hình từ tệp đã chọn: ' + err?.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const path = await WailsBridge.exportBackupData();
      if (path) {
        setSuccessMsg(`Đã sao lưu thành công bài học ra: ${path}`);
      }
    } catch (err: any) {
      setError('Lỗi khi sao lưu dữ liệu: ' + err?.message);
    }
  };

  const handleImportBackup = async () => {
    try {
      const count = await WailsBridge.importBackupData();
      if (count > 0) {
        setSuccessMsg(`Đã khôi phục thành công ${count} bài học sang máy này!`);
        await loadModelsAndHardware();
      }
    } catch (err: any) {
      setError('Lỗi khi khôi phục bài học: ' + err?.message);
    }
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

  const isNvidia = hardwareInfo?.gpuVendor === 'nvidia';
  const isAMD = hardwareInfo?.gpuVendor === 'amd';
  const isIntel = hardwareInfo?.gpuVendor === 'intel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-fluent-bg-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                100% Offline & Bảo Mật • Tối ưu đa nền tảng NVIDIA / AMD / Intel CPU
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-fluent-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {isLoading && models.length === 0 ? (
            <div className="space-y-4 animate-fade-in">
              {/* Informative loading banner */}
              <div className="p-3.5 rounded-xl bg-fluent-accent/10 border border-fluent-accent/30 flex items-center gap-3 text-fluent-accent">
                <Loader2 className="w-5 h-5 animate-spin shrink-0 text-fluent-accent" />
                <div className="text-xs">
                  <p className="font-semibold text-white">Đang phân tích cấu hình phần cứng & mô hình AI Whisper...</p>
                  <p className="text-[11px] text-fluent-text-muted mt-0.5">
                    Hệ thống đang kiểm tra GPU (CUDA), tối ưu đa luồng CPU và các tệp mô hình đã cài đặt.
                  </p>
                </div>
              </div>

              {/* Skeleton Hardware Card */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-1/3" />
                  <div className="h-2.5 bg-white/5 rounded w-2/3" />
                </div>
                <div className="h-6 bg-white/10 rounded-full w-24 shrink-0" />
              </div>

              {/* Skeleton Model Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-fluent-text-secondary px-1">
                  <span className="font-semibold text-white">Danh Sách Mô Hình AI Khuyên Dùng:</span>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 animate-pulse flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 bg-white/10 rounded w-36" />
                          <div className="h-3 bg-white/5 rounded-full w-20" />
                        </div>
                        <div className="h-2.5 bg-white/5 rounded w-4/5" />
                        <div className="h-2 bg-white/5 rounded w-1/2" />
                      </div>
                      <div className="h-4 bg-white/10 rounded w-14" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Universal Hardware Detection Banner */}
              {hardwareInfo && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${
                    hardwareInfo.accelerationEnabled
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-indigo-950/30 border-indigo-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        hardwareInfo.accelerationEnabled
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {hardwareInfo.gpuName || 'Đồ họa hệ thống'}
                        </span>
                        <span className="text-[10px] text-fluent-text-muted font-mono">
                          ({hardwareInfo.vramGb ? `${hardwareInfo.vramGb}GB VRAM` : hardwareInfo.vramMb > 0 ? `${Math.round(hardwareInfo.vramMb / 1024)}GB VRAM` : 'iGPU'}
                          {hardwareInfo.cpuThreads ? ` • ${hardwareInfo.cpuThreads} luồng CPU` : ''}
                          {hardwareInfo.ramGb ? ` • ${hardwareInfo.ramGb}GB RAM` : ''})
                        </span>
                        {hardwareInfo.accelerationEnabled ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {hardwareInfo.accelerationType === 'cuda'
                              ? 'CUDA GPU Đã Sẵn Sàng'
                              : 'OpenBLAS Đa Nhân Đã Kích Hoạt'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                            Chạy CPU Thuần
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-fluent-text-muted mt-1 truncate">
                        {hardwareInfo.accelerationEnabled
                          ? isNvidia
                            ? `Toàn bộ mô hình được xử lý bằng nhân CUDA trên card ${hardwareInfo.gpuName} (${hardwareInfo.vramGb || 6}GB VRAM) với Flash Attention.`
                            : 'Các phép tính ma trận được tối ưu đa luồng bằng OpenBLAS trên các nhân CPU / iGPU.'
                          : isNvidia
                          ? `Phát hiện card đồ họa ${hardwareInfo.gpuName} (${hardwareInfo.vramGb || 6}GB VRAM). Kích hoạt CUDA để tăng tốc độ nhận diện gấp 10x-20x.`
                          : isAMD || isIntel
                          ? 'Phát hiện phần cứng AMD/Intel. Kích hoạt OpenBLAS để tối ưu hóa hiệu suất đa nhân.'
                          : 'Kích hoạt gói tăng tốc để tối ưu hóa hiệu suất máy tính của bạn.'}
                      </p>
                    </div>
                  </div>

                  {!hardwareInfo.accelerationEnabled && (
                    <button
                      onClick={handleDownloadAcceleration}
                      disabled={activeGPUDownload !== null}
                      className="shrink-0 px-3.5 py-1.5 rounded-lg bg-fluent-accent text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {activeGPUDownload
                          ? 'Đang tải...'
                          : isNvidia
                          ? 'Bật CUDA GPU'
                          : 'Bật Tăng Tốc BLAS'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Acceleration Download Progress Bar */}
              {activeGPUDownload && (
                <div className="p-3 rounded-xl bg-black/40 border border-fluent-accent/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fluent-accent font-semibold flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 animate-bounce" /> Đang cài đặt gói tăng tốc:{' '}
                      {Math.round(activeGPUDownload.percentage)}%
                    </span>
                    <span className="text-fluent-text-muted font-mono text-[10px]">
                      {(activeGPUDownload.downloadedBytes / (1024 * 1024)).toFixed(0)} /{' '}
                      {(activeGPUDownload.totalBytes / (1024 * 1024)).toFixed(0)} MB
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fluent-accent transition-[width] duration-150"
                      style={{ width: `${activeGPUDownload.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Model Cards List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-fluent-text-secondary px-1">
                  <span className="font-semibold text-white">Danh Sách Mô Hình AI Khuyên Dùng:</span>
                  <button
                    onClick={handleImportLocalModel}
                    className="text-[11px] text-fluent-accent hover:underline flex items-center gap-1 cursor-pointer"
                    title="Nếu bạn đã có sẵn file ggml-*.bin trên máy hoặc ổ cứng khác, bấm vào đây để nạp trực tiếp"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Nạp file model (.bin) từ máy
                  </button>
                </div>

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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{mod.name}</span>

                            {mod.hardwareMatch === 'perfect' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Đề Xuất Cho Máy Bạn
                              </span>
                            )}

                            {mod.downloaded && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Đã Tải Sẵn
                              </span>
                            )}

                            {mod.hardwareMatch === 'heavy' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/30">
                                Mô hình rất nặng
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-fluent-text-muted mt-1 leading-normal">
                            {mod.description}
                          </p>

                          {/* Official Specs Badges */}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-fluent-text-secondary font-mono flex-wrap">
                            {mod.params && (
                              <span className="flex items-center gap-1 text-fluent-text-muted">
                                <Layers className="w-3 h-3 text-fluent-accent" /> {mod.params} tham số
                              </span>
                            )}
                            {mod.relativeSpeed && (
                              <span className="flex items-center gap-1 text-fluent-text-muted">
                                <Gauge className="w-3 h-3 text-emerald-400" /> Tốc độ {mod.relativeSpeed}
                              </span>
                            )}
                            {mod.requiredVramMb && mod.requiredVramMb > 0 && (
                              <span className="flex items-center gap-1 text-fluent-text-muted">
                                <Zap className="w-3 h-3 text-yellow-400" /> VRAM &gt;{' '}
                                {(mod.requiredVramMb / 1024).toFixed(1)}GB
                              </span>
                            )}
                            {mod.accuracyLevel && (
                              <span className="flex items-center gap-1 text-fluent-text-muted">
                                <ShieldCheck className="w-3 h-3 text-blue-400" /> Độ chuẩn:{' '}
                                {mod.accuracyLevel}
                              </span>
                            )}
                          </div>

                          {mod.hardwareTip && (
                            <p className="text-[10px] text-fluent-accent/90 mt-1 italic">
                              💡 {mod.hardwareTip}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className="text-xs font-mono font-semibold text-fluent-text-secondary">
                            ~{mod.sizeMb} MB
                          </span>

                          {isSelected && (
                            <span className="text-[10px] text-fluent-accent font-bold">
                              ✓ Đang chọn
                            </span>
                          )}

                          {mod.downloaded && (
                            <button
                              onClick={(e) => handleDeleteModel(e, mod.id, mod.name)}
                              title="Xóa mô hình này để giải phóng ổ cứng"
                              className="mt-1 p-1 rounded-lg text-fluent-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
            </>
          )}

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions & Migration Bar */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-fluent-bg-subtle/80 flex-wrap gap-3">
          <div className="flex items-center gap-3 text-[11px] text-fluent-text-muted">
            <div className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-fluent-accent" />
              <span>{hardwareInfo?.isPortable ? 'Chế độ: Portable' : 'Chế độ: Hệ thống'}</span>
            </div>

            <span className="text-white/20">•</span>

            <button
              onClick={handleExportBackup}
              className="text-fluent-text-secondary hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
              title="Sao lưu tất cả bài học, câu đánh dấu sao và điểm dictation ra tệp ZIP"
            >
              <Upload className="w-3 h-3" /> Sao lưu dữ liệu
            </button>

            <span className="text-white/20">•</span>

            <button
              onClick={handleImportBackup}
              className="text-fluent-text-secondary hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
              title="Nạp dữ liệu bài học từ máy khác sang máy này"
            >
              <FolderOpen className="w-3 h-3" /> Khôi phục dữ liệu
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {(() => {
              if (isLoading && models.length === 0) {
                return (
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-fluent-accent/40 text-black/60 font-semibold text-xs transition-all cursor-not-allowed"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra...
                  </button>
                );
              }

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
                    <>Đang xử lý tải...</>
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
