// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import type { StyledAsciiGrid, CRTOptions } from "../../src/types";

// Mock grid-renderer
vi.mock("../../src/core/grid-renderer", () => ({
  renderToDOM: vi.fn(),
  renderToCanvas: vi.fn(),
  measureCharDimensions: vi.fn(() => ({ charWidth: 8, charHeight: 16 })),
  computeGridDimensions: vi.fn(() => ({ cols: 80, rows: 24 })),
}));

// Mock crt-overlay
vi.mock("../../src/three/crt-overlay", () => ({
  applyCRTStyles: vi.fn(),
  clearCRTStyles: vi.fn(),
}));

import { ASCIICanvas } from "../../src/components/ASCIICanvas";
import { renderToDOM, renderToCanvas } from "../../src/core/grid-renderer";
import { applyCRTStyles, clearCRTStyles } from "../../src/three/crt-overlay";

function makeGrid(rows = 2, cols = 3): StyledAsciiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: "#",
      r: 255,
      g: 255,
      b: 255,
      brightness: 1,
      isTransparent: false,
      color: "#00ff41",
      background: "#000000",
    }))
  );
}

describe("ASCIICanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with role='img' and aria-label", () => {
    const { container } = render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="Test ASCII art"
      />
    );

    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Test ASCII art");
  });

  it("has tabIndex={0} for keyboard focus", () => {
    const { container } = render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="Focusable"
      />
    );

    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("renders a <pre> element for DOM mode", () => {
    const { container } = render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="DOM mode"
      />
    );

    expect(container.querySelector("pre")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders a <canvas> element for canvas mode", () => {
    const { container } = render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="canvas"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="Canvas mode"
      />
    );

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(container.querySelector("pre")).toBeNull();
  });

  it("calls renderToDOM when renderer is 'dom'", () => {
    render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="DOM render"
      />
    );

    expect(renderToDOM).toHaveBeenCalled();
    expect(renderToCanvas).not.toHaveBeenCalled();
  });

  it("does not render when grid is empty", () => {
    render(
      <ASCIICanvas
        grid={[]}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="Empty grid"
      />
    );

    expect(renderToDOM).not.toHaveBeenCalled();
  });

  it("applies CRT styles when crt.enabled is true", () => {
    const crt: CRTOptions = {
      enabled: true,
      scanlineOpacity: 0.3,
      glowIntensity: 0.5,
      glowColor: "#00ff00",
      curvature: 0.1,
      flickerSpeed: 2,
      noiseAmount: 0.05,
    };

    render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="CRT"
        crt={crt}
      />
    );

    expect(applyCRTStyles).toHaveBeenCalled();
    expect(clearCRTStyles).not.toHaveBeenCalled();
  });

  it("clears CRT styles when crt.enabled is false", () => {
    const crt: CRTOptions = {
      enabled: false,
      scanlineOpacity: 0,
      glowIntensity: 0,
      glowColor: "#000",
      curvature: 0,
      flickerSpeed: 0,
      noiseAmount: 0,
    };

    render(
      <ASCIICanvas
        grid={makeGrid()}
        renderer="dom"
        fontSize={12}
        lineHeight={1.2}
        letterSpacing={0}
        fontFamily="monospace"
        ariaLabel="No CRT"
        crt={crt}
      />
    );

    expect(clearCRTStyles).toHaveBeenCalled();
    expect(applyCRTStyles).not.toHaveBeenCalled();
  });
});
