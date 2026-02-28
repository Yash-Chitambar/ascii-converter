import { useEffect, useRef, useCallback, useState } from "react";
import type { VideoPlaybackControls } from "../types";

interface UseVideoPlaybackOptions {
  loop?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  /** Pause when the browser tab becomes hidden. */
  pauseOnBackground?: boolean;
  /** Whether the component is currently in the viewport. */
  isVisible?: boolean;
}

/**
 * Manages the full lifecycle of an HTMLVideoElement:
 * - Background tab pause / resume via document.visibilitychange
 * - Viewport-aware pause / resume (driven by isVisible prop)
 * - Exposes play / pause / seek controls
 */
export function useVideoPlayback(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseVideoPlaybackOptions = {}
): VideoPlaybackControls {
  const {
    loop = true,
    muted = true,
    autoplay = true,
    pauseOnBackground = true,
    isVisible = true,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const shouldPlayRef = useRef(autoplay); // tracks user intent (play vs pause)

  // Sync video element attributes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = loop;
    video.muted = muted;
  }, [videoRef, loop, muted]);

  // Attempt to play or pause based on current intent + conditions
  const syncPlayState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const tabVisible = !pauseOnBackground || document.visibilityState === "visible";
    const inViewport = isVisible;

    if (shouldPlayRef.current && tabVisible && inViewport) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoRef, pauseOnBackground, isVisible]);

  // Re-sync whenever visibility conditions change
  useEffect(() => {
    syncPlayState();
  }, [syncPlayState, isVisible]);

  // Listen for tab background/foreground switches
  useEffect(() => {
    if (!pauseOnBackground) return;

    const handler = () => syncPlayState();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [pauseOnBackground, syncPlayState]);

  // Autoplay on mount
  useEffect(() => {
    if (autoplay) {
      shouldPlayRef.current = true;
      syncPlayState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(() => {
    shouldPlayRef.current = true;
    syncPlayState();
  }, [syncPlayState]);

  const pause = useCallback(() => {
    shouldPlayRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, [videoRef]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
  }, [videoRef]);

  return { play, pause, seek, isPlaying };
}
