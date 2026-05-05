import { useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Hero ASCII — canvas-sampled particle physics
   "EXPERIENCE DESIGN" and "AI JOURNAL" are rendered offscreen
   in a heavy system font, then sampled on a grid to create particles.
   Each particle is a stable printable ASCII glyph with theme colour + mouse repulsion.
═══════════════════════════════════════════════════════════════════ */

export type HeroAsciiLine = {
  text: string;
  targetWidth: number;
  maxSize: number;
  xScale: number;
  trackingEm: number;
};

const HERO_LINES: HeroAsciiLine[] = [
  { text: "EXPERIENCE DESIGN", targetWidth: 0.93, maxSize: 150, xScale: 1.08, trackingEm: 0.035 },
  { text: "AI JOURNAL", targetWidth: 0.78, maxSize: 180, xScale: 1.06, trackingEm: 0.045 },
];
const ASCII_RAMP = " .:-=+*#%@";
const ACTIVE_RAMP = "01<>/\\[]{}$#@";
const SAMPLE_STEP = 5;   /* px — grid sampling of the offscreen text */
const SOURCE_CHAR_TUNING: Partial<Record<string, { strokeScale: number; fillOffsets?: number[]; advanceScale?: number }>> = {
  X: { strokeScale: 0.40, fillOffsets: [-0.18, 0.24], advanceScale: 0.32 },
  R: { strokeScale: 0.36, fillOffsets: [-0.24, 0.32], advanceScale: 0.36 },
  N: { strokeScale: 0.30, fillOffsets: [-0.16, 0.24], advanceScale: 0.30 },
};

/* ── Physics ── */
const REPEL_RADIUS = 72;
const REPEL_FORCE  = 5800;
const SPRING_K     = 0.055;
const DAMPING      = 0.82;
const MIN_DIST     = 6;

interface Particle {
  char: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  shade: number;
}

function pickGlyph(x: number, y: number, shade: number, active = false) {
  const ramp = active ? ACTIVE_RAMP : ASCII_RAMP;
  const jitter = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  const index = Math.min(
    ramp.length - 1,
    Math.max(0, Math.floor((shade * 0.82 + jitter * 0.18) * ramp.length)),
  );
  return ramp[index];
}

function measureTrackedText(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  return Array.from(text).reduce((width, char, index) => {
    const tuning = SOURCE_CHAR_TUNING[char.toUpperCase()];
    return width
      + ctx.measureText(char).width
      + (index > 0 ? tracking : 0)
      + (tuning?.advanceScale ? tracking * tuning.advanceScale : 0);
  }, 0);
}

function fillTrackedText(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  let x = 0;
  Array.from(text).forEach((char, index) => {
    if (index > 0) x += tracking;
    const upperChar = char.toUpperCase();
    const tuning = SOURCE_CHAR_TUNING[upperChar];
    if (tuning) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = Math.max(1.3, tracking * tuning.strokeScale);
      ctx.strokeText(char, x, 0);
      if (tuning.fillOffsets) {
        tuning.fillOffsets.forEach((offset) => {
          ctx.fillText(char, x + offset, 0);
        });
      }
      ctx.restore();
    }
    ctx.fillText(char, x, 0);
    x += ctx.measureText(char).width + (tuning?.advanceScale ? tracking * tuning.advanceScale : 0);
  });
}

/* ── Build particle set by sampling offscreen canvas ── */
function buildParticles(cW: number, lines: HeroAsciiLine[]): { particles: Particle[]; height: number } {
  const oc  = document.createElement("canvas");
  const ctx = oc.getContext("2d");
  if (!ctx || !cW) return { particles: [], height: 0 };

  /* Font: use a reliable system font for the shape; particles render in JetBrains Mono */
  const SHAPE_FONT = '"Impact", "Arial Black", "Helvetica Neue", Arial, sans-serif';

  const baseSize = 160;
  const lineLayouts = lines.map((line) => {
    ctx.font = `900 ${baseSize}px ${SHAPE_FONT}`;
    const measured = measureTrackedText(ctx, line.text, baseSize * line.trackingEm) * line.xScale;
    const size = Math.min(
      Math.max(baseSize * ((cW * line.targetWidth) / measured), 42),
      line.maxSize,
    );
    return {
      ...line,
      size,
      lineH: size * 1.05,
    };
  });

  /* Layout */
  const gap = Math.max(20, Math.min(40, cW * 0.024));
  const totalH = lineLayouts.reduce((sum, line) => sum + line.lineH, 0) + gap + 24;

  oc.width  = cW;
  oc.height = Math.ceil(totalH);

  ctx.clearRect(0, 0, oc.width, oc.height);
  ctx.fillStyle    = "#ffffff";
  ctx.textBaseline = "top";

  let y = 0;
  lineLayouts.forEach((line, index) => {
    ctx.font = `900 ${line.size}px ${SHAPE_FONT}`;
    const tracking = line.size * line.trackingEm;
    const width = measureTrackedText(ctx, line.text, tracking) * line.xScale;
    ctx.save();
    ctx.translate((cW - width) / 2, y);
    ctx.scale(line.xScale, 1);
    fillTrackedText(ctx, line.text, tracking);
    ctx.restore();
    y += line.lineH + (index === 0 ? gap : 0);
  });

  /* Sample pixels — guarded: getImageData can throw in restricted contexts */
  let imgData: Uint8ClampedArray | null = null;
  try {
    imgData = ctx.getImageData(0, 0, oc.width, oc.height).data;
  } catch {
    return { particles: [], height: totalH };
  }

  const particles: Particle[] = [];

  for (let y = 0; y < oc.height; y += SAMPLE_STEP) {
    for (let x = 0; x < oc.width; x += SAMPLE_STEP) {
      const alpha = imgData[(y * oc.width + x) * 4 + 3];
      if (alpha > 36) {
        const shade = alpha / 255;
        particles.push({
          char: pickGlyph(x, y, shade),
          homeX: x, homeY: y,
          x: x, y: y,
          vx: 0, vy: 0, energy: 0,
          shade,
        });
      }
    }
  }

  return { particles, height: totalH };
}

