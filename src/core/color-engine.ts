import type { AsciiGrid, ColorPalette, StyledAsciiCell, StyledAsciiGrid } from "../types";
import { getPalette } from "../palettes";

// ---------------------------------------------------------------------------
// Color interpolation helpers
// ---------------------------------------------------------------------------

/** Parses a 6-digit hex color string to { r, g, b } (0–255). */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/** Converts { r, g, b } (0–255) back to a CSS hex color string. */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolates between two hex colors by factor t (0.0–1.0).
 * t=0 → colorA, t=1 → colorB.
 */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

/**
 * Samples a multi-stop gradient at the given brightness (0.0–1.0).
 * Color stops must be sorted ascending by threshold.
 */
function sampleGradient(
  stops: { threshold: number; color: string }[],
  brightness: number
): string {
  if (stops.length === 0) return "#ffffff";
  if (brightness <= stops[0].threshold) return stops[0].color;
  if (brightness >= stops[stops.length - 1].threshold)
    return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (brightness >= lo.threshold && brightness <= hi.threshold) {
      const t = (brightness - lo.threshold) / (hi.threshold - lo.threshold);
      return lerpColor(lo.color, hi.color, t);
    }
  }
  return stops[stops.length - 1].color;
}

// ---------------------------------------------------------------------------
// Core palette application
// ---------------------------------------------------------------------------

/**
 * Applies a color palette to a raw AsciiGrid, producing a StyledAsciiGrid
 * where every cell carries a `color` and `background` CSS string.
 */
export function applyPalette(
  grid: AsciiGrid,
  paletteOrId: ColorPalette | string
): StyledAsciiGrid {
  const palette =
    typeof paletteOrId === "string" ? getPalette(paletteOrId) : paletteOrId;

  return grid.map((row) =>
    row.map((cell): StyledAsciiCell => {
      if (cell.isTransparent) {
        return { ...cell, color: "transparent", background: "transparent" };
      }

      let color: string;

      switch (palette.type) {
        case "monochrome":
          color = palette.foreground ?? "#ffffff";
          break;

        case "original":
          // Preserve the source pixel color; convert back to hex
          color = rgbToHex(cell.r, cell.g, cell.b);
          break;

        case "mapped":
          color = sampleGradient(palette.colorStops ?? [], cell.brightness);
          break;

        default:
          color = "#ffffff";
      }

      return {
        ...cell,
        color,
        background: palette.background,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Pre-computed color LUT for hot paths
// ---------------------------------------------------------------------------

/**
 * Pre-computes a 256-entry color LUT for the given palette.
 * Index b (0–255) → CSS color string for that integer brightness.
 *
 * Call once per palette change; cache the result in a ref.
 * For 'original' palette, returns null (per-pixel source RGB cannot be cached).
 *
 * Based on benchmark findings: pre-computed string[] LUTs are ~4× faster than
 * inline lerpColor() + hexToRgb() + rgbToHex() chains per cell per frame.
 */
export function buildColorLUT(palette: ColorPalette): string[] | null {
  if (palette.type === "original") return null;

  const lut: string[] = new Array(256);
  for (let b = 0; b < 256; b++) {
    const brightness = b / 255;
    switch (palette.type) {
      case "monochrome":
        lut[b] = palette.foreground ?? "#ffffff";
        break;
      case "mapped":
        lut[b] = sampleGradient(palette.colorStops ?? [], brightness);
        break;
      default:
        lut[b] = "#ffffff";
    }
  }
  return lut;
}

/**
 * Fast palette application using a pre-built color LUT.
 * Replaces applyPalette() in hot paths (video, 3D RAF loops).
 *
 * @param grid       - Raw AsciiGrid
 * @param colorLUT   - From buildColorLUT(); null means palette.type === 'original'
 * @param background - palette.background CSS string
 */
export function applyPaletteWithLUT(
  grid: AsciiGrid,
  colorLUT: string[] | null,
  background: string
): StyledAsciiGrid {
  return grid.map((row) =>
    row.map((cell): StyledAsciiCell => {
      if (cell.isTransparent) {
        return { ...cell, color: "transparent", background: "transparent" };
      }
      const color = colorLUT
        ? colorLUT[Math.round(cell.brightness * 255)]
        : rgbToHex(cell.r, cell.g, cell.b);
      return { ...cell, color, background };
    })
  );
}

// ---------------------------------------------------------------------------
// Convenience: apply palette by id string
// ---------------------------------------------------------------------------

export function applyPaletteById(
  grid: AsciiGrid,
  paletteId: string
): StyledAsciiGrid {
  return applyPalette(grid, getPalette(paletteId));
}
