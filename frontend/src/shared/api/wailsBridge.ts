import { AppSettings, MediaFile, ScanProgress } from '../../entities/media/types';

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          SelectFolderDialog: () => Promise<string>;
          AddFolder: (path: string) => Promise<string[]>;
          RemoveFolder: (path: string) => Promise<string[]>;
          SetActiveFolder: (path: string) => Promise<void>;
          GetSettings: () => Promise<AppSettings>;
          SaveSettings: (settings: AppSettings) => Promise<void>;
          ScanFiles: () => Promise<MediaFile[]>;
          AddYouTubeVideo: (url: string) => Promise<MediaFile>;
          GetYouTubeVideos: () => Promise<MediaFile[]>;
          RemoveYouTubeVideo: (videoId: string) => Promise<void>;
          SavePlaybackProgress: (
            fingerprint: string,
            path: string,
            position: number,
            duration: number,
            loopA: number,
            loopB: number
          ) => Promise<void>;
          ClearPlaybackProgress: (fingerprint: string) => Promise<void>;
          ClearAllPlaybackProgress: () => Promise<void>;
          GetStreamURL: (filePath: string) => Promise<string>;
          OpenFileInExplorer: (filePath: string) => Promise<void>;
        };
      };
    };
    runtime?: {
      EventsOn: (eventName: string, callback: (data: any) => void) => () => void;
      EventsOff: (eventName: string) => void;
      EventsOnce: (eventName: string, callback: (data: any) => void) => void;
    };
  }
}

export const WailsBridge = {
  isWailsAvailable(): boolean {
    return typeof window.go?.main?.App !== 'undefined';
  },

  async selectFolderDialog(): Promise<string> {
    if (window.go?.main?.App?.SelectFolderDialog) {
      return await window.go.main.App.SelectFolderDialog();
    }
    return '';
  },

  async addFolder(path: string): Promise<string[]> {
    if (window.go?.main?.App?.AddFolder) {
      return await window.go.main.App.AddFolder(path);
    }
    return [path];
  },

  async removeFolder(path: string): Promise<string[]> {
    if (window.go?.main?.App?.RemoveFolder) {
      return await window.go.main.App.RemoveFolder(path);
    }
    return [];
  },

  async setActiveFolder(path: string): Promise<void> {
    if (window.go?.main?.App?.SetActiveFolder) {
      await window.go.main.App.SetActiveFolder(path);
    }
  },

  async getSettings(): Promise<AppSettings> {
    if (window.go?.main?.App?.GetSettings) {
      return await window.go.main.App.GetSettings();
    }
    return {
      folders: [],
      activeFolder: '',
      jumpSeconds: 5,
      slowSpeed: 0.5,
      holdSlowKey: 'KeyS',
      defaultSpeed: 1.0,
      autoPlayNext: false,
      autoResume: true,
      theme: 'dark',
      volume: 0.9,
      showSubtitles: true,
      abLoopAutoRestart: true,
    };
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    if (window.go?.main?.App?.SaveSettings) {
      await window.go.main.App.SaveSettings(settings);
    }
  },

  async scanFiles(): Promise<MediaFile[]> {
    if (window.go?.main?.App?.ScanFiles) {
      return await window.go.main.App.ScanFiles();
    }
    return [];
  },

  async addYouTubeVideo(url: string): Promise<MediaFile | null> {
    if (window.go?.main?.App?.AddYouTubeVideo) {
      return await window.go.main.App.AddYouTubeVideo(url);
    }
    return null;
  },

  async getYouTubeVideos(): Promise<MediaFile[]> {
    if (window.go?.main?.App?.GetYouTubeVideos) {
      return await window.go.main.App.GetYouTubeVideos();
    }
    return [];
  },

  async removeYouTubeVideo(videoId: string): Promise<void> {
    if (window.go?.main?.App?.RemoveYouTubeVideo) {
      await window.go.main.App.RemoveYouTubeVideo(videoId);
    }
  },

  async savePlaybackProgress(
    fingerprint: string,
    path: string,
    position: number,
    duration: number,
    loopA: number = 0,
    loopB: number = 0
  ): Promise<void> {
    if (window.go?.main?.App?.SavePlaybackProgress) {
      await window.go.main.App.SavePlaybackProgress(fingerprint, path, position, duration, loopA, loopB);
    }
  },

  async clearPlaybackProgress(fingerprint: string): Promise<void> {
    if (window.go?.main?.App?.ClearPlaybackProgress) {
      await window.go.main.App.ClearPlaybackProgress(fingerprint);
    }
  },

  async clearAllPlaybackProgress(): Promise<void> {
    if (window.go?.main?.App?.ClearAllPlaybackProgress) {
      await window.go.main.App.ClearAllPlaybackProgress();
    }
  },

  async getStreamURL(filePath: string): Promise<string> {
    if (window.go?.main?.App?.GetStreamURL) {
      return await window.go.main.App.GetStreamURL(filePath);
    }
    return filePath;
  },

  async openFileInExplorer(filePath: string): Promise<void> {
    if (window.go?.main?.App?.OpenFileInExplorer) {
      await window.go.main.App.OpenFileInExplorer(filePath);
    }
  },

  onScanProgress(callback: (progress: ScanProgress) => void): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('scan:progress', callback);
    }
    return () => {};
  },
};
