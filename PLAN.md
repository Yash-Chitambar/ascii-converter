# ASCIIfy — Framer ASCII Art Component

## Overview

ASCIIfy is a high-performance Framer component that converts images and videos into dynamic ASCII art in real time. It also includes a 3D ASCII Viewer that renders GLB models as animated ASCII art. Both components are designed for the Framer ecosystem with full property panel integration, responsive layout, and accessibility support.

This plan is based on the existing `@yash-chitambar/ascii-converter` package from the personal website monorepo, which provides the core image-to-ASCII pipeline (`char-ramp.ts`, `image-to-ascii.ts`, `video-to-ascii.ts`, `grid-utils.ts`). The standalone Framer component extends this foundation with color palettes, fit modes, performance controls, and a polished property panel experience.

---

## Architecture

```
ascii-converter/
├── src/
│   ├── index.tsx                    # Framer component registration (addPropertyControls)
│   │
│   ├── components/
│   │   ├── ASCIIfy.tsx              # Main image/video ASCII component
│   │   ├── ASCIIfy3D.tsx            # 3D GLB model ASCII viewer
│   │   └── ASCIICanvas.tsx          # Shared rendering surface (canvas + pre overlay)
│   │
│   ├── core/
│   │   ├── char-ramp.ts             # Character density ramp & brightness mapping
│   │   │                            # (ported from personal_website/packages/ascii-converter)
│   │   ├── image-to-ascii.ts        # Static image → ASCII grid conversion
│   │   │                            # (ported from personal_website/packages/ascii-converter)
│   │   ├── video-to-ascii.ts        # Video frame → ASCII conversion loop
│   │   │                            # (ported from personal_website/packages/ascii-converter)
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
│   ├── hooks/
│   │   ├── useASCIIConverter.ts     # Core hook: media source → ASCII output
│   │   ├── useVideoPlayback.ts      # Video lifecycle (pause on bg, loop, manual)
│   │   ├── useViewportAware.ts      # IntersectionObserver for viewport-based pause
│   │   └── useResizeDebounce.ts     # Debounced container resize handling
│   │
│   ├── types.ts                     # Shared TypeScript interfaces
│   └── constants.ts                 # Default values, ramp strings, palette defs
│
├── package.json
├── tsconfig.json
├── framer.json                      # Framer component metadata
└── README.md
```

---

## Implementation Plan

### Phase 1: Core Engine (Port & Extend)

Port the proven conversion pipeline from the personal website and extend it for standalone use.

#### 1.1 — Character Ramp System (`core/char-ramp.ts`)

**Port from:** `personal_website/packages/ascii-converter/src/char-ramp.ts`

Existing code to carry over:
- `CHAR_RAMP` — 70-character density string (`$@B%8&WM#*oahkbd...`)
- `brightnessToChar(brightness: number): string` — maps 0.0–1.0 to ASCII char
- `charToBrightness(char: string): number` — reverse lookup via pre-computed Map
- `rgbToBrightness(r, g, b): number` — luminosity formula (0.299R + 0.587G + 0.114B)

**New additions:**
- Multiple character ramp presets for different density levels:
  ```typescript
  export const RAMPS = {
    standard: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^\'`. ',
    simple:   '@%#*+=-:. ',
    blocks:   '█▓▒░ ',
    minimal:  '#=-. ',
    binary:   '█ ',
  } as const;
  ```
- `createCustomRamp(chars: string)` — user-defined character sets
- Density control: `densityToRampSubset(density: number, ramp: string)` — reduces ramp length based on 0.0–1.0 density slider, fewer chars = less detail

#### 1.2 — Image-to-ASCII Conversion (`core/image-to-ascii.ts`)

**Port from:** `personal_website/packages/ascii-converter/src/image-to-ascii.ts`

Existing code to carry over:
- `imageDataToParticles(imageData, gridWidth, gridHeight, scattered)` — per-pixel RGB → brightness → char mapping with alpha threshold (< 128 skip) and dark threshold (< 0.05 skip)
- Canvas-based image sampling: `drawImage()` → `getImageData()` → pixel iteration

**New additions (for Framer):**
- Remove dependency on `AsciiParticle` type from `@yash-chitambar/ascii-diffusion` — output a simpler `AsciiGrid` structure instead:
  ```typescript
  interface AsciiCell {
    char: string;
    r: number; g: number; b: number;  // Original pixel color (for color mode)
    brightness: number;
  }
  type AsciiGrid = AsciiCell[][];
  ```
- `imageToAsciiGrid(imageData, width, height, options)` — returns `AsciiGrid` instead of particles
- Resolution scaling: `scaleFactor` param that reduces the sampling grid before converting (e.g., 0.5 = half resolution for performance)
- Offscreen canvas support: use `OffscreenCanvas` when available (Web Workers), fall back to regular canvas

#### 1.3 — Fit Modes (`core/fit-modes.ts`)

Compute source → destination mapping for different fit strategies:
```typescript
type FitMode = 'cover' | 'contain' | 'fill' | 'none';

