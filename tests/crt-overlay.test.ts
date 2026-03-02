// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { applyCRTStyles, clearCRTStyles } from "../src/three/crt-overlay";
import type { CRTOptions } from "../src/types";

// jsdom provides document/HTMLElement in vitest by default with happy-dom or
// via the setup file. We create real DOM elements for testing.

function makeElements() {
  const container = document.createElement("div");
  const pre = document.createElement("pre");
  container.appendChild(pre);
  document.body.appendChild(container);
  return { container, pre };
}

function baseCRT(overrides: Partial<CRTOptions> = {}): CRTOptions {
  return {
    enabled: true,
    scanlineOpacity: 0.15,
    glowIntensity: 0.6,
    glowColor: "#00ff41",
    curvature: 0,
    flickerSpeed: 0,
    noiseAmount: 0,
    ...overrides,
  };
}

describe("applyCRTStyles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds scanline overlay when enabled", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT());
    const overlay = container.querySelector(".crt-scanlines");
    expect(overlay).not.toBeNull();
  });

  it("sets text-shadow for glow when glowIntensity > 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ glowIntensity: 0.5 }));
    expect(pre.style.textShadow).not.toBe("");
  });

  it("no text-shadow when glowIntensity is 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ glowIntensity: 0 }));
    expect(pre.style.textShadow).toBe("");
  });

  it("applies border-radius when curvature > 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ curvature: 0.5 }));
    expect(container.style.borderRadius).not.toBe("");
    expect(container.style.overflow).toBe("hidden");
  });

  it("no border-radius when curvature is 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ curvature: 0 }));
    expect(container.style.borderRadius).toBe("");
  });

  it("sets animation when flickerSpeed > 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ flickerSpeed: 5 }));
    expect(container.style.animation).toContain("crt-flicker");
  });

  it("no animation when flickerSpeed is 0", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ flickerSpeed: 0 }));
    expect(container.style.animation).toBe("");
  });
});

describe("clearCRTStyles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("removes scanline and noise overlays", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ noiseAmount: 0.5 }));
    expect(container.querySelector(".crt-scanlines")).not.toBeNull();

    clearCRTStyles(container, pre);
    expect(container.querySelector(".crt-scanlines")).toBeNull();
    expect(container.querySelector(".crt-noise")).toBeNull();
  });

  it("resets inline styles", () => {
    const { container, pre } = makeElements();
    applyCRTStyles(container, pre, baseCRT({ glowIntensity: 0.8, curvature: 0.5 }));
    clearCRTStyles(container, pre);

    expect(pre.style.textShadow).toBe("");
    expect(container.style.boxShadow).toBe("");
    expect(container.style.borderRadius).toBe("");
    expect(container.style.transform).toBe("");
    expect(container.style.animation).toBe("");
  });
});

describe("applyCRTStyles with enabled=false clears everything", () => {
  it("clears all CRT styles when disabled", () => {
    const { container, pre } = makeElements();
    // First apply
    applyCRTStyles(container, pre, baseCRT({ glowIntensity: 0.5 }));
    expect(pre.style.textShadow).not.toBe("");

    // Then disable
    applyCRTStyles(container, pre, baseCRT({ enabled: false }));
    expect(pre.style.textShadow).toBe("");
    expect(container.querySelector(".crt-scanlines")).toBeNull();
  });
});
