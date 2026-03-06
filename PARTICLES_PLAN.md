# Interactive Particles Plan — Dot/Circle Rendering Mode

## Motivation

Text ASCII characters have internal geometry (strokes, counters, serifs) that competes with the image. A circle is the only shape with perfect rotational symmetry — no orientation, no internal structure. When dots animate, the swelling/shrinking of each circle as brightness shifts gives motion a tactile quality that flat text doesn't have.

This plan adds **two new rendering modes** alongside the existing DOM/Canvas text renderers:

1. **SVG Dot Renderer** — Seurat-inspired pointillist circles, interactive, vector-scalable
2. **WebGL Particle Renderer** — GPU-accelerated instanced particles with touch/mouse interaction (brunoimbrizi-inspired)

Both reuse the existing conversion pipeline (`image-to-ascii.ts` → `AsciiGrid` → `color-engine.ts` → `StyledAsciiGrid`). The grid data is the same — only the final rendering stage changes from text characters to dots/particles.

---

## Architecture Overview

```
Existing Pipeline (unchanged):
  Media Source → Canvas Sampling → AsciiGrid → StyledAsciiGrid
                                                      │
                                          ┌───────────┼───────────────┐
                                          ▼           ▼               ▼
                                    [DOM Text]   [SVG Dots]    [WebGL Particles]
                                    (existing)    (new)           (new)
```

The key insight: `StyledAsciiGrid` already contains everything needed — brightness (for dot size), color (for dot fill), and grid position. We just render circles instead of characters.

---

## Phase 1: Type Extensions & Constants

### 1.1 — Extend `RendererMode` in `types.ts`

```typescript
// Before:
export type RendererMode = "dom" | "canvas";

// After:
export type RendererMode = "dom" | "canvas" | "svg-dots" | "webgl-particles";
```

### 1.2 — Add `DotRenderOptions` to `types.ts`

```typescript
export interface DotRenderOptions {
  /** Minimum dot radius as fraction of cell size (0.0–0.5). Default 0.05. */
  minDotRadius: number;
  /** Maximum dot radius as fraction of cell size (0.0–0.5). Default 0.45. */
  maxDotRadius: number;
  /** Gap between dots in px. Default 1. */
  dotGap: number;
  /** Dot shape: circle or rounded-rect. Default "circle". */
  dotShape: "circle" | "rounded-rect";
  /** Whether brightness maps to radius (true) or opacity (false). Default true. */
  sizeByBrightness: boolean;
  /** Easing curve for brightness→radius mapping. Default "linear". */
  brightnessEasing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}
```

### 1.3 — Add `InteractionOptions` to `types.ts`

```typescript
export interface InteractionOptions {
  /** Enable mouse/touch interaction. Default true. */
  enabled: boolean;
  /** Interaction type. Default "repel". */
  mode: "repel" | "attract" | "pop" | "hover-reveal";
  /** Radius of influence in grid cells. Default 3. */
  radius: number;
  /** Strength of repel/attract force (0.0–1.0). Default 0.5. */
  strength: number;
  /** Whether popped dots regenerate. Default true. */
  regenerate: boolean;
  /** Regeneration delay in ms. Default 2000. */
  regenerateDelay: number;
}
```

### 1.4 — Extend `ASCIIfyProps` in `types.ts`

Add to the existing props interface:

```typescript
// In ASCIIfyProps, add:
dotOptions?: Partial<DotRenderOptions>;
interaction?: Partial<InteractionOptions>;
```

### 1.5 — Add defaults to `constants.ts`

```typescript
export const DEFAULT_DOT_OPTIONS: DotRenderOptions = {
  minDotRadius: 0.05,
  maxDotRadius: 0.45,
  dotGap: 1,
  dotShape: "circle",
  sizeByBrightness: true,
  brightnessEasing: "linear",
};

export const DEFAULT_INTERACTION_OPTIONS: InteractionOptions = {
  enabled: true,
  mode: "repel",
  radius: 3,
  strength: 0.5,
  regenerate: true,
  regenerateDelay: 2000,
};
```

---

## Phase 2: SVG Dot Renderer

### File: `src/core/dot-renderer-svg.ts`

The SVG renderer converts a `StyledAsciiGrid` into an SVG element where each cell becomes a `<circle>` (or `<rect rx>`) element. This is the Seurat-inspired approach: vector-scalable, interactive per-element, and visually crisp at any zoom level.

### 2.1 — Core Rendering Function

```typescript
export function renderToSVG(
  container: HTMLElement,
  grid: StyledAsciiGrid,
  cellSize: number,
  options: DotRenderOptions,
  interaction?: InteractionOptions
): SVGSVGElement;
```