interface FitResult {
  sx: number; sy: number; sw: number; sh: number;  // Source crop
  dx: number; dy: number; dw: number; dh: number;  // Destination placement
}

function computeFit(
  srcWidth: number, srcHeight: number,
  dstWidth: number, dstHeight: number,
  mode: FitMode
): FitResult;
```

- **Cover:** scale to fill container, crop overflow (centered)
- **Contain:** scale to fit within container, letterbox with spaces
- **Fill:** stretch to exact container dimensions
- **None:** render at source resolution, centered, clip overflow

#### 1.4 — Color Palette System (`core/color-engine.ts`, `palettes/index.ts`)

10 built-in palettes, each defining how pixel colors map to terminal-style output:

```typescript
interface ColorPalette {
  name: string;
  id: string;
  type: 'monochrome' | 'mapped' | 'original';
  // For monochrome: single foreground color
  foreground?: string;
  // For mapped: brightness ranges → colors
  colorStops?: { threshold: number; color: string }[];
  // For original: use source pixel colors directly
  background: string;
}
```

**The 10 palettes:**
1. **Classic Green** — `#00ff41` on black (Matrix terminal)
2. **Amber CRT** — `#ffb000` on `#1a0800` (vintage amber monitor)
3. **Cool Blue** — `#00d4ff` on `#0a0a1a` (cyan terminal)
4. **Hot Pink** — `#ff00aa` on `#0f000a` (cyberpunk magenta)
5. **Phosphor White** — `#e8e8f0` on `#0a0a0f` (modern terminal)
6. **Original Colors** — preserve source image RGB values
7. **Neon Gradient** — brightness-mapped: dark=magenta → mid=cyan → bright=gold
8. **Heatmap** — brightness-mapped: dark=blue → mid=red → bright=yellow
9. **Dracula** — multi-color: uses Dracula theme palette tones
10. **Solarized** — multi-color: uses Solarized Dark theme tones

**Color application function:**
```typescript
function applyPalette(grid: AsciiGrid, palette: ColorPalette): StyledAsciiGrid;
// StyledAsciiGrid adds `color: string` and `background: string` per cell
```

#### 1.5 — Grid Renderer (`core/grid-renderer.ts`)

Two rendering strategies:

**DOM Renderer (default):** Renders to a `<pre>` element using `<span>` elements per character (for per-char coloring). Uses `document.createDocumentFragment()` for batch DOM updates.

**Canvas Renderer (performance mode):** Renders to an offscreen `<canvas>`:
- `fillText()` per character with color
- Better performance for high-resolution grids
- Falls back to DOM renderer if canvas not available

```typescript
interface RenderOptions {
  mode: 'dom' | 'canvas';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
}
```

---

### Phase 2: Video & Media Support

#### 2.1 — Video-to-ASCII Loop (`core/video-to-ascii.ts`)

**Port from:** `personal_website/packages/ascii-converter/src/video-to-ascii.ts`

Existing code to carry over:
- `useVideoToAscii` hook: frame capture loop using `requestAnimationFrame`
- Canvas-based frame sampling: `drawImage(video, ...)` → `getImageData()` → `imageDataToParticles()`
- FPS throttling via `lastFrameRef` comparison
- Webcam support via `navigator.mediaDevices.getUserMedia()`

**New additions:**
- Replace `AsciiParticle[]` output with `AsciiGrid` (same as image pipeline)
- Support `HTMLVideoElement`, webcam stream, or MediaStream as source
- Configurable target FPS (default 15, range 5–60)
- Frame skipping when conversion takes longer than frame interval

#### 2.2 — Video Playback Control (`hooks/useVideoPlayback.ts`)

