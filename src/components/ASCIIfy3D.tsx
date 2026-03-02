import React, { useRef, useEffect, useState } from "react";
import type { ASCIIfy3DProps, StyledAsciiGrid, CRTOptions } from "../types";
import type { GLBToAsciiHandle } from "../three/glb-to-ascii";
import { ASCIICanvas } from "./ASCIICanvas";
import { useResizeDebounce } from "../hooks/useResizeDebounce";
import { useViewportAware } from "../hooks/useViewportAware";
import { createGLBToAsciiRenderer } from "../three/glb-to-ascii";
import { applyPaletteById } from "../core/color-engine";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_DENSITY,
  DEFAULT_RAMP_PRESET,
  DEFAULT_RESOLUTION_SCALE,
  DEFAULT_CRT,
} from "../constants";

/**
 * ASCIIfy3D — Framer component that renders a GLB model via Three.js into
 * an offscreen WebGL buffer and converts the output to real-time ASCII art.
 *
 * Uses createGLBToAsciiRenderer (async) and manages its lifecycle inside
 * a useEffect, pausing via useViewportAware when the component leaves the
 * viewport.
 */
export function ASCIIfy3D({
  modelUrl = "",

  autoRotate = true,
  autoRotateSpeed = 30,
  initialRotationX = 0,
  initialRotationY = 0,
  initialRotationZ = 0,

  characterDensity = DEFAULT_CHARACTER_DENSITY,
  rampPreset = DEFAULT_RAMP_PRESET,
  colorMode = "monochrome",

  crtEnabled = false,
  crtGlowColor = DEFAULT_CRT.glowColor,
  crtScanlineOpacity = DEFAULT_CRT.scanlineOpacity,
  crtCurvature = DEFAULT_CRT.curvature,
  crtFlickerSpeed = DEFAULT_CRT.flickerSpeed,
  crtNoiseAmount = DEFAULT_CRT.noiseAmount,

  resolutionScale = DEFAULT_RESOLUTION_SCALE,
  refreshRate = 15,

  fontSize = DEFAULT_FONT_SIZE,
  lineHeight = DEFAULT_LINE_HEIGHT,
  background = "#000000",
}: ASCIIfy3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useViewportAware(containerRef);
  const { width, height, gridCols, gridRows } = useResizeDebounce(containerRef, {
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize,
    lineHeight,
  });

  const [grid, setGrid] = useState<StyledAsciiGrid>([]);
  const handleRef = useRef<GLBToAsciiHandle | null>(null);

  // Palette applied is classic-green for monochrome, original for colorMode=original
  const paletteId = colorMode === "original" ? "original" : "classic-green";

  useEffect(() => {
    if (!modelUrl || gridCols === 0 || gridRows === 0 || width === 0 || height === 0) return;

    let handle: Awaited<ReturnType<typeof createGLBToAsciiRenderer>> | null = null;
    let cancelled = false;

    createGLBToAsciiRenderer(
      {
        modelUrl,
        width,
        height,
        gridCols,
        gridRows,
        rotation: { x: initialRotationX, y: initialRotationY, z: initialRotationZ },
        autoRotate,
        autoRotateSpeed,
        colorMode,
        rampPreset,
        characterDensity,
        resolutionScale,
        refreshRate,
      },
      (rawGrid) => {
        setGrid(applyPaletteById(rawGrid, paletteId));
      }
    ).then((h) => {
      if (cancelled) {
        h.dispose();
        return;
      }
      handle = h;
      handleRef.current = h;
      if (isVisible) h.start();
    }).catch(console.error);

    return () => {
      cancelled = true;
      handle?.dispose();
      handleRef.current = null;
    };
  // Re-create renderer if fundamental options change (model URL, grid size, etc.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, gridCols, gridRows, width, height, resolutionScale, refreshRate,
      autoRotate, autoRotateSpeed, initialRotationX, initialRotationY, initialRotationZ,
      colorMode, rampPreset, characterDensity]);

  // Pause / resume when visibility changes
  useEffect(() => {
    if (isVisible) {
      handleRef.current?.start();
    } else {
      handleRef.current?.stop();
    }
  }, [isVisible]);

  const crt: CRTOptions = {
    enabled: crtEnabled,
    scanlineOpacity: crtScanlineOpacity,
    glowIntensity: DEFAULT_CRT.glowIntensity,
    glowColor: crtGlowColor,
    curvature: crtCurvature,
    flickerSpeed: crtFlickerSpeed,
    noiseAmount: crtNoiseAmount,
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative", background }}
    >
      <ASCIICanvas
        grid={grid}
        renderer="dom"
        fontSize={fontSize}
        lineHeight={lineHeight}
        letterSpacing={0}
        fontFamily={DEFAULT_FONT_FAMILY}
        crt={crt}
        ariaLabel={`3D ASCII art rendering of ${modelUrl}`}
      />
    </div>
  );
}
