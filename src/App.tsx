import { MediaProvider, useMedia } from "./context/MediaContext";
import MainLibrary from "./components/MainLibrary";
import VideoPlayerSuite from "./components/VideoPlayerSuite";

function InnerApp() {
  const { activeVideo } = useMedia();

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