Smart video lifecycle management:
```typescript
interface VideoPlaybackOptions {
  loop: boolean;              // default true
  muted: boolean;             // default true
  autoplay: boolean;          // default true
  pauseOnBackground: boolean; // default true (pause when tab not visible)
  manualPlayback: boolean;    // default false (show play/pause controls)
}
```
- `document.visibilitychange` listener for background pause
- Intersection Observer for viewport-aware pause (via `useViewportAware`)
- Expose `play()`, `pause()`, `seek(time)` controls

#### 2.3 — Viewport-Aware Rendering (`hooks/useViewportAware.ts`)

Stop rendering when component is off-screen:
```typescript
function useViewportAware(ref: RefObject<HTMLElement>, options?: {
  threshold?: number;  // default 0.1 (10% visible)
  rootMargin?: string; // default '100px' (pre-load)
}): { isVisible: boolean };
```
- Uses `IntersectionObserver` API
- Pauses `requestAnimationFrame` loop when not visible
- Pauses video playback when not visible

#### 2.4 — Resize Handling (`hooks/useResizeDebounce.ts`)

**Ported pattern from:** `personal_website/packages/ascii-diffusion/src/AsciiDiffusionRenderer.tsx` (character dimension measurement)

```typescript
function useResizeDebounce(ref: RefObject<HTMLElement>, delay?: number): {
  width: number;
  height: number;
  charWidth: number;
  charHeight: number;
};
```
- Uses `ResizeObserver` for container size changes
- Debounced (150ms default) to prevent excessive re-renders
- Measures monospace character dimensions (same technique as personal website: append hidden `<span>M</span>`, measure, remove)
- Recomputes grid dimensions: `gridCols = containerWidth / charWidth`, `gridRows = containerHeight / charHeight`

---

### Phase 3: 3D ASCII Viewer

#### 3.1 — GLB-to-ASCII Pipeline (`three/glb-to-ascii.ts`)

Uses Three.js to render a GLB model to an offscreen buffer, then samples pixels for ASCII conversion.

```typescript
interface GLBToAsciiOptions {
  modelUrl: string;
  width: number;
  height: number;
  rotation: { x: number; y: number; z: number };
  autoRotate: boolean;
  autoRotateSpeed: number;
  colorMode: 'monochrome' | 'original';
}
```

**Pipeline:**
1. Load GLB via `GLTFLoader`
2. Set up offscreen `WebGLRenderer` (no DOM attachment)
3. Auto-frame camera to fit model bounds (`auto-framer.ts`)
4. Each frame: render to offscreen buffer → `readPixels()` → `imageToAsciiGrid()`
5. Pass ASCII grid to renderer

**Dependencies:** `three`, `@types/three` (peer dependency)

#### 3.2 — Auto Camera Framing (`three/auto-framer.ts`)

Automatically positions the camera so any GLB model is fully visible and centered:

```typescript
function autoFrameCamera(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  padding?: number  // default 1.2 (20% padding)
): void;
```

- Compute bounding box of all meshes in the scene
- Position camera at distance where bounding sphere fills viewport
- Center camera target on bounding box center
- Apply padding multiplier

#### 3.3 — CRT Post-Processing (`three/crt-overlay.ts`)

Optional CRT terminal effect overlay:

```typescript
interface CRTOptions {
  enabled: boolean;
  scanlineOpacity: number;  // 0.0–1.0
  glowIntensity: number;    // 0.0–1.0
  glowColor: string;        // default '#00ff41' (green)
  curvature: number;        // 0.0–1.0 barrel distortion
  flickerSpeed: number;     // Hz
  noiseAmount: number;      // 0.0–1.0
}
```

Implemented as CSS overlays on the rendering surface:
- Scanlines: repeating-linear-gradient (2px transparent/opaque bars)
- Glow: CSS `text-shadow` on the `<pre>` element + box-shadow on container
- Curvature: CSS `border-radius` + slight `perspective` transform
- Flicker: CSS `animation` with subtle opacity variation
- Noise: Optional `<canvas>` overlay with random noise pattern

---

### Phase 4: Framer Integration

#### 4.1 — Main Component: ASCIIfy (`components/ASCIIfy.tsx`)

The primary Framer component combining image/video conversion with all controls.

