import { describe, it, expect } from "vitest";
import { applyPalette } from "../src/core/color-engine";
import type { AsciiGrid } from "../src/types";

function makeGrid(cells: Array<{ brightness: number; r: number; g: number; b: number }>): AsciiGrid {
  return [cells.map(c => ({ char: "#", ...c }))];
}

describe("applyPalette — monochrome", () => {
  it("applies uniform foreground color to all cells", () => {
    const grid = makeGrid([
      { brightness: 0.2, r: 100, g: 50, b: 200 },
      { brightness: 0.8, r: 200, g: 100, b: 50 },
    ]);
    const styled = applyPalette(grid, "classic-green");
    expect(styled[0][0].color).toBe("#00ff41");
    expect(styled[0][1].color).toBe("#00ff41");
    expect(styled[0][0].background).toBe("#000000");
  });
});

describe("applyPalette — original", () => {
  it("preserves source pixel RGB values as colors", () => {
    const grid = makeGrid([
      { brightness: 0.5, r: 255, g: 128, b: 0 },
    ]);
    const styled = applyPalette(grid, "original");
    expect(styled[0][0].color).toBe("#ff8000");
  });

  it("handles pure white", () => {
    const grid = makeGrid([{ brightness: 1, r: 255, g: 255, b: 255 }]);
    const styled = applyPalette(grid, "original");
    expect(styled[0][0].color).toBe("#ffffff");
  });

  it("handles pure black", () => {
    const grid = makeGrid([{ brightness: 0, r: 0, g: 0, b: 0 }]);
    const styled = applyPalette(grid, "original");
    expect(styled[0][0].color).toBe("#000000");
  });
});

describe("applyPalette — mapped", () => {
  it("maps low brightness to first color stop", () => {
    const grid = makeGrid([{ brightness: 0.0, r: 0, g: 0, b: 0 }]);
    const styled = applyPalette(grid, "heatmap");
    expect(styled[0][0].color).toBe("#0000ff"); // heatmap starts blue
  });

  it("maps high brightness to last color stop", () => {
    const grid = makeGrid([{ brightness: 1.0, r: 255, g: 255, b: 255 }]);
    const styled = applyPalette(grid, "heatmap");
    expect(styled[0][0].color).toBe("#ffff00"); // heatmap ends yellow
  });

  it("interpolates between stops for mid brightness", () => {
    const grid = makeGrid([{ brightness: 0.5, r: 128, g: 128, b: 128 }]);
    const styled = applyPalette(grid, "heatmap");
    // At 0.5 threshold, should be exactly at the red stop
    expect(styled[0][0].color).toBe("#ff2200");
  });
});

describe("applyPalette — unknown id fallback", () => {
  it("falls back to classic-green for unknown palette ids", () => {
    const grid = makeGrid([{ brightness: 0.5, r: 128, g: 128, b: 128 }]);
    const styled = applyPalette(grid, "nonexistent-palette");
    expect(styled[0][0].color).toBe("#00ff41");
  });
});

describe("applyPalette — grid structure", () => {
  it("preserves grid dimensions", () => {
    const grid: AsciiGrid = [
      [
        { char: "A", r: 100, g: 100, b: 100, brightness: 0.4 },
        { char: "B", r: 200, g: 200, b: 200, brightness: 0.8 },
      ],
      [
        { char: "C", r: 50, g: 50, b: 50, brightness: 0.2 },
        { char: "D", r: 150, g: 150, b: 150, brightness: 0.6 },
      ],
    ];
    const styled = applyPalette(grid, "classic-green");
    expect(styled.length).toBe(2);
    expect(styled[0].length).toBe(2);
    expect(styled[1].length).toBe(2);
  });

  it("preserves char and brightness from original cells", () => {
    const grid = makeGrid([{ brightness: 0.5, r: 128, g: 128, b: 128 }]);
    const styled = applyPalette(grid, "classic-green");
    expect(styled[0][0].char).toBe("#");
    expect(styled[0][0].brightness).toBe(0.5);
  });
});
