import { useEffect, useRef, useState } from "react";
import { VIEWPORT_THRESHOLD, VIEWPORT_ROOT_MARGIN } from "../constants";

interface UseViewportAwareOptions {
  /** Fraction of the element that must be visible (0.0–1.0). Default: 0.1. */
  threshold?: number;
  /** Root margin for the observer. Default: '100px'. */
  rootMargin?: string;
}

/**
 * Returns whether the referenced element is currently visible in the viewport,
 * using IntersectionObserver.
 *
 * When isVisible is false, the calling component should pause all rendering
 * (RAF loops, video playback) to save CPU.
 */
export function useViewportAware(
  ref: React.RefObject<Element>,
  options: UseViewportAwareOptions = {}
): { isVisible: boolean } {
  const {
    threshold = VIEWPORT_THRESHOLD,
    rootMargin = VIEWPORT_ROOT_MARGIN,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold, rootMargin }
    );
    observerRef.current.observe(ref.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, threshold, rootMargin]);

  return { isVisible };
}
