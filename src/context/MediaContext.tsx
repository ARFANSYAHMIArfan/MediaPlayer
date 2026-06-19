import React, { createContext, useContext, useState, useEffect } from "react";
import { MediaFile, Playlist, PlaybackSettings } from "../types";
import { SAMPLE_VIDEOS } from "../data/sampleVideos";
import { analyzeLocalVideoFile } from "../utils/mediaUtils";

interface MediaContextType {
  files: MediaFile[];
  activeVideo: MediaFile | null;
  playlists: Playlist[];
  playheadPoints: { [id: string]: number };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFolder: string | null;
  setSelectedFolder: (folder: string | null) => void;
  selectedTab: "all" | "folders" | "recent" | "playlists";
  setSelectedTab: (tab: "all" | "folders" | "recent" | "playlists") => void;
  playVideo: (video: MediaFile) => void;
  closeVideo: () => void;
  savePlayhead: (id: string, time: number) => void;
  createPlaylist: (name: string) => void;
  addVideoToPlaylist: (playlistId: string, videoId: string) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addLocalFiles: (fileList: FileList | File[]) => Promise<void>;
  deleteFile: (id: string) => void;
  clearPlaybackHistory: () => void;
  isScanning: boolean;
  scanProgress: { current: number; total: number; filename: string } | null;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  // Load persisted folders or files descriptors & playlists
  const [files, setFiles] = useState<MediaFile[]>(() => {
    try {
      const persisted = localStorage.getItem("mediaplayer_files");
      if (persisted) {
        // Hydrate persisted descriptors
        const parsed: MediaFile[] = JSON.parse(persisted);
        
        // Remove old user-defined blob URLs which expire upon page refresh.
        // We preserve the metadata so the user knows the file is in their library.
        // They can easily bind it again by re-uploading (or we keep the item structure).
        const scrubbed = parsed.map(f => {
          if (!f.isSample) {
            // Keep descriptor but mark URL as empty so we can ask for file binding if clicked,
            // or we preserve the state.
            return { ...f, url: "" }; 
          }
          return f;
        });

        // Ensure sample videos are always populated even if cleared
        const sampleIds = SAMPLE_VIDEOS.map(v => v.id);
        const uniqueStored = scrubbed.filter(f => !sampleIds.includes(f.id));
        return [...SAMPLE_VIDEOS, ...uniqueStored];
      }
    } catch (e) {
      console.error("Failed to load persisted library:", e);
    }
    return SAMPLE_VIDEOS;
  });

  const [activeVideo, setActiveVideo] = useState<MediaFile | null>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem("mediaplayer_playlists");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [playheadPoints, setPlayheadPoints] = useState<{ [id: string]: number }>(() => {
    try {
      const saved = localStorage.getItem("mediaplayer_playheads");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "folders" | "recent" | "playlists">("all");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem("mediaplayer_files", JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem("mediaplayer_playlists", JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem("mediaplayer_playheads", JSON.stringify(playheadPoints));
  }, [playheadPoints]);

  const playVideo = (video: MediaFile) => {
    // Save last played timestamp
    setFiles((prev) =>
      prev.map((f) =>
        f.id === video.id ? { ...f, lastPlayed: Date.now() } : f
      )
    );
    setActiveVideo(video);
  };

  const closeVideo = () => {
    setActiveVideo(null);
  };

  const savePlayhead = (id: string, time: number) => {
    setPlayheadPoints((prev) => {
      const updated = { ...prev, [id]: time };
      return updated;
    });

    // Update progress in files list
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, progress: time } : f
      )
    );
  };

  const createPlaylist = (name: string) => {
    const fresh: Playlist = {
      id: "playlist-" + Date.now(),
      name,
      videoIds: [],
    };
    setPlaylists((prev) => [...prev, fresh]);
  };

  const addVideoToPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.videoIds.includes(videoId)) return pl;
        return { ...pl, videoIds: [...pl.videoIds, videoId] };
      })
    );
  };

  const removeVideoFromPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return { ...pl, videoIds: pl.videoIds.filter((id) => id !== videoId) };
      })
    );
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  };

  // Indexes uploaded / selected files from the user storage securely
  const addLocalFiles = async (fileList: FileList | File[]) => {
    setIsScanning(true);
    const filesToProcess = Array.from(fileList).filter((f) =>
      f.type.startsWith("video/") || 
      /\.(mp4|mkv|avi|mov|webm|ogg)$/i.test(f.name)
    );

    if (filesToProcess.length === 0) {
      setIsScanning(false);
      return;
    }

    const processedList: MediaFile[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const originalFile = filesToProcess[i];
      setScanProgress({
        current: i + 1,
        total: filesToProcess.length,
        filename: originalFile.name,
      });

      // Analyze file to extract duration, real dimensions and base64 canvas thumbnail frame
      const analysis = await analyzeLocalVideoFile(originalFile);

      // Guess directory layout structural paths (or tag as "Internal Storage" or custom path if uploaded via directory)
      // Standard File interfaces sometimes expose relativePath or webkitRelativePath
      let folderPath = "Internal/Videos";
      const relativePath = (originalFile as any).webkitRelativePath;
      if (relativePath && relativePath.includes("/")) {
        const parts = relativePath.split("/");
        parts.pop(); // remove file name
        folderPath = parts.join("/");
      }

      const mediaFileItem: MediaFile = {
        id: "local-" + originalFile.name + "-" + originalFile.size,
        name: originalFile.name,
        size: originalFile.size,
        duration: analysis.duration,
        resolution: analysis.resolution,
        format: originalFile.name.split(".").pop() || "mp4",
        url: URL.createObjectURL(originalFile), // active session url for execution
        thumbnail: analysis.thumbnail,
        folder: folderPath,
        isSample: false,
      };

      processedList.push(mediaFileItem);
    }

    setFiles((prev) => {
      // Avoid duplicate file entries by mapping IDs
      const existingIds = prev.map((f) => f.id);
      const uniqueNew = processedList.filter((f) => !existingIds.includes(f.id));

      // Re-bind URLs if the file exists already but had expired URL
      const updatedPrev = prev.map((f) => {
        const foundNew = processedList.find((p) => p.id === f.id);
        if (foundNew) {
          return { ...f, url: foundNew.url, thumbnail: foundNew.thumbnail }; // restore session URL & updated details
        }
        return f;
      });

      return [...updatedPrev, ...uniqueNew];
    });

    setIsScanning(false);
    setScanProgress(null);
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // Remove from playlists too
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        videoIds: pl.videoIds.filter((vId) => vId !== id),
      }))
    );
    // Remove playhead
    setPlayheadPoints((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    if (activeVideo?.id === id) {
      setActiveVideo(null);
    }
  };

  const clearPlaybackHistory = () => {
    setPlayheadPoints({});
    setFiles((prev) =>
      prev.map((f) => ({ ...f, progress: undefined, lastPlayed: undefined }))
    );
  };

  return (
    <MediaContext.Provider
      value={{
        files,
        activeVideo,
        playlists,
        playheadPoints,
        searchQuery,
        setSearchQuery,
        selectedFolder,
        setSelectedFolder,
        selectedTab,
        setSelectedTab,
        playVideo,
        closeVideo,
        savePlayhead,
        createPlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        deletePlaylist,
        addLocalFiles,
        deleteFile,
        clearPlaybackHistory,
        isScanning,
        scanProgress,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error("useMedia must be used within a MediaProvider");
  }
  return context;
}
