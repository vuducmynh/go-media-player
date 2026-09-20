import { AppSettings, MediaFile, ScanProgress } from '../../entities/media/types';
import {
  Lesson,
  ModelInfo,
  ModelDownloadProgress,
  DictationAttempt,
  TranscribeProgress,
  GPUInfo,
} from '../../entities/study/types';

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

          // Study & Whisper Methods
          GetLesson: (fingerprint: string) => Promise<Lesson | null>;
          GetInstalledModels: () => Promise<ModelInfo[]>;
          DownloadModel: (modelId: string) => Promise<void>;
          ProcessLesson: (
            fingerprint: string,
            title: string,
            mediaPath: string,
            modelId: string
          ) => Promise<Lesson | null>;
          ProcessYouTubeLesson: (
            fingerprint: string,
            title: string,
            videoId: string,
            modelId: string
          ) => Promise<Lesson | null>;
          SaveDictationAttempt: (
            fingerprint: string,
            sentenceId: string,
            attempt: DictationAttempt
          ) => Promise<Lesson | null>;
          ToggleSentenceStar: (
            fingerprint: string,
            sentenceId: string
          ) => Promise<Lesson | null>;
          MarkSentenceDifficult: (
            fingerprint: string,
            currentTimestampMs: number
          ) => Promise<Lesson | null>;
          UpdateSentenceVisibility: (
            fingerprint: string,
            sentenceId: string,
            revealed: boolean
          ) => Promise<Lesson | null>;
          CancelLessonProcessing: (fingerprint: string) => Promise<boolean>;
          GetGPUInfo: () => Promise<GPUInfo>;
          DownloadGPUAcceleration: () => Promise<void>;
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

  // --- Study & Whisper Methods ---
  async getLesson(fingerprint: string): Promise<Lesson | null> {
    if (window.go?.main?.App?.GetLesson) {
      return await window.go.main.App.GetLesson(fingerprint);
    }
    return null;
  },

  async getInstalledModels(): Promise<ModelInfo[]> {
    if (window.go?.main?.App?.GetInstalledModels) {
      return await window.go.main.App.GetInstalledModels();
    }
    return [];
  },

  async downloadModel(modelId: string): Promise<void> {
    if (window.go?.main?.App?.DownloadModel) {
      await window.go.main.App.DownloadModel(modelId);
    }
  },

  async processLesson(
    fingerprint: string,
    title: string,
    mediaPath: string,
    modelId: string
  ): Promise<Lesson | null> {
    if (window.go?.main?.App?.ProcessLesson) {
      return await window.go.main.App.ProcessLesson(fingerprint, title, mediaPath, modelId);
    }
    return null;
  },

  async processYouTubeLesson(
    fingerprint: string,
    title: string,
    videoId: string,
    modelId: string
  ): Promise<Lesson | null> {
    if (window.go?.main?.App?.ProcessYouTubeLesson) {
      return await window.go.main.App.ProcessYouTubeLesson(fingerprint, title, videoId, modelId);
    }
    return null;
  },

  async saveDictationAttempt(
    fingerprint: string,
    sentenceId: string,
    attempt: DictationAttempt
  ): Promise<Lesson | null> {
    if (window.go?.main?.App?.SaveDictationAttempt) {
      return await window.go.main.App.SaveDictationAttempt(fingerprint, sentenceId, attempt);
    }
    return null;
  },

  async toggleSentenceStar(fingerprint: string, sentenceId: string): Promise<Lesson | null> {
    if (window.go?.main?.App?.ToggleSentenceStar) {
      return await window.go.main.App.ToggleSentenceStar(fingerprint, sentenceId);
    }
    return null;
  },

  async markSentenceDifficult(
    fingerprint: string,
    currentTimestampMs: number
  ): Promise<Lesson | null> {
    if (window.go?.main?.App?.MarkSentenceDifficult) {
      return await window.go.main.App.MarkSentenceDifficult(fingerprint, currentTimestampMs);
    }
    return null;
  },

  async updateSentenceVisibility(
    fingerprint: string,
    sentenceId: string,
    revealed: boolean
  ): Promise<Lesson | null> {
    if (window.go?.main?.App?.UpdateSentenceVisibility) {
      return await window.go.main.App.UpdateSentenceVisibility(fingerprint, sentenceId, revealed);
    }
    return null;
  },

  async cancelLessonProcessing(fingerprint: string): Promise<boolean> {
    if (window.go?.main?.App?.CancelLessonProcessing) {
      return await window.go.main.App.CancelLessonProcessing(fingerprint);
    }
    return false;
  },

  async getGPUInfo(): Promise<GPUInfo> {
    if (window.go?.main?.App?.GetGPUInfo) {
      return await window.go.main.App.GetGPUInfo();
    }
    return { hasNvidiaGpu: false, gpuName: '', gpuEnabled: false };
  },

  async downloadGPUAcceleration(): Promise<void> {
    if (window.go?.main?.App?.DownloadGPUAcceleration) {
      await window.go.main.App.DownloadGPUAcceleration();
    }
  },

  // Event Listeners
  onGPUDownloadProgress(callback: (progress: ModelDownloadProgress) => void): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('gpu:download:progress', callback);
    }
    return () => {};
  },

  onScanProgress(callback: (progress: ScanProgress) => void): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('scan:progress', callback);
    }
    return () => {};
  },

  onModelDownloadProgress(callback: (progress: ModelDownloadProgress) => void): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('model:download:progress', callback);
    }
    return () => {};
  },

  onLessonTranscribeProgress(
    callback: (data: { fingerprint: string; percentage: number }) => void
  ): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('lesson:transcribe:progress', callback);
    }
    return () => {};
  },

  onStudyProcessingProgress(
    callback: (data: TranscribeProgress) => void
  ): () => void {
    if (window.runtime?.EventsOn) {
      return window.runtime.EventsOn('lesson:transcribe:progress', (data: any) => {
        callback({
          fingerprint: data.fingerprint,
          percentage: typeof data.percentage === 'number' ? data.percentage : 0,
          status: data.status || `Đang xử lý (${data.percentage}%)...`,
          latestSentence: data.latestSentence || '',
          sentenceCount: data.sentenceCount || 0,
          recentSentences: data.recentSentences || [],
        });
      });
    }
    return () => {};
  },
};
