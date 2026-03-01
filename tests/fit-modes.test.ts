import { describe, it, expect } from "vitest";
import { computeFit } from "../src/core/fit-modes";

describe("computeFit — cover", () => {
  it("fills destination completely", () => {
    const result = computeFit(1000, 500, 400, 400, "cover");
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.dw).toBe(400);
    expect(result.dh).toBe(400);
  });

  it("crops the wider source dimension for landscape into square", () => {
    const result = computeFit(1000, 500, 400, 400, "cover");
    // Source is 2:1, dest is 1:1 — source width should be cropped
    expect(result.sw).toBeLessThan(1000);
    expect(result.sh).toBe(500);
  });

  it("crops the taller source dimension for portrait into square", () => {
    const result = computeFit(500, 1000, 400, 400, "cover");
    expect(result.sw).toBe(500);
    expect(result.sh).toBeLessThan(1000);
  });

  it("centers the crop", () => {
    const result = computeFit(1000, 500, 400, 400, "cover");
    // sx should be roughly centered
    expect(result.sx).toBeGreaterThan(0);
    expect(result.sy).toBe(0);
  });
});

describe("computeFit — contain", () => {
  it("preserves entire source content", () => {
    const result = computeFit(1000, 500, 400, 400, "contain");
    expect(result.sx).toBe(0);
    expect(result.sy).toBe(0);
    expect(result.sw).toBe(1000);
    expect(result.sh).toBe(500);
  });

  it("letterboxes a wide image into a square container", () => {
    const result = computeFit(1000, 500, 400, 400, "contain");
    // Should have horizontal bars (dw fills, dh is smaller)
    expect(result.dw).toBe(400);
    expect(result.dh).toBe(200);
    expect(result.dy).toBeGreaterThan(0); // Centered vertically
  });

  it("pillarboxes a tall image into a square container", () => {
    const result = computeFit(500, 1000, 400, 400, "contain");
    expect(result.dh).toBe(400);
    expect(result.dw).toBe(200);
    expect(result.dx).toBeGreaterThan(0); // Centered horizontally
  });
});

describe("computeFit — fill", () => {
  it("stretches source to fill destination exactly", () => {
    const result = computeFit(1000, 500, 400, 300, "fill");
    expect(result.sx).toBe(0);
    expect(result.sy).toBe(0);
    expect(result.sw).toBe(1000);
    expect(result.sh).toBe(500);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.dw).toBe(400);
    expect(result.dh).toBe(300);
  });
});

describe("computeFit — none", () => {
  it("centers small source in larger destination", () => {
    const result = computeFit(200, 100, 400, 400, "none");
    expect(result.dx).toBe(100); // (400-200)/2
    expect(result.dy).toBe(150); // (400-100)/2
  });

  it("clips large source in smaller destination", () => {
    const result = computeFit(800, 600, 400, 300, "none");
    // Source overflows — only visible portion is rendered
    expect(result.sx).toBeGreaterThan(0);
    expect(result.sy).toBeGreaterThan(0);
    expect(result.dw).toBeLessThanOrEqual(400);
    expect(result.dh).toBeLessThanOrEqual(300);
  });
});
