# CLAUDE.md — ASCIIfy Framer Component

This file documents the codebase structure, conventions, and development workflows for AI assistants working in this repository.

---

## Project Overview

**ASCIIfy** is a high-performance Framer component that converts images, videos, and 3D GLB models into dynamic ASCII art in real time. It is built for the Framer ecosystem with full property panel integration, responsive layout, and accessibility support.

The project is currently in the **planning/scaffolding stage**. The authoritative design document is `PLAN.md`. No source files have been written yet — implementation follows the phased plan described there.

The core ASCII conversion logic is ported and extended from the `@yash-chitambar/ascii-converter` package inside a personal website monorepo.

---

## Intended Repository Layout

Once implemented, the source tree will be:

```
ascii-converter/
├── src/
│   ├── index.tsx                    # Framer component registration (addPropertyControls)
│   ├── types.ts                     # All shared TypeScript interfaces
│   ├── constants.ts                 # Default values, ramp presets, palette defs
│   │
│   ├── components/
│   │   ├── ASCIIfy.tsx              # Main image/video ASCII component
│   │   ├── ASCIIfy3D.tsx            # 3D GLB model ASCII viewer
│   │   └── ASCIICanvas.tsx          # Shared rendering surface (canvas + pre overlay)
│   │
│   ├── core/
│   │   ├── char-ramp.ts             # Character density ramp & brightness mapping
│   │   ├── image-to-ascii.ts        # Static image → ASCII grid conversion
│   │   ├── video-to-ascii.ts        # Video frame → ASCII conversion loop
│   │   ├── color-engine.ts          # Color palette system & per-character coloring
│   │   ├── fit-modes.ts             # Cover/Contain/Fill/None image fitting
│   │   └── grid-renderer.ts         # ASCII grid → DOM/canvas rendering
│   │
│   ├── three/
│   │   ├── glb-to-ascii.ts          # Three.js scene → offscreen render → ASCII
│   │   ├── auto-framer.ts           # Automatic camera framing for any GLB model
│   │   └── crt-overlay.ts           # CRT scanline + glow post-processing
│   │
│   ├── palettes/
│   │   └── index.ts                 # 10 built-in color palettes
│   │
│   └── hooks/
│       ├── useASCIIConverter.ts     # Core hook: media source → ASCII output
│       ├── useVideoPlayback.ts      # Video lifecycle (pause on bg, loop, manual)
│       ├── useViewportAware.ts      # IntersectionObserver for viewport-based pause
│       └── useResizeDebounce.ts     # Debounced container resize handling
│
├── PLAN.md                          # Canonical implementation plan (source of truth)
├── CLAUDE.md                        # This file
├── package.json
├── tsconfig.json
├── framer.json                      # Framer component metadata
└── README.md
```

---

## Implementation Phases

Follow this order when implementing files (see `PLAN.md` for full detail):

| Phase | Area | Key Files |
|-------|------|-----------|
| 1 | Core engine | `types.ts`, `constants.ts`, `core/char-ramp.ts`, `core/fit-modes.ts`, `palettes/index.ts`, `core/color-engine.ts`, `core/image-to-ascii.ts`, `core/grid-renderer.ts` |
| 2 | Video & media | `core/video-to-ascii.ts`, `hooks/useResizeDebounce.ts`, `hooks/useViewportAware.ts`, `hooks/useVideoPlayback.ts`, `hooks/useASCIIConverter.ts` |
| 3 | 3D viewer | `three/auto-framer.ts`, `three/crt-overlay.ts`, `three/glb-to-ascii.ts` |
| 4 | Framer integration | `components/ASCIICanvas.tsx`, `components/ASCIIfy.tsx`, `components/ASCIIfy3D.tsx`, `index.tsx` |
| 5 | Accessibility & polish | Aria attributes, reduced-motion, high-contrast, responsive sizing |

---

## Core Domain Concepts

### ASCII Conversion Pipeline

