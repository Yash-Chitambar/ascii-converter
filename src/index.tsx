import { addPropertyControls, ControlType } from "framer";
import { ASCIIfy } from "./components/ASCIIfy";
import { ASCIIfy3D } from "./components/ASCIIfy3D";
import { PALETTE_IDS, PALETTE_NAMES } from "./palettes";

export { ASCIIfy, ASCIIfy3D };

// ---------------------------------------------------------------------------
// ASCIIfy — image / video / webcam property controls
// ---------------------------------------------------------------------------

addPropertyControls(ASCIIfy, {
  // ── Media source ──────────────────────────────────────────────────────────
  mediaType: {
    type: ControlType.Enum,
    title: "Source",
    options: ["image", "video", "webcam"],
    optionTitles: ["Image", "Video", "Webcam"],
    defaultValue: "image",
  },
  imageSrc: {
    type: ControlType.Image,
    title: "Image",
    hidden: (props: Record<string, unknown>) => props.mediaType !== "image",
  },
  videoSrc: {
    type: ControlType.File,
    title: "Video",
    allowedFileTypes: ["mp4", "webm", "ogg"],
    hidden: (props: Record<string, unknown>) => props.mediaType !== "video",
  },

  // ── ASCII controls ────────────────────────────────────────────────────────
  palette: {
    type: ControlType.Enum,
    title: "Palette",
    options: PALETTE_IDS,
    optionTitles: PALETTE_NAMES,
    defaultValue: "classic-green",
  },
  rampPreset: {
    type: ControlType.Enum,
    title: "Characters",
    options: ["standard", "simple", "blocks", "minimal", "binary"],
    optionTitles: ["Standard", "Simple", "Blocks", "Minimal", "Binary"],
    defaultValue: "standard",
  },
  customCharacters: {
    type: ControlType.String,
    title: "Custom Chars",
    defaultValue: "",
    placeholder: "Leave empty to use preset",
  },
  characterDensity: {
    type: ControlType.Number,
    title: "Density",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  invertBrightness: {
    type: ControlType.Boolean,
    title: "Invert",
    defaultValue: false,
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  fitMode: {
    type: ControlType.Enum,
    title: "Fit",
    options: ["cover", "contain", "fill", "none"],
    optionTitles: ["Cover", "Contain", "Fill", "None"],
    defaultValue: "cover",
  },
  fontSize: {
    type: ControlType.Number,
    title: "Font Size",
    min: 4,
    max: 24,
    step: 1,
    defaultValue: 10,
    unit: "px",
  },
  lineHeight: {
    type: ControlType.Number,
    title: "Line Height",
    min: 0.8,
    max: 2,
    step: 0.05,
    defaultValue: 1.1,
  },
  letterSpacing: {
    type: ControlType.Number,
    title: "Letter Spacing",
    min: -2,
    max: 4,
    step: 0.5,
    defaultValue: 0,
    unit: "px",
  },

  // ── Performance ───────────────────────────────────────────────────────────
  resolutionScale: {
    type: ControlType.Number,
    title: "Resolution",
    min: 0.25,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  targetFps: {
    type: ControlType.Number,
    title: "Target FPS",
    min: 5,
    max: 60,
    step: 1,
    defaultValue: 15,
    hidden: (props: Record<string, unknown>) => props.mediaType === "image",
  },
  renderer: {
    type: ControlType.Enum,
    title: "Renderer",
    options: ["dom", "canvas"],
    optionTitles: ["DOM", "Canvas"],
    defaultValue: "dom",
  },

  // ── Video options ─────────────────────────────────────────────────────────
  loop: {
    type: ControlType.Boolean,
    title: "Loop",
    defaultValue: true,
    hidden: (props: Record<string, unknown>) => props.mediaType === "image",
  },
  muted: {
    type: ControlType.Boolean,
    title: "Muted",
    defaultValue: true,
    hidden: (props: Record<string, unknown>) => props.mediaType === "image",
  },
  autoplay: {
    type: ControlType.Boolean,
    title: "Autoplay",
    defaultValue: true,
    hidden: (props: Record<string, unknown>) => props.mediaType === "image",
  },
  pauseOnBackground: {
    type: ControlType.Boolean,
    title: "Pause in BG",
    defaultValue: true,
    hidden: (props: Record<string, unknown>) => props.mediaType === "image",
  },

  // ── CRT effect ────────────────────────────────────────────────────────────
  crtEnabled: {
    type: ControlType.Boolean,
    title: "CRT Effect",
    defaultValue: false,
  },
  crtScanlineOpacity: {
    type: ControlType.Number,
    title: "Scanlines",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.15,
    hidden: (props: Record<string, unknown>) => !props.crtEnabled,
  },
  crtGlowIntensity: {
    type: ControlType.Number,
    title: "Glow",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.6,
    hidden: (props: Record<string, unknown>) => !props.crtEnabled,
  },
  crtGlowColor: {
    type: ControlType.Color,
    title: "Glow Color",
    defaultValue: "#00ff41",
    hidden: (props: Record<string, unknown>) => !props.crtEnabled,
  },

  // ── Accessibility ─────────────────────────────────────────────────────────
  ariaLabel: {
    type: ControlType.String,
    title: "Aria Label",
    defaultValue: "",
    placeholder: "Auto-generated if empty",
  },
  reducedMotion: {
    type: ControlType.Boolean,
    title: "Reduce Motion",
    defaultValue: false,
  },
});

// ---------------------------------------------------------------------------
// ASCIIfy3D — GLB model property controls
// ---------------------------------------------------------------------------

addPropertyControls(ASCIIfy3D, {
  // ── Model ─────────────────────────────────────────────────────────────────
  modelUrl: {
    type: ControlType.File,
    title: "GLB Model",
    allowedFileTypes: ["glb", "gltf"],
  },

  // ── Rotation ──────────────────────────────────────────────────────────────
  autoRotate: {
    type: ControlType.Boolean,
    title: "Auto Rotate",
    defaultValue: true,
  },
  autoRotateSpeed: {
    type: ControlType.Number,
    title: "Rotate Speed",
    min: 1,
    max: 360,
    step: 5,
    defaultValue: 30,
    unit: "°/s",
    hidden: (props: Record<string, unknown>) => !props.autoRotate,
  },
  initialRotationX: {
    type: ControlType.Number,
    title: "Rotation X",
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    unit: "°",
  },
  initialRotationY: {
    type: ControlType.Number,
    title: "Rotation Y",
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    unit: "°",
  },
  initialRotationZ: {
    type: ControlType.Number,
    title: "Rotation Z",
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    unit: "°",
  },

  // ── ASCII controls ────────────────────────────────────────────────────────
  characterDensity: {
    type: ControlType.Number,
    title: "Density",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  rampPreset: {
    type: ControlType.Enum,
    title: "Characters",
    options: ["standard", "simple", "blocks", "minimal", "binary"],
    optionTitles: ["Standard", "Simple", "Blocks", "Minimal", "Binary"],
    defaultValue: "standard",
  },
  colorMode: {
    type: ControlType.Enum,
    title: "Color",
    options: ["monochrome", "original"],
    optionTitles: ["Monochrome", "Original"],
    defaultValue: "monochrome",
  },

  // ── CRT ───────────────────────────────────────────────────────────────────
  crtEnabled: {
    type: ControlType.Boolean,
    title: "CRT Effect",
    defaultValue: false,
  },
  crtGlowColor: {
    type: ControlType.Color,
    title: "Glow Color",
    defaultValue: "#00ff41",
    hidden: (props: Record<string, unknown>) => !props.crtEnabled,
  },
  crtScanlineOpacity: {
    type: ControlType.Number,
    title: "Scanlines",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.15,
    hidden: (props: Record<string, unknown>) => !props.crtEnabled,
  },

  // ── Performance ───────────────────────────────────────────────────────────
  resolutionScale: {
    type: ControlType.Number,
    title: "Resolution",
    min: 0.25,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  refreshRate: {
    type: ControlType.Number,
    title: "Refresh Rate",
    min: 5,
    max: 60,
    step: 1,
    defaultValue: 15,
    unit: "fps",
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  fontSize: {
    type: ControlType.Number,
    title: "Font Size",
    min: 4,
    max: 24,
    step: 1,
    defaultValue: 10,
    unit: "px",
  },
  lineHeight: {
    type: ControlType.Number,
    title: "Line Height",
    min: 0.8,
    max: 2,
    step: 0.05,
    defaultValue: 1.1,
  },
  background: {
    type: ControlType.Color,
    title: "Background",
    defaultValue: "#000000",
  },
});
