import type { CRTOptions, RampPreset, RendererMode, FitMode } from "./types";

// ---------------------------------------------------------------------------
// Character ramp presets
// ---------------------------------------------------------------------------

export const RAMPS: Record<RampPreset, string> = {
  standard:
    '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^\'.` ',
  simple: "@%#*+=-:. ",
  blocks: "█▓▒░ ",
  minimal: "#=-. ",
  binary: "█ ",
};

// ---------------------------------------------------------------------------
// Default component values
// ---------------------------------------------------------------------------

export const DEFAULT_FONT_SIZE = 10;
export const DEFAULT_LINE_HEIGHT = 1.1;
export const DEFAULT_LETTER_SPACING = 0;
export const DEFAULT_FONT_FAMILY =
  '"Courier New", Courier, "Lucida Console", monospace';

export const DEFAULT_RESOLUTION_SCALE = 0.5;
export const DEFAULT_TARGET_FPS = 15;
export const DEFAULT_CHARACTER_DENSITY = 0.5;
export const DEFAULT_RAMP_PRESET: RampPreset = "standard";
export const DEFAULT_RENDERER: RendererMode = "dom";
export const DEFAULT_FIT_MODE: FitMode = "cover";
export const DEFAULT_PALETTE_ID = "classic-green";

// ---------------------------------------------------------------------------
// Thresholds (must not be changed — ported from personal website)
// ---------------------------------------------------------------------------

/** Pixels with alpha below this value are skipped (transparent). */
export const ALPHA_THRESHOLD = 128;

/** Pixels with brightness below this value are skipped (near-black → space). */
export const DARK_THRESHOLD = 0.05;

/** Maximum delta time (ms) in the RAF loop — prevents explosion after tab switch. */
export const MAX_DELTA_MS = 50;

/** Debounce delay (ms) for ResizeObserver callbacks. */
export const RESIZE_DEBOUNCE_MS = 150;

/** Minimum fraction of component that must be visible to continue rendering. */
export const VIEWPORT_THRESHOLD = 0.1;

/** Root margin for IntersectionObserver (pre-loads slightly off-screen). */
export const VIEWPORT_ROOT_MARGIN = "100px";

// ---------------------------------------------------------------------------
// Default CRT options
// ---------------------------------------------------------------------------

export const DEFAULT_CRT: CRTOptions = {
  enabled: false,
  scanlineOpacity: 0.15,
  glowIntensity: 0.6,
  glowColor: "#00ff41",
  curvature: 0,
  flickerSpeed: 0,
  noiseAmount: 0,
};

// ---------------------------------------------------------------------------
// Default video options
// ---------------------------------------------------------------------------

export const DEFAULT_VIDEO = {
  loop: true,
  muted: true,
  autoplay: true,
  pauseOnBackground: true,
};

// ---------------------------------------------------------------------------
// Font feature settings applied to all <pre> elements
// Disables ligatures so monospace characters never combine.
// ---------------------------------------------------------------------------

export const FONT_FEATURE_SETTINGS = '"liga" 0, "calt" 0';

// ---------------------------------------------------------------------------
// Responsive font sizing (CSS clamp expression)
// ---------------------------------------------------------------------------

export const RESPONSIVE_FONT_CLAMP = "clamp(6px, 1.2vw, 14px)";
