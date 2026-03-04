// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

// Mock hooks
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

vi.mock("../../src/hooks/useASCIIConverter", () => ({
  useASCIIConverter: vi.fn(() => []),
}));

// Mock ASCIICanvas to inspect props passed to it
vi.mock("../../src/components/ASCIICanvas", () => ({
  ASCIICanvas: vi.fn((props: any) => (
    <div data-testid="ascii-canvas" data-aria-label={props.ariaLabel} data-crt-enabled={props.crt?.enabled} />
  )),
}));

import { ASCIIfy } from "../../src/components/ASCIIfy";
import { ASCIICanvas } from "../../src/components/ASCIICanvas";
import { useViewportAware } from "../../src/hooks/useViewportAware";
import { useASCIIConverter } from "../../src/hooks/useASCIIConverter";

describe("ASCIIfy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.matchMedia for reduced-motion detection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders without crashing", () => {
    const { container } = render(<ASCIIfy />);
    expect(container.firstChild).not.toBeNull();
  });

  it("passes ASCIICanvas as a child", () => {
    render(<ASCIIfy />);
    expect(ASCIICanvas).toHaveBeenCalled();
  });

  it("auto-generates aria-label from imageSrc when not provided", () => {
    render(<ASCIIfy mediaType="image" imageSrc="photo.jpg" />);
    const calls = (ASCIICanvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.ariaLabel).toBe("ASCII art rendering of photo.jpg");
  });

  it("uses custom ariaLabel when provided", () => {
    render(<ASCIIfy ariaLabel="Custom label" />);
    const calls = (ASCIICanvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.ariaLabel).toBe("Custom label");
  });

  it("passes CRT options through to ASCIICanvas", () => {
    render(<ASCIIfy crtEnabled={true} crtScanlineOpacity={0.5} crtGlowColor="#ff0000" />);
    const calls = (ASCIICanvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.crt.enabled).toBe(true);
    expect(lastCall.crt.scanlineOpacity).toBe(0.5);
    expect(lastCall.crt.glowColor).toBe("#ff0000");
  });

  it("sets isActive=false when not visible", () => {
    (useViewportAware as ReturnType<typeof vi.fn>).mockReturnValue({ isVisible: false });
    render(<ASCIIfy />);
    const calls = (useASCIIConverter as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.isActive).toBe(false);
  });

  it("sets isActive=true when visible", () => {
    (useViewportAware as ReturnType<typeof vi.fn>).mockReturnValue({ isVisible: true });
    render(<ASCIIfy />);
    const calls = (useASCIIConverter as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.isActive).toBe(true);
  });

  it("disables CRT when reducedMotion is true", () => {
    render(<ASCIIfy crtEnabled={true} reducedMotion={true} />);
    const calls = (ASCIICanvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.crt.enabled).toBe(false);
  });
});
