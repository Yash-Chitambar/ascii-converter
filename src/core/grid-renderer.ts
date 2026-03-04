import type { StyledAsciiGrid, RenderOptions } from "../types";
import { FONT_FEATURE_SETTINGS } from "../constants";

// ---------------------------------------------------------------------------
// DOM renderer
// ---------------------------------------------------------------------------

/**
 * Renders a StyledAsciiGrid into a <pre> element using document fragments.
 *
 * Per-character coloring is applied via inline style on individual <span>
 * elements. Adjacent cells with the same color are merged into a single span
 * to reduce DOM node count.
 *
 * The pre element's textContent is NOT cleared and re-set via React — direct
 * DOM mutation is used to bypass React reconciliation overhead.
 */
export function renderToDOM(
  pre: HTMLPreElement,
  grid: StyledAsciiGrid,
  options: Pick<RenderOptions, "fontSize" | "lineHeight" | "letterSpacing" | "fontFamily">
): void {
  const { fontSize, lineHeight, letterSpacing, fontFamily } = options;

  // Apply stable styles directly on the <pre> element
  const s = pre.style;
  s.fontSize = `${fontSize}px`;
  s.lineHeight = String(lineHeight);
  s.letterSpacing = `${letterSpacing}px`;
  s.fontFamily = fontFamily;
  s.fontFeatureSettings = FONT_FEATURE_SETTINGS;
  s.margin = "0";
  s.padding = "0";
  s.whiteSpace = "pre";
  s.overflow = "hidden";

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];

    // Group consecutive cells with the same color and background into a single span
    let spanStart = 0;
    while (spanStart < row.length) {
      const currentColor = row[spanStart].color;
      const currentBg = row[spanStart].background;
      let spanEnd = spanStart + 1;

      while (
        spanEnd < row.length &&
        row[spanEnd].color === currentColor &&
        row[spanEnd].background === currentBg
      ) {
        spanEnd++;
      }

      // Build text content for this run
      let text = "";
      for (let c = spanStart; c < spanEnd; c++) {
        text += row[c].char;
      }

      const span = document.createElement("span");
      span.style.color = currentColor;
      if (currentBg !== "transparent") {
        span.style.backgroundColor = currentBg;
      }
      span.textContent = text;
      fragment.appendChild(span);

      spanStart = spanEnd;
    }

    // Line break between rows (not after the last one)
    if (r < grid.length - 1) {
      fragment.appendChild(document.createTextNode("\n"));
    }
  }

  // Direct DOM mutation — avoids React re-render
  pre.innerHTML = "";
  pre.appendChild(fragment);
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

/**
 * Renders a StyledAsciiGrid to a <canvas> element using fillText per character.
 *
 * Better performance for high-resolution grids at the cost of losing native
 * browser text selection and accessibility.
 */
export function renderToCanvas(
  canvas: HTMLCanvasElement,
  grid: StyledAsciiGrid,
  options: RenderOptions
): void {
  const { fontSize, lineHeight, letterSpacing, fontFamily } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const charHeight = fontSize * lineHeight;
  const charWidth = fontSize * 0.6 + letterSpacing; // approximate monospace width

  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  canvas.width = Math.ceil(cols * charWidth);
  canvas.height = Math.ceil(rows * charHeight);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";

  // Fill background of first cell as a proxy for the whole canvas bg
  // (actual background is controlled by the container element's CSS)

  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    const y = r * charHeight;

    for (let c = 0; c < cols; c++) {
      const cell = row[c];
      if (cell.char === " ") continue;

      if (cell.background !== "transparent") {
        ctx.fillStyle = cell.background;
        ctx.fillRect(c * charWidth, y, charWidth, charHeight);
      }

      ctx.fillStyle = cell.color;
      ctx.fillText(cell.char, c * charWidth, y);
    }
  }
}

// ---------------------------------------------------------------------------
// Monospace character dimension measurement
// ---------------------------------------------------------------------------

/**
 * Measures the width and height of a single monospace character by inserting
 * a hidden probe span into the DOM, measuring it, then removing it.
 *
 * This is the canonical technique from the personal website monorepo.
 */
export function measureCharDimensions(
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  container: HTMLElement
): { charWidth: number; charHeight: number } {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.fontFamily = fontFamily;
  probe.style.fontSize = `${fontSize}px`;
  probe.style.lineHeight = String(lineHeight);
  probe.style.fontFeatureSettings = FONT_FEATURE_SETTINGS;
  probe.textContent = "M";

  container.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  container.removeChild(probe);

  return {
    charWidth: rect.width || fontSize * 0.6,
    charHeight: rect.height || fontSize * lineHeight,
  };
}

// ---------------------------------------------------------------------------
// Grid dimension helpers
// ---------------------------------------------------------------------------

export function computeGridDimensions(
  containerWidth: number,
  containerHeight: number,
  charWidth: number,
  charHeight: number
): { gridCols: number; gridRows: number } {
  return {
    gridCols: Math.max(1, Math.floor(containerWidth / charWidth)),
    gridRows: Math.max(1, Math.floor(containerHeight / charHeight)),
  };
}
