import { describe, it, expect } from "vitest";
import { imageDataToAsciiGrid } from "../src/core/image-to-ascii";
import { applyPalette } from "../src/core/color-engine";
import { computeGridDimensions } from "../src/core/grid-renderer";
import { getPalette, PALETTES } from "../src/palettes";
import { rgbToBrightness } from "../src/core/char-ramp";

/**
 * End-to-end pipeline tests that exercise the full conversion chain:
 *   ImageData → imageDataToAsciiGrid → applyPalette → StyledAsciiGrid
 */

function makeImageData(
  width: number,
  height: number,
  fill: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return new ImageData(data, width, height);
}

function makeCheckerboard(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isWhite = (x + y) % 2 === 0;
      const v = isWhite ? 255 : 60; // 60 is above dark threshold (0.05)
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}

describe("Full pipeline: ImageData → AsciiGrid → StyledAsciiGrid", () => {
  it("processes a solid white image through all palettes", () => {
    const imgData = makeImageData(50, 50, [255, 255, 255, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 10, gridRows: 10 });

    for (const palette of PALETTES) {
      const styled = applyPalette(grid, palette.id);
      expect(styled.length).toBe(10);
      expect(styled[0].length).toBe(10);

      for (const row of styled) {
        for (const cell of row) {
          expect(cell.color).toBeTruthy();
          expect(cell.background).toBe(palette.background);
          expect(cell.char).toBeTruthy();
        }
      }
    }
  });

  it("produces styled grid with correct original colors", () => {
    const imgData = makeImageData(20, 20, [255, 0, 128, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    const styled = applyPalette(grid, "original");

    for (const row of styled) {
      for (const cell of row) {
        expect(cell.color).toBe("#ff0080");
        expect(cell.background).toBe("#000000");
      }
    }
  });

  it("monochrome palette produces uniform foreground color", () => {
    const imgData = makeImageData(20, 20, [100, 200, 50, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    const styled = applyPalette(grid, "classic-green");

    const colors = new Set(styled.flat().map((c) => c.color));
    expect(colors.size).toBe(1);
    expect(colors.has("#00ff41")).toBe(true);
  });

  it("mapped palette produces varying colors for a gradient", () => {
    // Create a vertical gradient
    const width = 50, height = 50;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const v = Math.round((y / (height - 1)) * 255);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    const imgData = new ImageData(data, width, height);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 10, gridRows: 10, characterDensity: 1.0 });
    const styled = applyPalette(grid, "neon-gradient");

    const colors = new Set(styled.flat().filter((c) => c.char !== " ").map((c) => c.color));
    // Gradient + mapped palette should produce multiple colors
    expect(colors.size).toBeGreaterThan(1);
  });

  it("transparent image produces all space chars with no palette errors", () => {
    const imgData = makeImageData(30, 30, [0, 0, 0, 0]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    const styled = applyPalette(grid, "heatmap");

    expect(styled.length).toBe(5);
    for (const row of styled) {
      for (const cell of row) {
        expect(cell.char).toBe(" ");
      }
    }
  });
});

describe("Pipeline: grid dimensions from container", () => {
  it("computes grid dimensions and uses them for conversion", () => {
    const containerW = 640, containerH = 480;
    const charW = 6, charH = 12;
    const { gridCols, gridRows } = computeGridDimensions(containerW, containerH, charW, charH);

    expect(gridCols).toBe(Math.floor(640 / 6));
    expect(gridRows).toBe(Math.floor(480 / 12));

    const imgData = makeImageData(100, 100, [180, 180, 180, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols, gridRows });

    expect(grid.length).toBe(gridRows);
    expect(grid[0].length).toBe(gridCols);
  });
});

describe("Pipeline: checkerboard pattern fidelity", () => {
  it("produces multiple distinct characters for a checkerboard input", () => {
    const imgData = makeCheckerboard(20, 20);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 20, gridRows: 20 });

    // Checkerboard has two brightness levels — should produce at least 2 distinct chars
    const uniqueChars = new Set(grid.flat().map((c) => c.char));
    expect(uniqueChars.size).toBeGreaterThanOrEqual(2);
  });

  it("has varying brightness values across the grid", () => {
    const imgData = makeCheckerboard(20, 20);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 20, gridRows: 20 });

    const brightnesses = new Set(grid.flat().map((c) => c.brightness.toFixed(3)));
    expect(brightnesses.size).toBeGreaterThanOrEqual(2);
  });
});

describe("Pipeline: all ramp presets work end-to-end", () => {
  const presets = ["standard", "simple", "blocks", "minimal", "binary"] as const;

  for (const preset of presets) {
    it(`works with ramp preset: ${preset}`, () => {
      const imgData = makeImageData(30, 30, [180, 180, 180, 255]);
      const grid = imageDataToAsciiGrid(imgData, {
        gridCols: 5,
        gridRows: 5,
        rampPreset: preset,
      });
      const styled = applyPalette(grid, "classic-green");

      expect(styled.length).toBe(5);
      expect(styled[0].length).toBe(5);
      const hasNonSpace = styled.flat().some((c) => c.char !== " ");
      expect(hasNonSpace).toBe(true);
    });
  }
});

describe("Pipeline: brightness consistency across stages", () => {
  it("preserves brightness values through palette application", () => {
    const imgData = makeImageData(20, 20, [128, 128, 128, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3 });
    const styled = applyPalette(grid, "original");

    const expectedBrightness = rgbToBrightness(128, 128, 128);
    for (const row of styled) {
      for (const cell of row) {
        expect(cell.brightness).toBeCloseTo(expectedBrightness, 5);
      }
    }
  });
});