```typescript
interface ASCIIfyProps {
  // Media Source
  mediaType: 'image' | 'video' | 'webcam';
  imageSrc: string;
  videoSrc: string;

  // ASCII Controls
  palette: string;           // palette ID
  characterDensity: number;  // 0.0–1.0 (maps to ramp subset)
  rampPreset: string;        // 'standard' | 'simple' | 'blocks' | 'minimal' | 'binary'
  customCharacters: string;  // user-defined character set
  invertBrightness: boolean;

  // Layout
  fitMode: FitMode;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;

  // Performance
  resolutionScale: number;   // 0.25–1.0 (lower = faster, less detail)
  targetFps: number;         // 5–60 (video/webcam only)
  renderer: 'dom' | 'canvas';

  // Video
  loop: boolean;
  muted: boolean;
  autoplay: boolean;
  pauseOnBackground: boolean;

  // CRT Effect
  crtEnabled: boolean;
  crtScanlineOpacity: number;
  crtGlowIntensity: number;
  crtGlowColor: string;

  // Accessibility
  ariaLabel: string;
  reducedMotion: boolean;    // auto-detect prefers-reduced-motion
}
```

#### 4.2 — 3D Component: ASCIIfy3D (`components/ASCIIfy3D.tsx`)

Framer component for GLB model rendering.

```typescript
interface ASCIIfy3DProps {
  // Model
  modelUrl: string;

  // Rotation
  autoRotate: boolean;
  autoRotateSpeed: number;
  initialRotationX: number;
  initialRotationY: number;
  initialRotationZ: number;

  // ASCII Controls
  characterDensity: number;
  rampPreset: string;
  colorMode: 'monochrome' | 'original';

  // CRT
  crtEnabled: boolean;
  crtGlowColor: string;
  crtScanlineOpacity: number;

  // Performance
  resolutionScale: number;
  refreshRate: number;       // FPS for ASCII re-rendering

  // Layout
  fontSize: number;
  lineHeight: number;
  background: string;
}
```

#### 4.3 — Framer Property Controls (`index.tsx`)

Register both components with Framer's property panel system:

```typescript
import { addPropertyControls, ControlType } from "framer";

addPropertyControls(ASCIIfy, {
  mediaType: {
    type: ControlType.Enum,
    options: ["image", "video", "webcam"],
    defaultValue: "image",
  },
  imageSrc: {
    type: ControlType.Image,
    title: "Image",
    hidden: (props) => props.mediaType !== "image",
  },
  videoSrc: {
    type: ControlType.File,
    title: "Video",
    allowedFileTypes: ["mp4", "webm"],
    hidden: (props) => props.mediaType !== "video",
  },
  palette: {
    type: ControlType.Enum,
    options: [...paletteIds],
    optionTitles: [...paletteNames],
    defaultValue: "classic-green",
  },
  characterDensity: {
    type: ControlType.Number,
    min: 0, max: 1, step: 0.05,
    defaultValue: 0.5,
    title: "Density",
  },
  fitMode: {
    type: ControlType.Enum,
    options: ["cover", "contain", "fill", "none"],
    defaultValue: "cover",
  },
  resolutionScale: {
    type: ControlType.Number,
    min: 0.25, max: 1, step: 0.05,
    defaultValue: 0.5,
    title: "Resolution",
  },
  // ... all other controls
});
```

#### 4.4 — Shared Rendering Surface (`components/ASCIICanvas.tsx`)

Common wrapper for both ASCIIfy and ASCIIfy3D:

```typescript
interface ASCIICanvasProps {
  grid: StyledAsciiGrid;
  renderer: 'dom' | 'canvas';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  crt?: CRTOptions;
  ariaLabel: string;
  className?: string;
}
```

- Handles DOM vs Canvas rendering selection
- Applies CRT overlay if enabled
- Manages container sizing and font measurement
- Provides `role="img"` and `aria-label` for accessibility

---

### Phase 5: Accessibility & Polish

#### 5.1 — Accessibility

- **Screen readers:** `role="img"` with descriptive `aria-label` (user-configurable, auto-generated fallback: "ASCII art rendering of [source]")
- **Keyboard navigation:** Focusable container, `tabindex="0"`, keyboard shortcuts for video play/pause (Space), density adjustment (arrow keys)
- **Reduced motion:** Auto-detect `prefers-reduced-motion`, stop video autoplay and disable CRT flicker
- **High contrast mode:** Detect `prefers-contrast: more`, force maximum density ramp
- **ARIA live region:** Announce state changes ("Playing", "Paused") for video mode

#### 5.2 — Performance Optimization

