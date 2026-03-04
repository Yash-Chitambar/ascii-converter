import { describe, it, expect } from "vitest";
import { imageDataToAsciiGrid } from "../src/core/image-to-ascii";

/**
 * Creates a synthetic ImageData with a given pixel pattern.
 * Each pixel is [r, g, b, a].
 */
function makeImageData(
  width: number,
  height: number,
  fillPixel: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillPixel[0];
    data[i * 4 + 1] = fillPixel[1];
    data[i * 4 + 2] = fillPixel[2];
    data[i * 4 + 3] = fillPixel[3];
  }
  return new ImageData(data, width, height);
}

/**
 * Creates an ImageData with a gradient from black (top) to white (bottom).
 */
function makeGradientImageData(width: number, height: number): ImageData {
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
  return new ImageData(data, width, height);
}

describe("imageDataToAsciiGrid — grid dimensions", () => {
  it("returns a grid with the requested rows and columns", () => {
    const imgData = makeImageData(100, 100, [128, 128, 128, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 40, gridRows: 20 });
    expect(grid.length).toBe(20);
    expect(grid[0].length).toBe(40);
  });

  it("works with small grids (1x1)", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 1, gridRows: 1 });
    expect(grid.length).toBe(1);
    expect(grid[0].length).toBe(1);
    expect(grid[0][0].char).not.toBe(" ");
  });
});

describe("imageDataToAsciiGrid — transparency handling", () => {
  it("outputs spaces for fully transparent pixels", () => {
    const imgData = makeImageData(10, 10, [255, 255, 255, 0]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.char).toBe(" ");
        expect(cell.isTransparent).toBe(true);
      }
    }
  });

  it("outputs spaces for alpha below 128", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 100]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.char).toBe(" ");
        expect(cell.isTransparent).toBe(true);
      }
    }
  });

  it("renders characters for alpha at or above 128", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 128]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    const hasNonSpace = grid.some((row) => row.some((cell) => cell.char !== " "));
    expect(hasNonSpace).toBe(true);
    // Opaque cells should not be marked transparent
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.isTransparent).toBe(false);
      }
    }
  });
});

describe("imageDataToAsciiGrid — dark threshold", () => {
  it("outputs spaces for near-black pixels (brightness < 0.05)", () => {
    // RGB(5, 5, 5) => brightness ~0.02
    const imgData = makeImageData(10, 10, [5, 5, 5, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.char).toBe(" ");
      }
    }
  });

  it("renders characters for pixels above dark threshold", () => {
    // RGB(50, 50, 50) => brightness ~0.196
    const imgData = makeImageData(10, 10, [50, 50, 50, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 5, gridRows: 5 });
    const hasChar = grid.some((row) => row.some((cell) => cell.char !== " "));
    expect(hasChar).toBe(true);
  });
});

describe("imageDataToAsciiGrid — cell data", () => {
  it("stores correct RGB values in each cell", () => {
    const imgData = makeImageData(10, 10, [100, 150, 200, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3 });
    const cell = grid[0][0];
    expect(cell.r).toBe(100);
    expect(cell.g).toBe(150);
    expect(cell.b).toBe(200);
  });

  it("stores correct brightness using luminosity formula", () => {
    const imgData = makeImageData(10, 10, [100, 150, 200, 255]);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3 });
    const cell = grid[0][0];
    const expected = (0.299 * 100 + 0.587 * 150 + 0.114 * 200) / 255;
    expect(cell.brightness).toBeCloseTo(expected, 5);
  });
});

describe("imageDataToAsciiGrid — ramp presets", () => {
  it("uses different chars for different ramp presets", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 255]);
    const gridStd = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3, rampPreset: "standard" });
    const gridBin = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3, rampPreset: "binary" });
    // Binary ramp only has "█" and " "
    const binChars = new Set(gridBin.flat().map((c) => c.char));
    expect(binChars.size).toBeLessThanOrEqual(2);
    expect(binChars.has("█") || binChars.has(" ")).toBe(true);
  });

  it("uses custom characters when provided", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 255]);
    const grid = imageDataToAsciiGrid(imgData, {
      gridCols: 3,
      gridRows: 3,
      customCharacters: "XO ",
    });
    const chars = new Set(grid.flat().map((c) => c.char));
    // All chars should be from custom set
    for (const ch of chars) {
      expect("XO ".includes(ch)).toBe(true);
    }
  });
});

describe("imageDataToAsciiGrid — brightness inversion", () => {
  it("produces different characters when inverted", () => {
    const imgData = makeImageData(10, 10, [200, 200, 200, 255]);
    const normal = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3, invertBrightness: false });
    const inverted = imageDataToAsciiGrid(imgData, { gridCols: 3, gridRows: 3, invertBrightness: true });
    // Bright pixels should map to dense chars normally, sparse when inverted
    expect(normal[0][0].char).not.toBe(inverted[0][0].char);
  });
});

describe("imageDataToAsciiGrid — density control", () => {
  it("produces visually different output at different density levels", () => {
    const imgData = makeGradientImageData(50, 50);
    const lowDensity = imageDataToAsciiGrid(imgData, { gridCols: 10, gridRows: 10, characterDensity: 0.0 });
    const highDensity = imageDataToAsciiGrid(imgData, { gridCols: 10, gridRows: 10, characterDensity: 1.0 });

    const lowChars = new Set(lowDensity.flat().map((c) => c.char));
    const highChars = new Set(highDensity.flat().map((c) => c.char));
    // High density should use more unique characters
    expect(highChars.size).toBeGreaterThanOrEqual(lowChars.size);
  });
});

describe("imageDataToAsciiGrid — gradient produces varied output", () => {
  it("uses multiple distinct characters for a gradient image", () => {
    const imgData = makeGradientImageData(100, 100);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 20, gridRows: 20, characterDensity: 1.0 });
    const uniqueChars = new Set(grid.flat().map((c) => c.char));
    // A full gradient with full density should produce many distinct chars
    expect(uniqueChars.size).toBeGreaterThan(5);
  });

  it("has brighter cells at bottom of gradient (white end)", () => {
    const imgData = makeGradientImageData(100, 100);
    const grid = imageDataToAsciiGrid(imgData, { gridCols: 10, gridRows: 10 });
    const topBrightness = grid[0][0].brightness;
    const bottomBrightness = grid[grid.length - 1][0].brightness;
    expect(bottomBrightness).toBeGreaterThan(topBrightness);
  });
});
