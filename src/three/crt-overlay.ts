import type { CRTOptions } from "../types";

/**
 * Applies CRT-style visual effects to a container element via inline CSS.
 * All effects are implemented as CSS overlays rather than WebGL shaders to
 * avoid a GPU dependency for the text layer.
 *
 * Call this once after mounting and again whenever CRT options change.
 */
export function applyCRTStyles(
  container: HTMLElement,
  pre: HTMLPreElement,
  options: CRTOptions
): void {
  const {
    enabled,
    scanlineOpacity,
    glowIntensity,
    glowColor,
    curvature,
    flickerSpeed,
    noiseAmount,
  } = options;

  if (!enabled) {
    clearCRTStyles(container, pre);
    return;
  }

  // --- Scanlines via pseudo-element (implemented as a gradient overlay div) ---
  let overlay = container.querySelector<HTMLDivElement>(".crt-scanlines");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "crt-scanlines";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2";
    container.appendChild(overlay);
  }
  overlay.style.backgroundImage = `repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 1px,
    rgba(0,0,0,${scanlineOpacity}) 1px,
    rgba(0,0,0,${scanlineOpacity}) 2px
  )`;

  // --- Glow via text-shadow on the <pre> element ---
  const glowRadius = Math.round(glowIntensity * 12);
  const glowSpread = Math.round(glowIntensity * 4);
  pre.style.textShadow = glowIntensity > 0
    ? `0 0 ${glowRadius}px ${glowColor}, 0 0 ${glowSpread}px ${glowColor}`
    : "";

  // --- Container box-shadow for screen glow ---
  container.style.boxShadow = glowIntensity > 0
    ? `inset 0 0 ${Math.round(glowIntensity * 30)}px rgba(0,0,0,0.5)`
    : "";

  // --- Curvature via border-radius + perspective ---
  if (curvature > 0) {
    container.style.borderRadius = `${curvature * 20}px`;
    container.style.transform = `perspective(${800 - curvature * 400}px) rotateX(0deg)`;
    container.style.overflow = "hidden";
  } else {
    container.style.borderRadius = "";
    container.style.transform = "";
  }

  // --- Flicker via CSS animation ---
  if (flickerSpeed > 0) {
    const duration = (1 / flickerSpeed).toFixed(3);
    container.style.animation = `crt-flicker ${duration}s step-end infinite`;
    ensureFlickerKeyframes();
  } else {
    container.style.animation = "";
  }

  // --- Noise canvas overlay (optional) ---
  applyNoiseOverlay(container, noiseAmount);
}

export function clearCRTStyles(
  container: HTMLElement,
  pre: HTMLPreElement
): void {
  container.querySelector(".crt-scanlines")?.remove();
  container.querySelector(".crt-noise")?.remove();
  pre.style.textShadow = "";
  container.style.boxShadow = "";
  container.style.borderRadius = "";
  container.style.transform = "";
  container.style.animation = "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let flickerKeyframesInjected = false;

function ensureFlickerKeyframes(): void {
  if (flickerKeyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes crt-flicker {
      0%   { opacity: 1; }
      50%  { opacity: 0.96; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  flickerKeyframesInjected = true;
}

function applyNoiseOverlay(container: HTMLElement, amount: number): void {
  let canvas = container.querySelector<HTMLCanvasElement>(".crt-noise");

  if (amount <= 0) {
    canvas?.remove();
    return;
  }

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "crt-noise";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "3";
    canvas.style.mixBlendMode = "overlay";
    container.appendChild(canvas);
  }

  const { offsetWidth: w, offsetHeight: h } = container;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.createImageData(w, h);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() * 255 * amount) | 0;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = (amount * 80) | 0;
  }
  ctx.putImageData(imageData, 0, 0);
}
