import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AsciiGrid } from "../types";
import type { RampPreset } from "../types";
import { imageDataToAsciiGrid } from "../core/image-to-ascii";
import { autoFrameCamera } from "./auto-framer";
import { MAX_DELTA_MS } from "../constants";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface GLBToAsciiOptions {
  modelUrl: string;
  width: number;
  height: number;
  gridCols: number;
  gridRows: number;
  rotation: { x: number; y: number; z: number };
  autoRotate: boolean;
  autoRotateSpeed: number; // degrees per second
  colorMode: "monochrome" | "original";
  rampPreset?: RampPreset | string;
  customCharacters?: string;
  characterDensity?: number;
  invertBrightness?: boolean;
  resolutionScale?: number;
  refreshRate?: number; // target FPS for ASCII re-render
}

// ---------------------------------------------------------------------------
// Renderer loop handle
// ---------------------------------------------------------------------------

export interface GLBToAsciiHandle {
  start: () => void;
  stop: () => void;
  dispose: () => void;
  isRunning: () => boolean;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Creates an offscreen Three.js renderer that continuously renders a GLB
 * model and samples pixels to produce AsciiGrid frames.
 *
 * The pipeline:
 *   GLTFLoader → scene setup → WebGLRenderer (offscreen) → RAF loop →
 *   readRenderTargetPixels → imageDataToAsciiGrid → onFrame callback
 */
export async function createGLBToAsciiRenderer(
  options: GLBToAsciiOptions,
  onFrame: (grid: AsciiGrid) => void
): Promise<GLBToAsciiHandle> {
  const {
    modelUrl,
    width,
    height,
    gridCols,
    gridRows,
    rotation,
    autoRotate,
    autoRotateSpeed,
    rampPreset = "standard",
    customCharacters,
    characterDensity = 0.5,
    invertBrightness = false,
    resolutionScale = 0.5,
    refreshRate = 15,
  } = options;

  const frameInterval = 1000 / refreshRate;

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = null; // transparent background

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // --- Offscreen renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);

  // Render target for readback
  const sampleW = Math.max(1, Math.round(gridCols / resolutionScale));
  const sampleH = Math.max(1, Math.round(gridRows / resolutionScale));
  const renderTarget = new THREE.WebGLRenderTarget(sampleW, sampleH);
  const pixelBuffer = new Uint8Array(sampleW * sampleH * 4);

  // --- Load GLB ---
  const loader = new GLTFLoader();
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>(
    (resolve, reject) => loader.load(modelUrl, resolve, undefined, reject)
  );

  const model = gltf.scene;

  // Apply initial rotation
  model.rotation.set(
    (rotation.x * Math.PI) / 180,
    (rotation.y * Math.PI) / 180,
    (rotation.z * Math.PI) / 180
  );

  scene.add(model);
  autoFrameCamera(camera, scene);

  // --- RAF loop ---
  let rafId: number | null = null;
  let lastFrameTime = 0;
  let running = false;
  let lastTimestamp = 0;

  function tick(timestamp: number): void {
    if (!running) return;

    const delta = Math.min(timestamp - lastFrameTime, MAX_DELTA_MS);

    // Auto-rotate model
    if (autoRotate) {
      const elapsed = Math.min(timestamp - lastTimestamp, MAX_DELTA_MS);
      model.rotation.y += (autoRotateSpeed * Math.PI) / 180 / 1000 * elapsed;
    }
    lastTimestamp = timestamp;

    if (delta >= frameInterval) {
      lastFrameTime = timestamp;

      // Render to offscreen target
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);

      // Read pixels back to CPU
      renderer.readRenderTargetPixels(renderTarget, 0, 0, sampleW, sampleH, pixelBuffer);
      renderer.setRenderTarget(null);

      // WebGL reads pixels bottom-up — flip vertically
      const flipped = flipY(pixelBuffer, sampleW, sampleH);

      // Wrap in ImageData — copy into a plain ArrayBuffer to satisfy TS strict types
      const clamped = new Uint8ClampedArray(flipped.length);
      clamped.set(flipped);
      const imageData = new ImageData(clamped, sampleW, sampleH);

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

    rafId = requestAnimationFrame(tick);
  }

  // Shared stop logic used by both stop() and dispose() via closure
  function stopLoop(): void {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastFrameTime = 0;
      lastTimestamp = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      stopLoop();
    },
    dispose() {
      stopLoop();
      renderTarget.dispose();
      renderer.dispose();
      scene.clear();
    },
    isRunning() {
      return running;
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: flip pixel buffer vertically (WebGL returns bottom-up)
// ---------------------------------------------------------------------------

function flipY(buffer: Uint8Array, width: number, height: number): Uint8Array {
  const rowSize = width * 4;
  const flipped = new Uint8Array(buffer.length);
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * rowSize;
    const dstRow = y * rowSize;
    flipped.set(buffer.subarray(srcRow, srcRow + rowSize), dstRow);
  }
  return flipped;
}
