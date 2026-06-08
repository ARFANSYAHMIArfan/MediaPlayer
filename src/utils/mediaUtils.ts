/**
 * Utility functions for local media indexing, duration formatting, and metadata analysis.
 */

/**
 * Robustly formats byte sizes to appropriate human-readable scales (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Robustly formats duration in seconds to hh:mm:ss or mm:ss.
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString();
  const sStr = s.toString().padStart(2, "0");

  if (h > 0) {
    return `${h}:${mStr.padStart(2, "0")}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

/**
 * Dynamically extract dimensions and generate a base64 canvas-backed thumbnail for a local Video File.
 */
export function analyzeLocalVideoFile(file: File): Promise<{
  duration: number;
  resolution: string;
  thumbnail: string;
}> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let resolution = "1080p";

    video.src = objectUrl;
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      resolve({
        duration: 0,
        resolution: "1080p",
        thumbnail: createDefaultThumbnailPlaceholder(file.name),
      });
      cleanup();
    }, 4500);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.remove();
      // We don't revoke here because the original local file might still be loaded from the storage item,
      // but we do release this video's lifecycle.
    }

    function onMetadata() {
      // Determine resolution tag
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;

      if (width >= 3840 || height >= 2160) {
        resolution = "4K";
      } else if (width >= 2560 || height >= 1440) {
        resolution = "2K";
      } else if (width >= 1920 || height >= 1080) {
        resolution = "1080p";
      } else if (width >= 1280 || height >= 720) {
        resolution = "720p";
      } else if (width > 0) {
        resolution = `${height}p`;
      }

      // Try seeking to 1s to capture a meaningful frame (instead of frame 0 which is often black)
      const seekTime = Math.min(1.5, video.duration / 2 || 0);
      video.currentTime = seekTime;
    }

    function onSeeked() {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        // Thumbnail size
        canvas.width = 320;
        canvas.height = 180;

        if (ctx) {
          // Fill background
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Return base64 thumbnail
          const thumbnail = canvas.toDataURL("image/jpeg", 0.75);
          resolve({
            duration: video.duration || 120,
            resolution,
            thumbnail,
          });
        } else {
          throw new Error("Canvas context is unavailable");
        }
      } catch (err) {
        resolve({
          duration: video.duration || 120,
          resolution: "1080p",
          thumbnail: createDefaultThumbnailPlaceholder(file.name),
        });
      } finally {
        cleanup();
      }
    }

    function onError() {
      resolve({
        duration: 0,
        resolution: "1080p",
        thumbnail: createDefaultThumbnailPlaceholder(file.name),
      });
      cleanup();
    }

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
  });
}

/**
 * Creates a beautiful geometric fallback canvas representation for video thumbnails if generation fails
 * or the media format is not natively seekable inside HTML5 video metadata tags.
 */
export function createDefaultThumbnailPlaceholder(title: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 168;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Draw smooth dark tech gradient
  const grad = ctx.createLinearGradient(0, 0, 300, 168);
  grad.addColorStop(0, "#090d16");
  grad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 300, 168);

  // Draw subtle grid
  ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 300; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 168);
    ctx.stroke();
  }
  for (let y = 0; y < 168; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(300, y);
    ctx.stroke();
  }

  // Draw minimalist video play icon geometry in center
  ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
  ctx.beginPath();
  ctx.arc(150, 84, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(144, 72);
  ctx.lineTo(162, 84);
  ctx.lineTo(144, 96);
  ctx.closePath();
  ctx.fill();

  // Draw file name snippet
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  const nameToDraw = title.length > 28 ? title.substring(0, 25) + "..." : title;
  ctx.fillText(nameToDraw, 150, 140);

  return canvas.toDataURL("image/jpeg");
}
