import { RAMPS, ALPHA_THRESHOLD, DARK_THRESHOLD } from "../constants";
import type { RampPreset } from "../types";

// ---------------------------------------------------------------------------
// Brightness conversion (luminosity formula — do NOT change weights)
// ---------------------------------------------------------------------------

/** Converts linear RGB (0–255 each) to perceived brightness (0.0–1.0). */
export function rgbToBrightness(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---------------------------------------------------------------------------
// Ramp selection
// ---------------------------------------------------------------------------

/** Returns the ramp string for a named preset or falls back to standard. */
export function getRamp(preset: RampPreset | string): string {
  return RAMPS[preset as RampPreset] ?? RAMPS.standard;
}

/**
 * Creates a user-defined ramp from an arbitrary character string.
 * The first character should be the densest (brightest) and the last the
 * least dense (darkest). A trailing space is appended if not present.
 */
export function createCustomRamp(chars: string): string {
  if (!chars) return RAMPS.standard;
  return chars.endsWith(" ") ? chars : chars + " ";
}

/**
 * Returns a subset of the ramp controlled by a density slider (0.0–1.0).
 * density=1.0 returns the full ramp; density=0.0 returns just two chars
 * (densest + space), giving a near-binary result.
 */
export function densityToRampSubset(density: number, ramp: string): string {
  const clamped = Math.max(0, Math.min(1, density));
  const minChars = 2;
  const targetLen = Math.round(minChars + clamped * (ramp.length - minChars));
  if (targetLen >= ramp.length) return ramp;

  // Always keep first char (densest) and last char (space / lightest)
  const step = (ramp.length - 1) / (targetLen - 1);
  let result = "";
  for (let i = 0; i < targetLen; i++) {
    result += ramp[Math.round(i * step)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Char ↔ brightness lookup
// ---------------------------------------------------------------------------

/**
 * Maps a brightness value (0.0–1.0) to an ASCII character from the given ramp.
 * Ramp is ordered dense-to-light, so index 0 = brightest.
 */
export function brightnessToChar(
  brightness: number,
  ramp: string,
  invert = false
): string {
  const b = invert ? 1 - brightness : brightness;
  // Clamp then map: 1.0 → index 0 (dense), 0.0 → last index (space)
  const idx = Math.min(
    ramp.length - 1,
    Math.floor((1 - b) * ramp.length)
  );
  return ramp[idx];
}

/**
 * Pre-computes a reverse lookup: char → approximate brightness.
 * Useful for effects that need to go from ASCII back to brightness.
 */
export function buildCharBrightnessMap(ramp: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < ramp.length; i++) {
    map.set(ramp[i], 1 - i / (ramp.length - 1));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Pixel qualification helpers (reusable across image + video pipelines)
// ---------------------------------------------------------------------------

/** Returns true if a pixel's alpha channel is fully transparent (skip it). */
export function isTransparent(alpha: number): boolean {
  return alpha < ALPHA_THRESHOLD;
}

/** Returns true if a pixel is too dark to distinguish from the background. */
export function isDark(brightness: number): boolean {
  return brightness < DARK_THRESHOLD;
}
