export type AssessmentType = 'independent' | 'assisted';
export type GuidedStage = 'listen' | 'dictation' | 'shadow' | 'review';
export type DiffType = 'correct' | 'substitution' | 'deletion' | 'insertion';

export interface WordDiff {
  type: DiffType;
  reference?: string;
  answer?: string;
}

export interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface DictationAttempt {
  id: string;
  sentenceId: string;
  answer: string;
  score: number;
  matchedWords: number;
  totalWords: number;
  transcriptWasVisible: boolean;
  assessmentType: AssessmentType;
  diff: WordDiff[];
  createdAt: string;
}

export interface Sentence {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  transcript: string;
  words?: WordTiming[];
  starred: boolean;
  markedDifficult: boolean;
  bestIndependentScore?: number;
  bestAssistedScore?: number;
  latestScore?: number;
  dictationAttempts?: DictationAttempt[];
  transcriptRevealed: boolean;
  shadowCompleted: boolean;
}

export interface LessonProgress {
  guidedStage: GuidedStage;
  currentSentenceId: string;
  sessionStartIndex: number;
  sessionEndIndex: number;
  completedSentenceIds: string[];
}

export interface Lesson {
  id: string;
  fingerprint: string;
  title: string;
  source: 'local' | 'youtube';
  durationMs: number;
  sentences: Sentence[];
  processedBy: string;
  progress: LessonProgress;
  createdAt: string;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  sizeMb: number;
  downloaded: boolean;
  filePath?: string;
  url: string;
  recommended: boolean;
}

export interface ModelDownloadProgress {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  status: 'downloading' | 'verifying' | 'completed' | 'error';
  errorMessage?: string;
}

export type SentenceFilterMode = 'all' | 'starred' | 'under90';

export interface TranscribeProgress {
  fingerprint?: string;
  percentage: number;
  status: string;
  latestSentence?: string;
  sentenceCount?: number;
  recentSentences?: string[];
}
