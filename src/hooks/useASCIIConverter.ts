import { useEffect, useRef, useCallback, useState } from "react";
import type { StyledAsciiGrid, MediaType, FitMode, RampPreset } from "../types";
import { imageToAsciiGrid } from "../core/image-to-ascii";
import { createVideoAsciiLoop, createWebcamVideo } from "../core/video-to-ascii";
import { applyPaletteById } from "../core/color-engine";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseASCIIConverterOptions {
  mediaType: MediaType;
  imageSrc?: string;
  videoSrc?: string;

  gridCols: number;
  gridRows: number;
  containerWidth: number;
  containerHeight: number;

  paletteId: string;
  rampPreset?: RampPreset | string;
  customCharacters?: string;
  characterDensity?: number;
  invertBrightness?: boolean;
  fitMode?: FitMode;
  resolutionScale?: number;
  targetFps?: number;

  /** If false, pause all processing (viewport / tab hidden). */
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Core hook that drives the full media → ASCII pipeline.
 *
 * Returns a StyledAsciiGrid ready to hand off to a renderer.
 * Manages its own image load, video loop, and webcam stream lifecycle.
 */
export function useASCIIConverter(
  options: UseASCIIConverterOptions
): StyledAsciiGrid {
  const {
    mediaType,
    imageSrc = "",
    videoSrc = "",
    gridCols,
    gridRows,
    containerWidth,
    containerHeight,
    paletteId,
    rampPreset = "standard",
    customCharacters,
    characterDensity = 0.5,
    invertBrightness = false,
    fitMode = "cover",
    resolutionScale = 0.5,
    targetFps = 15,
    isActive = true,
  } = options;

  const [grid, setGrid] = useState<StyledAsciiGrid>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof createVideoAsciiLoop> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Shared conversion options object (rebuilt on every option change)
  const conversionOpts = {
    gridCols,
    gridRows,
    rampPreset,
    customCharacters,
    characterDensity,
    invertBrightness,
    fitMode,
    resolutionScale,
    targetFps,
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const applyAndSet = useCallback(
    (rawGrid: ReturnType<typeof imageToAsciiGrid>) => {
      setGrid(applyPaletteById(rawGrid, paletteId));
    },
    [paletteId]
  );

  const stopLoop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Image pipeline
  // -------------------------------------------------------------------------

  const startImage = useCallback(() => {
    if (!imageSrc || gridCols === 0 || gridRows === 0) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    imgRef.current = img;

    img.onload = () => {
      if (imgRef.current !== img) return; // stale
      const raw = imageToAsciiGrid(img, containerWidth, containerHeight, conversionOpts);
      applyAndSet(raw);
    };
    img.src = imageSrc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, gridCols, gridRows, containerWidth, containerHeight, paletteId,
      rampPreset, customCharacters, characterDensity, invertBrightness, fitMode, resolutionScale]);

  // -------------------------------------------------------------------------
  // Video pipeline
  // -------------------------------------------------------------------------

  const startVideo = useCallback(
    (videoElement: HTMLVideoElement) => {
      stopLoop();

      const loop = createVideoAsciiLoop(videoElement, conversionOpts, (raw) => {
        applyAndSet(raw);
      });
      loopRef.current = loop;

      if (isActive) loop.start();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive, applyAndSet, gridCols, gridRows, rampPreset, customCharacters,
     characterDensity, invertBrightness, fitMode, resolutionScale, targetFps]
  );

  // -------------------------------------------------------------------------
  // Effect: switch media type / source
  // -------------------------------------------------------------------------

  useEffect(() => {
    stopLoop();
    stopWebcam();
    imgRef.current = null;

    if (!isActive) return;
    if (gridCols === 0 || gridRows === 0) return;

    if (mediaType === "image") {
      startImage();
      return;
    }

    if (mediaType === "video") {
      if (!videoSrc) return;
      const video = document.createElement("video");
      video.src = videoSrc;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      videoRef.current = video;

      const onReady = () => startVideo(video);
      video.addEventListener("loadeddata", onReady, { once: true });
      video.load();
      return;
    }

    if (mediaType === "webcam") {
      createWebcamVideo()
        .then(({ video, stream }) => {
          videoRef.current = video;
          streamRef.current = stream;
          startVideo(video);
        })
        .catch(console.error);
    }

    return () => {
      stopLoop();
      stopWebcam();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, imageSrc, videoSrc, gridCols, gridRows, isActive]);

  // -------------------------------------------------------------------------
  // Effect: pause / resume loop when isActive changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!loopRef.current) return;
    if (isActive) {
      loopRef.current.start();
    } else {
      loopRef.current.stop();
    }
  }, [isActive]);

  // -------------------------------------------------------------------------
  // Effect: re-render image when palette or conversion options change
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (mediaType === "image") startImage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteId, characterDensity, rampPreset, customCharacters, invertBrightness, fitMode, resolutionScale]);

  return grid;
}
