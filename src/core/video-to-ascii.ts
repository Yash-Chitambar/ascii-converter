import type { AsciiGrid, FitMode } from "../types";
import type { RampPreset } from "../types";
import { imageDataToAsciiGrid } from "./image-to-ascii";
import { computeFit } from "./fit-modes";
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
// RAF-based conversion loop
// ---------------------------------------------------------------------------

export interface VideoAsciiLoop {
  /** Start the render loop (full start — resets timing). */
  start: () => void;
  /** Stop the render loop (full stop — cancels RAF, removes listeners). */
  stop: () => void;
  /** Cancel RAF, preserve running state (for viewport/tab transitions). */
  pause: () => void;
  /** Restart RAF without resetting lastFrameTime (smooth resume). */
  resume: () => void;
  /** Returns true when the loop is actively rendering frames. */
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
  let paused = false;

  const sampleW = Math.max(1, Math.round(gridCols * (1 / resolutionScale)));
  const sampleH = Math.max(1, Math.round(gridRows * (1 / resolutionScale)));

  // ── Allocate canvas ONCE per loop instance (not per frame) ──────────────
  const samplingCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(sampleW, sampleH)
      : (() => {
          const c = document.createElement("canvas");
          c.width  = sampleW;
          c.height = sampleH;
          return c;
        })();
  const samplingCtx = samplingCanvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  // ────────────────────────────────────────────────────────────────────────

  function captureFrame(): ImageData | null {
    if (video.readyState < 2) return null;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (srcW === 0 || srcH === 0) return null;

    const fit = computeFit(srcW, srcH, sampleW, sampleH, fitMode);
    samplingCtx.clearRect(0, 0, sampleW, sampleH);
    samplingCtx.drawImage(
      video,
      fit.sx, fit.sy, fit.sw, fit.sh,
      fit.dx, fit.dy, fit.dw, fit.dh
    );
    return samplingCtx.getImageData(0, 0, sampleW, sampleH);
  }

  function tick(timestamp: number): void {
    if (!running || paused) return;

    const delta = Math.min(timestamp - lastFrameTime, MAX_DELTA_MS);

    if (delta >= frameInterval) {
      lastFrameTime = timestamp;

      const imageData = captureFrame();
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

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") loop.pause();
    else                                        loop.resume();
  }

  const loop: VideoAsciiLoop = {
    start() {
      if (running) return;
      running = true;
      paused = false;
      lastFrameTime = 0;
      document.addEventListener("visibilitychange", onVisibilityChange);
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      paused = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    },
    pause() {
      if (!running || paused) return;
      paused = true;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    },
    resume() {
      if (!running || !paused) return;
      paused = false;
      rafId = requestAnimationFrame(tick);
    },
    isRunning() { return running && !paused; },
  };
  return loop;
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
