import { MediaFile } from "../types";

export const SAMPLE_VIDEOS: MediaFile[] = [
  {
    id: "sample-sintel",
    name: "Sintel (Blender Open Movie).mp4",
    size: 243901244, // ~232 MB
    duration: 888, // 14 mins 48 secs
    resolution: "1080p",
    format: "mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
    folder: "Movies/Fantasy",
    isSample: true,
  },
  {
    id: "sample-bunny",
    name: "Big Buck Bunny - HD Edition.mp4",
    size: 132103520, // ~126 MB
    duration: 596, // 9 mins 56 secs
    resolution: "1080p",
    format: "mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1590157121773-619e0cf6ea04?w=400&q=80",
    folder: "Downloads/Animation",
    isSample: true,
  },
  {
    id: "sample-tears",
    name: "Tears of Steel (Sci-Fi VFX Project).mp4",
    size: 471012920, // ~449 MB
    duration: 734, // 12 mins 14 secs
    resolution: "4K (GPU Acceleration Enabled)",
    format: "mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
    folder: "Movies/Sci-Fi",
    isSample: true,
  },
  {
    id: "sample-elephants",
    name: "Elephants Dream.mp4",
    size: 198218412, // ~189 MB
    duration: 653, // 10 mins 53 secs
    resolution: "720p",
    format: "mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80",
    folder: "Downloads/Animation",
    isSample: true,
  }
];