type HeroAsciiCanvasProps = {
  lines?: HeroAsciiLine[];
  ariaLabel?: string;
  className?: string;
};

/* ═══════════════════════════════════════════════════════════ Component */
export function HeroAsciiCanvas({ lines = HERO_LINES, ariaLabel, className = "" }: HeroAsciiCanvasProps) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const pRef      = useRef<Particle[]>([]);
  const rafRef    = useRef<number | null>(null);
  const sizeRef   = useRef({ width: 0, height: 0, dpr: 1 });

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const fs     = SAMPLE_STEP * 1.18;
    const mx     = mouseRef.current.x;
    const my     = mouseRef.current.y;
    const css = getComputedStyle(document.documentElement);
    const neonHex = css.getPropertyValue("--neon").trim() || "#3D2400";
    const neonRgb = css.getPropertyValue("--neon-rgb").trim() || "61,36,0";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = `800 ${fs}px "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace`;
    ctx.textBaseline = "top";

    let moving = false;

    for (const p of pRef.current) {
      /* Repulsion */
      const dx   = p.x - mx;
      const dy   = p.y - my;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      if (dist < REPEL_RADIUS) {
        const f = REPEL_FORCE / (dist * dist);
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
        p.energy = Math.min(1, p.energy + 0.28);
      }

      /* Spring */
      p.vx += (p.homeX - p.x) * SPRING_K;
      p.vy += (p.homeY - p.y) * SPRING_K;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x  += p.vx;
      p.y  += p.vy;
      p.energy = Math.max(0, p.energy - 0.026);

      const drift = Math.abs(p.homeX - p.x) + Math.abs(p.homeY - p.y);
      if (drift > 0.4 || Math.abs(p.vx) > 0.08) moving = true;

      const alpha = 0.58 + p.shade * 0.38 + p.energy * 0.16;

      if (p.energy > 0.07) {
        ctx.shadowColor = neonHex;
        ctx.shadowBlur  = 4 + p.energy * 22;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = p.energy > 0.07
        ? neonHex
        : `rgba(${neonRgb},${Math.min(alpha, 1)})`;

      ctx.fillText(p.energy > 0.18 ? pickGlyph(p.homeX, p.homeY, 1, true) : p.char, p.x, p.y);
    }

    ctx.shadowBlur = 0;
    if (moving) rafRef.current = requestAnimationFrame(tick);
    else rafRef.current = null;
  }, []);

  const startAnim = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const setup = useCallback(() => {
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const cW = wrap.clientWidth;
    if (!cW) return;

    const { particles, height } = buildParticles(cW, lines);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cH = Math.ceil(height);
    sizeRef.current = { width: cW, height: cH, dpr };
    canvas.width  = Math.ceil(cW * dpr);
    canvas.height = Math.ceil(cH * dpr);
    canvas.style.height = `${cH}px`;
    pRef.current  = particles;

    /* Draw initial state immediately */
    startAnim();
  }, [lines, startAnim]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    setup();

    /* Debounce via rAF — prevents "ResizeObserver loop" browser string-throw */
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setup);
    });
    ro.observe(wrap);

    /* Repaint immediately when the theme class changes (dark ↔ light).
       Without this, resting particles keep the old colour until next interaction. */
    const mo = new MutationObserver(() => startAnim());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(rafId);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [setup, startAnim]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    startAnim();
  }, [startAnim]);

  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
    startAnim();
  }, [startAnim]);

  /* Initial render after mount (canvas won't paint without a frame) */
  useEffect(() => { startAnim(); }, [startAnim]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${className}`.trim()}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? lines.map((line) => line.text).join(" ")}
        style={{ display: "block", width: "100%" }}
      />
    </div>
  );
}
