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
// Convenience: apply palette by id string
// ---------------------------------------------------------------------------

export function applyPaletteById(
  grid: AsciiGrid,
  paletteId: string
): StyledAsciiGrid {
  return applyPalette(grid, getPalette(paletteId));
}
