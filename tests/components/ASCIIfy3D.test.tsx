// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";

const mockHandle = {
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  isRunning: vi.fn(() => false),
};

const mockCreateRenderer = vi.fn(() => Promise.resolve(mockHandle));

vi.mock("../../src/three/glb-to-ascii", () => ({
  createGLBToAsciiRenderer: (...args: any[]) => mockCreateRenderer(...args),
}));

vi.mock("../../src/hooks/useViewportAware", () => ({
  useViewportAware: vi.fn(() => ({ isVisible: true })),
}));

vi.mock("../../src/hooks/useResizeDebounce", () => ({
  useResizeDebounce: vi.fn(() => ({
    width: 800,
    height: 600,
    gridCols: 80,
    gridRows: 24,
    charWidth: 8,
    charHeight: 16,
  })),
}));

vi.mock("../../src/core/color-engine", () => ({
  applyPaletteById: vi.fn((grid: any) => grid),
}));

vi.mock("../../src/components/ASCIICanvas", () => ({
  ASCIICanvas: vi.fn((props: any) => (
    <div data-testid="ascii-canvas" data-aria-label={props.ariaLabel} />
  )),
}));

import { ASCIIfy3D } from "../../src/components/ASCIIfy3D";

describe("ASCIIfy3D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRenderer.mockResolvedValue(mockHandle);
  });

  it("renders without crashing", () => {
    const { container } = render(<ASCIIfy3D modelUrl="model.glb" />);
    expect(container.firstChild).not.toBeNull();
  });

  it("calls createGLBToAsciiRenderer with correct options", async () => {
    await act(async () => {
      render(<ASCIIfy3D modelUrl="model.glb" autoRotate={true} autoRotateSpeed={45} />);
    });

    expect(mockCreateRenderer).toHaveBeenCalledTimes(1);
    const opts = mockCreateRenderer.mock.calls[0][0];
    expect(opts.modelUrl).toBe("model.glb");
    expect(opts.autoRotate).toBe(true);
    expect(opts.autoRotateSpeed).toBe(45);
    expect(opts.gridCols).toBe(80);
    expect(opts.gridRows).toBe(24);
  });

  it("does not create renderer when modelUrl is empty", async () => {
    await act(async () => {
      render(<ASCIIfy3D modelUrl="" />);
    });

    expect(mockCreateRenderer).not.toHaveBeenCalled();
  });

  it("calls dispose on unmount", async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<ASCIIfy3D modelUrl="model.glb" />);
      unmount = result.unmount;
    });

    await act(async () => {
      unmount();
    });

    expect(mockHandle.dispose).toHaveBeenCalled();
  });

  it("starts the handle when visible", async () => {
    await act(async () => {
      render(<ASCIIfy3D modelUrl="model.glb" />);
    });

    expect(mockHandle.start).toHaveBeenCalled();
  });
});
