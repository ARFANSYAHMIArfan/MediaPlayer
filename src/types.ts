export interface MediaFile {
  id: string;
  name: string;
  size: number; // bytes
  duration: number; // seconds
  resolution: string; // "1080p", "4K", etc.
  format: string; // "mp4", "mkv", "webm", etc.
  url: string; // Object URL for local files or remote mock URL
  thumbnail: string; // Image URL or base64 placeholder
  folder: string; // Relative directory e.g., "Downloads", "Movies"
  lastPlayed?: number; // timestamp
  progress?: number; // accumulated playback time in seconds
  isSample?: boolean;
}

export interface SubtitleTrack {
  id: string;
  name: string;
  url: string; // File URL or blob
  isBuiltIn?: boolean;
  language?: string;
}

export interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}

export type AspectRatio = "fit" | "fill" | "zoom" | "16:9" | "4:3";

export interface PlaybackSettings {
  volume: number; // 0 to 1
  brightness: number; // 0 to 1 (simulated via layer)
  speed: number; // 0.5 to 2.0
  aspectRatio: AspectRatio;
  subtitleOffset: number; // offset in seconds (e.g. -1.5, +2.0)
  loop: boolean;
  backgroundAudio: boolean;
}
