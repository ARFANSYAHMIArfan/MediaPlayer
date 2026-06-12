import React, { useState, useEffect, useRef } from "react";
import { Tv, Play, Radio, Volume2, Sparkles, AlertCircle } from "lucide-react";
import { AspectRatio } from "../types";

export default function CastingReceiver() {
  const [syncState, setSyncState] = useState<{
    videoName: string;
    videoUrl: string;
    isPlaying: boolean;
    volume: number;
    playbackSpeed: number;
    aspectRatio: AspectRatio;
    brightness: number;
    activeSubtitleText: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "idle" | "streaming">("connecting");
  const [currentSyncTime, setCurrentSyncTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Audio context or user interaction warning
    const initStatus = () => {
      setConnectionStatus("idle");
    };
    initStatus();

    const channel = new BroadcastChannel("mediaplayer_cast_sync");

    channel.onmessage = (event) => {
      const data = event.data;

      if (data.type === "sync_state") {
        setSyncState({
          videoName: data.videoName,
          videoUrl: data.videoUrl,
          isPlaying: data.isPlaying,
          volume: data.volume,
          playbackSpeed: data.playbackSpeed,
          aspectRatio: data.aspectRatio,
          brightness: data.brightness,
          activeSubtitleText: data.activeSubtitleText,
        });
        setConnectionStatus("streaming");
      } else if (data.type === "seek_sync") {
        setCurrentSyncTime(data.currentTime);
        if (data.duration) setDuration(data.duration);

        // Sync receiver's physical video playhead
        if (videoRef.current && Math.abs(videoRef.current.currentTime - data.currentTime) > 0.8) {
          videoRef.current.currentTime = data.currentTime;
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Update physical video element attributes based on changed sync state
  useEffect(() => {
    if (!videoRef.current || !syncState) return;
    const vEl = videoRef.current;

    // Source change
    if (vEl.src !== syncState.videoUrl) {
      vEl.src = syncState.videoUrl;
      vEl.load();
    }

    // Play/Pause sync
    if (syncState.isPlaying && vEl.paused) {
      vEl.play().catch((err) => {
        console.warn("Autoplay/Play call blocked without user action. Keep receiver active.", err);
      });
    } else if (!syncState.isPlaying && !vEl.paused) {
      vEl.pause();
    }

    // Speed Sync
    if (vEl.playbackRate !== syncState.playbackSpeed) {
      vEl.playbackRate = syncState.playbackSpeed;
    }

    // Volume Sync
    if (vEl.volume !== syncState.volume) {
      vEl.volume = syncState.volume;
    }
  }, [syncState]);

  // Handle aspect ratio height styling rules
  const getAspectRatioClass = () => {
    if (!syncState) return "object-contain w-full h-full";
    switch (syncState.aspectRatio) {
      case "fill":
        return "object-fill w-full h-full";
      case "zoom":
        return "object-cover w-full h-full scale-105";
      case "16:9":
        return "aspect-video w-full h-auto object-cover max-h-full";
      case "4:3":
        return "aspect-[4/3] w-auto h-full object-cover max-w-full";
      case "fit":
      default:
        return "object-contain w-full h-full";
    }
  };

  const handleManualActivatePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        if (syncState && !syncState.isPlaying) {
          videoRef.current?.pause();
        }
      }).catch(err => console.log(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center overflow-hidden z-[99999]">
      {/* Streaming Workspace Mirror */}
      {connectionStatus === "streaming" && syncState?.videoUrl ? (
        <div 
          className="relative w-full h-full flex items-center justify-center bg-black transition-all"
          style={{ filter: `brightness(${syncState.brightness})` }}
        >
          <video
            ref={videoRef}
            className={`transition-all duration-300 ${getAspectRatioClass()}`}
            playsInline
            controls={false}
            muted={false}
          />

          {/* Cinematic Overlay Subtitles */}
          {syncState.activeSubtitleText && (
            <div className="absolute bottom-16 inset-x-8 text-center z-50 pointer-events-none select-none">
              <span
                className="px-6 py-3 bg-black/85 text-white rounded-xl border border-zinc-900 font-sans font-semibold tracking-wide text-lg md:text-2xl lg:text-3xl inline-block max-w-4xl shadow-2xl leading-relaxed text-center"
                dangerouslySetInnerHTML={{ __html: syncState.activeSubtitleText }}
              />
            </div>
          )}

          {/* Quick HUD Cast Indicator */}
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/85 border border-zinc-800/80 px-3 py-1.5 rounded-full text-xs text-zinc-400 z-50 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-mono tracking-wider uppercase text-[10px]">Casting Display • Live</span>
          </div>

          {/* Auto Unlock Audio Interaction Assist Overlay */}
          <button 
            onClick={handleManualActivatePlay}
            className="absolute top-6 right-6 flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs text-white z-50 transition-all font-semibold active:scale-95"
            title="Some browsers require clicking to authorize external window audio"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Sync Sound Track</span>
          </button>
        </div>
      ) : (
        /* Standby / Sync Connection setup wallpaper */
        <div className="p-8 text-center max-w-lg flex flex-col items-center justify-center relative">
          <div className="absolute -z-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -z-10 w-80 h-80 bg-rose-600/5 rounded-full blur-[80px] delay-100" />

          {/* Casting logo representation */}
          <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-3xl shadow-xl mb-6 relative group animate-bounce duration-[4000ms]">
            <Tv className="w-16 h-16 text-indigo-400" />
            <div className="absolute -top-1 -right-1 bg-rose-500 text-[9px] font-mono font-bold uppercase py-0.5 px-2 rounded-full border border-neutral-950 animate-pulse text-white">
              STANDBY
            </div>
          </div>

          <h1 className="text-2xl font-bold font-sans tracking-tight mb-2 text-zinc-50">
            TV & Screen Mirror Base
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed mb-8">
            You are now in full immersion external target mode. Place this secondary screen on your Smart TV, second HDMI monitor, or projector beam.
          </p>

          <div className="bg-zinc-900/80 border border-zinc-850 p-4 rounded-2xl w-full text-left space-y-3.5 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700/40 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">1</div>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-normal">
                Leave files open on the main player dashboard.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700/40 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">2</div>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-normal">
                Press the <strong className="text-indigo-400 font-semibold">"Cast Display Device"</strong> projection icon inside the video's control tray.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-700/40 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">3</div>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-normal">
                This external window will match the video container, subtitles, offset, active speeds, and audio feeds!
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span>High fidelity HTML5 Broadcast Stream</span>
          </div>
        </div>
      )}
    </div>
  );
}
