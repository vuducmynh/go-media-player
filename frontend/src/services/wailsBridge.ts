import { AppSettings, MediaFile, ScanProgress } from '../types';

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          SelectFolderDialog: () => Promise<string>;
          AddFolder: (path: string) => Promise<string[]>;
          RemoveFolder: (path: string) => Promise<string[]>;
          GetSettings: () => Promise<AppSettings>;
          SaveSettings: (settings: AppSettings) => Promise<void>;
          ScanFiles: () => Promise<MediaFile[]>;
          SavePlaybackProgress: (
            fingerprint: string,
            path: string,
            position: number,
            duration: number,
            loopA: number,
            loopB: number
          ) => Promise<void>;
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

  async getSettings(): Promise<AppSettings> {
    if (window.go?.main?.App?.GetSettings) {
      return await window.go.main.App.GetSettings();
    }
    return {
      folders: [],
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
