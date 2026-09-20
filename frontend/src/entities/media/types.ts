export type SourceType = 'local' | 'youtube';
export type MediaType = 'audio' | 'video';

export interface YouTubeItem {
  videoId: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  addedAt: string;
}

export interface MediaFile {
  id: string;
  fingerprint: string;
  source: SourceType;
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
  thumbnail?: string;
  youtubeId?: string;

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

export type FilterCategory = 'in_progress' | 'audio' | 'youtube' | 'video' | 'completed' | 'all';
export type SortOption = 'newest' | 'oldest' | 'name' | 'duration';
