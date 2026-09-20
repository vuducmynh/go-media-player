export namespace library {
	
	export class AppSettings {
	    folders: string[];
	    activeFolder: string;
	    youtubeVideos: media.YouTubeItem[];
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
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folders = source["folders"];
	        this.activeFolder = source["activeFolder"];
	        this.youtubeVideos = this.convertValues(source["youtubeVideos"], media.YouTubeItem);
	        this.jumpSeconds = source["jumpSeconds"];
	        this.slowSpeed = source["slowSpeed"];
	        this.holdSlowKey = source["holdSlowKey"];
	        this.defaultSpeed = source["defaultSpeed"];
	        this.autoPlayNext = source["autoPlayNext"];
	        this.autoResume = source["autoResume"];
	        this.theme = source["theme"];
	        this.volume = source["volume"];
	        this.showSubtitles = source["showSubtitles"];
	        this.abLoopAutoRestart = source["abLoopAutoRestart"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace media {
	
	export class MediaItem {
	    id: string;
	    fingerprint: string;
	    source: string;
	    path: string;
	    name: string;
	    title: string;
	    ext: string;
	    type: string;
	    size: number;
	    // Go type: time
	    modTime: any;
	    folderRoot: string;
	    relativeDir: string;
	    duration: number;
	    streamUrl: string;
	    thumbnail: string;
	    youtubeId: string;
	    lastPosition: number;
	    totalPlayed: number;
	    completed: boolean;
	    // Go type: time
	    lastPlayedAt: any;
	    loopA: number;
	    loopB: number;
	
	    static createFrom(source: any = {}) {
	        return new MediaItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fingerprint = source["fingerprint"];
	        this.source = source["source"];
	        this.path = source["path"];
	        this.name = source["name"];
	        this.title = source["title"];
	        this.ext = source["ext"];
	        this.type = source["type"];
	        this.size = source["size"];
	        this.modTime = this.convertValues(source["modTime"], null);
	        this.folderRoot = source["folderRoot"];
	        this.relativeDir = source["relativeDir"];
	        this.duration = source["duration"];
	        this.streamUrl = source["streamUrl"];
	        this.thumbnail = source["thumbnail"];
	        this.youtubeId = source["youtubeId"];
	        this.lastPosition = source["lastPosition"];
	        this.totalPlayed = source["totalPlayed"];
	        this.completed = source["completed"];
	        this.lastPlayedAt = this.convertValues(source["lastPlayedAt"], null);
	        this.loopA = source["loopA"];
	        this.loopB = source["loopB"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class YouTubeItem {
	    videoId: string;
	    url: string;
	    title: string;
	    author: string;
	    thumbnail: string;
	    duration: number;
	    // Go type: time
	    addedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new YouTubeItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.videoId = source["videoId"];
	        this.url = source["url"];
	        this.title = source["title"];
	        this.author = source["author"];
	        this.thumbnail = source["thumbnail"];
	        this.duration = source["duration"];
	        this.addedAt = this.convertValues(source["addedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace study {
	
	export class WordDiff {
	    type: string;
	    reference?: string;
	    answer?: string;
	
	    static createFrom(source: any = {}) {
	        return new WordDiff(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.reference = source["reference"];
	        this.answer = source["answer"];
	    }
	}
	export class DictationAttempt {
	    id: string;
	    sentenceId: string;
	    answer: string;
	    score: number;
	    matchedWords: number;
	    totalWords: number;
	    transcriptWasVisible: boolean;
	    assessmentType: string;
	    diff?: WordDiff[];
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new DictationAttempt(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sentenceId = source["sentenceId"];
	        this.answer = source["answer"];
	        this.score = source["score"];
	        this.matchedWords = source["matchedWords"];
	        this.totalWords = source["totalWords"];
	        this.transcriptWasVisible = source["transcriptWasVisible"];
	        this.assessmentType = source["assessmentType"];
	        this.diff = this.convertValues(source["diff"], WordDiff);
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GPUInfo {
	    hasNvidiaGpu: boolean;
	    gpuName: string;
	    gpuEnabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GPUInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasNvidiaGpu = source["hasNvidiaGpu"];
	        this.gpuName = source["gpuName"];
	        this.gpuEnabled = source["gpuEnabled"];
	    }
	}
	export class HardwareInfo {
	    gpuVendor: string;
	    gpuName: string;
	    vramMb: number;
	    vramGb: number;
	    cpuName: string;
	    cpuCores: number;
	    cpuThreads: number;
	    ramMb: number;
	    ramGb: number;
	    accelerationType: string;
	    accelerationEnabled: boolean;
	    recommendedBackend: string;
	    isPortable: boolean;
	    dataDir: string;
	
	    static createFrom(source: any = {}) {
	        return new HardwareInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.gpuVendor = source["gpuVendor"];
	        this.gpuName = source["gpuName"];
	        this.vramMb = source["vramMb"];
	        this.vramGb = source["vramGb"];
	        this.cpuName = source["cpuName"];
	        this.cpuCores = source["cpuCores"];
	        this.cpuThreads = source["cpuThreads"];
	        this.ramMb = source["ramMb"];
	        this.ramGb = source["ramGb"];
	        this.accelerationType = source["accelerationType"];
	        this.accelerationEnabled = source["accelerationEnabled"];
	        this.recommendedBackend = source["recommendedBackend"];
	        this.isPortable = source["isPortable"];
	        this.dataDir = source["dataDir"];
	    }
	}
	export class LessonProgress {
	    guidedStage: string;
	    currentSentenceId: string;
	    sessionStartIndex: number;
	    sessionEndIndex: number;
	    completedSentenceIds: string[];
	
	    static createFrom(source: any = {}) {
	        return new LessonProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.guidedStage = source["guidedStage"];
	        this.currentSentenceId = source["currentSentenceId"];
	        this.sessionStartIndex = source["sessionStartIndex"];
	        this.sessionEndIndex = source["sessionEndIndex"];
	        this.completedSentenceIds = source["completedSentenceIds"];
	    }
	}
	export class WordTiming {
	    text: string;
	    startMs: number;
	    endMs: number;
	    confidence?: number;
	
	    static createFrom(source: any = {}) {
	        return new WordTiming(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	        this.startMs = source["startMs"];
	        this.endMs = source["endMs"];
	        this.confidence = source["confidence"];
	    }
	}
	export class Sentence {
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
	
	    static createFrom(source: any = {}) {
	        return new Sentence(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.index = source["index"];
	        this.startMs = source["startMs"];
	        this.endMs = source["endMs"];
	        this.transcript = source["transcript"];
	        this.words = this.convertValues(source["words"], WordTiming);
	        this.starred = source["starred"];
	        this.markedDifficult = source["markedDifficult"];
	        this.bestIndependentScore = source["bestIndependentScore"];
	        this.bestAssistedScore = source["bestAssistedScore"];
	        this.latestScore = source["latestScore"];
	        this.dictationAttempts = this.convertValues(source["dictationAttempts"], DictationAttempt);
	        this.transcriptRevealed = source["transcriptRevealed"];
	        this.shadowCompleted = source["shadowCompleted"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Lesson {
	    id: string;
	    fingerprint: string;
	    title: string;
	    source: string;
	    durationMs: number;
	    sentences: Sentence[];
	    processedBy: string;
	    progress: LessonProgress;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Lesson(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fingerprint = source["fingerprint"];
	        this.title = source["title"];
	        this.source = source["source"];
	        this.durationMs = source["durationMs"];
	        this.sentences = this.convertValues(source["sentences"], Sentence);
	        this.processedBy = source["processedBy"];
	        this.progress = this.convertValues(source["progress"], LessonProgress);
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ModelInfo {
	    id: string;
	    name: string;
	    description: string;
	    sizeMb: number;
	    downloaded: boolean;
	    filePath?: string;
	    url: string;
	    recommended: boolean;
	    requiredVramMb: number;
	    requiredRamMb: number;
	    params: string;
	    relativeSpeed: string;
	    accuracyLevel: string;
	    hardwareMatch: string;
	    hardwareTip: string;
	
	    static createFrom(source: any = {}) {
	        return new ModelInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.sizeMb = source["sizeMb"];
	        this.downloaded = source["downloaded"];
	        this.filePath = source["filePath"];
	        this.url = source["url"];
	        this.recommended = source["recommended"];
	        this.requiredVramMb = source["requiredVramMb"];
	        this.requiredRamMb = source["requiredRamMb"];
	        this.params = source["params"];
	        this.relativeSpeed = source["relativeSpeed"];
	        this.accuracyLevel = source["accuracyLevel"];
	        this.hardwareMatch = source["hardwareMatch"];
	        this.hardwareTip = source["hardwareTip"];
	    }
	}
	
	

}

