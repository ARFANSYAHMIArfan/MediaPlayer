import React, { useState, useMemo } from "react";
import { useMedia } from "../context/MediaContext";
import { formatDuration, formatBytes } from "../utils/mediaUtils";
import { MediaFile } from "../types";
import {
  Folder,
  FolderOpen,
  ListPlus,
  Play,
  Trash2,
  Upload,
  Search,
  Clock,
  FileVideo,
  Plus,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  MonitorPlay,
  RotateCcw
} from "lucide-react";

export default function MainLibrary() {
  const {
    files,
    playlists,
    playheadPoints,
    searchQuery,
    setSearchQuery,
    selectedFolder,
    setSelectedFolder,
    selectedTab,
    setSelectedTab,
    playVideo,
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    addLocalFiles,
    deleteFile,
    clearPlaybackHistory,
    isScanning,
    scanProgress,
  } = useMedia();

  const [playlistInput, setPlaylistInput] = useState("");
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylistManager, setActivePlaylistManager] = useState<string | null>(null);

  // Sorting features
  const [sortBy, setSortBy] = useState<"name" | "size" | "duration" | "recent">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Handle Drag-and-Drop file uploads
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addLocalFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addLocalFiles(e.target.files);
    }
  };

  // Compute directory paths/folders available
  const folders = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      if (f.folder) {
        set.add(f.folder);
      }
    });
    return Array.from(set).sort();
  }, [files]);

  // Filters and sorts files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.folder.toLowerCase().includes(query)
      );
    }

    // Tab filtering
    if (selectedTab === "folders" && selectedFolder) {
      result = result.filter((f) => f.folder === selectedFolder);
    } else if (selectedTab === "recent") {
      result = result.filter((f) => f.lastPlayed !== undefined);
    } else if (selectedTab === "playlists" && activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        result = result.filter((f) => pl.videoIds.includes(f.id));
      } else {
        result = [];
      }
    }

    // Sort files logic
    result.sort((a, b) => {
      let valA: any = a[sortBy === "recent" ? "lastPlayed" : sortBy];
      let valB: any = b[sortBy === "recent" ? "lastPlayed" : sortBy];

      // fallback defaults for nulls
      if (valA === undefined) valA = sortBy === "recent" ? 0 : "";
      if (valB === undefined) valB = sortBy === "recent" ? 0 : "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [files, searchQuery, selectedTab, selectedFolder, activePlaylistId, playlists, sortBy, sortOrder]);

  // Compute dynamic stats
  const totalDuration = useMemo(() => {
    return files.reduce((acc, current) => acc + (current.duration || 0), 0);
  }, [files]);

  const totalSize = useMemo(() => {
    return files.reduce((acc, current) => acc + (current.size || 0), 0);
  }, [files]);

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistInput.trim()) {
      createPlaylist(playlistInput.trim());
      setPlaylistInput("");
      setShowAddPlaylistModal(false);
    }
  };

  const toggleSort = (field: "name" | "size" | "duration" | "recent") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to descending for numbers/recent, asc for names shortly after
    }
  };

  return (
    <div
      id="main-library-container"
      className="flex flex-col min-h-screen bg-black text-slate-100 font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* High-visibility drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/90 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-indigo-500 animate-pulse transition-all duration-200">
          <Upload className="w-20 h-20 text-indigo-400 mb-4 animate-bounce" />
          <h3 className="text-2xl font-bold font-sans tracking-wide text-white">
            Drag Video Files Here
          </h3>
          <p className="text-indigo-200 mt-2 text-sm font-mono">
            Support for MP4, MKV, AVI, WEBM, and MOV local items
          </p>
        </div>
      )}

      {/* Index scan system loader */}
      {isScanning && (
        <div className="absolute inset-x-4 top-4 z-40 bg-zinc-900 border border-indigo-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-4 transition-all duration-300">
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 animate-pulse">
            <MonitorPlay className="w-6 h-6 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-300 mb-1">
              <span>Scanning physical device storage...</span>
              <span className="text-indigo-400 font-bold">
                [{scanProgress?.current}/{scanProgress?.total}]
              </span>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-150"
                style={{
                  width: `${
                    ((scanProgress?.current || 0) / (scanProgress?.total || 1)) * 100
                  }%`,
                }}
              />
            </div>
            <p className="text-zinc-400 text-[11px] truncate mt-1.5 font-mono">
              Indexing: <span className="text-indigo-300">{scanProgress?.filename}</span>
            </p>
          </div>
        </div>
      )}

      {/* App Header */}
      <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white tracking-widest text-lg shadow-lg">
              M
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              MediaPlayer App
              <span className="text-[10px] ml-2 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
                OFFLINE V1.2
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            No tracking • Full GPU Acceleration • Zero Internet Permissions Required
          </p>
        </div>

        {/* Global Statistics */}
        <div className="flex items-center gap-6 bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-2 text-xs font-mono">
          <div className="text-left">
            <span className="text-zinc-500 block">INDEXED MEDIA</span>
            <span className="text-white font-bold text-sm block">
              {files.length} Videos
            </span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="text-left">
            <span className="text-zinc-500 block">TOTAL VOLUME</span>
            <span className="text-white font-bold text-sm block">
              {formatBytes(totalSize)}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="text-left">
            <span className="text-zinc-500 block">PLAYTIME SPAN</span>
            <span className="text-white font-bold text-sm block">
              {formatDuration(totalDuration)}
            </span>
          </div>
        </div>
      </header>

      {/* Interactive Toolbar Filter Area */}
      <div className="px-6 py-4 bg-zinc-950/40 border-b border-zinc-900 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Dynamic Navigation Tabs inside Sidebar or Header replacement */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="tab-all-videos"
            onClick={() => {
              setSelectedTab("all");
              setSelectedFolder(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedTab === "all"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            All Videos
          </button>
          <button
            id="tab-folders"
            onClick={() => {
              setSelectedTab("folders");
              if (folders.length > 0 && !selectedFolder) {
                setSelectedFolder(folders[0]);
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedTab === "folders"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            Folders ({folders.length})
          </button>
          <button
            id="tab-recent"
            onClick={() => {
              setSelectedTab("recent");
              setSelectedFolder(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedTab === "recent"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recently Played
          </button>
          <button
            id="tab-playlists"
            onClick={() => {
              setSelectedTab("playlists");
              setSelectedFolder(null);
              if (playlists.length > 0 && !activePlaylistId) {
                setActivePlaylistId(playlists[0].id);
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedTab === "playlists"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            Playlists ({playlists.length})
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              id="search-media"
              type="text"
              placeholder="Search local catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 text-xs font-medium placeholder-zinc-500 pl-9 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>Scan Device File</span>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Left Drawer Inner Toolbar - Dynamic context based on selected main tab */}
        {selectedTab === "folders" && (
          <aside className="w-full md:w-64 bg-zinc-950/60 border-r border-zinc-900 p-4 shrink-0">
            <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
              <span>Directory Tree</span>
              <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
            </h3>
            {folders.length === 0 ? (
              <div className="p-4 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                No custom folders indexed. Drag video hierarchies to inspect.
              </div>
            ) : (
              <div className="space-y-1">
                {folders.map((fld) => {
                  const count = files.filter((v) => v.folder === fld).length;
                  const isCur = selectedFolder === fld;
                  return (
                    <button
                      key={fld}
                      onClick={() => setSelectedFolder(fld)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left font-medium transition-all ${
                        isCur
                          ? "bg-zinc-800/80 text-white"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        <span>{fld}</span>
                      </span>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded text-zinc-500">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        )}

        {selectedTab === "playlists" && (
          <aside className="w-full md:w-64 bg-zinc-950/60 border-r border-zinc-900 p-4 shrink-0 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-zinc-500">
                User Playlists
              </h3>
              <button
                onClick={() => setShowAddPlaylistModal(true)}
                className="p-1 hover:bg-zinc-800 text-indigo-400 rounded-lg transition-all"
                title="Create playlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Playlist Creator quick view */}
            {showAddPlaylistModal && (
              <form
                onSubmit={handleCreatePlaylistSubmit}
                className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Playlist name..."
                  value={playlistInput}
                  onChange={(e) => setPlaylistInput(e.target.value)}
                  className="bg-zinc-900 text-xs px-2 py-1 flex-1 rounded border border-zinc-800 text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 px-2 py-1 rounded text-white text-[11px] font-bold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlaylistModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="space-y-1 flex-1 overflow-y-auto max-h-[300px] md:max-h-none">
              {playlists.map((pl) => {
                const isCur = activePlaylistId === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`w-full flex items-center justify-between group px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      isCur
                        ? "bg-zinc-800/80 text-white"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <button
                      onClick={() => setActivePlaylistId(pl.id)}
                      className="flex-1 text-left truncate py-1.5"
                    >
                      {pl.name}
                      <span className="text-[9px] block text-zinc-500 font-mono mt-0.5">
                        {pl.videoIds.length} video streams
                      </span>
                    </button>
                    <button
                      onClick={() => deletePlaylist(pl.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 hover:text-red-400 rounded transition-all text-zinc-500"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Content Section */}
        <main className="flex-1 p-6">
          {/* Main Title of active view */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-md font-sans font-bold text-white flex items-center gap-2">
                {selectedTab === "all" && "All Offline Index Files"}
                {selectedTab === "folders" && (
                  <>
                    <span>Folder:</span>
                    <span className="text-indigo-400">{selectedFolder || "Root"}</span>
                  </>
                )}
                {selectedTab === "recent" && "Recently Played Watchhead Blocks"}
                {selectedTab === "playlists" && (
                  <>
                    <span>Playlist:</span>
                    <span className="text-indigo-400">
                      {playlists.find((pl) => pl.id === activePlaylistId)?.name || "Not Selected"}
                    </span>
                  </>
                )}
                <span className="text-xs bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded font-mono font-normal">
                  {filteredFiles.length} item{filteredFiles.length === 1 ? "" : "s"}
                </span>
              </h2>
              {selectedTab === "recent" && filteredFiles.length > 0 && (
                <button
                  onClick={clearPlaybackHistory}
                  className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1.5 mt-1.5 transition-colors font-mono"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Entire Playback History
                </button>
              )}
            </div>

            {/* Sorting operations UI */}
            <div className="flex items-center gap-1.5 text-xs bg-zinc-950 px-2 pl-1.5 py-1 rounded-lg border border-zinc-900/80">
              <span className="p-1 text-zinc-500">
                <SlidersHorizontal className="w-3 h-3" />
              </span>
              <button
                onClick={() => toggleSort("name")}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  sortBy === "name"
                    ? "bg-zinc-900 text-indigo-400 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("size")}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  sortBy === "size"
                    ? "bg-zinc-900 text-indigo-400 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Size {sortBy === "size" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("duration")}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  sortBy === "duration"
                    ? "bg-zinc-900 text-indigo-400 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Length {sortBy === "duration" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("recent")}
                className={`px-2 py-1 rounded transition-all font-medium ${
                  sortBy === "recent"
                    ? "bg-zinc-900 text-indigo-400 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Played {sortBy === "recent" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </div>
          </div>

          {/* Catalog grid */}
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20 px-4">
              <div className="p-4 bg-zinc-900/50 rounded-full text-zinc-500 mb-4 border border-zinc-800/80">
                <FileVideo className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-md font-bold text-white font-sans text-center">
                No Video Streams Found
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1.5 text-center">
                Your offline library is currently empty. Direct select or drag and drop local files using the green button.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Select Local Folder or File
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFiles.map((v) => {
                const storedProgress = playheadPoints[v.id] || 0;
                const percent = v.duration ? (storedProgress / v.duration) * 100 : 0;
                const remaining = v.duration ? Math.max(0, v.duration - storedProgress) : 0;

                return (
                  <div
                    key={v.id}
                    className="group bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900 hover:border-zinc-800 hover:shadow-xl transition-all duration-300 flex flex-col relative"
                  >
                    {/* Resolution badging */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex gap-1.5 flex-wrap">
                      <span className="bg-black/80 backdrop-blur-sm border border-zinc-800 text-[9px] font-bold font-mono tracking-wider text-slate-300 px-1.5 py-0.5 rounded leading-none">
                        {v.resolution}
                      </span>
                      {v.isSample && (
                        <span className="bg-indigo-950 border border-indigo-500/25 text-[9px] font-bold font-mono text-indigo-400 px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          DEMO
                        </span>
                      )}
                    </div>

                    {/* Folder Badge representation */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="bg-black/80 backdrop-blur-sm border border-zinc-800 max-w-[120px] truncate text-[9px] font-mono tracking-wider text-zinc-400 px-1.5 py-0.5 rounded leading-none flex items-center gap-1">
                        <Folder className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{v.folder}</span>
                      </span>
                    </div>

                    {/* Thumbnail Section */}
                    <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden shrink-0">
                      <img
                        src={v.thumbnail}
                        alt={v.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />

                      {/* Cover play button overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => playVideo(v)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl"
                          title="Play video"
                        >
                          <Play className="w-6 h-6 fill-white" />
                        </button>
                      </div>

                      {/* Duration Indicator */}
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white">
                        {formatDuration(v.duration)}
                      </div>

                      {/* Playhead progress slider baseline */}
                      {percent > 0 && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900">
                          <div
                            className="bg-indigo-500 h-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Description Area */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h4
                        className="font-sans font-bold text-white text-xs group-hover:text-indigo-400 cursor-pointer line-clamp-2 leading-snug flex-1 border-b border-zinc-900/60 pb-3"
                        onClick={() => playVideo(v)}
                        title={v.name}
                      >
                        {v.name}
                      </h4>

                      {/* Underline facts */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-2.5">
                        <span>SIZE: {formatBytes(v.size)}</span>
                        <span>FORMAT: .{v.format.toUpperCase()}</span>
                      </div>

                      {/* Resume metadata */}
                      {percent > 0 && (
                        <div className="bg-zinc-900/60 border border-zinc-900 rounded-lg p-2 mt-3 text-[10px] font-mono flex items-center justify-between text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Resume at {formatDuration(storedProgress)}</span>
                          </span>
                          <span className="text-zinc-500">
                            {formatDuration(remaining)} left
                          </span>
                        </div>
                      )}

                      {/* Playlist assignment & deletion controls */}
                      <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActivePlaylistManager(
                                activePlaylistManager === v.id ? null : v.id
                              )
                            }
                            className="text-[10px] hover:text-white px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded font-medium text-zinc-400 transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add to Playlist</span>
                          </button>

                          {activePlaylistManager === v.id && (
                            <div className="absolute left-0 bottom-full mb-1.5 z-20 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-1.5 text-xs text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider mb-1">
                                <span>Assign Playlist</span>
                                <button
                                  onClick={() => setActivePlaylistManager(null)}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              {playlists.map((pl) => {
                                const belongs = pl.videoIds.includes(v.id);
                                return (
                                  <button
                                    key={pl.id}
                                    onClick={() => {
                                      if (belongs) {
                                        removeVideoFromPlaylist(pl.id, v.id);
                                      } else {
                                        addVideoToPlaylist(pl.id, v.id);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                  >
                                    <span className="truncate">{pl.name}</span>
                                    {belongs ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Plus className="w-3 h-3 text-zinc-600 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* File Deletion operation (allows removal of files from catalogs) */}
                        <button
                          onClick={() => deleteFile(v.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 hover:bg-zinc-900 rounded transition-all"
                          title="Remove file descriptors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
