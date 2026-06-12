import React, { useState, useEffect } from "react";
import { MediaProvider, useMedia } from "./context/MediaContext";
import MainLibrary from "./components/MainLibrary";
import VideoPlayerSuite from "./components/VideoPlayerSuite";
import CastingReceiver from "./components/CastingReceiver";

function InnerApp() {
  const { activeVideo } = useMedia();
  const [isReceiverMode, setIsReceiverMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsReceiverMode(params.get("mode") === "receiver");
  }, []);

  if (isReceiverMode) {
    return <CastingReceiver />;
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 overflow-x-hidden font-sans select-none antialiased">
      <MainLibrary />
      {activeVideo && <VideoPlayerSuite />}
    </div>
  );
}

export default function App() {
  return (
    <MediaProvider>
      <InnerApp />
    </MediaProvider>
  );
}
