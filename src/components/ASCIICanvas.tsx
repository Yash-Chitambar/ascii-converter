import React, { useRef, useEffect } from "react";
import type { ASCIICanvasProps } from "../types";
import { renderToDOM, renderToCanvas } from "../core/grid-renderer";
import { applyCRTStyles, clearCRTStyles } from "../three/crt-overlay";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
} from "../constants";

/**
 * Shared rendering surface used by both ASCIIfy and ASCIIfy3D.
 *
 * Handles:
 * - DOM renderer: writes styled chars into a <pre> element
 * - Canvas renderer: draws chars via fillText on a <canvas>
 * - CRT overlay: applies scanlines, glow, curvature, flicker via CSS
 * - Accessibility: role="img" + aria-label
 */
export function ASCIICanvas({
  grid,
  renderer = "dom",
  fontSize = DEFAULT_FONT_SIZE,
  lineHeight = DEFAULT_LINE_HEIGHT,
  letterSpacing = DEFAULT_LETTER_SPACING,
  fontFamily = DEFAULT_FONT_FAMILY,
  crt,
  ariaLabel,
  className,
}: ASCIICanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render grid whenever it changes
  useEffect(() => {
    if (grid.length === 0) return;

    if (renderer === "dom" && preRef.current) {
      renderToDOM(preRef.current, grid, { fontSize, lineHeight, letterSpacing, fontFamily });
    } else if (renderer === "canvas" && canvasRef.current) {
      renderToCanvas(canvasRef.current, grid, {
        mode: "canvas",
        fontSize,
        lineHeight,
        letterSpacing,
        fontFamily,
      });
    }
  }, [grid, renderer, fontSize, lineHeight, letterSpacing, fontFamily]);

  // Apply / clear CRT overlay
  useEffect(() => {
    const container = containerRef.current;
    const pre = preRef.current;
    if (!container || !pre) return;

    if (crt?.enabled) {
      applyCRTStyles(container, pre, crt);
    } else {
      clearCRTStyles(container, pre);
    }
  }, [crt]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  };

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      className={className}
      style={{ ...containerStyle, backgroundColor: "transparent" }}
    >
      {renderer === "dom" ? (
        <pre
          ref={preRef}
          aria-hidden="true"
          style={{
            margin: 0,
            padding: 0,
            whiteSpace: "pre",
            overflow: "hidden",
            width: "100%",
            height: "100%",
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