**Algorithm:**
1. Calculate SVG viewBox from `grid[0].length * cellSize` × `grid.length * cellSize`
2. For each cell in `StyledAsciiGrid`:
   - Skip transparent cells (`isTransparent === true`)
   - Skip near-black cells (brightness < DARK_THRESHOLD) — render as empty space
   - Map brightness → radius: `radius = lerp(minDotRadius, maxDotRadius, brightness) * cellSize`
   - Apply easing curve to brightness before radius mapping
   - Create `<circle cx cy r>` with `fill` set to `cell.color`
   - Position: `cx = col * cellSize + cellSize/2`, `cy = row * cellSize + cellSize/2`
3. Set SVG `viewBox` and `preserveAspectRatio="xMidYMid meet"` for responsive scaling

**Brightness → Radius mapping (inverse, matching Seurat):**
- Bright pixels → large dots (more visual mass)
- Dark pixels → small dots (approaching invisible)
- This is the OPPOSITE of the Seurat blog's convention (which uses dark=large). We should make this configurable via an `invertDotSize` boolean, defaulting to the Seurat convention where dark areas have larger dots.

### 2.2 — Incremental DOM Update

For video/animation, recreating the full SVG each frame is expensive. Instead:

```typescript
export function updateSVGDots(
  svg: SVGSVGElement,
  grid: StyledAsciiGrid,
  cellSize: number,
  options: DotRenderOptions
): void;
```

- On first render, create all `<circle>` elements and store references in a flat array
- On subsequent frames, iterate the flat array and update only `r` (radius) and `fill` attributes that changed
- Use `setAttribute()` directly — no virtual DOM overhead

### 2.3 — SVG Interaction Handler

```typescript
export function attachSVGInteraction(
  svg: SVGSVGElement,
  grid: StyledAsciiGrid,
  cellSize: number,
  options: InteractionOptions
): () => void; // Returns cleanup function
```

**Interaction modes:**

| Mode | Behavior |
|------|----------|
| `repel` | Dots near cursor shrink/move away. Uses distance-based falloff from cursor position. |
| `attract` | Dots near cursor grow/move toward cursor. |
| `pop` | Click/drag to remove dots. Uses Bresenham's line algorithm for drag path. Optional regeneration timer. |
| `hover-reveal` | Dots are initially hidden/minimal; hover reveals them at full size with a radial gradient falloff. |

**Implementation approach:**
- Single `pointermove` listener on SVG element (not per-circle — O(1) event binding)
- Convert pointer coordinates to grid position: `col = Math.floor(x / cellSize)`, `row = Math.floor(y / cellSize)`
- Iterate only dots within `interaction.radius` of cursor position
- For `repel`/`attract`: calculate displacement vector, apply spring-like force, animate with `transform: translate()`
- For `pop`: track popped state per cell, use Bresenham for continuous drag paths
- Use `requestAnimationFrame` for smooth interaction animation (separate from grid update RAF)

### 2.4 — Hover Tooltip

On hover, show the hex color value of the dot (like the Seurat blog):
- CSS `::after` pseudo-element or lightweight `<title>` element per circle
- Shows `#RRGGBB` of the original source pixel color

---

## Phase 3: WebGL Particle Renderer

### File: `src/core/dot-renderer-webgl.ts`

The WebGL renderer uses Three.js instanced meshes for GPU-accelerated rendering of thousands of particles. This is inspired by brunoimbrizi's interactive-particles approach.

### 3.1 — Architecture

```
StyledAsciiGrid
  ↓
[Instance Buffer Build]
  - position (x, y) per cell
  - radius per cell (from brightness)
  - color (r, g, b) per cell
  ↓
[Three.js InstancedMesh]
  - Base geometry: CircleGeometry (or PlaneGeometry with circle shader)
  - Instance attributes: offset, scale, color
  ↓
[Touch Texture] (off-screen canvas, 64×64)
  - Tracks mouse/touch position with trail & fade
  - Passed as uniform to vertex shader
  ↓
[Custom Shaders]
  - Vertex: displace particles based on touch texture sample
  - Fragment: render circle with soft edge (SDF)
  ↓
[WebGLRenderer → container <canvas>]
```

### 3.2 — Touch Texture (ported from brunoimbrizi)

```typescript
export class TouchTexture {
  canvas: HTMLCanvasElement;      // 64×64 offscreen canvas
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  trail: TouchPoint[];            // Active touch points
  maxAge: number;                 // 120 frames

  addTouch(uv: { x: number; y: number }): void;
  update(): void;  // Called each frame — ages points, redraws gradient
}
```

- Each touch point has `x, y, age, force`
- Force = distance from previous point × scale factor (faster movement = stronger displacement)
- Radial gradient drawn per point: white center → transparent edge
- Intensity follows easing: ramp up during first 30% of lifespan (easeOutSine), fade out over remaining 70%
- Points removed when `age > maxAge` (120 frames)

