import type { ColorPalette } from "../types";

export const PALETTES: ColorPalette[] = [
  // 1 — Classic Green (Matrix terminal)
  {
    id: "classic-green",
    name: "Classic Green",
    type: "monochrome",
    foreground: "#00ff41",
    background: "#000000",
  },

  // 2 — Amber CRT (vintage amber monitor)
  {
    id: "amber-crt",
    name: "Amber CRT",
    type: "monochrome",
    foreground: "#ffb000",
    background: "#1a0800",
  },

  // 3 — Cool Blue (cyan terminal)
  {
    id: "cool-blue",
    name: "Cool Blue",
    type: "monochrome",
    foreground: "#00d4ff",
    background: "#0a0a1a",
  },

  // 4 — Hot Pink (cyberpunk magenta)
  {
    id: "hot-pink",
    name: "Hot Pink",
    type: "monochrome",
    foreground: "#ff00aa",
    background: "#0f000a",
  },

  // 5 — Phosphor White (modern terminal)
  {
    id: "phosphor-white",
    name: "Phosphor White",
    type: "monochrome",
    foreground: "#e8e8f0",
    background: "#0a0a0f",
  },

  // 6 — Original Colors (preserve source image RGB)
  {
    id: "original",
    name: "Original Colors",
    type: "original",
    background: "#000000",
  },

  // 7 — Neon Gradient (brightness-mapped: dark=magenta → mid=cyan → bright=gold)
  {
    id: "neon-gradient",
    name: "Neon Gradient",
    type: "mapped",
    colorStops: [
      { threshold: 0.0, color: "#ff00ff" },
      { threshold: 0.5, color: "#00ffff" },
      { threshold: 1.0, color: "#ffd700" },
    ],
    background: "#0a000a",
  },

  // 8 — Heatmap (brightness-mapped: dark=blue → mid=red → bright=yellow)
  {
    id: "heatmap",
    name: "Heatmap",
    type: "mapped",
    colorStops: [
      { threshold: 0.0, color: "#0000ff" },
      { threshold: 0.5, color: "#ff2200" },
      { threshold: 1.0, color: "#ffff00" },
    ],
    background: "#000010",
  },

  // 9 — Dracula (Dracula theme palette tones)
  {
    id: "dracula",
    name: "Dracula",
    type: "mapped",
    colorStops: [
      { threshold: 0.0, color: "#6272a4" },
      { threshold: 0.33, color: "#bd93f9" },
      { threshold: 0.66, color: "#ff79c6" },
      { threshold: 1.0, color: "#f8f8f2" },
    ],
    background: "#282a36",
  },

  // 10 — Solarized (Solarized Dark theme tones)
  {
    id: "solarized",
    name: "Solarized",
    type: "mapped",
    colorStops: [
      { threshold: 0.0, color: "#073642" },
      { threshold: 0.25, color: "#268bd2" },
      { threshold: 0.5, color: "#2aa198" },
      { threshold: 0.75, color: "#b58900" },
      { threshold: 1.0, color: "#fdf6e3" },
    ],
    background: "#002b36",
  },
];

/** Lookup map for O(1) palette access by id. */
export const PALETTE_MAP = new Map<string, ColorPalette>(
  PALETTES.map((p) => [p.id, p])
);

export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const PALETTE_NAMES = PALETTES.map((p) => p.name);

/** Returns a palette by id, falling back to classic-green if not found. */
export function getPalette(id: string): ColorPalette {
  return PALETTE_MAP.get(id) ?? PALETTES[0];
}
