// ---------------------------------------------------------------------------
// Core grid types
// ---------------------------------------------------------------------------

export interface AsciiCell {
  char: string;
  r: number;
  g: number;
  b: number;
  brightness: number;
}

export type AsciiGrid = AsciiCell[][];

export interface StyledAsciiCell extends AsciiCell {
  color: string;
  background: string;
}

export type StyledAsciiGrid = StyledAsciiCell[][];

// ---------------------------------------------------------------------------
// Fit modes
// ---------------------------------------------------------------------------

export type FitMode = "cover" | "contain" | "fill" | "none";

export interface FitResult {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

export type PaletteType = "monochrome" | "mapped" | "original";

export interface ColorStop {
  threshold: number; // 0.0–1.0 brightness threshold
  color: string;     // CSS color string
}

export interface ColorPalette {
  id: string;
  name: string;
  type: PaletteType;
  foreground?: string;   // Used by monochrome palettes
  colorStops?: ColorStop[]; // Used by mapped palettes
  background: string;
}

// ---------------------------------------------------------------------------
// Character ramps
// ---------------------------------------------------------------------------

export type RampPreset = "standard" | "simple" | "blocks" | "minimal" | "binary";

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export type RendererMode = "dom" | "canvas";

export interface RenderOptions {
  mode: RendererMode;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
}

// ---------------------------------------------------------------------------
// CRT overlay
// ---------------------------------------------------------------------------

export interface CRTOptions {
  enabled: boolean;
  scanlineOpacity: number; // 0.0–1.0
  glowIntensity: number;   // 0.0–1.0
  glowColor: string;
  curvature: number;       // 0.0–1.0 barrel distortion
  flickerSpeed: number;    // Hz
  noiseAmount: number;     // 0.0–1.0
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export type MediaType = "image" | "video" | "webcam";

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ASCIIfyProps {
  // Media source
  mediaType: MediaType;
  imageSrc: string;
  videoSrc: string;

  // ASCII controls
  palette: string;
  characterDensity: number;  // 0.0–1.0
  rampPreset: RampPreset;
  customCharacters: string;
  invertBrightness: boolean;

  // Layout
  fitMode: FitMode;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;

  // Performance
  resolutionScale: number;  // 0.25–1.0
  targetFps: number;        // 5–60 (video/webcam only)
  renderer: RendererMode;

  // Video
  loop: boolean;
  muted: boolean;
  autoplay: boolean;
  pauseOnBackground: boolean;

  // CRT effect
  crtEnabled: boolean;
  crtScanlineOpacity: number;
  crtGlowIntensity: number;
  crtGlowColor: string;
  crtCurvature: number;
  crtFlickerSpeed: number;
  crtNoiseAmount: number;

  // Accessibility
  ariaLabel: string;
  reducedMotion: boolean;
}

export interface ASCIIfy3DProps {
  // Model
  modelUrl: string;

  // Rotation
  autoRotate: boolean;
  autoRotateSpeed: number;
  initialRotationX: number;
  initialRotationY: number;
  initialRotationZ: number;

  // ASCII controls
  characterDensity: number;
  rampPreset: RampPreset;
  colorMode: "monochrome" | "original";

  // CRT
  crtEnabled: boolean;
  crtGlowColor: string;
  crtScanlineOpacity: number;
  crtCurvature: number;
  crtFlickerSpeed: number;
  crtNoiseAmount: number;

  // Performance
  resolutionScale: number;
  refreshRate: number;

  // Layout
  fontSize: number;
  lineHeight: number;
  background: string;
}

export interface ASCIICanvasProps {
  grid: StyledAsciiGrid;
  renderer: RendererMode;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  crt?: CRTOptions;
  ariaLabel: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Hook return types
// ---------------------------------------------------------------------------

export interface CharDimensions {
  charWidth: number;
  charHeight: number;
}

export interface ContainerSize extends CharDimensions {
  width: number;
  height: number;
  gridCols: number;
  gridRows: number;
}

export interface VideoPlaybackControls {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  isPlaying: boolean;
}
