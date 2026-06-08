import React, { useState, useRef, useEffect, useMemo } from "react";
import { useMedia } from "../context/MediaContext";
import { formatDuration } from "../utils/mediaUtils";
import { AspectRatio, SubtitleTrack } from "../types";
import { parseSubtitles, DEMO_ENGLISH_VTT, DEMO_SPANISH_VTT, SubtitleCue } from "../utils/subtitleParser";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sun,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  ArrowLeft,
  ChevronLeft,
  AudioLines,
  Sparkles,
  Zap,
  Activity,
  Maximize2,
  Clock,
  RotateCcw,
  Plus
} from "lucide-react";

export default function VideoPlayerSuite() {
  const { activeVideo, closeVideo, savePlayhead, playheadPoints } = useMedia();

  if (!activeVideo) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("mediaplayer_volume");
    return saved ? parseFloat(saved) : 1.0;
  });
  const [isMuted, setIsMuted] = useState(false);

  // Video Settings
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("fit");
  const [brightness, setBrightness] = useState(() => {
    const saved = localStorage.getItem("mediaplayer_brightness");
    return saved ? parseFloat(saved) : 1.5; // multiplier for brightness filter
  });

  // Controls UI fade transitions
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Panels
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showSubtitleDropdown, setShowSubtitleDropdown] = useState(false);
  const [activePanel, setActivePanel] = useState<"none" | "speed" | "aspect" | "audio" | "sync">("none");

  // Gesture HUD Overlay Indicators
  const [gestureIndicator, setGestureIndicator] = useState<{
    type: "volume" | "brightness" | "seek" | "skip-left" | "skip-right" | "ratio" | "none";
    value?: string | number;
  }>({ type: "none" });
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Tracks simulation (Multilingual Embedded Streams)
  const audioTracks = ["Stereo (English) [Primary]", "Dual Action (Director Commentary)", "5.1 Digital Surround Mix"];
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);

  // Subtitle States
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([
    { id: "sub-none", name: "Off", url: "", isBuiltIn: true },
    { id: "sub-demo-en", name: "English (Demo Caption)", url: "demo-en", isBuiltIn: true },
    { id: "sub-demo-es", name: "Spanish (Demo Caption)", url: "demo-es", isBuiltIn: true },
  ]);
  const [activeSubtitleId, setActiveSubtitleId] = useState("sub-demo-en");
  const [parsedCues, setParsedCues] = useState<SubtitleCue[]>([]);
  const [subtitleOffset, setSubtitleOffset] = useState(0.0); // Offset in seconds
  const [activeSubtitleText, setActiveSubtitleText] = useState("");

  // Track initial playhead restore
  const [restoredPlayhead, setRestoredPlayhead] = useState(false);

  // Load sample/default subtitles on start
  useEffect(() => {
    if (activeSubtitleId === "sub-demo-en") {
      setParsedCues(parseSubtitles(DEMO_ENGLISH_VTT));
    } else if (activeSubtitleId === "sub-demo-es") {
      setParsedCues(parseSubtitles(DEMO_SPANISH_VTT));
    } else if (activeSubtitleId === "sub-none") {
      setParsedCues([]);
    }
  }, [activeSubtitleId]);

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem("mediaplayer_volume", volume.toString());
  }, [volume, isMuted]);

  // Sync brightness slider in localStorage
  useEffect(() => {
    localStorage.setItem("mediaplayer_brightness", brightness.toString());
  }, [brightness]);

  // Sync Speed with video rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isPlaying]);

  // Track subtitle rendering based on exact timing
  useEffect(() => {
    if (parsedCues.length === 0) {
      setActiveSubtitleText("");
      return;
    }

    const adjTime = currentTime + subtitleOffset;
    const currentCues = parsedCues.filter(
      (cue) => adjTime >= cue.startTime && adjTime <= cue.endTime
    );

    if (currentCues.length > 0) {
      setActiveSubtitleText(
        currentCues.map((c) => c.text).join("<br />")
      );
    } else {
      setActiveSubtitleText("");
    }
  }, [currentTime, parsedCues, subtitleOffset]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in search or playlist forms
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "arrowright":
          e.preventDefault();
          skipTime(10);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => Math.min(1.0, v + 0.05));
          setIsMuted(false);
          triggerHUD("volume", Math.round(Math.min(1.0, volume + 0.05) * 100) + "%");
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => Math.max(0.0, v - 0.05));
          setIsMuted(false);
          triggerHUD("volume", Math.round(Math.max(0.0, volume - 0.05) * 100) + "%");
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "escape":
          // Closes dropdown panels first
          if (showSettingsDropdown || showSubtitleDropdown) {
            setShowSettingsDropdown(false);
            setShowSubtitleDropdown(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, volume, showSettingsDropdown, showSubtitleDropdown]);

  // Auto Hide Controls sequence on movement
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsDropdown && !showSubtitleDropdown) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettingsDropdown, showSubtitleDropdown]);

  // Custom gesture HUD helper
  const triggerHUD = (type: typeof gestureIndicator.type, value: string | number) => {
    setGestureIndicator({ type, value });
    if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    gestureTimeoutRef.current = setTimeout(() => {
      setGestureIndicator({ type: "none" });
    }, 1200);
  };

  // Playhead restore flow
  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      const savedPoint = playheadPoints[activeVideo.id];
      if (savedPoint && !restoredPlayhead) {
        videoRef.current.currentTime = savedPoint;
        setCurrentTime(savedPoint);
        setRestoredPlayhead(true);
        triggerHUD("seek", `Resumed: ${formatDuration(savedPoint)}`);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      triggerHUD(seconds > 0 ? "skip-right" : "skip-left", `${seconds > 0 ? "+" : ""}${seconds}s`);
    }
  };

  // Handle Double Taps/Double Clicks
  const handleOverlayDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.4) {
      // Left Skip
      skipTime(-10);
    } else if (clickX > width * 0.6) {
      // Right Skip
      skipTime(10);
    } else {
      // Center Double Click toggles aspect ratio for responsive testing
      cycleAspectRatio();
    }
  };

  const cycleAspectRatio = () => {
    const list: AspectRatio[] = ["fit", "fill", "zoom", "16:9", "4:3"];
    const idx = list.indexOf(aspectRatio);
    const nextRatio = list[(idx + 1) % list.length];
    setAspectRatio(nextRatio);
    triggerHUD("ratio", `Aspect: ${nextRatio.toUpperCase()}`);
  };

  // Mouse drag coordinates tracking for brightness / volume slide adjustments
  const isDraggingRef = useRef(false);
  const dragStartCoords = useRef({ x: 0, y: 0 });
  const dragStartValues = useRef({ value: 0, side: "" as "left" | "right" | "center" });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Avoid tracking if clicking buttons
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.className.includes("slider-node")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDraggingRef.current = true;
    dragStartCoords.current = { x: e.clientX, y: e.clientY };

    const side = x < rect.width * 0.5 ? "left" : "right";
    dragStartValues.current = {
      value: side === "left" ? brightness : volume,
      side,
    };
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    resetControlsTimeout();

    if (!isDraggingRef.current) return;

    const deltaY = dragStartCoords.current.y - e.clientY; // swipe upwards is positive
    const rect = e.currentTarget.getBoundingClientRect();
    const pixelRange = rect.height * 0.8; // move 80% screen tall for full range

    const adjustment = deltaY / pixelRange;

    if (dragStartValues.current.side === "left") {
      // Adjust brightness: 0.1 to 3.0 (baseline 1.0)
      const adjusted = Math.max(0.1, Math.min(3.0, dragStartValues.current.value + adjustment * 3.0));
      setBrightness(adjusted);
      triggerHUD("brightness", `${Math.round(adjusted * 33)}%`); // raw conversion standard
    } else if (dragStartValues.current.side === "right") {
      // Adjust volume: 0.0 to 1.0
      const adjusted = Math.max(0.0, Math.min(1.0, dragStartValues.current.value + adjustment));
      setVolume(adjusted);
      setIsMuted(false);
      triggerHUD("volume", `${Math.round(adjusted * 100)}%`);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn("Fullscreen permission error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Picture-in-Picture logic
  const togglePictureInPicture = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn("PiP not fully active or supported on this browser format", err);
      }
    } else {
      alert("Floating PiP window is not fully supported in this sandboxed layout.");
    }
  };

  const handleCustomSubtitleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const loadedCues = parseSubtitles(text);
          const freshId = "sub-custom-" + Date.now();
          setSubtitleTracks((prev) => [
            ...prev,
            { id: freshId, name: `${file.name.substring(0, 15)}...`, url: "custom" },
          ]);
          setParsedCues(loadedCues);
          setActiveSubtitleId(freshId);
          triggerHUD("seek", "Custom Subtitles Loaded!");
        }
      };
      reader.readAsText(file);
    }
  };

  // Safe subtitle renderer with VTT/HTML content parser
  const renderSubtitleText = (text: string) => {
    return { __html: text };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between items-stretch">
      {/* Upper Titlebar (revealed on mousemove) */}
      <div
        className={`absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/90 to-transparent z-40 px-6 flex items-center justify-between pointer-events-auto transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (videoRef.current) {
                savePlayhead(activeVideo.id, videoRef.current.currentTime);
              }
              closeVideo();
            }}
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-all active:scale-95 border border-zinc-800/85 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-sans font-bold text-white max-w-md md:max-w-xl truncate leading-normal">
              {activeVideo.name}
            </h2>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
                {activeVideo.folder}
              </span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span className="text-[10px] text-zinc-500 font-mono">
                GPU Decoded • Local stream
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-2.5 py-1 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          <span>OFFLINE PLAYER ENVIRONMENT</span>
        </div>
      </div>

      {/* Main Core Screen - Includes Drag Zones, Brightness masks, HUD Indicators */}
      <div
        id="gesture-player-screen"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseMove={resetControlsTimeout}
        onClick={togglePlay}
        onDoubleClick={handleOverlayDoubleClick}
        className="flex-1 w-full bg-black flex items-center justify-center relative select-none cursor-pointer overflow-hidden"
      >
        {/* Dynamic Brightness Filter Overlay System: Simulated elegantly */}
        <div
          className="absolute inset-0 pointer-events-none z-10 mix-blend-multiply bg-black transition-opacity duration-100"
          style={{ opacity: Math.max(0, 1 - (brightness / 1.5)) }}
        />

        {/* Dynamic Video Element */}
        <video
          ref={videoRef}
          src={activeVideo.url || undefined}
          autoPlay
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={() => {
            if (videoRef.current) {
              const curr = videoRef.current.currentTime;
              setCurrentTime(curr);
              // Auto-persist bookmark increments
              if (Math.round(curr) % 5 === 0) {
                savePlayhead(activeVideo.id, curr);
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (videoRef.current) {
              savePlayhead(activeVideo.id, 0); // reset upon completion
              setCurrentTime(0);
              videoRef.current.currentTime = 0;
            }
            triggerHUD("seek", "Playback Finished!");
          }}
          className={`transition-all duration-300 w-full max-h-full ${
            aspectRatio === "fit" ? "object-contain" : ""
          } ${aspectRatio === "fill" ? "object-fill h-full w-full" : ""} ${
            aspectRatio === "zoom" ? "object-cover scale-110 h-full" : ""
          } ${aspectRatio === "16:9" ? "aspect-video" : ""} ${
            aspectRatio === "4:3" ? "aspect-[4/3]" : ""
          }`}
          style={{ filter: `brightness(${brightness > 1.5 ? brightness : 1.0})` }}
        />

        {/* Real-time Subtitle Frame Display Overlay */}
        {activeSubtitleText && (
          <div className="absolute bottom-24 inset-x-4 md:inset-x-20 text-center z-30 pointer-events-none select-none text-shadow font-sans">
            <span
              className="px-4 py-2 bg-black/75 text-white/95 rounded-lg border border-zinc-800/60 font-medium tracking-wide text-sm md:text-md inline-block max-w-2xl leading-relaxed text-center"
              dangerouslySetInnerHTML={renderSubtitleText(activeSubtitleText)}
            />
          </div>
        )}

        {/* Gesture HUD HUD Overlay Indicators */}
        {gestureIndicator.type !== "none" && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none animate-in zoom-in-75 duration-100">
            <div className="bg-black/85 border border-zinc-800/80 px-6 py-4 rounded-2xl flex flex-col items-center gap-2.5 shadow-2xl backdrop-blur-md min-w-[140px] text-center">
              {gestureIndicator.type === "volume" && (
                <>
                  <Volume2 className="w-8 h-8 text-indigo-400 animate-bounce" />
                  <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Volume</span>
                  <span className="text-md font-sans font-bold text-white">{gestureIndicator.value}</span>
                </>
              )}
              {gestureIndicator.type === "brightness" && (
                <>
                  <Sun className="w-8 h-8 text-amber-500 animate-spin" />
                  <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Brightness</span>
                  <span className="text-md font-sans font-bold text-white">{gestureIndicator.value}</span>
                </>
              )}
              {gestureIndicator.type === "seek" && (
                <>
                  <Clock className="w-8 h-8 text-indigo-400" />
                  <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Seek Buffer</span>
                  <span className="text-xs font-mono font-bold text-white">{gestureIndicator.value}</span>
                </>
              )}
              {gestureIndicator.type === "skip-left" && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex text-indigo-400 scale-125 my-1.5 font-bold">≪</div>
                  <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Skip Backward</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{gestureIndicator.value}</span>
                </div>
              )}
              {gestureIndicator.type === "skip-right" && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex text-indigo-400 scale-125 my-1.5 font-bold">≫</div>
                  <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Skip Forward</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{gestureIndicator.value}</span>
                </div>
              )}
              {gestureIndicator.type === "ratio" && (
                <>
                  <Maximize2 className="w-8 h-8 text-emerald-400" />
                  <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Aspect Scaling</span>
                  <span className="text-[11px] font-mono font-bold text-white uppercase">{gestureIndicator.value}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Double click instruction visual bounds */}
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-indigo-500/0 hover:from-indigo-500/3 to-transparent pointer-events-none transition-all flex items-center justify-start pl-4 group">
          <div className="opacity-0 group-hover:opacity-60 transition-opacity bg-black/60 px-3 py-1.5 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400">
            Double click left: -10s
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-indigo-500/0 hover:from-indigo-500/3 to-transparent pointer-events-none transition-all flex items-center justify-end pr-4 group">
          <div className="opacity-0 group-hover:opacity-60 transition-opacity bg-black/60 px-3 py-1.5 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400">
            Double click right: +10s
          </div>
        </div>

        {/* In-view video failure help message */}
        {!activeVideo.url && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center z-20" onClick={(e) => e.stopPropagation()}>
            <Activity className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
            <h4 className="text-md font-bold text-white font-sans">
              Local File Handle Expired
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1.5">
              To guarantee performance & complete privacy, browsers do not persist true file descriptors. Re-choose the local file or run an offline demo video!
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={closeVideo}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
              >
                Go Back to Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Console Grid (revealed on mousemove) */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/85 to-transparent z-40 p-6 pointer-events-auto transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timeline Slider with visual duration tracking */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[11px] font-mono font-medium text-zinc-400">
            {formatDuration(currentTime)}
          </span>

          <div className="flex-1 relative group py-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const target = parseFloat(e.target.value);
                if (videoRef.current) {
                  videoRef.current.currentTime = target;
                }
                setCurrentTime(target);
              }}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 outline-none transition-all group-hover:h-2"
            />
          </div>

          <span className="text-[11px] font-mono font-medium text-zinc-400">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Action Trays */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-1 border-t border-zinc-900/60">
          <div className="flex items-center gap-4.5">
            {/* Play trigger button */}
            <button
              onClick={togglePlay}
              className="p-3 bg-white text-black hover:bg-zinc-200 rounded-full transition-all active:scale-90 shadow-md"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black pl-0.5" />
              )}
            </button>

            {/* Previous Actions Skips */}
            <button
              onClick={() => skipTime(-10)}
              className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-900 rounded-lg transition-colors font-mono text-xs font-bold"
              title="Skip back 10 seconds"
            >
              -10s
            </button>
            <button
              onClick={() => skipTime(10)}
              className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-900 rounded-lg transition-colors font-mono text-xs font-bold"
              title="Skip forward 10 seconds"
            >
              +10s
            </button>

            {/* Volume control with mute toggle */}
            <div className="flex items-center gap-1.5 group">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-zinc-850 rounded appearance-none cursor-pointer accent-zinc-200 transition-all group-hover:w-24 border-0"
              />
            </div>
          </div>

          {/* Right Action Tray: Settings dropdowns and sync widgets */}
          <div className="flex items-center gap-1.5 relative">
            {/* Subtitle synchronizer Quick Bar */}
            <div className="flex items-center gap-1 md:mr-3 border-r border-zinc-800 pr-3">
              <button
                onClick={() => setShowSubtitleDropdown(!showSubtitleDropdown)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                  activeSubtitleId !== "sub-none"
                    ? "bg-indigo-950 text-indigo-400 border border-indigo-500/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
                title="Captions & sync"
              >
                <Subtitles className="w-4 h-4" />
                <span>CC</span>
              </button>

              {showSubtitleDropdown && (
                <div className="absolute bottom-full right-0 mb-3 w-64 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-3 text-xs text-left text-zinc-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <span className="font-bold">Subtitle Tracks</span>
                    <span className="text-[9px] bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-200">
                      SYNC OFFSET Enabled
                    </span>
                  </div>

                  {/* Tracks Selector */}
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {subtitleTracks.map((trk) => (
                      <button
                        key={trk.id}
                        onClick={() => setActiveSubtitleId(trk.id)}
                        className={`w-full text-left px-2 py-1.5 rounded transition-all text-[11px] ${
                          activeSubtitleId === trk.id
                            ? "bg-indigo-600 text-white font-semibold"
                            : "text-zinc-400 hover:bg-zinc-900"
                        }`}
                      >
                        {trk.name}
                      </button>
                    ))}
                  </div>

                  {/* Subtitle syncing latency range slider */}
                  {activeSubtitleId !== "sub-none" && (
                    <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-900">
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1 font-mono">
                        <span>Sync Offset:</span>
                        <span className="text-white font-bold">
                          {subtitleOffset > 0 ? "+" : ""}
                          {subtitleOffset.toFixed(1)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-5.0}
                        max={5.0}
                        step={0.5}
                        value={subtitleOffset}
                        onChange={(e) => setSubtitleOffset(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-805 rounded accent-indigo-500 cursor-pointer mb-2"
                      />
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                        <span>-5.0s (delay text)</span>
                        <button
                          onClick={() => setSubtitleOffset(0.0)}
                          className="hover:text-white underline"
                        >
                          Reset
                        </button>
                        <span>+5.0s (rush text)</span>
                      </div>
                    </div>
                  )}

                  {/* Manual .vtt / .srt local upload button */}
                  <div className="border-t border-zinc-900 pt-2.5">
                    <label className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer text-zinc-300">
                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Upload local .srt/.vtt</span>
                      <input
                        type="file"
                        accept=".srt,.vtt"
                        onChange={handleCustomSubtitleFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Video configuration settings dropdown */}
            <button
              onClick={() => {
                setShowSettingsDropdown(!showSettingsDropdown);
                setActivePanel("none");
              }}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {showSettingsDropdown && (
              <div className="absolute bottom-full right-0 mb-3 w-64 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-1 text-xs text-left text-zinc-300 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {activePanel === "none" && (
                  <>
                    <h4 className="font-bold border-b border-zinc-900 pb-2 mb-2 text-zinc-100 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-400" />
                      <span>Codec Parameters</span>
                    </h4>

                    {/* Speed selection click */}
                    <button
                      onClick={() => setActivePanel("speed")}
                      className="w-full flex justify-between items-center px-2 py-2 hover:bg-zinc-900 rounded text-left transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Playback Speed</span>
                      </span>
                      <span className="font-mono text-indigo-400 text-[11px]">
                        {playbackSpeed}x
                      </span>
                    </button>

                    {/* Aspect aspect ratios click */}
                    <button
                      onClick={() => setActivePanel("aspect")}
                      className="w-full flex justify-between items-center px-2 py-2 hover:bg-zinc-900 rounded text-left transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <Maximize className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Aspect Ratio</span>
                      </span>
                      <span className="font-mono text-indigo-400 text-[11px] uppercase">
                        {aspectRatio}
                      </span>
                    </button>

                    {/* Audio track channel click */}
                    <button
                      onClick={() => setActivePanel("audio")}
                      className="w-full flex justify-between items-center px-2 py-2 hover:bg-zinc-900 rounded text-left transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <AudioLines className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Audio Track</span>
                      </span>
                      <span className="text-[10px] text-indigo-400 truncate max-w-[100px] text-right font-mono">
                        {audioTracks[activeAudioIndex]}
                      </span>
                    </button>

                    {/* Brightness calibration slide */}
                    <div className="border-t border-zinc-900 mt-2 pt-2">
                      <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Brightness Overlay</span>
                        </span>
                        <span className="font-bold text-white">
                          {Math.round(brightness * 33)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        value={brightness}
                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </>
                )}

                {activePanel === "speed" && (
                  <div>
                    <button
                      onClick={() => setActivePanel("none")}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white mb-2"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back to Main
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            setPlaybackSpeed(spd);
                            setActivePanel("none");
                            triggerHUD("ratio", `Speed: ${spd}x`);
                          }}
                          className={`px-2.5 py-1.5 rounded text-center transition-colors text-[11px] font-mono ${
                            playbackSpeed === spd
                              ? "bg-indigo-600 text-white font-bold"
                              : "bg-zinc-900 hover:bg-zinc-800"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activePanel === "aspect" && (
                  <div>
                    <button
                      onClick={() => setActivePanel("none")}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white mb-2"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back to Main
                    </button>
                    <div className="space-y-1">
                      {(["fit", "fill", "zoom", "16:9", "4:3"] as AspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => {
                            setAspectRatio(ratio);
                            setActivePanel("none");
                            triggerHUD("ratio", `Aspect: ${ratio.toUpperCase()}`);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded text-left transition-colors text-[11px] flex justify-between font-mono ${
                            aspectRatio === ratio
                              ? "bg-indigo-600 text-white font-bold"
                              : "hover:bg-zinc-905 bg-zinc-900"
                          }`}
                        >
                          <span>{ratio.toUpperCase()}</span>
                          <span className="text-[9px] text-zinc-500">
                            {ratio === "fit" && "Contain standard ratio"}
                            {ratio === "fill" && "Fit display height"}
                            {ratio === "zoom" && "Immersive crop"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activePanel === "audio" && (
                  <div>
                    <button
                      onClick={() => setActivePanel("none")}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white mb-2"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back to Main
                    </button>
                    <div className="space-y-1">
                      {audioTracks.map((track, idx) => (
                        <button
                          key={track}
                          onClick={() => {
                            setActiveAudioIndex(idx);
                            setActivePanel("none");
                            triggerHUD("ratio", `Audio: CH ${idx + 1}`);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded text-left transition-colors text-[11px] truncate ${
                            activeAudioIndex === idx
                              ? "bg-indigo-600 text-white font-bold"
                              : "hover:bg-zinc-905 bg-zinc-900"
                          }`}
                        >
                          {track}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Float Picture-in-Picture Trigger button */}
            <button
              onClick={togglePictureInPicture}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              title="Mini floating Player"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* Absolute Fullscreen Trigger button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              title="Full screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