```
Media source (image / video frame / WebGL buffer)
  → Canvas sampling (drawImage → getImageData)
  → Pixel iteration: RGB → brightness → char via ramp
  → AsciiGrid (2D array of AsciiCell)
  → Color palette application → StyledAsciiGrid
  → Renderer (DOM <pre>/<span> or <canvas> fillText)
  → Display
```

### Key Types (to be defined in `src/types.ts`)

```typescript
interface AsciiCell {
  char: string;
  r: number; g: number; b: number;  // Original pixel RGB
  brightness: number;
}
type AsciiGrid = AsciiCell[][];

interface StyledAsciiCell extends AsciiCell {
  color: string;
  background: string;
}
type StyledAsciiGrid = StyledAsciiCell[][];

type FitMode = 'cover' | 'contain' | 'fill' | 'none';

interface ColorPalette {
  name: string;
  id: string;
  type: 'monochrome' | 'mapped' | 'original';
  foreground?: string;
  colorStops?: { threshold: number; color: string }[];
  background: string;
}
```

### Character Ramp Presets (defined in `src/constants.ts`)

```typescript
export const RAMPS = {
  standard: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^\\'`. ',
  simple:   '@%#*+=-:. ',
  blocks:   '█▓▒░ ',
  minimal:  '#=-. ',
  binary:   '█ ',
};
```

### Built-in Color Palettes (10 total)

| ID | Name | Type | Description |
|----|------|------|-------------|
| `classic-green` | Classic Green | monochrome | `#00ff41` on black (Matrix) |
| `amber-crt` | Amber CRT | monochrome | `#ffb000` on `#1a0800` |
| `cool-blue` | Cool Blue | monochrome | `#00d4ff` on `#0a0a1a` |
| `hot-pink` | Hot Pink | monochrome | `#ff00aa` on `#0f000a` |
| `phosphor-white` | Phosphor White | monochrome | `#e8e8f0` on `#0a0a0f` |
| `original` | Original Colors | original | Preserve source RGB |
| `neon-gradient` | Neon Gradient | mapped | dark=magenta → mid=cyan → bright=gold |
| `heatmap` | Heatmap | mapped | dark=blue → mid=red → bright=yellow |
| `dracula` | Dracula | mapped | Dracula theme tones |
| `solarized` | Solarized | mapped | Solarized Dark tones |

---

## Critical Algorithms — Do Not Change

These patterns are ported from the proven personal website implementation and must be preserved exactly:

1. **Brightness formula:** `luminance = 0.299*R + 0.587*G + 0.114*B`
   - Use luminosity weighting, never simple RGB averaging.

2. **Character ramp direction:** Dense/complex chars map to bright pixels; space maps to black.
   - Do NOT invert this without an explicit `invertBrightness` flag.

3. **Alpha threshold:** Skip pixels with `alpha < 128` (treat as transparent).

4. **Dark threshold:** Skip pixels with `brightness < 0.05` (skip near-black, output space).

5. **RAF throttling:** Use `Math.min(delta, 50)` to clamp delta time and prevent explosion after tab switch.

6. **Direct DOM mutation:** Use `element.textContent = string` for output updates, not React state, to bypass React's reconciler overhead.

7. **Font feature settings:** Apply `font-feature-settings: "liga" 0, "calt" 0` on the `<pre>` element to disable ligatures in monospace rendering.

8. **Character measurement:** Measure monospace character dimensions by temporarily appending a hidden `<span>M</span>`, reading `getBoundingClientRect()`, then removing it.

---

## Framer Integration Conventions

### Property Controls

All Framer property controls are registered via `addPropertyControls()` in `src/index.tsx`. Use `hidden` callbacks to show/hide controls based on other prop values:

```typescript
imageSrc: {
  type: ControlType.Image,
  hidden: (props) => props.mediaType !== "image",
},
```

### Component Props

- `ASCIIfy` handles `image | video | webcam` media sources.
- `ASCIIfy3D` handles GLB model rendering via Three.js.
- Both share `ASCIICanvas` as the rendering surface.

