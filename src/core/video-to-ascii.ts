import type { AsciiGrid, FitMode } from "../types";
import type { RampPreset } from "../types";
import { imageDataToAsciiGrid } from "./image-to-ascii";
import { MAX_DELTA_MS } from "../constants";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface VideoToAsciiOptions {
  gridCols: number;
  gridRows: number;
  rampPreset?: RampPreset | string;
  customCharacters?: string;
  characterDensity?: number;
  invertBrightness?: boolean;
  fitMode?: FitMode;
  resolutionScale?: number;
  /** Target frames per second (5–60). Default: 15. */
  targetFps?: number;
}

// ---------------------------------------------------------------------------
// Frame capture helpers
// ---------------------------------------------------------------------------

/**
 * Captures the current video frame to an ImageData object via an offscreen
 * canvas. Returns null if the video is not ready.
 */
function captureVideoFrame(
  video: HTMLVideoElement,
  sampleWidth: number,
  sampleHeight: number,
  fitMode: FitMode
): ImageData | null {
  if (video.readyState < 2) return null; // HAVE_CURRENT_DATA

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (srcW === 0 || srcH === 0) return null;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(sampleWidth, sampleHeight);
    ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  } else {
    canvas = document.createElement("canvas");
    (canvas as HTMLCanvasElement).width = sampleWidth;
    (canvas as HTMLCanvasElement).height = sampleHeight;
    ctx = (canvas as HTMLCanvasElement).getContext("2d") as CanvasRenderingContext2D;
  }

  // Import here to avoid circular dependency
  const { computeFit } = require("./fit-modes");
  const fit = computeFit(srcW, srcH, sampleWidth, sampleHeight, fitMode);

  ctx.clearRect(0, 0, sampleWidth, sampleHeight);
  ctx.drawImage(
    video,
    fit.sx, fit.sy, fit.sw, fit.sh,
    fit.dx, fit.dy, fit.dw, fit.dh
  );

  return ctx.getImageData(0, 0, sampleWidth, sampleHeight);
}

// ---------------------------------------------------------------------------
// RAF-based conversion loop
// ---------------------------------------------------------------------------

export interface VideoAsciiLoop {
  /** Start the render loop. */
  start: () => void;
  /** Stop the render loop. */
  stop: () => void;
  /** Returns true when the loop is currently running. */
  isRunning: () => boolean;
}

/**
 * Creates a requestAnimationFrame loop that continuously converts video
 * frames to AsciiGrid and invokes an onFrame callback.
 *
 * Key behaviours carried over from the personal website:
 * - delta time is clamped to MAX_DELTA_MS (50ms) to prevent explosions after
 *   tab switching.
 * - Frame skipping: if conversion takes longer than one frame interval the
 *   next frame is processed immediately rather than accumulating lag.
 */
export function createVideoAsciiLoop(
  video: HTMLVideoElement,
  options: VideoToAsciiOptions,
  onFrame: (grid: AsciiGrid) => void
): VideoAsciiLoop {
  const {
    gridCols,
    gridRows,
    rampPreset = "standard",
    customCharacters,
    characterDensity = 0.5,
    invertBrightness = false,
    fitMode = "cover",
    resolutionScale = 0.5,
    targetFps = 15,
  } = options;

  const frameInterval = 1000 / targetFps;
  let rafId: number | null = null;
  let lastFrameTime = 0;
  let running = false;

  const sampleW = Math.max(1, Math.round(gridCols * (1 / resolutionScale)));
  const sampleH = Math.max(1, Math.round(gridRows * (1 / resolutionScale)));

  function tick(timestamp: number): void {
    if (!running) return;

    const delta = Math.min(timestamp - lastFrameTime, MAX_DELTA_MS);

    if (delta >= frameInterval) {
      lastFrameTime = timestamp;

      const imageData = captureVideoFrame(video, sampleW, sampleH, fitMode);
      if (imageData) {
        const grid = imageDataToAsciiGrid(imageData, {
          gridCols,
          gridRows,
          rampPreset,
          customCharacters,
          characterDensity,
          invertBrightness,
        });
        onFrame(grid);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastFrameTime = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}

// ---------------------------------------------------------------------------
// Webcam stream helper
// ---------------------------------------------------------------------------

/**
 * Requests webcam access and returns an HTMLVideoElement playing the stream.
 * The caller is responsible for calling video.srcObject = null; stream.stop()
 * during cleanup.
 */
export async function createWebcamVideo(): Promise<{
  video: HTMLVideoElement;
  stream: MediaStream;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  return { video, stream };
}
