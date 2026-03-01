# ASCIIfy Test UI — Instructions

## Quick Start

Open `test.html` in any modern browser (Chrome, Firefox, Safari, Edge):

```bash
open test.html
```

No build step, no dependencies, no server required. The file is fully self-contained.

---

## Uploading Media

### Drag & Drop
Drag any supported file onto the upload zone in the sidebar.

### File Picker
Click the upload zone to open your system file picker.

### Supported Formats

| Type | Formats |
|------|---------|
| Image | PNG, JPG/JPEG, GIF, WebP |
| Vector | SVG |
| Video | MP4, WebM |

---

## Controls Reference

### Palette
Selects the color scheme applied to the ASCII output.

| Palette | Style |
|---------|-------|
| Classic Green | Matrix terminal (`#00ff41` on black) |
| Amber CRT | Vintage amber monitor |
| Cool Blue | Cyan terminal |
| Hot Pink | Cyberpunk magenta |
| Phosphor White | Modern terminal |
| Original Colors | Preserves the source image's RGB values |
| Neon Gradient | Brightness-mapped: magenta → cyan → gold |
| Heatmap | Brightness-mapped: blue → red → yellow |
| Dracula | Dracula theme tones |
| Solarized | Solarized Dark tones |

### Character Ramp
Controls which ASCII characters are used for density mapping.

- **Standard** — 70-character ramp with full detail
- **Simple** — 10 characters (`@%#*+=-:. `)
- **Blocks** — Unicode block elements (`█▓▒░`)
- **Minimal** — 4 characters (`#=-. `)
- **Binary** — On/off (`█` and space)
- **Custom** — Type your own characters (dense → light, ending with space)

### Density (0.0 – 1.0)
Controls how many characters from the ramp are used. Lower values produce more binary-looking output; higher values use the full ramp for more detail.

### Fit Mode
How the source media fits into the output area:

- **Cover** — Scale to fill, crop overflow (default)
- **Contain** — Scale to fit, letterbox with empty space
- **Fill** — Stretch to exact dimensions
- **None** — Render at source resolution, centered

### Font Size / Line Height / Letter Spacing
Typography controls that affect the ASCII grid density. Smaller font = more characters = more detail.

### Resolution Scale (0.1 – 1.0)
Scales the pixel sampling resolution before conversion. Lower values are faster but less detailed. Default `0.5` is a good balance.

### Target FPS (5 – 60)
Controls how many times per second the video frame is converted to ASCII. Only applies to video files. Default `15` is smooth without heavy CPU usage.

### Invert Brightness
Flips the character ramp so bright pixels map to sparse characters and dark pixels map to dense characters.

---

## Video Playback

When a video is loaded, controls appear at the bottom of the output area:

- **Pause / Play** — Toggle video playback and the ASCII conversion loop
- **Restart** — Seek to beginning and resume playback

---

## Status Bar

The bottom bar shows live diagnostics:

| Field | Meaning |
|-------|---------|
| `grid` | ASCII grid dimensions (columns × rows) |
| `source` | Original media dimensions |
| `time` | Render time per frame in milliseconds |

---

## Tips

- **Better detail**: Decrease font size or increase resolution scale
- **Better performance**: Increase font size (fewer cells) or decrease resolution scale
- **SVGs work like images**: They're rasterized by the browser before ASCII conversion
- **Large videos**: Lower the resolution scale and target FPS for smoother playback
- **Window resizing**: The grid automatically recalculates on browser resize (150ms debounce)

---

## Technical Notes

The test UI inlines the core conversion engine from `src/` directly into the HTML file. It uses the same algorithms as the Framer component:

- Brightness: `0.299*R + 0.587*G + 0.114*B` (luminosity weighting)
- Alpha threshold: pixels with `alpha < 128` are treated as transparent
- Dark threshold: pixels with `brightness < 0.05` are skipped
- Delta time clamping: `Math.min(delta, 50ms)` prevents frame explosions after tab switch
- Font ligature prevention: `font-feature-settings: "liga" 0, "calt" 0`
