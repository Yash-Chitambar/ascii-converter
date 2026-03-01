import { describe, it, expect } from "vitest";
import { computeGridDimensions } from "../src/core/grid-renderer";

describe("computeGridDimensions", () => {
  it("computes correct columns and rows", () => {
    const { gridCols, gridRows } = computeGridDimensions(800, 600, 8, 16);
    expect(gridCols).toBe(100); // 800 / 8
    expect(gridRows).toBe(37); // floor(600 / 16)
  });

  it("returns at least 1 for very small containers", () => {
    const { gridCols, gridRows } = computeGridDimensions(2, 2, 8, 16);
    expect(gridCols).toBe(1);
    expect(gridRows).toBe(1);
  });

  it("floors fractional results", () => {
    const { gridCols, gridRows } = computeGridDimensions(100, 100, 7, 13);
    expect(gridCols).toBe(Math.floor(100 / 7));
    expect(gridRows).toBe(Math.floor(100 / 13));
  });

  it("handles wide containers", () => {
    const { gridCols, gridRows } = computeGridDimensions(1920, 200, 6, 12);
    expect(gridCols).toBe(320);
    expect(gridRows).toBe(16);
  });

  it("handles tall containers", () => {
    const { gridCols, gridRows } = computeGridDimensions(200, 1080, 6, 12);
    expect(gridCols).toBe(33);
    expect(gridRows).toBe(90);
  });
});
