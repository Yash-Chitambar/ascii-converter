import { describe, it, expect } from "vitest";
import {
  rgbToBrightness,
  brightnessToChar,
  densityToRampSubset,
  getRamp,
  createCustomRamp,
  buildCharBrightnessMap,
  isTransparent,
  isDark,
} from "../src/core/char-ramp";
import { RAMPS } from "../src/constants";

describe("rgbToBrightness", () => {
  it("returns 0 for black", () => {
    expect(rgbToBrightness(0, 0, 0)).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(rgbToBrightness(255, 255, 255)).toBeCloseTo(1, 5);
  });

  it("uses luminosity weights, not simple average", () => {
    // Pure green should be brighter than pure red or pure blue
    const green = rgbToBrightness(0, 255, 0);
    const red = rgbToBrightness(255, 0, 0);
    const blue = rgbToBrightness(0, 0, 255);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });

  it("applies correct weights: 0.299R + 0.587G + 0.114B", () => {
    const result = rgbToBrightness(100, 150, 200);
    const expected = (0.299 * 100 + 0.587 * 150 + 0.114 * 200) / 255;
    expect(result).toBeCloseTo(expected, 10);
  });
});

describe("brightnessToChar", () => {
  const ramp = RAMPS.standard;

  it("maps brightness 1.0 to the densest char (first in ramp)", () => {
    expect(brightnessToChar(1.0, ramp)).toBe(ramp[0]);
  });

  it("maps brightness 0.0 to the lightest char (last in ramp)", () => {
    expect(brightnessToChar(0.0, ramp)).toBe(ramp[ramp.length - 1]);
  });

  it("inverts when invert=true", () => {
    const normal = brightnessToChar(0.9, ramp, false);
    const inverted = brightnessToChar(0.9, ramp, true);
    expect(normal).not.toBe(inverted);
    // Inverted 0.9 should behave like normal 0.1
    expect(inverted).toBe(brightnessToChar(0.1, ramp, false));
  });

  it("works with short ramps", () => {
    const binary = RAMPS.binary; // "█ "
    expect(brightnessToChar(1.0, binary)).toBe("█");
    expect(brightnessToChar(0.0, binary)).toBe(" ");
  });
});

describe("getRamp", () => {
  it("returns the correct ramp for known presets", () => {
    expect(getRamp("standard")).toBe(RAMPS.standard);
    expect(getRamp("simple")).toBe(RAMPS.simple);
    expect(getRamp("blocks")).toBe(RAMPS.blocks);
  });

  it("falls back to standard for unknown presets", () => {
    expect(getRamp("nonexistent")).toBe(RAMPS.standard);
  });
});

describe("createCustomRamp", () => {
  it("appends a trailing space if missing", () => {
    expect(createCustomRamp("ABC")).toBe("ABC ");
  });

  it("does not double-append space", () => {
    expect(createCustomRamp("ABC ")).toBe("ABC ");
  });

  it("falls back to standard for empty string", () => {
    expect(createCustomRamp("")).toBe(RAMPS.standard);
  });
});

describe("densityToRampSubset", () => {
  const ramp = RAMPS.standard;

  it("returns full ramp at density 1.0", () => {
    expect(densityToRampSubset(1.0, ramp)).toBe(ramp);
  });

  it("returns 2 chars at density 0.0", () => {
    const result = densityToRampSubset(0.0, ramp);
    expect(result.length).toBe(2);
  });

  it("always keeps the first and last characters", () => {
    const result = densityToRampSubset(0.3, ramp);
    expect(result[0]).toBe(ramp[0]);
    expect(result[result.length - 1]).toBe(ramp[ramp.length - 1]);
  });

  it("produces monotonically more chars as density increases", () => {
    const len1 = densityToRampSubset(0.2, ramp).length;
    const len2 = densityToRampSubset(0.5, ramp).length;
    const len3 = densityToRampSubset(0.8, ramp).length;
    expect(len2).toBeGreaterThanOrEqual(len1);
    expect(len3).toBeGreaterThanOrEqual(len2);
  });

  it("clamps density outside 0-1 range", () => {
    expect(densityToRampSubset(-0.5, ramp).length).toBe(2);
    expect(densityToRampSubset(1.5, ramp)).toBe(ramp);
  });
});

describe("buildCharBrightnessMap", () => {
  it("maps first char to brightness ~1.0", () => {
    const ramp = RAMPS.simple;
    const map = buildCharBrightnessMap(ramp);
    expect(map.get(ramp[0])).toBe(1);
  });

  it("maps last char to brightness 0.0", () => {
    const ramp = RAMPS.simple;
    const map = buildCharBrightnessMap(ramp);
    expect(map.get(ramp[ramp.length - 1])).toBe(0);
  });

  it("contains an entry for every char in the ramp", () => {
    const ramp = RAMPS.simple;
    const map = buildCharBrightnessMap(ramp);
    for (const ch of ramp) {
      expect(map.has(ch)).toBe(true);
    }
  });
});

describe("isTransparent", () => {
  it("returns true for alpha below 128", () => {
    expect(isTransparent(0)).toBe(true);
    expect(isTransparent(127)).toBe(true);
  });

  it("returns false for alpha at or above 128", () => {
    expect(isTransparent(128)).toBe(false);
    expect(isTransparent(255)).toBe(false);
  });
});

describe("isDark", () => {
  it("returns true for brightness below 0.05", () => {
    expect(isDark(0)).toBe(true);
    expect(isDark(0.04)).toBe(true);
  });

  it("returns false for brightness at or above 0.05", () => {
    expect(isDark(0.05)).toBe(false);
    expect(isDark(0.5)).toBe(false);
  });
});
