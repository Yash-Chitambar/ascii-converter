import type { AsciiGrid, AsciiCell, FitMode } from "../types";
import { rgbToBrightness, brightnessToChar, isTransparent, isDark, densityToRampSubset, getRamp, buildCharLUT } from "./char-ramp";
import { computeFit } from "./fit-modes";
import type { RampPreset } from "../types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ImageToAsciiOptions {
  /** Grid columns (number of ASCII characters per row). */
  gridCols: number;
  /** Grid rows (number of ASCII character rows). */
  gridRows: number;
  /** Character ramp preset name or custom ramp string. */
  rampPreset?: RampPreset | string;
  /** Custom character set overrides rampPreset when provided. */
  customCharacters?: string;
  /** 0.0–1.0 density slider (1 = full ramp, 0 = near-binary). */
  characterDensity?: number;
  /** If true, bright pixels map to sparse chars (inverted ramp). */
  invertBrightness?: boolean;
  /** Image fitting strategy. */
  fitMode?: FitMode;
  /** 0.25–1.0 — scales the sampling resolution before conversion. */
  resolutionScale?: number;
}

// ---------------------------------------------------------------------------
// Offscreen canvas helper
// ---------------------------------------------------------------------------

function getOrCreateSamplingCanvas(
  width: number,
  height: number,
  existing?: HTMLCanvasElement | OffscreenCanvas
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (existing && existing.width === width && existing.height === height) {
    const ctx = existing.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    return { canvas: existing, ctx };
  }
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, ctx: canvas.getContext("2d") as OffscreenCanvasRenderingContext2D };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
}

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

/**
 * Converts an HTMLImageElement (or ImageBitmap) to an AsciiGrid.
 *
 * The pipeline:
 *   1. Draw source image into an offscreen canvas at (resolutionScale × container) size.
 *   2. Apply fit mode to compute crop/placement rectangles.
 *   3. Sample pixel data — one pixel per grid cell.
 *   4. Convert each pixel: RGB → brightness → char.
 */
export function imageToAsciiGrid(
  source: HTMLImageElement | ImageBitmap,
  containerWidth: number,
  containerHeight: number,
  options: ImageToAsciiOptions,
  existingCanvas?: HTMLCanvasElement | OffscreenCanvas
): { grid: AsciiGrid; canvas: HTMLCanvasElement | OffscreenCanvas } {
  const {
    gridCols,
    gridRows,
    rampPreset = "standard",
    customCharacters,
    characterDensity = 0.5,
    invertBrightness = false,
    fitMode = "cover",
    resolutionScale = 0.5,
  } = options;

  // --- Build ramp ---
  const baseRamp = customCharacters
    ? (customCharacters.endsWith(" ") ? customCharacters : customCharacters + " ")
    : getRamp(rampPreset);
  const ramp = densityToRampSubset(characterDensity, baseRamp);

  // --- Source dimensions ---
  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;

  // --- Sampling canvas dimensions (scaled for performance) ---
  const sampleW = Math.max(1, Math.round(containerWidth * resolutionScale));
  const sampleH = Math.max(1, Math.round(containerHeight * resolutionScale));

  const { canvas, ctx } = getOrCreateSamplingCanvas(sampleW, sampleH, existingCanvas);

  // --- Compute fit ---
  const fit = computeFit(srcW, srcH, sampleW, sampleH, fitMode);

  // Clear with transparency so alpha-threshold check works correctly
  ctx.clearRect(0, 0, sampleW, sampleH);
  ctx.drawImage(
    source as CanvasImageSource,
    fit.sx, fit.sy, fit.sw, fit.sh,
    fit.dx, fit.dy, fit.dw, fit.dh
  );

  const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
  const { data } = imageData;

  // --- Build ASCII grid (block averaging) ---
  const grid: AsciiGrid = [];

  for (let row = 0; row < gridRows; row++) {
    const gridRow: AsciiCell[] = [];

    for (let col = 0; col < gridCols; col++) {
      // Block averaging: average all pixels in the block for this cell
      const x0 = Math.floor((col       / gridCols) * sampleW);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) / gridCols) * sampleW));
      const y0 = Math.floor((row       / gridRows) * sampleH);
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / gridRows) * sampleH));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const i = (py * sampleW + px) * 4;
          rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; aSum += data[i + 3];
          count++;
        }
      }
      const r = rSum / count;
      const g = gSum / count;
      const b = bSum / count;
      const a = aSum / count;

      if (isTransparent(a)) {
        gridRow.push({ char: " ", r: 0, g: 0, b: 0, brightness: 0, isTransparent: true });
        continue;
      }

      const brightness = rgbToBrightness(r, g, b);

      if (isDark(brightness)) {
        gridRow.push({ char: " ", r, g, b, brightness, isTransparent: false });
        continue;
      }

      const char = brightnessToChar(brightness, ramp, invertBrightness);
      gridRow.push({ char, r, g, b, brightness, isTransparent: false });
    }

    grid.push(gridRow);
  }

  return { grid, canvas };
}

// ---------------------------------------------------------------------------
// Convenience: convert from a URL (creates HTMLImageElement internally)
// ---------------------------------------------------------------------------

export function imageUrlToAsciiGrid(
  src: string,
  containerWidth: number,
  containerHeight: number,
  options: ImageToAsciiOptions
): Promise<AsciiGrid> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(imageToAsciiGrid(img, containerWidth, containerHeight, options).grid);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Convenience: convert from raw ImageData (e.g., from WebGL readPixels)
// ---------------------------------------------------------------------------

export function imageDataToAsciiGrid(
  imageData: ImageData,
  options: ImageToAsciiOptions,
  charLUT?: string[]
): AsciiGrid {
  const { gridCols, gridRows, rampPreset = "standard", customCharacters, characterDensity = 0.5, invertBrightness = false } = options;

  const baseRamp = customCharacters
    ? (customCharacters.endsWith(" ") ? customCharacters : customCharacters + " ")
    : getRamp(rampPreset);
  const ramp = densityToRampSubset(characterDensity, baseRamp);

  const { data, width: imgW, height: imgH } = imageData;
  const grid: AsciiGrid = [];

  for (let row = 0; row < gridRows; row++) {
    const gridRow: AsciiCell[] = [];

    for (let col = 0; col < gridCols; col++) {
      // Block averaging: average all pixels in the block for this cell
      const x0 = Math.floor((col       / gridCols) * imgW);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) / gridCols) * imgW));
      const y0 = Math.floor((row       / gridRows) * imgH);
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / gridRows) * imgH));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const i = (py * imgW + px) * 4;
          rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; aSum += data[i + 3];
          count++;
        }
      }
      const r = rSum / count;
      const g = gSum / count;
      const b = bSum / count;
      const a = aSum / count;

      if (isTransparent(a)) {
        gridRow.push({ char: " ", r: 0, g: 0, b: 0, brightness: 0, isTransparent: true });
        continue;
      }

      if (charLUT) {
        // Integer BT.601 formula — identical result, no floating point division
        const intB = ((r * 299 + g * 587 + b * 114 + 500) / 1000) | 0;
        gridRow.push({ char: charLUT[intB], r, g, b, brightness: intB / 255, isTransparent: false });
      } else {
        const brightness = rgbToBrightness(r, g, b);

        if (isDark(brightness)) {
          gridRow.push({ char: " ", r, g, b, brightness, isTransparent: false });
          continue;
        }

        gridRow.push({ char: brightnessToChar(brightness, ramp, invertBrightness), r, g, b, brightness, isTransparent: false });
      }
    }

    grid.push(gridRow);
  }

  return grid;
}
