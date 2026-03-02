// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVideoAsciiLoop } from "../src/core/video-to-ascii";

// We can't fully test RAF-based rendering in Node, but we can test the
// factory API surface: start/stop/isRunning contract.

function makeMockVideo(ready = true): HTMLVideoElement {
  const video = document.createElement("video");
  Object.defineProperty(video, "readyState", { value: ready ? 4 : 0 });
  Object.defineProperty(video, "videoWidth", { value: 320 });
  Object.defineProperty(video, "videoHeight", { value: 240 });
  return video;
}

describe("createVideoAsciiLoop", () => {
  beforeEach(() => {
    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  it("returns an object with start, stop, and isRunning", () => {
    const video = makeMockVideo();
    const onFrame = vi.fn();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, onFrame);

    expect(typeof loop.start).toBe("function");
    expect(typeof loop.stop).toBe("function");
    expect(typeof loop.isRunning).toBe("function");
  });

  it("isRunning is false before start", () => {
    const video = makeMockVideo();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, vi.fn());
    expect(loop.isRunning()).toBe(false);
  });

  it("isRunning is true after start", () => {
    const video = makeMockVideo();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, vi.fn());
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
  });

  it("isRunning is false after stop", () => {
    const video = makeMockVideo();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, vi.fn());
    loop.start();
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it("calling start twice does not double-start", () => {
    const rafSpy = vi.fn((_cb: FrameRequestCallback) => 1 as unknown as number);
    vi.stubGlobal("requestAnimationFrame", rafSpy);

    const video = makeMockVideo();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, vi.fn());
    loop.start();
    loop.start();
    // Should only have called requestAnimationFrame once
    expect(rafSpy).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it("stop cancels the animation frame", () => {
    const cancelSpy = vi.fn();
    vi.stubGlobal("requestAnimationFrame", () => 42);
    vi.stubGlobal("cancelAnimationFrame", cancelSpy);

    const video = makeMockVideo();
    const loop = createVideoAsciiLoop(video, { gridCols: 40, gridRows: 20 }, vi.fn());
    loop.start();
    loop.stop();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
