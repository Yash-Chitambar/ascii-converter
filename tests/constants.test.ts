import { describe, it, expect } from "vitest";
import {
  RAMPS,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_RESOLUTION_SCALE,
  DEFAULT_TARGET_FPS,
  DEFAULT_CHARACTER_DENSITY,
  ALPHA_THRESHOLD,
  DARK_THRESHOLD,
  MAX_DELTA_MS,
  RESIZE_DEBOUNCE_MS,
  VIEWPORT_THRESHOLD,
  DEFAULT_CRT,
} from "../src/constants";

describe("RAMPS", () => {
  it("has all 5 presets", () => {
    expect(Object.keys(RAMPS)).toEqual(
      expect.arrayContaining(["standard", "simple", "blocks", "minimal", "binary"])
    );
  });

  it("standard ramp ends with a space", () => {
    expect(RAMPS.standard[RAMPS.standard.length - 1]).toBe(" ");
  });

  it("every ramp has at least 2 characters", () => {
    for (const [, ramp] of Object.entries(RAMPS)) {
      expect(ramp.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("default values are within documented ranges", () => {
  it("DEFAULT_FONT_SIZE is positive", () => {
    expect(DEFAULT_FONT_SIZE).toBeGreaterThan(0);
  });

  it("DEFAULT_LINE_HEIGHT is between 0.8 and 2", () => {
    expect(DEFAULT_LINE_HEIGHT).toBeGreaterThanOrEqual(0.8);
    expect(DEFAULT_LINE_HEIGHT).toBeLessThanOrEqual(2);
  });

  it("DEFAULT_LETTER_SPACING is between -2 and 4", () => {
    expect(DEFAULT_LETTER_SPACING).toBeGreaterThanOrEqual(-2);
    expect(DEFAULT_LETTER_SPACING).toBeLessThanOrEqual(4);
  });

  it("DEFAULT_RESOLUTION_SCALE is between 0.25 and 1.0", () => {
    expect(DEFAULT_RESOLUTION_SCALE).toBeGreaterThanOrEqual(0.25);
    expect(DEFAULT_RESOLUTION_SCALE).toBeLessThanOrEqual(1.0);
  });

  it("DEFAULT_TARGET_FPS is between 5 and 60", () => {
    expect(DEFAULT_TARGET_FPS).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_TARGET_FPS).toBeLessThanOrEqual(60);
  });

  it("DEFAULT_CHARACTER_DENSITY is between 0 and 1", () => {
    expect(DEFAULT_CHARACTER_DENSITY).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CHARACTER_DENSITY).toBeLessThanOrEqual(1);
  });
});

describe("thresholds", () => {
  it("ALPHA_THRESHOLD is 128", () => {
    expect(ALPHA_THRESHOLD).toBe(128);
  });

  it("DARK_THRESHOLD is 0.05", () => {
    expect(DARK_THRESHOLD).toBe(0.05);
  });

  it("MAX_DELTA_MS is 50", () => {
    expect(MAX_DELTA_MS).toBe(50);
  });

  it("RESIZE_DEBOUNCE_MS is 150", () => {
    expect(RESIZE_DEBOUNCE_MS).toBe(150);
  });

  it("VIEWPORT_THRESHOLD is 0.1", () => {
    expect(VIEWPORT_THRESHOLD).toBe(0.1);
  });
});

describe("DEFAULT_CRT", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_CRT.enabled).toBe(false);
  });

  it("scanlineOpacity is between 0 and 1", () => {
    expect(DEFAULT_CRT.scanlineOpacity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CRT.scanlineOpacity).toBeLessThanOrEqual(1);
  });

  it("glowIntensity is between 0 and 1", () => {
    expect(DEFAULT_CRT.glowIntensity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CRT.glowIntensity).toBeLessThanOrEqual(1);
  });

  it("curvature defaults to 0", () => {
    expect(DEFAULT_CRT.curvature).toBe(0);
  });

  it("flickerSpeed defaults to 0", () => {
    expect(DEFAULT_CRT.flickerSpeed).toBe(0);
  });

  it("noiseAmount defaults to 0", () => {
    expect(DEFAULT_CRT.noiseAmount).toBe(0);
  });
});
