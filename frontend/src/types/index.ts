export type MediaType = 'audio' | 'video';

export interface MediaFile {
  id: string;
  fingerprint: string;
  path: string;
  name: string;
  title: string;
  ext: string;
  type: MediaType;
  size: number;
  modTime: string;
  folderRoot: string;
  relativeDir: string;
  duration: number;
  streamUrl: string;

  // Playback state
  lastPosition: number;
  totalPlayed: number;
  completed: boolean;
  lastPlayedAt?: string;
  loopA?: number;
  loopB?: number;
}

export interface PlaybackState {
  fingerprint: string;
  lastPath: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  lastPlayedAt: string;
  loopA?: number;
  loopB?: number;
}

export interface AppSettings {
  folders: string[];
  activeFolder: string;
  jumpSeconds: number;
  slowSpeed: number;
  holdSlowKey: string;
  defaultSpeed: number;
  autoPlayNext: boolean;
  autoResume: boolean;
  theme: string;
  volume: number;
  showSubtitles: boolean;
  abLoopAutoRestart: boolean;
}

export interface ScanProgress {
  totalFolders: number;
  scannedFiles: number;
  foundMedia: number;
  currentPath: string;
  isScanning: boolean;
}

export type FilterCategory = 'all' | 'audio' | 'video' | 'in_progress' | 'completed';

export interface HotkeyConfig {
  action: string;
  keyLabel: string;
  description: string;
  category: 'playback' | 'listening' | 'navigation';
}