### Peer Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "framer": "^2.0.0",
    "framer-motion": "^11.0.0"
  },
  "dependencies": {
    "three": "^0.170.0"
  }
}
```

`three` is required only for `ASCIIfy3D`. The main `ASCIIfy` component has zero runtime dependencies beyond React and Framer.

---

## Performance Guidelines

- **Viewport-aware pause:** Always stop `requestAnimationFrame` loops and video playback when the component is off-screen (`IntersectionObserver`, threshold `0.1`, root margin `100px`).
- **Resolution scaling:** Support a `resolutionScale` prop (0.25–1.0). Lower values sample fewer pixels before ASCII conversion, dramatically reducing CPU cost.
- **Debounced resize:** Use a 150ms debounce on `ResizeObserver` callbacks to avoid thrashing grid recalculation on every pixel of resize.
- **Object pooling:** Reuse `AsciiCell` arrays across frames rather than allocating new arrays each frame.
- **Offscreen canvas:** Prefer `OffscreenCanvas` for pixel sampling when available.
- **Target FPS for video:** Default 15fps; allow 5–60fps via prop. Skip frames when processing takes longer than the frame interval.

---

## Accessibility Requirements

All components must:

- Have `role="img"` on the container element.
- Accept an `ariaLabel` prop with a sensible auto-generated fallback (e.g., `"ASCII art rendering of [source filename]"`).
- Support `prefers-reduced-motion`: disable video autoplay and CRT flicker animation.
- Support `prefers-contrast: more`: force maximum density ramp.
- Have a focusable container (`tabindex="0"`) with keyboard shortcuts for video (Space = play/pause).
- Announce video state changes via an `aria-live` region.

---

## Git Workflow

- **Development branch:** `claude/add-claude-documentation-WuhEK`
- **Never push to `main` or `master`** without explicit permission.
- Always push with: `git push -u origin <branch-name>`
- Write descriptive commit messages summarising the "why", not just the "what".

---

## File Authoring Order

When starting implementation, create files in this exact order (later files depend on earlier ones):

1. `src/types.ts`
2. `src/constants.ts`
3. `src/core/char-ramp.ts`
4. `src/core/fit-modes.ts`
5. `src/palettes/index.ts`
6. `src/core/color-engine.ts`
7. `src/core/image-to-ascii.ts`
8. `src/core/grid-renderer.ts`
9. `src/core/video-to-ascii.ts`
10. `src/hooks/useResizeDebounce.ts`
11. `src/hooks/useViewportAware.ts`
12. `src/hooks/useVideoPlayback.ts`
13. `src/hooks/useASCIIConverter.ts`
14. `src/three/auto-framer.ts`
15. `src/three/crt-overlay.ts`
16. `src/three/glb-to-ascii.ts`
17. `src/components/ASCIICanvas.tsx`
18. `src/components/ASCIIfy.tsx`
19. `src/components/ASCIIfy3D.tsx`
20. `src/index.tsx`

---

## Reference: Key Patterns from the Source Monorepo

The following patterns are pulled directly from `@yash-chitambar/ascii-converter` and `@yash-chitambar/ascii-diffusion` packages in the personal website monorepo:

| Pattern | Origin file | Notes |
|---------|-------------|-------|
| `CHAR_RAMP` string | `char-ramp.ts` | 70-char density string |
| `brightnessToChar` | `char-ramp.ts` | 0.0–1.0 → ASCII char |
| `rgbToBrightness` | `char-ramp.ts` | Luminosity formula |
| `imageDataToParticles` | `image-to-ascii.ts` | Adapt to return `AsciiGrid` |
| `useVideoToAscii` hook | `video-to-ascii.ts` | RAF loop, FPS throttle |
| Char measurement (hidden span) | `AsciiDiffusionRenderer.tsx` | Monospace dimension probe |
| `Math.min(delta, 50)` clamping | `useAnimationLoop.ts` | Delta time safety |
| `font-feature-settings` | `AsciiDiffusionRenderer.tsx` | Disable ligatures |
| `clamp(6px, 1.2vw, 14px)` | `AsciiDiffusionRenderer.tsx` | Responsive font size |
