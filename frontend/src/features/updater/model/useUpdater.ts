import { useState, useEffect, useCallback, useRef } from 'react';
import { WailsBridge, UpdateInfo, UpdateDownloadProgress } from '../../../shared/api/wailsBridge';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'update_available'
  | 'downloading'
  | 'ready_to_install'
  | 'installing'
  | 'installed'
  | 'error';

export function useUpdater() {
  const [currentVersion, setCurrentVersion] = useState<string>('v1.0.0');
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [justCheckedUpToDate, setJustCheckedUpToDate] = useState<boolean>(false);

  const initialCheckDone = useRef<boolean>(false);

  // Load current version on mount
  useEffect(() => {
    WailsBridge.getAppVersion().then((ver) => {
      if (ver) setCurrentVersion(ver);
    });
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async (silent = false) => {
    try {
      setStatus('checking');
      setErrorMessage(null);
      setJustCheckedUpToDate(false);

      const info = await WailsBridge.checkUpdate();
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
        setStatus('update_available');
      } else {
        setStatus('idle');
        if (!silent) {
          setJustCheckedUpToDate(true);
          setTimeout(() => setJustCheckedUpToDate(false), 3000);
        }
      }
    } catch (err: any) {
      console.warn('Update check failed:', err);
      setStatus('idle');
      if (!silent) {
        setErrorMessage(err?.message || 'Không thể kiểm tra bản cập nhật');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  }, []);

  // Perform automatic update check ONCE on startup
  useEffect(() => {
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      // Delay slightly on startup to let app finish initial render
      const timer = setTimeout(() => {
        checkForUpdates(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  // Listen to download progress events from Wails
  useEffect(() => {
    const unsubscribe = WailsBridge.onUpdateDownloadProgress((p: UpdateDownloadProgress) => {
      setDownloadPercent(p.percent);
      if (p.percent >= 100) {
        setStatus('ready_to_install');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Start downloading the update
  const startDownload = useCallback(async () => {
    if (!updateInfo?.assetUrl) {
      setErrorMessage('Không tìm thấy link tải bản cập nhật');
      return;
    }

    try {
      setStatus('downloading');
      setDownloadPercent(0);
      setErrorMessage(null);
      await WailsBridge.downloadUpdate(updateInfo.assetUrl);
    } catch (err: any) {
      console.error('Download update failed:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Tải bản cập nhật thất bại');
    }
  }, [updateInfo]);

  // Open install modal (freezes app)
  const openInstallModal = useCallback(() => {
    setIsInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    // Only allow closing if not in the middle of installing
    if (status !== 'installing') {
      setIsInstallModalOpen(false);
    }
  }, [status]);

  // Apply update and replace executable
  const applyUpdate = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('installing');
      setErrorMessage(null);
      const success = await WailsBridge.applyUpdate();
      if (success) {
        setStatus('installed');
        return true;
      }
      setStatus('ready_to_install');
      setErrorMessage('Thay thế file exe thất bại');
      return false;
    } catch (err: any) {
      console.error('Apply update failed:', err);
      setStatus('ready_to_install');
      setErrorMessage(err?.message || 'Cài đặt bản cập nhật thất bại');
      return false;
    }
  }, []);

  // Restart app to run the new executable
  const restartApp = useCallback(async () => {
    try {
      await WailsBridge.restartApp();
    } catch (err) {
      console.error('Restart failed:', err);
    }
  }, []);

  return {
    currentVersion,
    status,
    updateInfo,
    downloadPercent,
    errorMessage,
    isInstallModalOpen,
    justCheckedUpToDate,
    checkForUpdates,
    startDownload,
    openInstallModal,
    closeInstallModal,
    applyUpdate,
    restartApp,
  };
}