### 3.3 — Particle System

```typescript
export function createParticleSystem(
  grid: StyledAsciiGrid,
  cellSize: number,
  options: DotRenderOptions,
  interaction: InteractionOptions
): {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  touchTexture: TouchTexture;
  update: (grid: StyledAsciiGrid) => void;
  dispose: () => void;
};
```

**Geometry setup (instanced rendering):**
- Base geometry: `THREE.CircleGeometry(1, 16)` (16 segments — smooth enough, GPU-friendly)
- Instance count: `grid.rows × grid.cols`
- Instance attributes:
  - `aOffset` (vec2): grid position of each particle
  - `aScale` (float): radius from brightness
  - `aColor` (vec3): RGB from styled grid
  - `aIndex` (float): particle index for noise-based variation

**Vertex shader (`particle.vert`):**
```glsl
attribute vec2 aOffset;
attribute float aScale;
attribute vec3 aColor;

uniform sampler2D uTouch;
uniform float uTime;
uniform float uInteractionStrength;
uniform float uInteractionRadius;

varying vec3 vColor;

void main() {
  vec3 pos = position;

  // Scale by brightness-derived radius
  pos.xy *= aScale;

  // Sample touch texture at this particle's UV
  vec2 uv = aOffset / uGridSize;
  float touch = texture2D(uTouch, uv).r;

  // Displace based on touch (repel/attract)
  float angle = atan(aOffset.y - uCursor.y, aOffset.x - uCursor.x);
  pos.x += cos(angle) * touch * uInteractionStrength * 20.0;
  pos.y += sin(angle) * touch * uInteractionStrength * 20.0;

  // Translate to grid position
  pos.xy += aOffset;

  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Fragment shader (`particle.frag`):**
```glsl
varying vec3 vColor;

