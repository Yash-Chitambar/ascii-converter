import { useEffect, useRef, useState, useCallback } from "react";
import { measureCharDimensions, computeGridDimensions } from "../core/grid-renderer";
import { RESIZE_DEBOUNCE_MS, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT } from "../constants";
import type { ContainerSize } from "../types";

interface UseResizeDebounceOptions {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  debounceMs?: number;
}

/**
 * Observes container size changes via ResizeObserver (debounced) and returns:
 * - pixel dimensions of the container
 * - measured monospace character dimensions
 * - computed ASCII grid column/row counts
 *
 * Character measurement uses the hidden-span technique from the personal
 * website monorepo: temporarily inserting a probe span, measuring it, removing.
 */
export function useResizeDebounce(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseResizeDebounceOptions = {}
): ContainerSize {
  const {
    fontFamily = DEFAULT_FONT_FAMILY,
    fontSize = DEFAULT_FONT_SIZE,
    lineHeight = DEFAULT_LINE_HEIGHT,
    debounceMs = RESIZE_DEBOUNCE_MS,
  } = options;

  const [size, setSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
    charWidth: fontSize * 0.6,
    charHeight: fontSize * lineHeight,
    gridCols: 1,
    gridRows: 1,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cache char dimensions per font configuration — skip DOM probe on resize
  const charDimCacheRef = useRef<{ charWidth: number; charHeight: number } | null>(null);
  const lastFontKeyRef = useRef<string>("");

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;
    if (width === 0 || height === 0) return;

    // Re-run measureCharDimensions() ONLY when font props have changed
    const fontKey = `${fontFamily}|${fontSize}|${lineHeight}`;
    if (!charDimCacheRef.current || fontKey !== lastFontKeyRef.current) {
      charDimCacheRef.current = measureCharDimensions(fontFamily, fontSize, lineHeight, el);
      lastFontKeyRef.current = fontKey;
    }
    const { charWidth, charHeight } = charDimCacheRef.current;

    const { gridCols, gridRows } = computeGridDimensions(width, height, charWidth, charHeight);

    // Skip state update when all dimensions are unchanged (prevents re-renders)
    setSize((prev) => {
      if (
        prev.width    === width    &&
        prev.height   === height   &&
        prev.gridCols === gridCols &&
        prev.gridRows === gridRows
      ) return prev;
      return { width, height, charWidth, charHeight, gridCols, gridRows };
    });
  }, [containerRef, fontFamily, fontSize, lineHeight]);

  useEffect(() => {
    measure(); // Initial measurement

    const observer = new ResizeObserver(() => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      // RAF alignment: wait for browser layout to settle before measuring
      timerRef.current = setTimeout(() => requestAnimationFrame(measure), debounceMs);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [containerRef, measure, debounceMs]);

  return size;
}
