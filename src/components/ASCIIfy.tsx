import React, { useRef, useEffect } from "react";
import type { ASCIIfyProps, CRTOptions } from "../types";
import { ASCIICanvas } from "./ASCIICanvas";
import { useResizeDebounce } from "../hooks/useResizeDebounce";
import { useViewportAware } from "../hooks/useViewportAware";
import { useASCIIConverter } from "../hooks/useASCIIConverter";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_RESOLUTION_SCALE,
  DEFAULT_TARGET_FPS,
  DEFAULT_CHARACTER_DENSITY,
  DEFAULT_RAMP_PRESET,
  DEFAULT_RENDERER,
  DEFAULT_FIT_MODE,
  DEFAULT_PALETTE_ID,
  DEFAULT_CRT,
} from "../constants";

/**
 * ASCIIfy — Framer component for converting images, videos, or webcam feeds
 * into real-time ASCII art.
 *
 * Composes:
 *   useResizeDebounce  → container dimensions + grid sizing
 *   useViewportAware   → pause when off-screen
 *   useASCIIConverter  → runs the full media → ASCII pipeline
 *   ASCIICanvas        → renders the StyledAsciiGrid to DOM or canvas
 */
export function ASCIIfy({
  // Media source
  mediaType = "image",
  imageSrc = "",
  videoSrc = "",

  // ASCII controls
  palette = DEFAULT_PALETTE_ID,
  characterDensity = DEFAULT_CHARACTER_DENSITY,
  rampPreset = DEFAULT_RAMP_PRESET,
  customCharacters = "",
  invertBrightness = false,

  // Layout
  fitMode = DEFAULT_FIT_MODE,
  fontSize = DEFAULT_FONT_SIZE,
  lineHeight = DEFAULT_LINE_HEIGHT,
  letterSpacing = DEFAULT_LETTER_SPACING,

  // Performance
  resolutionScale = DEFAULT_RESOLUTION_SCALE,
  targetFps = DEFAULT_TARGET_FPS,
  renderer = DEFAULT_RENDERER,

  // Video
  loop: _loop = true,
  muted: _muted = true,
  autoplay: _autoplay = true,
  pauseOnBackground: _pauseOnBg = true,

  // CRT
  crtEnabled = false,
  crtScanlineOpacity = DEFAULT_CRT.scanlineOpacity,
  crtGlowIntensity = DEFAULT_CRT.glowIntensity,
  crtGlowColor = DEFAULT_CRT.glowColor,
  crtCurvature = DEFAULT_CRT.curvature,
  crtFlickerSpeed = DEFAULT_CRT.flickerSpeed,
  crtNoiseAmount = DEFAULT_CRT.noiseAmount,

  // Accessibility
  ariaLabel = "",
  reducedMotion = false,
}: ASCIIfyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect system reduced-motion preference
  const prefersReducedMotion =
    reducedMotion ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const { isVisible } = useViewportAware(containerRef);
  const { width, height, gridCols, gridRows } = useResizeDebounce(containerRef, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize,
    lineHeight,
  });

  const isActive = isVisible && !prefersReducedMotion;

  const grid = useASCIIConverter({
    mediaType,
    imageSrc,
    videoSrc,
    gridCols,
    gridRows,
    containerWidth: width,
    containerHeight: height,
    paletteId: palette,
    rampPreset: customCharacters ? "standard" : rampPreset,
    customCharacters: customCharacters || undefined,
    characterDensity,
    invertBrightness,
    fitMode,
    resolutionScale,
    targetFps: prefersReducedMotion ? 5 : targetFps,
    isActive,
  });

  const crt: CRTOptions = {
    enabled: crtEnabled && !prefersReducedMotion,
    scanlineOpacity: crtScanlineOpacity,
    glowIntensity: crtGlowIntensity,
    glowColor: crtGlowColor,
    curvature: crtCurvature,
    flickerSpeed: crtFlickerSpeed,
    noiseAmount: crtNoiseAmount,
  };

  const label =
    ariaLabel ||
    `ASCII art rendering of ${mediaType === "image" ? imageSrc : mediaType}`;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <ASCIICanvas
        grid={grid}
        renderer={renderer}
        fontSize={fontSize}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        fontFamily={DEFAULT_FONT_FAMILY}
        crt={crt}
        ariaLabel={label}
      />
    </div>
  );
}
