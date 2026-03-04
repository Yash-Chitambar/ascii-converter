# ASCIIfy

A high-performance Framer component that converts images, videos, and 3D GLB models into dynamic ASCII art in real time.

## Installation

```bash
npm install @yash-chitambar/ascii-converter
```

### Peer Dependencies

```bash
npm install react react-dom framer framer-motion
```

`three` (^0.170.0) is included as a direct dependency and is only needed for the `ASCIIfy3D` component.

## Usage

### Image

```tsx
import { ASCIIfy } from "@yash-chitambar/ascii-converter";

<ASCIIfy
  mediaType="image"
  imageSrc="/photo.jpg"
  palette="classic-green"
  rampPreset="standard"
  characterDensity={0.5}
  fontSize={10}
/>
```

### Video

```tsx
<ASCIIfy
  mediaType="video"
  videoSrc="/clip.mp4"
  palette="original"
  targetFps={15}
  loop={true}
  muted={true}
/>
```

### 3D GLB Model

```tsx
import { ASCIIfy3D } from "@yash-chitambar/ascii-converter";

<ASCIIfy3D
  modelUrl="/model.glb"
  autoRotate={true}
  autoRotateSpeed={30}
  colorMode="monochrome"
  refreshRate={15}
/>
```

## ASCIIfy Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mediaType` | `"image" \| "video" \| "webcam"` | `"image"` | Media source type |
| `imageSrc` | `string` | `""` | Image URL (when mediaType is "image") |
| `videoSrc` | `string` | `""` | Video URL (when mediaType is "video") |
| `palette` | `string` | `"classic-green"` | Color palette ID |
| `rampPreset` | `string` | `"standard"` | Character ramp preset |
| `customCharacters` | `string` | `""` | Custom character set (overrides preset) |
| `characterDensity` | `number` | `0.5` | Character density (0.0–1.0) |
| `invertBrightness` | `boolean` | `false` | Invert brightness mapping |
| `fitMode` | `"cover" \| "contain" \| "fill" \| "none"` | `"cover"` | Image fitting mode |
| `fontSize` | `number` | `10` | Font size in px |
| `lineHeight` | `number` | `1.1` | Line height multiplier |
| `letterSpacing` | `number` | `0` | Letter spacing in px |
| `resolutionScale` | `number` | `0.5` | Resolution scale (0.25–1.0) |
| `targetFps` | `number` | `15` | Target FPS for video/webcam (5–60) |
| `renderer` | `"dom" \| "canvas"` | `"dom"` | Rendering mode |
| `loop` | `boolean` | `true` | Loop video playback |
| `muted` | `boolean` | `true` | Mute video audio |
| `autoplay` | `boolean` | `true` | Autoplay video |
| `crtEnabled` | `boolean` | `false` | Enable CRT post-processing effect |
| `crtScanlineOpacity` | `number` | `0.15` | Scanline opacity (0.0–1.0) |
| `crtGlowIntensity` | `number` | `0.6` | Glow intensity (0.0–1.0) |
| `crtGlowColor` | `string` | `"#00ff41"` | Glow color |
| `crtCurvature` | `number` | `0` | Barrel distortion (0.0–1.0) |
| `crtFlickerSpeed` | `number` | `0` | Flicker speed in Hz |
| `crtNoiseAmount` | `number` | `0` | Noise amount (0.0–1.0) |
| `ariaLabel` | `string` | `""` | Custom aria-label (auto-generated if empty) |
| `reducedMotion` | `boolean` | `false` | Force reduced motion behavior |

## ASCIIfy3D Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelUrl` | `string` | `""` | GLB/GLTF model URL |
| `autoRotate` | `boolean` | `true` | Enable auto-rotation |
| `autoRotateSpeed` | `number` | `30` | Rotation speed in degrees/second |
| `initialRotationX` | `number` | `0` | Initial X rotation in degrees |
| `initialRotationY` | `number` | `0` | Initial Y rotation in degrees |
| `initialRotationZ` | `number` | `0` | Initial Z rotation in degrees |
| `characterDensity` | `number` | `0.5` | Character density (0.0–1.0) |
| `rampPreset` | `string` | `"standard"` | Character ramp preset |
| `colorMode` | `"monochrome" \| "original"` | `"monochrome"` | Color rendering mode |
| `crtEnabled` | `boolean` | `false` | Enable CRT effect |
| `resolutionScale` | `number` | `0.5` | Resolution scale (0.25–1.0) |
| `refreshRate` | `number` | `15` | Target FPS (5–60) |
| `fontSize` | `number` | `10` | Font size in px |
| `lineHeight` | `number` | `1.1` | Line height multiplier |
| `background` | `string` | `"#000000"` | Background color |

## Color Palettes

| ID | Name | Type | Description |
|----|------|------|-------------|
| `classic-green` | Classic Green | monochrome | Matrix-style green on black |
| `amber-crt` | Amber CRT | monochrome | Amber on dark brown |
| `cool-blue` | Cool Blue | monochrome | Cyan on dark blue |
| `hot-pink` | Hot Pink | monochrome | Pink on dark magenta |
| `phosphor-white` | Phosphor White | monochrome | White on dark gray |
| `original` | Original Colors | original | Preserves source RGB |
| `neon-gradient` | Neon Gradient | mapped | Magenta to cyan to gold |
| `heatmap` | Heatmap | mapped | Blue to red to yellow |
| `dracula` | Dracula | mapped | Dracula theme tones |
| `solarized` | Solarized | mapped | Solarized dark tones |

## Character Ramp Presets

| Preset | Characters | Best For |
|--------|-----------|----------|
| `standard` | 70 characters | Maximum detail |
| `simple` | `@%#*+=-:. ` | General use |
| `blocks` | `█▓▒░ ` | Block art style |
| `minimal` | `#=-. ` | Clean, minimal look |
| `binary` | `█ ` | High contrast |

## Performance Tips

- **Lower `resolutionScale`** (0.25–0.5) for faster rendering with minimal quality loss
- **Reduce `targetFps`** for video/3D to lower CPU usage (15fps is a good default)
- **Use `"dom"` renderer** for most cases; `"canvas"` can be faster for very large grids
- Components automatically pause when scrolled off-screen via `IntersectionObserver`
- Resize is debounced at 150ms to prevent thrashing

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Run tests
npm run test

# Build
npm run build
```

## License

MIT