void main() {
  // SDF circle with soft edge
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.45, 0.5, dist);
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColor, alpha);
}
```

### 3.4 — Frame Update Loop

For video/animation sources:
1. Receive new `StyledAsciiGrid` each frame
2. Update instance attribute buffers (`aScale`, `aColor`) — positions don't change
3. Update touch texture (age points, redraw canvas)
4. Render frame

Buffer updates use `THREE.InstancedBufferAttribute` with `needsUpdate = true` — only the changed attributes are re-uploaded to GPU.

### 3.5 — Performance Considerations

| Particle Count | Recommended Renderer |
|---|---|
| < 2,000 | SVG Dots (vector quality, interactive, accessible) |
| 2,000–50,000 | WebGL Particles (GPU-accelerated) |
| > 50,000 | WebGL Particles + reduced resolution scale |

- SVG DOM nodes become expensive above ~2K elements
- WebGL handles 50K+ particles at 60fps easily
- Auto-selection based on `gridCols × gridRows` is possible as a future enhancement

---

## Phase 4: Component Integration

### 4.1 — Update `ASCIICanvas.tsx`

Add SVG and WebGL rendering paths alongside existing DOM/Canvas:

```typescript
// In ASCIICanvas.tsx, extend the rendering switch:
switch (renderer) {
  case "dom":
    renderToDOM(preRef.current, grid, renderOptions);
    break;
  case "canvas":
    renderToCanvas(canvasRef.current, grid, renderOptions);
    break;
  case "svg-dots":
    renderToSVG(containerRef.current, grid, cellSize, dotOptions, interaction);
    break;
  case "webgl-particles":
    particleSystem.update(grid);
    break;
}
```

For `svg-dots`: the container holds an `<svg>` element instead of `<pre>` or `<canvas>`.
For `webgl-particles`: the container holds a Three.js `<canvas>` managed by WebGLRenderer.

### 4.2 — Update `ASCIICanvas.tsx` props

```typescript
export interface ASCIICanvasProps {
  grid: StyledAsciiGrid;
  renderer: RendererMode;       // Now includes "svg-dots" | "webgl-particles"
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  crt?: CRTOptions;
  ariaLabel: string;
  className?: string;
  dotOptions?: DotRenderOptions;       // NEW
  interaction?: InteractionOptions;    // NEW
}
```

### 4.3 — Update Framer Property Controls (`index.tsx`)

Add new controls for the dot rendering modes:

```typescript
renderer: {
  type: ControlType.Enum,
  options: ["dom", "canvas", "svg-dots", "webgl-particles"],
  optionTitles: ["DOM Text", "Canvas Text", "SVG Dots", "WebGL Particles"],
  defaultValue: "dom",
},
dotMinRadius: {
  type: ControlType.Number,
  min: 0, max: 0.5, step: 0.01,
  defaultValue: 0.05,
  hidden: (props) => !props.renderer.startsWith("svg") && !props.renderer.startsWith("webgl"),
},
dotMaxRadius: {
  type: ControlType.Number,
  min: 0, max: 0.5, step: 0.01,
  defaultValue: 0.45,
  hidden: (props) => !props.renderer.startsWith("svg") && !props.renderer.startsWith("webgl"),
},
interactionEnabled: {
  type: ControlType.Boolean,
  defaultValue: true,
  hidden: (props) => !props.renderer.startsWith("svg") && !props.renderer.startsWith("webgl"),
},
interactionMode: {
  type: ControlType.Enum,
  options: ["repel", "attract", "pop", "hover-reveal"],
  defaultValue: "repel",
  hidden: (props) => !props.interactionEnabled,
},
```

### 4.4 — Update `test.html`

Add a "Render Mode" dropdown to the sidebar controls:
- Options: Text (DOM), Text (Canvas), SVG Dots, WebGL Particles
- When SVG Dots or WebGL is selected, show dot-specific controls (min/max radius, interaction mode)
- The 3D tab should also support dot rendering (sample Three.js render buffer → grid → dots)

---

## Phase 5: Accessibility for Dot Modes

### SVG Dots
- `<svg role="img" aria-label="...">` on the root SVG element
- `<title>` element inside SVG for screen readers
- Each circle can have `<title>` with hex color for assistive tech (optional, can be expensive for large grids)
- `prefers-reduced-motion`: disable interaction animations, show static dots

### WebGL Particles
- WebGL canvas gets `role="img"` and `aria-label` on the container div
- Fallback: `<noscript>` or hidden `<p>` describing the image content
- `prefers-reduced-motion`: disable touch displacement animation, show static particles
- Keyboard: not applicable (canvas is not navigable), rely on aria-label description

---

## File Creation Order

| # | File | Description | Depends On |
|---|------|-------------|------------|
| 1 | `src/types.ts` | Add `DotRenderOptions`, `InteractionOptions`, extend `RendererMode` | — |
| 2 | `src/constants.ts` | Add `DEFAULT_DOT_OPTIONS`, `DEFAULT_INTERACTION_OPTIONS` | types.ts |
| 3 | `src/core/dot-renderer-svg.ts` | SVG dot rendering + incremental update + interaction | types.ts, constants.ts |
| 4 | `src/core/touch-texture.ts` | Off-screen touch tracking canvas (shared by WebGL) | — |
| 5 | `src/core/dot-renderer-webgl.ts` | WebGL instanced particle system + shaders | types.ts, touch-texture.ts |
| 6 | `src/components/ASCIICanvas.tsx` | Add svg-dots and webgl-particles render paths | dot-renderer-svg, dot-renderer-webgl |
| 7 | `src/index.tsx` | Add Framer property controls for dot modes | types.ts |
| 8 | `test.html` | Add render mode dropdown + dot controls | dot-renderer-svg |

---

## Key Design Decisions

### Why keep the existing AsciiGrid pipeline?
The grid is a clean intermediate representation. It already computes brightness, color, and grid position. Both dot renderers consume the same `StyledAsciiGrid` — they just draw circles instead of characters. This avoids duplicating the image sampling, fit-mode, and color engine logic.

### Why SVG + WebGL instead of just one?
- **SVG** is better for: small grids (<2K dots), print/export, accessibility, interactive hover states, crisp vector scaling
- **WebGL** is better for: large grids (>2K dots), real-time video, complex physics-based interaction, 60fps animation
- Different use cases demand different renderers. Framer users should pick what fits their design.

### Why not Canvas 2D for dots?
Canvas 2D `arc()` calls are surprisingly slow for >1K circles per frame. SVG with incremental updates or WebGL instanced rendering both outperform it. Canvas 2D remains available for text rendering where `fillText` is the only viable option.

### Brightness → Dot Size Convention
The Seurat blog uses: **dark areas = large dots, bright areas = small dots** (shadow expressed through mass, light through absence). This is the default (`invertDotSize: true`). The brunoimbrizi approach scales dot size by brightness (bright = large). Both are supported via the `invertDotSize` toggle.

---

## Migration Impact

### No Breaking Changes
- Existing `RendererMode` values (`"dom"`, `"canvas"`) continue to work unchanged
- New modes are additive — `"svg-dots"` and `"webgl-particles"`
- All existing props remain intact
- `ASCIIfy3D` can optionally support dot rendering (grid is already computed)

### New Dependencies
- **None for SVG dots** — pure DOM API
- **Three.js already included** for WebGL particles (used by ASCIIfy3D)

### Bundle Size Impact
- SVG renderer: ~3KB minified (pure DOM, no deps)
- WebGL renderer: ~8KB minified (shader strings + geometry setup, Three.js already bundled)
- Touch texture: ~2KB minified
