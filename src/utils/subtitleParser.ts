export interface SubtitleCue {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

/**
 * Parses time-string to seconds (decimal float)
 * e.g., "00:01:20,400" -> 80.4 or "01:23.000" -> 83.0
 */
function parseTimeToSeconds(timeStr: string): number {
  const cleanStr = timeStr.trim().replace(",", "."); // normalize webvtt vs srt
  const parts = cleanStr.split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  } else {
    seconds = parseFloat(cleanStr);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Super robust Client-Side Subtitle Parser for SubRip (.srt) and WebVTT (.vtt) file formats.
 */
export function parseSubtitles(rawText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  
  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split on double linebreaks or index breaks
  const blocks = normalized.split(/\n\s*\n/);

  let cueCount = 0;

  blocks.forEach((block) => {
    const lines = block.trim().split("\n");
    if (lines.length < 2) return;

    let timeLine = "";
    let textStartIndex = 1;

    // Skip the index line if this is SRT
    if (/^\d+$/.test(lines[0].trim())) {
      timeLine = lines[1] || "";
      textStartIndex = 2;
    } else {
      // Check if it's WEBVTT header
      if (lines[0].toUpperCase().includes("WEBVTT") && lines.length > 1) {
        timeLine = lines[1];
        textStartIndex = 2;
      } else {
        timeLine = lines[0];
        textStartIndex = 1;
      }
    }

    // Match typical arrow formats e.g. "00:00:00.000 --> 00:00:03.000" or SRT format with commas
    if (timeLine.includes("-->")) {
      const timeParts = timeLine.split("-->");
      if (timeParts.length === 2) {
        try {
          const startTime = parseTimeToSeconds(timeParts[0]);
          const endTime = parseTimeToSeconds(timeParts[1]);
          const text = lines.slice(textStartIndex).join("<br />"); // preserve multi-line subtitles with clean spacing

          if (!isNaN(startTime) && !isNaN(endTime)) {
            cueCount++;
            cues.push({
              id: `cue-${cueCount}-${startTime}`,
              startTime,
              endTime,
              text,
            });
          }
        } catch (e) {
          console.warn("Skipping malformed cue group line parse error.", e);
        }
      }
    }
  });

  return cues;
}

/**
 * Built-in standard demonstration VTT content so users don't need subtitle files
 * to immediately see our advanced multi-language subtitle offset syncers in action!
 */
export const DEMO_ENGLISH_VTT = `WEBVTT

00:00:02.000 --> 00:00:06.000
<b>Welcome to MediaPlayer Suite!</b><br />This movie supports hardware acceleration.

00:00:07.500 --> 00:00:11.800
Use the left side of the screen to slide up and down for brightness.

00:00:12.300 --> 00:00:16.800
Slide on the right side of the screen is wired to volume control.

00:00:17.500 --> 00:00:23.000
Double click sections to skip ±10 seconds, and use standard speeds up to 2.0x!

00:00:25.000 --> 00:00:30.000
You can adjust subtitle synchronization latency using our Settings panel below.
`;

export const DEMO_SPANISH_VTT = `WEBVTT

00:00:02.000 --> 00:00:06.000
<b>¡Bienvenido a MediaPlayer Suite!</b><br />Esta película es compatible con la aceleración por hardware.

00:00:07.500 --> 00:00:11.800
Utilice el lado izquierdo de la pantalla para deslizar hacia arriba y hacia abajo para el brillo.

00:00:12.300 --> 00:00:16.800
Deslizar en el lado derecho de la pantalla está conectado al volumen.

00:00:17.500 --> 00:00:23.000
¡Haga doble clic para saltar ±10 segundos, y use velocidades estándar de hasta 2.0x!

00:00:25.000 --> 00:00:30.000
Puede ajustar la latencia de sincronización de subtítulos usando nuestro panel de Configuración.
`;