Carry over patterns from the personal website:
- **Offscreen canvas processing** (from `image-to-ascii.ts`): avoid main-thread pixel manipulation
- **Cached lookup tables** (from `char-ramp.ts`): pre-computed `charBrightnessMap`
- **RAF throttling** (from `useAnimationLoop.ts`): frame skipping when behind target FPS
- **Delta time clamping** (from `useAnimationLoop.ts`): `Math.min(delta, 50)` prevents explosion after tab switch
- **Direct DOM mutation** (from `AsciiDiffusionRenderer.tsx`): `preRef.current.textContent = text` bypasses React re-renders

New optimizations:
- **Resolution scaling:** Reduce sampling grid before conversion (e.g., 0.5x = 4x fewer pixels)
- **Web Workers:** Offload pixel processing to a worker thread (optional, for high-res video)
- **Object pooling:** Reuse `AsciiCell` objects across frames instead of allocating new arrays
- **Viewport-aware pause:** Stop all processing when component is off-screen

#### 5.3 — Responsive Design

- Font size: `clamp(6px, 1.2vw, 14px)` (from personal website's `AsciiDiffusionRenderer.tsx`)
- Grid dimensions recompute on container resize (debounced)
- Automatic grid column/row calculation based on container dimensions and character size
- Container query support for nested layouts

---

## Dependencies

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "framer": "^2.0.0",
    "framer-motion": "^11.0.0"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/three": "^0.170.0",
    "typescript": "^5"
  }
}
```

`three` is only needed for the ASCIIfy3D component. The main ASCIIfy component has zero runtime dependencies beyond React and Framer.

---

## File-by-File Implementation Order

| # | File | Description | Est. Lines |
|---|------|-------------|------------|
| 1 | `types.ts` | All shared interfaces (`AsciiCell`, `AsciiGrid`, `FitMode`, `ColorPalette`, etc.) | ~80 |
| 2 | `constants.ts` | Default values, ramp presets | ~40 |
| 3 | `core/char-ramp.ts` | Port from personal website + multi-ramp + density control | ~70 |
| 4 | `core/fit-modes.ts` | Cover/Contain/Fill/None calculation | ~60 |
| 5 | `palettes/index.ts` | 10 palette definitions | ~120 |
| 6 | `core/color-engine.ts` | Palette application to ASCII grid | ~80 |
| 7 | `core/image-to-ascii.ts` | Port from personal website + AsciiGrid output | ~90 |
| 8 | `core/grid-renderer.ts` | DOM + Canvas rendering | ~140 |
| 9 | `core/video-to-ascii.ts` | Port from personal website + frame loop | ~100 |
| 10 | `hooks/useResizeDebounce.ts` | Container resize + char measurement | ~50 |
| 11 | `hooks/useViewportAware.ts` | IntersectionObserver visibility | ~35 |
| 12 | `hooks/useVideoPlayback.ts` | Video lifecycle management | ~80 |
| 13 | `hooks/useASCIIConverter.ts` | Core hook combining conversion pipeline | ~120 |
| 14 | `three/auto-framer.ts` | Camera auto-positioning | ~50 |
| 15 | `three/crt-overlay.ts` | CRT post-processing CSS | ~70 |
| 16 | `three/glb-to-ascii.ts` | Three.js offscreen render pipeline | ~150 |
| 17 | `components/ASCIICanvas.tsx` | Shared rendering surface | ~100 |
| 18 | `components/ASCIIfy.tsx` | Main image/video component | ~180 |
| 19 | `components/ASCIIfy3D.tsx` | 3D GLB component | ~160 |
| 20 | `index.tsx` | Framer registration + property controls | ~200 |

**Total estimated:** ~1,975 lines

---

## Key Patterns from Personal Website to Preserve

1. **Brightness formula:** `0.299*R + 0.587*G + 0.114*B` (luminosity, not averaging)
2. **Character ramp direction:** Dense chars for bright pixels on dark backgrounds
3. **Alpha threshold:** Skip pixels with alpha < 128
4. **Dark threshold:** Skip pixels with brightness < 0.05
5. **RAF throttling:** ~30fps cap with `Math.min(delta, 50)` clamping
6. **Direct DOM mutation:** `element.textContent = string` instead of React state for render output
7. **Font feature settings:** `"liga" 0, "calt" 0` to disable ligatures in monospace rendering
8. **Character measurement:** Hidden span technique for measuring monospace char dimensions
