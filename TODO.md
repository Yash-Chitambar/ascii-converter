# TODO — ASCIIfy

## Status: All P0–P3 Complete, 148 Tests Pass, Build Verified

---

### P0 — TypeScript Compilation Fixes
- [x] Fix `video-to-ascii.ts` — replace `require()` with ES import
- [x] Fix `useViewportAware.ts` — RefObject type needs `| null` for React 19
- [x] Fix `useResizeDebounce.ts` — RefObject type needs `| null` for React 19
- [x] Fix `glb-to-ascii.ts` — `dispose()` this-context binding issue
- [x] Fix `glb-to-ascii.ts` — ImageData Uint8ClampedArray buffer type
- [x] Fix `index.tsx` — Framer hidden callback prop types
- [x] Add `declarations.d.ts` for Framer CDN module types
- [x] Add `.gitignore`
- [x] Install dependencies & verify `tsc --noEmit` passes

### P1 — Build & Package
- [x] Verify `npm run typecheck` passes cleanly
- [x] Add proper build script (tsup)
- [x] Generate `dist/` output (CJS + ESM + types)
- [ ] Publish to npm

### P2 — Testing
- [x] Add test runner (vitest)
- [x] Unit tests for `core/char-ramp.ts` — 25 tests (brightness, ramp subset, char lookup, transparency, dark threshold)
- [x] Unit tests for `core/fit-modes.ts` — 10 tests (cover, contain, fill, none)
- [x] Unit tests for `core/color-engine.ts` — 10 tests (monochrome, original, mapped, fallback, grid structure)
- [x] Unit tests for `core/image-to-ascii.ts`
- [x] Component tests for ASCIIfy, ASCIIfy3D, ASCIICanvas

### P3 — Polish
- [x] Optimize ASCIIfy3D pause/resume (store handle in ref, call stop/start on visibility change)
- [x] Add README with usage examples
- [x] Interactive test UI with 3D GLB tab (`test.html`)

---

## Completed
- All 20 source files implemented per PLAN.md
- All 10 color palettes
- All 5 character ramp presets
- Image, video, webcam, and 3D GLB conversion pipelines
- CRT post-processing effects
- Framer property controls with conditional visibility
- Accessibility (ARIA, reduced-motion, keyboard)
- Performance (viewport-aware, resolution scaling, debounced resize, RAF throttling)
- Standalone test UI (`test.html`) with tabbed Image/Video and 3D Model support
- 3D test UI: GLB/GLTF file loading via Three.js (CDN), auto-frame camera, auto-rotate, enhanced lighting with ACES tone mapping, saturation boost for vivid original colors
- Video frame scheduling fix: use raw elapsed time instead of MAX_DELTA_MS-clamped delta
- Per-frame buffer reuse (WebGLRenderTarget, pixel buffers), cached char measurement
- TypeScript compiles with zero errors (`tsc --noEmit`)
- 148 tests passing across 13 test suites
- Frame scheduling bug fixed in glb-to-ascii.ts (raw elapsed time for frame interval, clamped delta for rotation only)
- README with installation, usage, props tables, palette/ramp reference, and dev commands
