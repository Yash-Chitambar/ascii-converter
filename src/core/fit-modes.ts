import type { FitMode, FitResult } from "../types";

/**
 * Computes source-crop and destination-placement rectangles for a given fit
 * mode, analogous to the CSS object-fit property.
 *
 * All values are in pixels relative to their respective coordinate spaces.
 *
 * @param srcWidth  Natural width of the source media (image / video frame).
 * @param srcHeight Natural height of the source media.
 * @param dstWidth  Width of the destination canvas / grid in pixels.
 * @param dstHeight Height of the destination canvas / grid in pixels.
 * @param mode      One of 'cover' | 'contain' | 'fill' | 'none'.
 */
export function computeFit(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  mode: FitMode
): FitResult {
  switch (mode) {
    case "cover":
      return fitCover(srcWidth, srcHeight, dstWidth, dstHeight);
    case "contain":
      return fitContain(srcWidth, srcHeight, dstWidth, dstHeight);
    case "fill":
      return fitFill(srcWidth, srcHeight, dstWidth, dstHeight);
    case "none":
      return fitNone(srcWidth, srcHeight, dstWidth, dstHeight);
  }
}

// ---------------------------------------------------------------------------
// Cover — scale to fill, crop overflow, center
// ---------------------------------------------------------------------------

function fitCover(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): FitResult {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  // Crop to destination, centered
  const cropX = (scaledW - dstW) / 2 / scale;
  const cropY = (scaledH - dstH) / 2 / scale;
  const cropW = dstW / scale;
  const cropH = dstH / scale;

  return {
    sx: cropX,
    sy: cropY,
    sw: cropW,
    sh: cropH,
    dx: 0,
    dy: 0,
    dw: dstW,
    dh: dstH,
  };
}

// ---------------------------------------------------------------------------
// Contain — scale to fit within destination, letterbox with empty space
// ---------------------------------------------------------------------------

function fitContain(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): FitResult {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  const offsetX = (dstW - scaledW) / 2;
  const offsetY = (dstH - scaledH) / 2;

  return {
    sx: 0,
    sy: 0,
    sw: srcW,
    sh: srcH,
    dx: offsetX,
    dy: offsetY,
    dw: scaledW,
    dh: scaledH,
  };
}

// ---------------------------------------------------------------------------
// Fill — stretch to exact destination dimensions (ignores aspect ratio)
// ---------------------------------------------------------------------------

function fitFill(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): FitResult {
  return {
    sx: 0,
    sy: 0,
    sw: srcW,
    sh: srcH,
    dx: 0,
    dy: 0,
    dw: dstW,
    dh: dstH,
  };
}

// ---------------------------------------------------------------------------
// None — render at source resolution, centered, clip overflow
// ---------------------------------------------------------------------------

function fitNone(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): FitResult {
  const offsetX = (dstW - srcW) / 2;
  const offsetY = (dstH - srcH) / 2;

  // Clamp source crop to what is actually visible
  const visibleSrcX = Math.max(0, -offsetX);
  const visibleSrcY = Math.max(0, -offsetY);
  const visibleSrcW = Math.min(srcW, dstW - Math.max(0, offsetX));
  const visibleSrcH = Math.min(srcH, dstH - Math.max(0, offsetY));

  return {
    sx: visibleSrcX,
    sy: visibleSrcY,
    sw: visibleSrcW,
    sh: visibleSrcH,
    dx: Math.max(0, offsetX),
    dy: Math.max(0, offsetY),
    dw: visibleSrcW,
    dh: visibleSrcH,
  };
}
