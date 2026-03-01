import { describe, it, expect } from "vitest";
import { PALETTES, PALETTE_MAP, PALETTE_IDS, PALETTE_NAMES, getPalette } from "../src/palettes";

describe("PALETTES", () => {
  it("has exactly 10 palettes", () => {
    expect(PALETTES.length).toBe(10);
  });

  it("every palette has required fields", () => {
    for (const p of PALETTES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(["monochrome", "mapped", "original"]).toContain(p.type);
      expect(p.background).toBeTruthy();
    }
  });

  it("monochrome palettes have a foreground color", () => {
    const mono = PALETTES.filter((p) => p.type === "monochrome");
    expect(mono.length).toBeGreaterThan(0);
    for (const p of mono) {
      expect(p.foreground).toBeTruthy();
      expect(p.foreground!.startsWith("#")).toBe(true);
    }
  });

  it("mapped palettes have color stops sorted by threshold", () => {
    const mapped = PALETTES.filter((p) => p.type === "mapped");
    expect(mapped.length).toBeGreaterThan(0);
    for (const p of mapped) {
      expect(p.colorStops).toBeDefined();
      expect(p.colorStops!.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < p.colorStops!.length; i++) {
        expect(p.colorStops![i].threshold).toBeGreaterThanOrEqual(
          p.colorStops![i - 1].threshold
        );
      }
    }
  });

  it("has exactly one 'original' type palette", () => {
    const orig = PALETTES.filter((p) => p.type === "original");
    expect(orig.length).toBe(1);
    expect(orig[0].id).toBe("original");
  });

  it("all palette IDs are unique", () => {
    const ids = PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("PALETTE_MAP", () => {
  it("contains all palettes keyed by id", () => {
    expect(PALETTE_MAP.size).toBe(10);
    for (const p of PALETTES) {
      expect(PALETTE_MAP.get(p.id)).toBe(p);
    }
  });
});

describe("PALETTE_IDS / PALETTE_NAMES", () => {
  it("PALETTE_IDS matches palette order", () => {
    expect(PALETTE_IDS).toEqual(PALETTES.map((p) => p.id));
  });

  it("PALETTE_NAMES matches palette order", () => {
    expect(PALETTE_NAMES).toEqual(PALETTES.map((p) => p.name));
  });
});

describe("getPalette", () => {
  it("returns the correct palette by ID", () => {
    expect(getPalette("amber-crt").name).toBe("Amber CRT");
    expect(getPalette("heatmap").name).toBe("Heatmap");
    expect(getPalette("original").type).toBe("original");
  });

  it("falls back to classic-green for unknown ID", () => {
    const fallback = getPalette("does-not-exist");
    expect(fallback.id).toBe("classic-green");
  });

  it("falls back for empty string", () => {
    expect(getPalette("").id).toBe("classic-green");
  });
});
