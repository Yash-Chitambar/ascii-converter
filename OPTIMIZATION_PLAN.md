# Graphics Optimization Implementation Plan

> Research-backed implementation plan for five performance features in the ASCIIfy rendering pipeline.
> Each section documents the current state, external research findings, identified gaps, and precise
> code changes — file by file.

---

## Table of Contents

1. [Optimized ASCII Rendering — Classic Bitmap to ASCII Algorithm](#1-optimized-ascii-rendering--classic-bitmap-to-ascii-algorithm)
2. [Offscreen Canvas Processing for Efficient Pixel Manipulation](#2-offscreen-canvas-processing-for-efficient-pixel-manipulation)
3. [Cached Lookup Tables for Faster Color Mapping](#3-cached-lookup-tables-for-faster-color-mapping)
4. [Viewport-Aware Video Playback to Save Resources](#4-viewport-aware-video-playback-to-save-resources)
5. [Debounced Resize Handling for Smooth Responsiveness](#5-debounced-resize-handling-for-smooth-responsiveness)
6. [Implementation Order](#implementation-order)
7. [Expected Performance Impact](#expected-performance-impact)
8. [Files Changed Summary](#files-changed-summary)

---

## 1. Optimized ASCII Rendering — Classic Bitmap to ASCII Algorithm

### Research Findings

The classic Bitmap-to-ASCII algorithm is well-documented in image processing literature
(Jonathan Petitcolas, 2017; Gehna Ahuja, 2025; Muhammad Naufal Pratama, 2025).
The standard two-step process is:

**Step 1 — Grayscale conversion using the BT.601 luminosity formula:**
```
Grayscale = 0.299 × R + 0.587 × G + 0.114 × B
```
Green carries 58.7% weight because the human eye is most sensitive to it; blue carries only
11.4% because pure blue appears darkest to human perception. This formula is used by MATLAB's
`rgb2gray`, CSS `color()`, and all major image processing libraries. It is already correct in
the codebase (`rgbToBrightness` in `char-ramp.ts`) and must not be changed.

**Step 2 — Block averaging:**
Each ASCII character represents a *block* of source pixels — not one pixel. Averaging all
pixels in the block before mapping to a character removes noise, reduces aliasing at low
resolutions, and produces perceptually accurate brightness for each cell. The block size is
naturally `(sampleW / gridCols) × (sampleH / gridRows)`. Published implementations use blocks
as small as 2×4 (accounting for character aspect ratio) and as large as 8×16.

**Step 3 — Integer LUT mapping:**
Pre-compute a 256-entry lookup array where `charLUT[b]` returns the ASCII character for
integer brightness `b` (0–255). The hot loop then becomes a single array read instead of
floating-point multiply-add-divide. Per-pixel cost drops from ~5 float ops to 1 array index.

### Current State (Gap Analysis)

| File | Current behaviour | Problem |
|---|---|---|
| `src/core/image-to-ascii.ts` | Samples **one pixel** per grid cell (`Math.floor((col/gridCols) * sampleW)`) | No block averaging — noisy output at low `resolutionScale` |
| `src/core/char-ramp.ts` | `brightnessToChar()` called per pixel with float arithmetic | No LUT — 5+ float ops per pixel per frame |
| `src/core/image-to-ascii.ts` | `imageDataToAsciiGrid()` rebuilds the ramp string every call | Ramp rebuild cost on every video frame |

### Changes Required

#### `src/core/char-ramp.ts` — Add `buildCharLUT()`

Add one new exported function **after** the existing `brightnessToChar`. No existing code changes.

```typescript
/**
 * Builds a 256-entry lookup table mapping integer brightness (0–255) to an
 * ASCII character from the given ramp.
 *
 * Call once per ramp/density/invert change and cache the result. Reuse it
 * across every pixel of every frame to replace the per-pixel float arithmetic
 * in brightnessToChar().
 *
 * Classic Bitmap-to-ASCII reference: index 0 = darkest (brightness 0),
 * index 255 = brightest (brightness 1).
 */
export function buildCharLUT(ramp: string, invert = false): string[] {
  const lut: string[] = new Array(256);
  for (let b = 0; b < 256; b++) {
    const brightness = b / 255;
    const adjusted   = invert ? 1 - brightness : brightness;
    const idx        = Math.min(ramp.length - 1, Math.floor((1 - adjusted) * ramp.length));
    lut[b]           = ramp[idx];
  }
  return lut;
}
```

#### `src/core/image-to-ascii.ts` — Block Averaging + Optional LUT Parameter

**Change A — Block averaging in `imageToAsciiGrid()`**

Replace the single-pixel sample in the inner loop (lines 117–124) with a pixel-block average.
The block spans the pixel range that belongs to one ASCII character cell:

```typescript
// REMOVE (current single-pixel sample):
const px = Math.floor((col / gridCols) * sampleW);
const py = Math.floor((row / gridRows) * sampleH);
const idx = (py * sampleW + px) * 4;
const r = data[idx];
const g = data[idx + 1];
const b = data[idx + 2];
const a = data[idx + 3];

// ADD (block average — classic bitmap-to-ASCII approach):
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
```

**Change B — Optional `charLUT` parameter in `imageDataToAsciiGrid()`**

This function is the hot path for video and 3D frames. Accept an optional pre-built LUT:

```typescript
export function imageDataToAsciiGrid(
  imageData: ImageData,
  options: ImageToAsciiOptions,
  charLUT?: string[]   // NEW — pass from createVideoAsciiLoop closure
): AsciiGrid
```

Inside the pixel loop, if `charLUT` is provided use the integer fast-path; otherwise fall back
to the existing float path (preserves backward compatibility):

```typescript
if (charLUT) {
  // Integer BT.601 formula — identical result, no floating point division
  // Formula: (r*299 + g*587 + b*114 + 500) / 1000  ≡  floor to integer
  const intB = ((r * 299 + g * 587 + b * 114 + 500) / 1000) | 0; // 0–255
  gridRow.push({ char: charLUT[intB], r, g, b, brightness: intB / 255 });
} else {
  const brightness = rgbToBrightness(r, g, b);
  gridRow.push({ char: brightnessToChar(brightness, ramp, invertBrightness), r, g, b, brightness });
}
```

---

## 2. Offscreen Canvas Processing for Efficient Pixel Manipulation

### Research Findings

The `OffscreenCanvas` API moves canvas operations off the DOM thread. Key findings from
web.dev, MDN, and Evil Martians engineering blog:

- **Canvas allocation is expensive** — each `new OffscreenCanvas()` allocates a GPU-backed
  surface. Creating one per animation frame causes continuous GPU memory churn.
- **Lighthouse benchmark:** Real-world tests show 95 → 100 performance score improvements
  when moving canvas operations off the main thread.
- **Reuse is the single highest-impact change** — Three.js documentation explicitly states:
  "allocate WebGLRenderTarget, pixel buffer, and flip buffer once, reuse every frame."
  The same principle applies to any sampling canvas.
- **`transferControlToOffscreen()`** allows handing a canvas to a Web Worker so rendering
  happens in a separate thread entirely (advanced, optional future step).
- **`async readRenderTargetPixels`** is recommended over synchronous reads to avoid GPU
  pipeline stalls (relevant to the 3D pipeline in `glb-to-ascii.ts`).

### Current State (Gap Analysis)

```typescript
// src/core/video-to-ascii.ts  captureVideoFrame() — lines 44-55
// ⚠ NEW OffscreenCanvas allocated on EVERY frame tick:
if (typeof OffscreenCanvas !== "undefined") {
  canvas = new OffscreenCanvas(sampleWidth, sampleHeight);   // ← per-frame GPU alloc
  ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
}
```

`image-to-ascii.ts:createSamplingCanvas()` has the same problem — a new canvas is created on
every call to `imageToAsciiGrid()`.

### Changes Required

#### `src/core/video-to-ascii.ts` — Persistent Canvas in Closure

Move canvas creation to the `createVideoAsciiLoop` closure (runs once per loop instance),
outside the `tick()` function that runs every animation frame:

```typescript
export function createVideoAsciiLoop(
  video: HTMLVideoElement,
  options: VideoToAsciiOptions,
  onFrame: (grid: AsciiGrid) => void
): VideoAsciiLoop {
  const { gridCols, gridRows, fitMode = "cover", resolutionScale = 0.5, ... } = options;

  const sampleW = Math.max(1, Math.round(gridCols * (1 / resolutionScale)));
  const sampleH = Math.max(1, Math.round(gridRows * (1 / resolutionScale)));

  // ── Allocate canvas ONCE per loop instance ────────────────────────────────
  const samplingCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(sampleW, sampleH)
      : (() => {
          const c = document.createElement("canvas");
          c.width  = sampleW;
          c.height = sampleH;
          return c;
        })();
  const samplingCtx = samplingCanvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  // ─────────────────────────────────────────────────────────────────────────

  function captureFrame(): ImageData | null {
    if (video.readyState < 2) return null;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (srcW === 0 || srcH === 0) return null;

    const fit = computeFit(srcW, srcH, sampleW, sampleH, fitMode);
    samplingCtx.clearRect(0, 0, sampleW, sampleH);
    samplingCtx.drawImage(video, fit.sx, fit.sy, fit.sw, fit.sh,
                                 fit.dx, fit.dy, fit.dw, fit.dh);
    return samplingCtx.getImageData(0, 0, sampleW, sampleH);
  }

  // tick() now calls captureFrame() — no canvas allocation inside
  function tick(timestamp: number): void { ... }
}
```

Remove the standalone `captureVideoFrame()` function or keep it unexported (it is only called
from within the loop anyway).

#### `src/core/image-to-ascii.ts` — Canvas Reuse for Static Images

Change `createSamplingCanvas()` to accept and return a canvas for reuse across calls at the
same resolution. Callers that need to convert multiple images at the same container size
(e.g., image carousel) avoid repeated allocations:

```typescript
// Rename + extend signature:
function getOrCreateSamplingCanvas(
  width: number,
  height: number,
  existing?: HTMLCanvasElement | OffscreenCanvas
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  // Reuse if dimensions match exactly
  if (existing && existing.width === width && existing.height === height) {
    const ctx = existing.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    return { canvas: existing, ctx };
  }
  // Otherwise create new (size changed or first call)
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, ctx: canvas.getContext("2d") as OffscreenCanvasRenderingContext2D };
  }
  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") as CanvasRenderingContext2D };
}
```

Update `imageToAsciiGrid()` to accept and return the canvas:

```typescript
export function imageToAsciiGrid(
  source: HTMLImageElement | ImageBitmap,
  containerWidth: number,
  containerHeight: number,
  options: ImageToAsciiOptions,
  existingCanvas?: HTMLCanvasElement | OffscreenCanvas  // NEW optional
): { grid: AsciiGrid; canvas: HTMLCanvasElement | OffscreenCanvas }
```

---

## 3. Cached Lookup Tables for Faster Color Mapping

### Research Findings

Benchmarks cited by Wing Ho Tang (Medium, 2024) and VoidCanvas (2024):

- **Pre-computed string LUTs outperform inline computation by ~400%** in hot loops. This is
  counterintuitive but explained by JavaScript engine optimisation of repeated property reads
  on the same object shape vs. creating new strings with `toString(16)` and concatenation.
- **Uint8ClampedArray** (the native type returned by `getImageData().data`) provides ~2×
  speedup over standard arrays for numeric colour data. Values are automatically clamped to
  0–255, eliminating bounds-check branches.
- **Object pooling**: reuse `Uint8ClampedArray` instances across frames — do not allocate new
  arrays each frame (already partially done in `glb-to-ascii.ts`; not done in the 2D pipeline).

The conclusion: pre-compute a `string[]` of length 256 mapping integer brightness to color
string. The hot loop becomes one array index per cell — eliminating `hexToRgb()`, `lerpColor()`,
`rgbToHex()`, and `sampleGradient()` calls per cell per frame.

### Current State (Gap Analysis)

`color-engine.ts:applyPalette()` runs on every frame for every cell. For a 120×40 grid at
15 fps that is **72,000 `lerpColor()` calls per second**. Each call does:

| Operation | Cost |
|---|---|
| `hexToRgb(colorA)` | `parseInt()` × 3 + string slicing |
| `hexToRgb(colorB)` | `parseInt()` × 3 + string slicing |
| Linear lerp (R/G/B) | 3 multiplies + 3 adds |
| `rgbToHex()` | `toString(16)` × 3 + `padStart()` × 3 + string concat |

`sampleGradient()` adds a linear scan through the stop list per cell. For `original` palette,
`rgbToHex()` is called per cell but cannot be pre-computed (source RGB is per-pixel).

### Changes Required

#### `src/core/color-engine.ts` — Add `buildColorLUT()` and `applyPaletteWithLUT()`

Add two new exported functions. No existing functions are removed.

```typescript
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
  if (palette.type === "original") return null; // Cannot pre-compute — source-dependent

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
      // 'original' palette: source RGB unavoidably computed per cell
      const color = colorLUT
        ? colorLUT[Math.round(cell.brightness * 255)]
        : rgbToHex(cell.r, cell.g, cell.b);
      return { ...cell, color, background };
    })
  );
}
```

#### `src/hooks/useASCIIConverter.ts` — Cache LUT Refs

Maintain refs for both the char LUT and the color LUT, rebuilding them only when their
inputs change (not on every render/frame):

```typescript
// Add near the top of the hook body:
const charLUTRef   = useRef<string[] | null>(null);
const colorLUTRef  = useRef<string[] | null>(null);
const prevRampKey  = useRef<string>("");
const prevPaletteId = useRef<string>("");

// Rebuild char LUT when ramp/density/invert changes:
const rampKey = `${rampPreset}|${customCharacters ?? ""}|${characterDensity}|${invertBrightness}`;
if (rampKey !== prevRampKey.current) {
  const baseRamp = customCharacters
    ? (customCharacters.endsWith(" ") ? customCharacters : customCharacters + " ")
    : getRamp(rampPreset as RampPreset);
  const ramp = densityToRampSubset(characterDensity, baseRamp);
  charLUTRef.current = buildCharLUT(ramp, invertBrightness);
  prevRampKey.current = rampKey;
}

// Rebuild color LUT when palette changes:
if (palette !== prevPaletteId.current) {
  const p = getPalette(palette);
  colorLUTRef.current = buildColorLUT(p);
  colorLUTBackground.current = p.background;
  prevPaletteId.current = palette;
}
```

Use `charLUTRef.current` when calling `imageDataToAsciiGrid()` and use
`applyPaletteWithLUT()` in place of `applyPalette()`.

---

## 4. Viewport-Aware Video Playback to Save Resources

### Research Findings

MDN, CodePen (rpsthecoder), and Esau Silva (2021) document the standard pattern for
IntersectionObserver-based video control:

```javascript
// Standard pattern — confirmed across all sources:
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) video.play();
    else                      video.pause();
  });
}, { threshold: 0.1, rootMargin: "100px" });
```

**Recommended configuration values (confirmed by research):**

| Parameter | Value | Rationale |
|---|---|---|
| `threshold` | `0.1` | Trigger at 10% visible — early enough for smooth UX |
| `rootMargin` | `"100px"` | Preload/pause 100px before the viewport edge — eliminates cold-start lag |

**Key finding:** The `IntersectionObserver` should pause/resume the video element **and** the
RAF loop. Pausing only the video but keeping the RAF alive wastes CPU on `requestAnimationFrame`
callbacks and `captureFrame()` calls that always return `null` (video paused). The fix is to
cancel the RAF when the component goes off-screen and resume it when it returns.

**Page Visibility API** (`document.visibilitychange`) should be integrated **inside the RAF loop**
to handle tab switching. This is independent from scroll visibility and must be handled separately.

### Current State (Gap Analysis)

```typescript
// VideoAsciiLoop interface — current:
export interface VideoAsciiLoop {
  start:     () => void;  // sets running=true, kicks off RAF
  stop:      () => void;  // sets running=false, cancels RAF — only called on unmount
  isRunning: () => boolean;
}
// No pause/resume — only full start/stop.

// useASCIIConverter.ts — isActive drives start/stop:
useEffect(() => {
  if (!loopRef.current) return;
  if (isActive) loopRef.current.start();  // resets lastFrameTime to 0 → burst
  else          loopRef.current.stop();
}, [isActive]);
```

Problems:
1. `stop()` + `start()` on scroll-out/scroll-in resets `lastFrameTime = 0`, causing a
   first-frame burst when the component scrolls back into view.
2. RAF loop continues running (60 Hz callbacks) even when off-screen.
3. No `document.visibilitychange` listener inside the loop to handle tab switching.
4. The existing `useViewportAware` constants (`threshold: 0.1`, `rootMargin: "100px"`) are
   correct — no changes needed in `useViewportAware.ts`.

### Changes Required

#### `src/core/video-to-ascii.ts` — Extend `VideoAsciiLoop` with `pause`/`resume`

```typescript
export interface VideoAsciiLoop {
  start:     () => void;   // full start — resets timing
  stop:      () => void;   // full stop — cancels RAF, removes listeners
  pause:     () => void;   // NEW: cancel RAF, preserve running state
  resume:    () => void;   // NEW: restart RAF without resetting lastFrameTime
  isRunning: () => boolean;
}
```

**Implementation inside `createVideoAsciiLoop`:**

```typescript
let running = false;
let paused  = false;

function onVisibilityChange() {
  if (document.visibilityState === "hidden") loop.pause();
  else                                        loop.resume();
}

const loop: VideoAsciiLoop = {
  start() {
    if (running) return;
    running = true;
    paused  = false;
    lastFrameTime = 0;
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(tick);
  },
  stop() {
    running = false;
    paused  = false;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  },
  pause() {
    if (!running || paused) return;
    paused = true;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    // Note: do NOT reset lastFrameTime — preserve it for smooth resume
  },
  resume() {
    if (!running || !paused) return;
    paused = false;
    rafId = requestAnimationFrame(tick); // continue from where we left off
  },
  isRunning() { return running && !paused; },
};
return loop;
```

#### `src/hooks/useASCIIConverter.ts` — Use `pause`/`resume` for Viewport Transitions

Replace the `start()`/`stop()` calls that fire on `isActive` changes (scroll visibility) with
`resume()`/`pause()`. Full `start()`/`stop()` are still used on mount/unmount and when the
media source URL changes:

```typescript
useEffect(() => {
  if (!loopRef.current) return;
  if (isActive) {
    loopRef.current.resume();   // was: start() — now avoids lastFrameTime reset
  } else {
    loopRef.current.pause();    // was: stop()  — now cancels RAF without destroying loop
  }
}, [isActive]);
```

---

## 5. Debounced Resize Handling for Smooth Responsiveness

### Research Findings

DHIwise, Go Make Things, OpenReplay, and MDN document the following best practices for
`ResizeObserver`:

**Standard debounce pattern (150ms — confirmed correct):**
```javascript
let timeout;
const observer = new ResizeObserver(() => {
  clearTimeout(timeout);
  timeout = setTimeout(expensiveCalc, 150);
});
```

**RAF alignment (go-make-things.com, 2024):**
Deferring the measurement callback into `requestAnimationFrame()` ensures `clientWidth` and
`clientHeight` reflect the browser's completed layout pass — avoiding stale values from
in-progress reflows:
```javascript
timeout = setTimeout(() => requestAnimationFrame(measure), 150);
```

**Measurement caching (DHIwise, 2024):**
```javascript
let cachedWidth = null;
const observer = new ResizeObserver((entries) => {
  const newWidth = entries[0].contentRect.width;
  if (newWidth === cachedWidth) return;   // Skip if unchanged
  cachedWidth = newWidth;
  expensiveCalc();
});
```

**Read-then-write pattern (prevents ResizeObserver loop error):**
- Read all DOM measurements first (no writes)
- Apply all DOM mutations in a separate step (after reads are complete)
- Never write to styles inside a ResizeObserver callback without deferral — it triggers a new
  resize which calls the callback again (infinite loop)

**Key insight for ASCIIfy specifically:** Container resize changes `clientWidth`/`clientHeight`
but does **not** change character dimensions. Character size only changes when `fontFamily`,
`fontSize`, or `lineHeight` props change. The expensive `measureCharDimensions()` probe-span
operation (DOM insert → `getBoundingClientRect()` → DOM remove) runs on every resize today,
but should run only on font prop changes.

### Current State (Gap Analysis)

```typescript
// useResizeDebounce.ts  measure() — called on every resize event:
const measure = useCallback(() => {
  const el = containerRef.current;
  if (!el) return;
  const width  = el.clientWidth;
  const height = el.clientHeight;
  if (width === 0 || height === 0) return;

  // ⚠ Runs DOM probe on EVERY resize — even when font hasn't changed:
  const { charWidth, charHeight } = measureCharDimensions(fontFamily, fontSize, lineHeight, el);

  const { gridCols, gridRows } = computeGridDimensions(width, height, charWidth, charHeight);
  setSize({ width, height, charWidth, charHeight, gridCols, gridRows }); // ⚠ Always triggers re-render
}, [containerRef, fontFamily, fontSize, lineHeight]);
```

Additional problem: `setSize()` is called unconditionally — even when `width`, `height`,
`gridCols`, and `gridRows` are identical to the previous values — causing unnecessary React
re-renders and downstream ASCII reconversions.

### Changes Required

#### `src/hooks/useResizeDebounce.ts` — Font-Keyed Char Dimension Cache + Equality Guard

```typescript
export function useResizeDebounce(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseResizeDebounceOptions = {}
): ContainerSize {
  const {
    fontFamily = DEFAULT_FONT_FAMILY,
    fontSize   = DEFAULT_FONT_SIZE,
    lineHeight = DEFAULT_LINE_HEIGHT,
    debounceMs = RESIZE_DEBOUNCE_MS,
  } = options;

  const [size, setSize] = useState<ContainerSize>({
    width: 0, height: 0,
    charWidth: fontSize * 0.6, charHeight: fontSize * lineHeight,
    gridCols: 1, gridRows: 1,
  });

  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NEW — cache char dimensions per font configuration:
  const charDimCacheRef = useRef<{ charWidth: number; charHeight: number } | null>(null);
  const lastFontKeyRef  = useRef<string>("");

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const width  = el.clientWidth;
    const height = el.clientHeight;
    if (width === 0 || height === 0) return;

    // Re-run measureCharDimensions() ONLY when font props have changed:
    const fontKey = `${fontFamily}|${fontSize}|${lineHeight}`;
    if (!charDimCacheRef.current || fontKey !== lastFontKeyRef.current) {
      charDimCacheRef.current = measureCharDimensions(fontFamily, fontSize, lineHeight, el);
      lastFontKeyRef.current  = fontKey;
    }
    const { charWidth, charHeight } = charDimCacheRef.current;

    const { gridCols, gridRows } = computeGridDimensions(width, height, charWidth, charHeight);

    // Skip state update when all dimensions are unchanged (prevents re-renders):
    setSize((prev) => {
      if (
        prev.width    === width    &&
        prev.height   === height   &&
        prev.gridCols === gridCols &&
        prev.gridRows === gridRows
      ) return prev; // React bails out — no re-render triggered
      return { width, height, charWidth, charHeight, gridCols, gridRows };
    });
  }, [containerRef, fontFamily, fontSize, lineHeight]);

  useEffect(() => {
    measure(); // Initial measurement on mount

    const observer = new ResizeObserver(() => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      // RAF alignment: wait for browser layout to settle before measuring
      timerRef.current = setTimeout(() => requestAnimationFrame(measure), debounceMs);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [containerRef, measure, debounceMs]);

  return size;
}
```

---

## Implementation Order

Work through features in this order — each step keeps the build green and is independently
testable before the next step begins:

| Step | Feature | File(s) changed | Risk |
|---|---|---|---|
| 1 | Char LUT — additive only | `src/core/char-ramp.ts` | None — new export only |
| 2 | Color LUT — additive only | `src/core/color-engine.ts` | None — new exports only |
| 3 | Canvas reuse in video loop | `src/core/video-to-ascii.ts` | Low — internal refactor |
| 4 | Canvas reuse in image pipeline | `src/core/image-to-ascii.ts` | Low — optional param |
| 5 | Block averaging | `src/core/image-to-ascii.ts` | Medium — changes output visuals (better) |
| 6 | LUT fast path in imageDataToAsciiGrid | `src/core/image-to-ascii.ts` | Low — behind optional param |
| 7 | Loop pause/resume interface | `src/core/video-to-ascii.ts` | Medium — extends interface |
| 8 | Viewport wiring to pause/resume | `src/hooks/useASCIIConverter.ts` | Low — swap method calls |
| 9 | LUT caching in hook | `src/hooks/useASCIIConverter.ts` | Low — adds refs |
| 10 | Resize dimension cache + equality guard | `src/hooks/useResizeDebounce.ts` | Low — pure optimisation |

---

## Expected Performance Impact

| Feature | Before | After | Gain |
|---|---|---|---|
| Block averaging | 1 pixel sample per cell | Block average (n×m pixels) | More accurate output, no speed cost at equal grid size |
| Char LUT | ~5 float ops per pixel | 1 array index per pixel | ~5× fewer ops per pixel |
| Canvas reuse (video) | 1 GPU canvas alloc/frame | 0 allocs/frame | Eliminates GPU churn |
| Color LUT | `lerpColor()` × 72,000/sec at 15fps | 1 array index per cell | ~4× speedup on color mapping |
| Loop pause (off-screen) | 60 Hz RAF callbacks | 0 callbacks | Eliminates all off-screen CPU usage |
| Tab visibility pause | Video paused; RAF continues | Both paused | Eliminates background RAF overhead |
| Resize char cache | DOM probe on every resize | DOM probe only on font change | Eliminates most probe-span ops |
| Resize equality guard | `setSize()` every resize | `setSize()` only on change | Eliminates spurious re-renders |

---

## Files Changed Summary

```
src/core/char-ramp.ts          + buildCharLUT()
src/core/color-engine.ts       + buildColorLUT(), applyPaletteWithLUT()
src/core/image-to-ascii.ts     ~ block averaging, optional charLUT param, canvas reuse support
src/core/video-to-ascii.ts     ~ persistent canvas in closure, pause/resume, visibilitychange
src/hooks/useASCIIConverter.ts ~ charLUTRef/colorLUTRef caching, pause/resume wiring
src/hooks/useResizeDebounce.ts ~ charDimCacheRef, equality guard, RAF alignment
```

No changes to `src/types.ts`, `src/constants.ts`, `src/components/`, `src/three/`,
`src/palettes/`, or `src/index.tsx`.

---

## Research Sources

| Topic | Source |
|---|---|
| Classic Bitmap to ASCII algorithm | Jonathan Petitcolas (2017), Gehna Ahuja — Medium (2025), Muhammad Naufal Pratama — Medium |
| BT.601 luminosity formula | Mustafa Murat ARAT — RGB to Grayscale Conversion; Dynamsoft Blog |
| OffscreenCanvas performance | web.dev/articles/offscreen-canvas; Evil Martians engineering blog; MDN Web API docs |
| OffscreenCanvas + Three.js | Evil Martians — Faster WebGL/Three.js 3D graphics with OffscreenCanvas and Web Workers |
| LUT performance benchmarks | Wing Ho Tang — Medium (2024); VoidCanvas — JavaScript Array Performance |
| Uint8ClampedArray | MDN Web Docs — Uint8ClampedArray; GeeksforGeeks |
| IntersectionObserver video pattern | MDN Intersection Observer API; CodePen rpsthecoder; Esau Silva (2021) |
| IntersectionObserver rootMargin | MDN — IntersectionObserver.rootMargin; Webinista |
| ResizeObserver debounce | DHIwise (2024); OpenReplay; Go Make Things (2024) |
| RAF debouncing | Go Make Things — Debouncing events with requestAnimationFrame |
| ResizeObserver loop error | DHIwise — Resolving ResizeObserver loop completed |
