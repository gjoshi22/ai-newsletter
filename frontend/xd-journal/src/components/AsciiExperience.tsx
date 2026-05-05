import { useCallback, useEffect, useRef } from "react";
import type { ArticleCategory, ArticleSubCategory } from "@/lib/data";

type AsciiExperienceMode = ArticleSubCategory | "Archive";
type AsciiExperienceVariant = "collection" | "article" | "archive";

type AsciiExperienceProps = {
  mode: AsciiExperienceMode;
  variant?: AsciiExperienceVariant;
  surface?: ArticleCategory;
};

type DesignTint = "amber" | "vermillion" | "blue" | "sage" | "slate" | "charcoal";
type TerminalZone = "frame" | "chrome" | "screen" | "code" | "cursor" | "data";
type DesignStudioZone = "frame" | "chrome" | "toolbar" | "brand" | "copy" | "artboard" | "shape" | "swatch" | "panel" | "note" | "cursor" | "dust";

type Point =
  | { family: "dev-terminal"; x: number; y: number; z: number; char: string; shade: number; zone: TerminalZone; pulse: number; tint?: DesignTint }
  | { family: "dev-sphere"; lat: number; lon: number; char: string; shade: number }
  | { family: "dev-ring"; angle: number; radius: number; char: string; shade: number }
  | { family: "dev-comet"; angle: number; radius: number; char: string; shade: number; lane: number }
  | { family: "design-studio"; x: number; y: number; z: number; char: string; shade: number; zone: DesignStudioZone; pulse: number; tilt: number; size: number; tint?: DesignTint }
  | { family: "design-brain"; x: number; y: number; z: number; char: string; shade: number; tint?: DesignTint }
  | { family: "design-node"; x: number; y: number; z: number; char: string; shade: number; tint: DesignTint; pulse: number }
  | { family: "news-signal"; angle: number; radius: number; char: string; shade: number; lane: number }
  | { family: "resource-frame"; side: 0 | 1 | 2 | 3; progress: number; char: string; shade: number; lane: number }
  | { family: "archive-globe"; lat: number; lon: number; char: string; shade: number }
  | { family: "archive-slab"; side: 0 | 1 | 2 | 3; progress: number; layer: number; char: string; shade: number }
  | { family: "dust"; x: number; y: number; z: number; char: string; shade: number };

const DEV_RAMP = "001101<>/\\+=*#@";
const DESIGN_RAMP = "..,:;!|10OQ#@";
const ARCHIVE_RAMP = "2026[]{}<>/\\01#@";
const TERMINAL_RAMP = "001101<>/\\[]{}$#@";
const TERMINAL_BOUNDS = {
  left: -2.52,
  right: 2.52,
  top: -1.42,
  chromeBottom: -1.05,
  screenLeft: -2.32,
  screenRight: 2.32,
  screenTop: -0.88,
  screenBottom: 1.24,
  bottom: 1.4,
};
const STUDIO_BOUNDS = {
  left: -2.76,
  right: 2.76,
  top: -1.56,
  bottom: 1.56,
};

function glyph(ramp: string, index: number, salt: number) {
  const value = Math.abs(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1;
  return ramp[Math.floor(value * ramp.length)] ?? ramp[0];
}

function ellipseContains(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function buildDevelopmentTerminalPoints(dense: number): Point[] {
  const points: Point[] = [];
  const bounds = TERMINAL_BOUNDS;
  let i = 0;

  const push = (
    x: number,
    y: number,
    char: string,
    shade: number,
    zone: TerminalZone,
    tint?: DesignTint,
    z = 0,
  ) => {
    points.push({
      family: "dev-terminal",
      x,
      y,
      z,
      char,
      shade,
      zone,
      tint,
      pulse: i * 0.17 + x * 0.31 + y * 0.19,
    });
    i += 1;
  };

  const frameStep = Math.max(0.055, 0.108 / dense);
  for (let x = bounds.left; x <= bounds.right; x += frameStep) {
    push(x, bounds.top, glyph("=-:.", i, x), 0.72, "frame");
    push(x, bounds.bottom, glyph("=-:.", i + 1, x), 0.68, "frame");
    push(x, bounds.chromeBottom, glyph(".:-", i + 2, x), 0.28, "chrome", "slate");
    push(x, bounds.screenTop, glyph("=-", i + 3, x), 0.54, "frame");
    push(x, bounds.screenBottom, glyph("=-", i + 4, x), 0.44, "frame");
  }

  for (let y = bounds.top; y <= bounds.bottom; y += frameStep) {
    push(bounds.left, y, glyph("|!:", i, y), 0.68, "frame");
    push(bounds.right, y, glyph("|!:", i + 1, y), 0.68, "frame");
  }
  for (let y = bounds.screenTop; y <= bounds.screenBottom; y += frameStep) {
    push(bounds.screenLeft, y, "|", 0.5, "frame");
    push(bounds.screenRight, y, "|", 0.5, "frame");
  }

  [
    [bounds.left, bounds.top],
    [bounds.right, bounds.top],
    [bounds.left, bounds.bottom],
    [bounds.right, bounds.bottom],
    [bounds.screenLeft, bounds.screenTop],
    [bounds.screenRight, bounds.screenTop],
    [bounds.screenLeft, bounds.screenBottom],
    [bounds.screenRight, bounds.screenBottom],
  ].forEach(([x, y]) => push(x, y, "+", 0.86, "frame"));

  [-2.18, -1.98, -1.78].forEach((x, index) => push(x, -1.22, "0", 0.88, "chrome", index === 0 ? "amber" : "slate"));
  [1.52, 1.78, 2.04, 2.24].forEach((x) => push(x, -1.21, "[]", 0.58, "chrome"));

  const screenXStep = 0.115;
  const screenYStep = 0.13;
  for (let y = bounds.screenTop + 0.14; y <= bounds.screenBottom - 0.12; y += screenYStep) {
    for (let x = bounds.screenLeft + 0.16; x <= bounds.screenRight - 0.16; x += screenXStep) {
      const salt = Math.floor((x + 3) * 10) + Math.floor((y + 2) * 13);
      if (salt % 5 === 0) continue;
      push(x, y, glyph("..::::", i, salt), 0.12 + (salt % 4) * 0.018, "screen", "slate", -0.04);
    }
  }

  const codeLines = [
    "> DR0P>>",
    "|  >>>init:terminal",
    "|  >>>fetch context",
    "|  >>>>tokens 00ff:390",
    "|  >>>>render grid --ok",
    "|",
    "|  >>>scan ports>>",
    "|  >>>>compose frame",
    "|  >>>>hover field armed",
    "|  >>>status:ready",
    ">>",
  ];
  const charStep = 0.112;
  const lineStep = 0.18;
  const lineStartY = -0.68;
  codeLines.forEach((line, lineIndex) => {
    const y = lineStartY + lineIndex * lineStep;
    Array.from(line).forEach((char, charIndex) => {
      if (char === " ") return;
      const isPrompt = char === ">" || char === "|";
      const isNumber = /[0-9]/.test(char);
      push(
        -2.08 + charIndex * charStep,
        y,
        char,
        isPrompt ? 0.88 : isNumber ? 0.72 : 0.62,
        "code",
        isPrompt || isNumber ? "amber" : undefined,
        0.02,
      );
    });
  });
  push(-1.92, lineStartY + codeLines.length * lineStep + 0.02, "#", 0.98, "cursor", "sage", 0.06);

  for (let column = 0; column < 52; column += 1) {
    const seed = Math.abs(Math.sin(column * 4.819) * 12.71) % 1;
    const x = -2.95 + column * (5.9 / 51);
    const topLen = 0.34 + seed * 1.06;
    const bottomLen = 0.26 + ((seed * 1.7) % 1) * 1.12;
    const yStep = 0.16 + (column % 3) * 0.02;
    for (let y = bounds.top - topLen; y < bounds.top - 0.12; y += yStep) {
      push(x, y, glyph(TERMINAL_RAMP, i, y + column), 0.1 + seed * 0.2, "data", column % 7 === 0 ? "amber" : undefined, -0.18);
    }
    for (let y = bounds.bottom + 0.14; y < bounds.bottom + bottomLen; y += yStep) {
      push(x, y, glyph(TERMINAL_RAMP, i, y + column), 0.1 + seed * 0.18, "data", column % 9 === 0 ? "amber" : undefined, -0.18);
    }
  }

  return points;
}

function buildDesignStudioPoints(dense: number): Point[] {
  const points: Point[] = [];
  let i = 0;

  const push = (
    x: number,
    y: number,
    char: string,
    shade: number,
    zone: DesignStudioZone,
    size = 8.4,
    tint?: DesignTint,
    z = 0,
    tilt = 0,
  ) => {
    points.push({
      family: "design-studio",
      x,
      y,
      z,
      char,
      shade,
      zone,
      size,
      tint,
      tilt,
      pulse: i * 0.23 + x * 0.41 - y * 0.29,
    });
    i += 1;
  };

  const rotatePoint = (x: number, y: number, originX: number, originY: number, angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - originX;
    const dy = y - originY;
    return {
      x: originX + dx * cos - dy * sin,
      y: originY + dx * sin + dy * cos,
    };
  };

  const pushLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zone: DesignStudioZone,
    ramp = "-|:.",
    shade = 0.58,
    size = 7.4,
    tint?: DesignTint,
    angle = 0,
    originX = 0,
    originY = 0,
    dash = 1,
  ) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(2, Math.round(length / Math.max(0.034, 0.072 / dense)));
    for (let stepIndex = 0; stepIndex <= count; stepIndex += 1) {
      if (dash > 1 && stepIndex % dash === 0) continue;
      const progress = stepIndex / count;
      const rawX = x1 + (x2 - x1) * progress;
      const rawY = y1 + (y2 - y1) * progress;
      const rotated = angle ? rotatePoint(rawX, rawY, originX, originY, angle) : { x: rawX, y: rawY };
      push(rotated.x, rotated.y, glyph(ramp, i + stepIndex, progress), shade, zone, size, tint, 0.02, angle);
    }
  };

  const pushRect = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    zone: DesignStudioZone,
    shade = 0.6,
    tint?: DesignTint,
    size = 7.4,
    angle = 0,
    dash = 1,
  ) => {
    const originX = (left + right) * 0.5;
    const originY = (top + bottom) * 0.5;
    pushLine(left, top, right, top, zone, "-=", shade, size, tint, angle, originX, originY, dash);
    pushLine(right, top, right, bottom, zone, "|:", shade, size, tint, angle, originX, originY, dash);
    pushLine(right, bottom, left, bottom, zone, "-=", shade, size, tint, angle, originX, originY, dash);
    pushLine(left, bottom, left, top, zone, "|:", shade, size, tint, angle, originX, originY, dash);
    [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ].forEach(([cornerX, cornerY], cornerIndex) => {
      const rotated = angle ? rotatePoint(cornerX, cornerY, originX, originY, angle) : { x: cornerX, y: cornerY };
      push(rotated.x, rotated.y, cornerIndex % 2 === 0 ? "+" : "0", shade + 0.12, zone, size + 0.8, tint, 0.04, angle);
    });
  };

  const pushText = (
    text: string,
    x: number,
    y: number,
    charStep: number,
    zone: DesignStudioZone,
    shade = 0.74,
    size = 8.6,
    tint?: DesignTint,
    angle = 0,
  ) => {
    Array.from(text).forEach((char, index) => {
      if (char === " ") return;
      const rawX = x + index * charStep;
      const rotated = angle ? rotatePoint(rawX, y, x, y, angle) : { x: rawX, y };
      push(rotated.x, rotated.y, char, shade, zone, size, tint, 0.08, angle);
    });
  };

  const fillRect = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    zone: DesignStudioZone,
    tint: DesignTint | undefined,
    ramp = "0011##@@",
    shade = 0.46,
    size = 7.2,
    angle = 0,
    xStep = 0.048,
    yStep = 0.052,
  ) => {
    const originX = (left + right) * 0.5;
    const originY = (top + bottom) * 0.5;
    for (let y = top; y <= bottom; y += yStep / dense) {
      for (let x = left; x <= right; x += xStep / dense) {
        if ((Math.floor((x + 3) * 43) + Math.floor((y + 2) * 37)) % 4 === 0) continue;
        const rotated = angle ? rotatePoint(x, y, originX, originY, angle) : { x, y };
        push(rotated.x, rotated.y, glyph(ramp, i, x + y), shade + ((x - left) / Math.max(right - left, 0.01)) * 0.16, zone, size, tint, 0.08, angle);
      }
    }
  };

  const fillEllipse = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    zone: DesignStudioZone,
    tint: DesignTint | undefined,
    ramp = "....::::",
    shade = 0.42,
    size = 6.8,
    clip?: (x: number, y: number) => boolean,
  ) => {
    const step = 0.046 / dense;
    for (let y = cy - ry; y <= cy + ry; y += step) {
      for (let x = cx - rx; x <= cx + rx; x += step) {
        if (!ellipseContains(x, y, cx, cy, rx, ry) || (clip && !clip(x, y))) continue;
        if ((Math.floor((x + 3) * 51) + Math.floor((y + 2) * 47)) % 3 === 0) continue;
        const distance = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
        push(x, y, glyph(ramp, i, distance), shade + (1 - distance) * 0.18, zone, size, tint, 0.12);
      }
    }
  };

  const fillTriangle = (
    a: [number, number],
    b: [number, number],
    c: [number, number],
    zone: DesignStudioZone,
    tint: DesignTint | undefined,
    ramp = "0011##@@",
    shade = 0.5,
    size = 7,
  ) => {
    const minX = Math.min(a[0], b[0], c[0]);
    const maxX = Math.max(a[0], b[0], c[0]);
    const minY = Math.min(a[1], b[1], c[1]);
    const maxY = Math.max(a[1], b[1], c[1]);
    const area = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    for (let y = minY; y <= maxY; y += 0.05 / dense) {
      for (let x = minX; x <= maxX; x += 0.05 / dense) {
        const w1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / area;
        const w2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / area;
        const w3 = 1 - w1 - w2;
        if (w1 < 0 || w2 < 0 || w3 < 0) continue;
        if ((Math.floor(x * 83) + Math.floor(y * 71)) % 3 === 0) continue;
        push(x, y, glyph(ramp, i, w1 + w2), shade + w1 * 0.12, zone, size, tint, 0.1);
      }
    }
  };

  const letters: Record<string, string[]> = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    a: ["00000", "01110", "00001", "01111", "10001", "10011", "01101"],
    G: ["01110", "10000", "10000", "10111", "10001", "10001", "01110"],
    S: ["11110", "10000", "10000", "01110", "00001", "00001", "11110"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  };

  const pushBitmapText = (text: string, x: number, y: number, cell: number, zone: DesignStudioZone, tint: DesignTint | undefined, size = 9.2) => {
    let cursorX = x;
    Array.from(text).forEach((letter) => {
      if (letter === " ") {
        cursorX += cell * 4;
        return;
      }
      const rows = letters[letter];
      if (!rows) return;
      rows.forEach((row, rowIndex) => {
        Array.from(row).forEach((bit, columnIndex) => {
          if (bit !== "1") return;
          push(cursorX + columnIndex * cell, y + rowIndex * cell, glyph("@#0", i, rowIndex + columnIndex), 0.82, zone, size, tint, 0.18);
        });
      });
      cursorX += cell * 6.25;
    });
  };

  pushRect(STUDIO_BOUNDS.left, STUDIO_BOUNDS.top, STUDIO_BOUNDS.right, STUDIO_BOUNDS.bottom, "frame", 0.76, "charcoal", 7.8);
  pushRect(STUDIO_BOUNDS.left + 0.05, STUDIO_BOUNDS.top + 0.05, STUDIO_BOUNDS.right - 0.05, STUDIO_BOUNDS.bottom - 0.05, "frame", 0.48, undefined, 6.8, 0, 3);
  pushLine(STUDIO_BOUNDS.left + 0.08, -1.26, STUDIO_BOUNDS.right - 0.08, -1.26, "chrome", "-:", 0.62, 7.2, undefined, 0, 0, 0, 2);
  pushRect(-2.62, -1.48, -1.54, -1.26, "brand", 0.64, undefined, 7.2);
  pushText("GSW", -2.34, -1.41, 0.11, "brand", 0.86, 12.4, "charcoal");
  pushText("powered by Syneos Health", -2.34, -1.32, 0.035, "brand", 0.72, 6.5, "charcoal");
  pushText(">| :: O T A", -1.34, -1.38, 0.18, "toolbar", 0.74, 9.8, "charcoal");
  pushText("... [] [] []", 1.95, -1.38, 0.12, "toolbar", 0.68, 8.2, "charcoal");

  pushRect(-2.62, -1.08, -2.42, 0.12, "toolbar", 0.58, undefined, 7.2);
  ["^", "[]", "O", "/", "T", "+", "Q"].forEach((tool, index) => {
    pushText(tool, -2.55, -0.93 + index * 0.17, 0.045, "toolbar", 0.74, 9.4, "charcoal");
  });

  pushBitmapText("GSW", -2.12, -0.88, 0.065, "brand", "charcoal", 9.8);
  pushText("powered by", -2.12, -0.28, 0.055, "copy", 0.7, 8.4, "charcoal");
  pushText("Syneos Health", -1.55, -0.28, 0.056, "copy", 0.86, 8.8, "charcoal");
  pushLine(-2.12, -0.1, -1.0, -0.1, "copy", "-=", 0.58, 7.4, "charcoal", 0, 0, 0, 2);
  ["THOUGHTFUL DESIGN", "SHAPES MEANINGFUL", "EXPERIENCES."].forEach((line, index) => {
    pushText(line, -2.12, 0.1 + index * 0.13, 0.065, "copy", 0.8, 8.2, "charcoal");
  });

  pushRect(-2.12, 0.56, -1.14, 1.04, "artboard", 0.64, undefined, 7.2);
  pushBitmapText("Aa", -1.96, 0.68, 0.052, "brand", "charcoal", 8.8);
  pushText("SPACING", -2.14, 1.18, 0.052, "copy", 0.58, 7.2, "charcoal");
  pushLine(-1.78, 1.18, -1.32, 1.18, "copy", "-:", 0.42, 6.8, "charcoal", 0, 0, 0, 2);
  pushText("120", -1.24, 1.18, 0.05, "copy", 0.58, 7.2, "charcoal");
  pushRect(-2.05, 1.32, -1.03, 1.52, "artboard", 0.5, undefined, 6.8);
  pushLine(-1.95, 1.36, -1.52, 1.48, "artboard", "-:", 0.38, 6.2, "charcoal", 0, 0, 0, 2);
  pushLine(-1.52, 1.36, -1.95, 1.48, "artboard", "-:", 0.38, 6.2, "charcoal", 0, 0, 0, 2);
  pushText("layout", -0.82, 1.38, 0.05, "note", 0.72, 8.4, "charcoal", -0.06);
  pushText("ideas", -0.82, 1.51, 0.05, "note", 0.72, 8.4, "charcoal", -0.06);

  pushRect(-0.62, -1.04, 0.58, -0.18, "artboard", 0.66, undefined, 7.2);
  fillEllipse(-0.18, -0.62, 0.33, 0.33, "shape", "amber", "..::++", 0.52, 6.6);
  fillEllipse(0.18, -0.42, 0.38, 0.27, "shape", "charcoal", "0011##", 0.56, 7.4, (_x, y) => y > -0.42);
  pushLine(-0.62, -0.18, 0.58, -0.18, "artboard", "-=", 0.54, 7.2, "charcoal", 0, 0, 0, 2);
  pushText("^", 0.55, -0.08, 0.08, "cursor", 0.86, 14, "charcoal", -0.72);

  [
    { x: -0.9, tint: "amber" as const, label: "E7E1D6" },
    { x: -0.54, tint: "slate" as const, label: "B9B3A5" },
    { x: -0.18, tint: "sage" as const, label: "7DB46E" },
    { x: 0.18, tint: "charcoal" as const, label: "1C1C1C" },
  ].forEach((swatch) => {
    fillRect(swatch.x, 0.45, swatch.x + 0.28, 0.78, "swatch", swatch.tint, "0011##@@", 0.5, 7.4);
    pushText(swatch.label, swatch.x + 0.02, 0.88, 0.046, "swatch", 0.62, 6.8, "charcoal");
  });

  pushRect(0.8, -1.16, 2.02, 0.34, "artboard", 0.6, undefined, 7.2, -0.04);
  fillRect(0.88, -1.08, 1.34, -0.55, "shape", "charcoal", "##@@00", 0.74, 7.2, -0.04);
  fillRect(1.34, -1.08, 1.9, -0.6, "shape", "slate", "..::11", 0.34, 6.4, -0.04);
  fillRect(0.9, -0.52, 1.34, 0.12, "shape", "charcoal", "0011##", 0.62, 7.2, -0.04);
  fillTriangle([1.2, -0.54], [1.78, -0.34], [1.1, -0.18], "shape", "slate", "0011##", 0.42, 6.8);
  fillRect(1.24, -0.08, 1.84, 0.12, "shape", "charcoal", "|||111", 0.48, 6.8, -0.04);
  pushRect(1.18, -1.2, 1.68, -1.02, "note", 0.58, "amber", 6.6, 0.06, 2);
  fillRect(1.2, -1.17, 1.66, -1.05, "note", "amber", "....::", 0.36, 5.8, 0.06);
  pushRect(1.78, -0.58, 2.33, 0.16, "note", 0.64, undefined, 7.2, 0.1, 2);
  pushText("keep", 1.9, -0.34, 0.06, "note", 0.78, 9.2, "charcoal", 0.1);
  pushText("it", 1.92, -0.18, 0.06, "note", 0.78, 9.2, "charcoal", 0.1);
  pushText("simple.", 1.92, -0.02, 0.06, "note", 0.78, 9.2, "charcoal", 0.1);

  pushRect(1.25, 0.56, 2.45, 1.42, "panel", 0.68, undefined, 7.2);
  pushText("LAYERS", 1.34, 0.68, 0.06, "panel", 0.78, 8.2, "charcoal");
  pushText("+", 2.33, 0.68, 0.06, "panel", 0.84, 9.2, "charcoal");
  pushLine(1.25, 0.78, 2.45, 0.78, "panel", "-:", 0.48, 6.8, "charcoal", 0, 0, 0, 2);
  ["Header", "Image", "Vector", "Typography", "Shapes", "Background"].forEach((row, index) => {
    const y = 0.9 + index * 0.12;
    pushText("<> []", 1.34, y, 0.052, "panel", 0.52, 6.8, "charcoal");
    pushText(row, 1.58, y, 0.045, "panel", 0.7, 6.8, "charcoal");
    pushText("::", 2.3, y, 0.035, "panel", 0.58, 6.8, "charcoal");
  });

  pushRect(0.2, 0.96, 0.85, 1.52, "artboard", 0.64, undefined, 7.2);
  pushLine(0.53, 0.96, 0.86, 1.18, "artboard", "-:", 0.5, 6.6, "charcoal", 0, 0, 0, 2);
  pushLine(0.53, 0.96, 0.22, 1.18, "artboard", "-:", 0.5, 6.6, "charcoal", 0, 0, 0, 2);
  pushBitmapText("A", 0.46, 1.18, 0.032, "brand", "charcoal", 7.2);
  pushText("CONCEPT", 0.68, 1.2, 0.05, "copy", 0.58, 7.2, "charcoal", -1.55);
  pushRect(0.98, 0.86, 1.72, 1.52, "artboard", 0.48, undefined, 6.8, 0.1, 2);
  fillRect(1.18, 1.06, 1.5, 1.28, "shape", "charcoal", "0011##", 0.56, 6.2, 0.1);
  fillRect(1.3, 1.0, 1.55, 1.34, "shape", "amber", "..::++", 0.34, 5.8, 0.1);
  pushText("concept", 1.03, 1.42, 0.04, "copy", 0.48, 5.8, "charcoal", 0.1);

  const dustCount = Math.round(96 * dense);
  for (let dot = 0; dot < dustCount; dot += 1) {
    const angle = dot * 2.399963229728653;
    const radius = Math.sqrt((dot + 1) / dustCount);
    const sidePull = dot % 2 === 0 ? STUDIO_BOUNDS.right + radius * 0.52 : STUDIO_BOUNDS.left - radius * 0.52;
    const x = dot % 5 === 0 ? -2.7 + radius * 5.4 : sidePull;
    const y = -1.55 + ((dot * 0.61803398875) % 1) * 3.1;
    const topBottomY = dot % 7 === 0 ? (dot % 14 === 0 ? STUDIO_BOUNDS.top - radius * 0.35 : STUDIO_BOUNDS.bottom + radius * 0.35) : y;
    push(x, topBottomY, glyph("..,:+0", dot, angle), 0.08 + (dot % 7) * 0.018, "dust", 6.4, dot % 9 === 0 ? "amber" : undefined, -0.16);
  }

  return points;
}

function buildDesignPalettePoints(variant: AsciiExperienceVariant, dense: number, resourceBias: number): Point[] {
  const points: Point[] = [];
  let i = 0;
  const step = (variant === "article" ? 0.106 : 0.118) / dense;
  const edgeProbe = step * 1.5;

  const shell = (x: number, y: number) => {
    const plate =
      ellipseContains(x, y, -0.12, 0.04, 1.28, 1) ||
      ellipseContains(x, y, 0.64, 0.02, 0.64, 0.52);
    const lowerTrim = ellipseContains(x, y, 0.06, 1.1, 1.08, 0.28);
    const thumbHole = ellipseContains(x, y, 0.52, 0.46, 0.28, 0.22);
    const thumbBite = ellipseContains(x, y, 0.96, 0.34, 0.28, 0.16);
    return plate && !lowerTrim && !thumbHole && !thumbBite;
  };

  const cavities = [
    { cx: 0.52, cy: 0.46, rx: 0.28, ry: 0.22 },
    { cx: 0.96, cy: 0.34, rx: 0.28, ry: 0.16 },
  ];
  const insideCavity = (x: number, y: number) => cavities.some((cavity) => ellipseContains(x, y, cavity.cx, cavity.cy, cavity.rx, cavity.ry));

  for (let y = -1.02; y <= 1.08; y += step) {
    for (let x = -1.46; x <= 1.24; x += step) {
      if (!shell(x, y) || insideCavity(x, y)) continue;
      const nearEdge =
        !shell(x + edgeProbe, y) ||
        !shell(x - edgeProbe, y) ||
        !shell(x, y + edgeProbe) ||
        !shell(x, y - edgeProbe) ||
        insideCavity(x + edgeProbe * 0.8, y) ||
        insideCavity(x - edgeProbe * 0.8, y) ||
        insideCavity(x, y + edgeProbe * 0.8) ||
        insideCavity(x, y - edgeProbe * 0.8);
      const scanline = Math.abs(Math.sin((x * 3.5 + y * 1.25) * Math.PI)) > 0.965;
      const column = Math.abs(Math.sin((x + 1.72) * Math.PI * (4.8 + resourceBias * 1.4))) > 0.975;
      const row = Math.abs(Math.sin((y + 1.12) * Math.PI * 4.4)) > 0.978;
      if (!nearEdge && !scanline && !column && !row) continue;

      const contour = 1 - Math.min(1, Math.sqrt(((x + 0.02) / 1.38) ** 2 + ((y - 0.02) / 1.04) ** 2));
      const z = Math.sin((x + 0.08) * 2.2) * 0.1 + Math.cos((y - 0.06) * 3.8) * 0.05 + contour * 0.08;
      const shade = nearEdge ? 0.82 : 0.46 + contour * 0.26;
      points.push({
        family: "design-brain",
        x,
        y,
        z,
        char: glyph(DESIGN_RAMP, i++, x * 11 + y * 7),
        shade,
      });
    }
  }

  const wells = [
    { x: -1.02, y: 0.12, rx: 0.22, ry: 0.18, tint: "slate" as const, filled: true },
    { x: -0.62, y: -0.34, rx: 0.23, ry: 0.19, tint: "amber" as const, filled: true },
    { x: 0.02, y: -0.54, rx: 0.2, ry: 0.16, tint: "vermillion" as const, filled: true },
    { x: 0.62, y: -0.38, rx: 0.21, ry: 0.18, tint: "blue" as const, filled: true },
    { x: 0.96, y: 0.02, rx: 0.18, ry: 0.17, tint: "sage" as const, filled: true },
    { x: -0.78, y: 0.58, rx: 0.25, ry: 0.2, tint: "amber" as const, filled: true },
    { x: -0.1, y: 0.88, rx: 0.18, ry: 0.16, tint: "charcoal" as const, filled: true },
    { x: 0.08, y: 0.28, rx: 0.16, ry: 0.12, tint: "slate" as const, filled: false },
    { x: -0.12, y: 0.64, rx: 0.18, ry: 0.14, tint: "slate" as const, filled: false },
    { x: 0.52, y: 0.46, rx: 0.3, ry: 0.24, tint: "slate" as const, filled: false },
  ];

  for (const [wellIndex, well] of wells.entries()) {
    const rimSteps = Math.round((well.filled ? 26 : 34) * dense);
    for (let stepIndex = 0; stepIndex < rimSteps; stepIndex += 1) {
      const angle = (stepIndex / rimSteps) * Math.PI * 2;
      const x = well.x + Math.cos(angle) * well.rx;
      const y = well.y + Math.sin(angle) * well.ry;
      if (!shell(x, y) && well.filled) continue;
      points.push({
        family: "design-brain",
        x,
        y,
        z: 0.14 + Math.sin(angle * 2 + wellIndex) * 0.03,
        char: glyph("00OQ#", i++, angle + wellIndex),
        shade: well.filled ? 0.74 : 0.68,
        tint: "slate",
      });
    }
  }

  const clusters = wells.filter((well) => well.filled);
  for (const [clusterIndex, cluster] of clusters.entries()) {
    const xStep = step * 0.78;
    const yStep = step * 0.72;
    for (let y = cluster.y - cluster.ry; y <= cluster.y + cluster.ry; y += yStep) {
      for (let x = cluster.x - cluster.rx; x <= cluster.x + cluster.rx; x += xStep) {
        if (!ellipseContains(x, y, cluster.x, cluster.y, cluster.rx * 0.86, cluster.ry * 0.86)) continue;
        if (!shell(x, y) || insideCavity(x, y)) continue;
        const halo = 1 - Math.min(1, Math.sqrt(((x - cluster.x) / cluster.rx) ** 2 + ((y - cluster.y) / cluster.ry) ** 2));
        points.push({
          family: "design-node",
          x,
          y,
          z: 0.14 + halo * 0.24 + Math.sin(clusterIndex * 0.8 + x * 5.2) * 0.02,
          char: glyph("000OOQ#", i++, clusterIndex + halo * 10),
          shade: 0.68 + halo * 0.24,
          tint: cluster.tint,
          pulse: clusterIndex * 0.9 + halo * 2.4,
        });
      }
    }
  }

  if (variant !== "article") {
    const accentLoops = 3 + Math.round(resourceBias * 3);
    for (let loop = 0; loop < accentLoops; loop += 1) {
      const steps = Math.round(38 * dense);
      for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
        const progress = stepIndex / steps;
        const angle = progress * Math.PI * 2 + loop * 1.9;
        const x = Math.cos(angle) * (1.5 + loop * 0.08);
        const y = Math.sin(angle) * (1.18 + loop * 0.05);
        if (shell(x, y)) continue;
        points.push({
          family: "design-brain",
          x,
          y,
          z: Math.sin(angle * 1.6 + loop) * 0.08,
          char: glyph("..++oo", i++, angle),
          shade: 0.22 + progress * 0.12,
          tint: loop % 2 === 0 ? "amber" : undefined,
        });
      }
    }
  }

  return points;
}

function buildPoints(mode: AsciiExperienceMode, variant: AsciiExperienceVariant, surface?: ArticleCategory): Point[] {
  const points: Point[] = [];
  const dense = variant === "collection" ? 1.72 : variant === "archive" ? 1.26 : mode === "Design" ? 0.62 : 1.08;
  const resourceBias = variant === "collection" && surface === "Resources" ? 0.18 : 0;

  if (mode === "Development") {
    if (variant === "article") {
      points.push(...buildDevelopmentTerminalPoints(dense));
    } else {
      let i = 0;
      const latSteps = Math.round((18 + resourceBias * 18) * dense);
      const lonSteps = Math.round((42 + resourceBias * 20) * dense);
      for (let latIndex = 0; latIndex <= latSteps; latIndex += 1) {
        const lat = -Math.PI / 2 + (latIndex / latSteps) * Math.PI;
        for (let lonIndex = 0; lonIndex < lonSteps; lonIndex += 1) {
          if ((latIndex + lonIndex) % 2 === 0) continue;
          const lon = (lonIndex / lonSteps) * Math.PI * 2;
          points.push({ family: "dev-sphere", lat, lon, char: glyph(DEV_RAMP, i++, latIndex), shade: 0.5 + Math.cos(lat) * 0.5 });
        }
      }
      [1.35, 1.58, 1.85, 2.18].forEach((radius, ringIndex) => {
        const steps = Math.round((96 + ringIndex * 26) * dense);
        for (let angleIndex = 0; angleIndex < steps; angleIndex += 1) {
          const angle = (angleIndex / steps) * Math.PI * 2;
          points.push({ family: "dev-ring", angle, radius, char: glyph(DEV_RAMP, i++, radius), shade: 0.7 + ringIndex * 0.1 });
        }
      });
      const cometLanes = 4;
      for (let lane = 0; lane < cometLanes; lane += 1) {
        const steps = Math.round(34 * dense);
        for (let step = 0; step < steps; step += 1) {
          points.push({
            family: "dev-comet",
            angle: (step / steps) * Math.PI * 2 + lane * 0.85,
            radius: 2.05 + lane * 0.16 + resourceBias * 0.55,
            char: glyph(DEV_RAMP, i++, lane),
            shade: 0.62 + step / steps * 0.34,
            lane,
          });
        }
      }
    }
  }

  if (mode === "Design") {
    if (variant === "article") {
      points.push(...buildDesignStudioPoints(dense));
    } else {
      points.push(...buildDesignPalettePoints(variant, dense, resourceBias));
    }
  }

  if (surface && mode !== "Archive" && variant === "collection") {
    const ramp = mode === "Design" ? DESIGN_RAMP : DEV_RAMP;
    let i = points.length;
    const surfaceDense = variant === "collection" ? dense : dense * 0.62;

    if (surface === "News") {
      for (let lane = 0; lane < 6; lane += 1) {
        const steps = Math.round((34 + lane * 8) * surfaceDense);
        const span = Math.PI * (0.42 + lane * 0.06);
        const base = lane * 0.98 - Math.PI * 0.72;
        for (let step = 0; step < steps; step += 1) {
          const progress = step / steps;
          points.push({
            family: "news-signal",
            angle: base + progress * span,
            radius: 1.22 + lane * 0.22,
            char: glyph(ramp, i++, lane + progress),
            shade: 0.42 + progress * 0.36,
            lane,
          });
        }
      }
    } else {
      for (let lane = 0; lane < 4; lane += 1) {
        const steps = Math.round((46 + lane * 8) * surfaceDense);
        for (const side of [0, 1, 2, 3] as const) {
          for (let step = 0; step < steps; step += 1) {
            if ((step + side + lane) % 3 === 0) continue;
            const progress = step / steps;
            points.push({
              family: "resource-frame",
              side,
              progress,
              char: glyph(ramp, i++, side + lane),
              shade: 0.34 + lane * 0.08 + progress * 0.16,
              lane,
            });
          }
        }
      }
    }
  }

  if (mode === "Archive") {
    let i = 0;
    const slabLayers = variant === "archive" ? 8 : 5;
    for (let layer = 0; layer < slabLayers; layer += 1) {
      const steps = Math.round((34 + layer * 3) * dense);
      for (const side of [0, 1, 2, 3] as const) {
        for (let step = 0; step < steps; step += 1) {
          if ((step + layer + side) % 3 === 0) continue;
          points.push({
            family: "archive-slab",
            side,
            progress: step / steps,
            layer,
            char: glyph(ARCHIVE_RAMP, i++, layer + side),
            shade: 0.44 + layer * 0.045 + step / steps * 0.18,
          });
        }
      }
    }
  }

  if (!((mode === "Development" || mode === "Design") && variant === "article")) {
    const dustCount = variant === "collection" ? 160 : variant === "archive" ? 120 : 180;
    for (let i = 0; i < dustCount; i += 1) {
      const angle = i * 2.399963229728653;
      const radius = Math.sqrt((i + 1) / dustCount) * 2.45;
      const ramp = mode === "Design" ? DESIGN_RAMP : mode === "Archive" ? ARCHIVE_RAMP : DEV_RAMP;
      points.push({
        family: "dust",
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.72,
        z: Math.sin(i * 1.7) * 0.18,
        char: glyph(ramp, i, radius),
        shade: 0.08 + (i % 7) * 0.025,
      });
    }
  }

  return points;
}

function rotateY(x: number, z: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - z * sin, z: x * sin + z * cos };
}

function rotateX(y: number, z: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { y: y * cos - z * sin, z: y * sin + z * cos };
}

function projectArticleTerminalPoint(x: number, y: number, scale: number, cx: number, cy: number, z = 0) {
  const depth = 1 / (2.65 - z * 0.58);
  return {
    sx: cx + x * scale * depth * 1.42,
    sy: cy + y * scale * depth * 1.24,
  };
}

function terminalRect(left: number, top: number, right: number, bottom: number, scale: number, cx: number, cy: number) {
  const start = projectArticleTerminalPoint(left, top, scale, cx, cy);
  const end = projectArticleTerminalPoint(right, bottom, scale, cx, cy);
  return {
    x: start.sx,
    y: start.sy,
    width: end.sx - start.sx,
    height: end.sy - start.sy,
  };
}

function projectedRect(left: number, top: number, right: number, bottom: number, scale: number, cx: number, cy: number) {
  return terminalRect(left, top, right, bottom, scale, cx, cy);
}

function hslLightness(value: string, fallback = 96) {
  const parts = value.trim().match(/-?\d+(?:\.\d+)?%?/g);
  if (!parts || parts.length < 3) return fallback;
  const lightness = Number.parseFloat(parts[2]);
  return Number.isFinite(lightness) ? lightness : fallback;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string | CanvasGradient | CanvasPattern) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, strokeStyle: string) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

function drawRotatedCard(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }, angle: number, draw: (card: { x: number; y: number; width: number; height: number }) => void) {
  ctx.save();
  ctx.translate(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  ctx.rotate(angle);
  draw({ x: -rect.width * 0.5, y: -rect.height * 0.5, width: rect.width, height: rect.height });
  ctx.restore();
}

function drawDevelopmentTerminalShell(
  ctx: CanvasRenderingContext2D,
  scale: number,
  cx: number,
  cy: number,
  neon: string,
  isDark: boolean,
) {
  const bounds = TERMINAL_BOUNDS;
  const outer = terminalRect(bounds.left, bounds.top, bounds.right, bounds.bottom, scale, cx, cy);
  const chrome = terminalRect(bounds.left, bounds.top, bounds.right, bounds.chromeBottom, scale, cx, cy);
  const screen = terminalRect(bounds.screenLeft, bounds.screenTop, bounds.screenRight, bounds.screenBottom, scale, cx, cy);
  const frameFill = isDark ? "rgba(18, 17, 14, 0.82)" : "rgba(246, 239, 221, 0.94)";
  const chromeFill = isDark ? "rgba(27, 25, 20, 0.9)" : "rgba(249, 243, 228, 0.96)";
  const screenFill = isDark ? "rgba(5, 5, 5, 0.92)" : "rgba(13, 12, 9, 0.9)";
  const ink = isDark ? "rgba(245, 237, 214, 0.66)" : "rgba(61, 36, 0, 0.54)";
  const faintInk = isDark ? "rgba(245, 237, 214, 0.24)" : "rgba(61, 36, 0, 0.28)";
  const screenStroke = isDark ? "rgba(245, 237, 214, 0.3)" : "rgba(61, 36, 0, 0.38)";
  const buttonInk = isDark ? "rgba(245, 237, 214, 0.7)" : "rgba(61, 36, 0, 0.48)";

  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 18;
  ctx.fillStyle = frameFill;
  ctx.fillRect(outer.x, outer.y, outer.width, outer.height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(outer.x - 5, outer.y - 5, outer.width + 10, outer.height + 10);
  ctx.setLineDash([]);
  ctx.strokeRect(outer.x, outer.y, outer.width, outer.height);

  ctx.fillStyle = chromeFill;
  ctx.fillRect(chrome.x, chrome.y, chrome.width, chrome.height);
  ctx.strokeStyle = faintInk;
  ctx.strokeRect(chrome.x, chrome.y + chrome.height, chrome.width, 0.5);

  ctx.fillStyle = screenFill;
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  ctx.strokeStyle = screenStroke;
  ctx.strokeRect(screen.x, screen.y, screen.width, screen.height);

  const buttonY = chrome.y + chrome.height * 0.5;
  [0, 1, 2].forEach((button) => {
    ctx.beginPath();
    ctx.fillStyle = button === 0 ? "rgba(214, 152, 53, 0.92)" : buttonInk;
    ctx.arc(chrome.x + 20 + button * 17, buttonY, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDesignStudioField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  cx: number,
  cy: number,
  isDark: boolean,
) {
  const rectFor = (left: number, top: number, right: number, bottom: number) => projectedRect(left, top, right, bottom, scale, cx, cy);
  const studioBounds = rectFor(STUDIO_BOUNDS.left, STUDIO_BOUNDS.top, STUDIO_BOUNDS.right, STUDIO_BOUNDS.bottom);
  const workArea = rectFor(-2.42, -1.25, 2.56, 1.4);
  const topBar = rectFor(STUDIO_BOUNDS.left + 0.08, STUDIO_BOUNDS.top + 0.06, STUDIO_BOUNDS.right - 0.08, -1.25);
  const sideRail = rectFor(-2.71, -1.08, -2.42, 0.16);
  const brandCard = rectFor(-2.6, -1.48, -1.54, -1.25);
  const layersPanel = rectFor(1.25, 0.56, 2.45, 1.42);
  const largePhoto = rectFor(0.78, -1.17, 2.05, 0.34);
  const stickyNote = rectFor(1.78, -0.58, 2.33, 0.16);
  const conceptCard = rectFor(0.98, 0.86, 1.72, 1.52);
  const halo = isDark ? "rgba(255, 225, 90, 0.12)" : "rgba(214, 152, 53, 0.1)";
  const haze = isDark ? "rgba(245, 237, 214, 0.05)" : "rgba(236, 224, 194, 0.06)";
  const edge = isDark ? "rgba(245, 237, 214, 0.22)" : "rgba(61, 36, 0, 0.2)";
  const corner = isDark ? "rgba(245, 237, 214, 0.36)" : "rgba(61, 36, 0, 0.3)";
  const shellFill = isDark ? "rgba(13, 13, 12, 0.94)" : "rgba(22, 22, 20, 0.94)";
  const shellStroke = isDark ? "rgba(245, 237, 214, 0.18)" : "rgba(0, 0, 0, 0.28)";
  const paperFill = isDark ? "rgba(235, 226, 207, 0.96)" : "rgba(246, 239, 221, 0.96)";
  const paperGrid = "rgba(61, 36, 0, 0.07)";

  ctx.save();
  const glow = ctx.createRadialGradient(cx - scale * 0.28, cy - scale * 0.38, scale * 0.12, cx, cy, scale * 2.18);
  glow.addColorStop(0, halo);
  glow.addColorStop(0.44, haze);
  glow.addColorStop(1, isDark ? "rgba(245, 237, 214, 0)" : "rgba(236, 224, 194, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.shadowColor = isDark ? "rgba(255, 225, 90, 0.2)" : "rgba(214, 152, 53, 0.18)";
  ctx.shadowBlur = 20;
  fillRoundedRect(ctx, studioBounds.x, studioBounds.y, studioBounds.width, studioBounds.height, 18, shellFill);
  ctx.shadowBlur = 0;
  strokeRoundedRect(ctx, studioBounds.x, studioBounds.y, studioBounds.width, studioBounds.height, 18, shellStroke);

  const topGradient = ctx.createLinearGradient(topBar.x, topBar.y, topBar.x, topBar.y + topBar.height);
  topGradient.addColorStop(0, "rgba(31, 31, 29, 0.96)");
  topGradient.addColorStop(1, "rgba(10, 10, 10, 0.96)");
  fillRoundedRect(ctx, topBar.x, topBar.y, topBar.width, topBar.height, 10, topGradient);

  fillRoundedRect(ctx, workArea.x, workArea.y, workArea.width, workArea.height, 5, paperFill);
  ctx.strokeStyle = "rgba(61, 36, 0, 0.18)";
  ctx.strokeRect(workArea.x, workArea.y, workArea.width, workArea.height);

  ctx.beginPath();
  ctx.rect(workArea.x, workArea.y, workArea.width, workArea.height);
  ctx.clip();
  ctx.strokeStyle = paperGrid;
  ctx.lineWidth = 1;
  const gridStep = Math.max(8, workArea.width / 44);
  for (let x = workArea.x; x <= workArea.x + workArea.width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, workArea.y);
    ctx.lineTo(x, workArea.y + workArea.height);
    ctx.stroke();
  }
  for (let y = workArea.y; y <= workArea.y + workArea.height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(workArea.x, y);
    ctx.lineTo(workArea.x + workArea.width, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();

  ctx.shadowColor = "rgba(0, 0, 0, 0.26)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  fillRoundedRect(ctx, brandCard.x, brandCard.y, brandCard.width, brandCard.height, 4, "rgba(242, 233, 215, 0.96)");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  strokeRoundedRect(ctx, brandCard.x, brandCard.y, brandCard.width, brandCard.height, 4, "rgba(61, 36, 0, 0.24)");
  ctx.beginPath();
  ctx.fillStyle = "rgba(28, 28, 28, 0.9)";
  ctx.moveTo(brandCard.x + brandCard.width * 0.14, brandCard.y + brandCard.height * 0.5);
  ctx.lineTo(brandCard.x + brandCard.width * 0.18, brandCard.y + brandCard.height * 0.28);
  ctx.lineTo(brandCard.x + brandCard.width * 0.23, brandCard.y + brandCard.height * 0.5);
  ctx.lineTo(brandCard.x + brandCard.width * 0.18, brandCard.y + brandCard.height * 0.74);
  ctx.closePath();
  ctx.fill();

  fillRoundedRect(ctx, sideRail.x, sideRail.y, sideRail.width, sideRail.height, 7, "rgba(12, 12, 12, 0.9)");
  strokeRoundedRect(ctx, sideRail.x, sideRail.y, sideRail.width, sideRail.height, 7, "rgba(245, 237, 214, 0.22)");
  const toolStep = sideRail.height / 7;
  for (let i = 0; i < 7; i += 1) {
    const y = sideRail.y + i * toolStep + toolStep * 0.5;
    if (i === 0) fillRoundedRect(ctx, sideRail.x + 5, y - toolStep * 0.32, sideRail.width - 10, toolStep * 0.64, 4, "rgba(245, 237, 214, 0.08)");
    ctx.strokeStyle = "rgba(245, 237, 214, 0.2)";
    ctx.beginPath();
    ctx.moveTo(sideRail.x + sideRail.width * 0.3, y);
    ctx.lineTo(sideRail.x + sideRail.width * 0.7, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(245, 237, 214, 0.34)";
  for (let i = 0; i < 9; i += 1) {
    const x = topBar.x + topBar.width * (0.24 + i * 0.043);
    ctx.beginPath();
    if (i === 1) {
      ctx.moveTo(x, topBar.y + topBar.height * 0.28);
      ctx.lineTo(x, topBar.y + topBar.height * 0.72);
    } else {
      ctx.arc(x, topBar.y + topBar.height * 0.5, i % 3 === 0 ? 5 : 2.4, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(245, 237, 214, 0.42)";
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      ctx.beginPath();
      ctx.arc(topBar.x + topBar.width * 0.82 + column * 16, topBar.y + topBar.height * 0.36 + row * 10, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const centralSelection = rectFor(-0.62, -1.04, 0.58, -0.18);
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = "rgba(28, 28, 28, 0.58)";
  ctx.strokeRect(centralSelection.x, centralSelection.y, centralSelection.width, centralSelection.height);
  ctx.setLineDash([]);
  [
    [centralSelection.x, centralSelection.y],
    [centralSelection.x + centralSelection.width, centralSelection.y],
    [centralSelection.x, centralSelection.y + centralSelection.height],
    [centralSelection.x + centralSelection.width, centralSelection.y + centralSelection.height],
    [centralSelection.x + centralSelection.width * 0.5, centralSelection.y],
    [centralSelection.x + centralSelection.width * 0.5, centralSelection.y + centralSelection.height],
  ].forEach(([x, y]) => {
    ctx.fillStyle = paperFill;
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.strokeStyle = "rgba(28, 28, 28, 0.72)";
    ctx.strokeRect(x - 3, y - 3, 6, 6);
  });

  [
    { x: -0.9, color: "#e7e1d6" },
    { x: -0.54, color: "#b9b3a5" },
    { x: -0.18, color: "#7d846e" },
    { x: 0.18, color: "#1c1c1c" },
  ].forEach((swatch) => {
    const swatchRect = rectFor(swatch.x, 0.45, swatch.x + 0.28, 0.78);
    ctx.fillStyle = swatch.color;
    ctx.fillRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
    ctx.strokeStyle = "rgba(61, 36, 0, 0.16)";
    ctx.strokeRect(swatchRect.x, swatchRect.y, swatchRect.width, swatchRect.height);
  });

  drawRotatedCard(ctx, largePhoto, -0.04, (card) => {
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    fillRoundedRect(ctx, card.x, card.y, card.width, card.height, 2, "rgba(247, 243, 234, 0.96)");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const photo = { x: card.x + card.width * 0.08, y: card.y + card.height * 0.1, width: card.width * 0.84, height: card.height * 0.76 };
    ctx.fillStyle = "rgba(22, 22, 20, 0.96)";
    ctx.fillRect(photo.x, photo.y, photo.width * 0.4, photo.height);
    ctx.fillStyle = "rgba(188, 182, 166, 0.82)";
    ctx.fillRect(photo.x + photo.width * 0.4, photo.y, photo.width * 0.6, photo.height);
    ctx.fillStyle = "rgba(44, 36, 28, 0.86)";
    ctx.beginPath();
    ctx.moveTo(photo.x + photo.width * 0.32, photo.y + photo.height * 0.5);
    ctx.lineTo(photo.x + photo.width * 0.95, photo.y + photo.height * 0.7);
    ctx.lineTo(photo.x + photo.width * 0.44, photo.y + photo.height * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(222, 205, 170, 0.86)";
    ctx.fillRect(card.x + card.width * 0.35, card.y - card.height * 0.04, card.width * 0.36, card.height * 0.1);
  });

  drawRotatedCard(ctx, stickyNote, 0.1, (card) => {
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    fillRoundedRect(ctx, card.x, card.y, card.width, card.height, 3, "rgba(16, 16, 15, 0.94)");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(245, 237, 214, 0.12)";
    ctx.strokeRect(card.x, card.y, card.width, card.height);
    ctx.fillStyle = "rgba(222, 205, 170, 0.78)";
    ctx.fillRect(card.x + card.width * 0.6, card.y - card.height * 0.05, card.width * 0.2, card.height * 0.12);
  });

  drawRotatedCard(ctx, conceptCard, 0.1, (card) => {
    ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    fillRoundedRect(ctx, card.x, card.y, card.width, card.height, 2, "rgba(242, 236, 223, 0.94)");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(28, 28, 28, 0.82)";
    ctx.beginPath();
    ctx.ellipse(card.x + card.width * 0.5, card.y + card.height * 0.34, card.width * 0.22, card.height * 0.12, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(172, 112, 22, 0.42)";
    ctx.beginPath();
    ctx.ellipse(card.x + card.width * 0.55, card.y + card.height * 0.38, card.width * 0.2, card.height * 0.09, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  fillRoundedRect(ctx, layersPanel.x, layersPanel.y, layersPanel.width, layersPanel.height, 6, "rgba(15, 15, 14, 0.94)");
  strokeRoundedRect(ctx, layersPanel.x, layersPanel.y, layersPanel.width, layersPanel.height, 6, "rgba(245, 237, 214, 0.18)");
  ctx.strokeStyle = "rgba(245, 237, 214, 0.1)";
  for (let row = 1; row < 7; row += 1) {
    const y = layersPanel.y + row * (layersPanel.height / 7);
    ctx.beginPath();
    ctx.moveTo(layersPanel.x, y);
    ctx.lineTo(layersPanel.x + layersPanel.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = edge;
  ctx.setLineDash([2, 7]);
  ctx.strokeRect(studioBounds.x - 8, studioBounds.y - 8, studioBounds.width + 16, studioBounds.height + 16);
  ctx.setLineDash([]);

  ctx.strokeStyle = corner;
  const tick = 18;
  [
    [studioBounds.x - 12, studioBounds.y - 12, tick, 0],
    [studioBounds.x - 12, studioBounds.y - 12, 0, tick],
    [studioBounds.x + studioBounds.width + 12, studioBounds.y - 12, -tick, 0],
    [studioBounds.x + studioBounds.width + 12, studioBounds.y - 12, 0, tick],
    [studioBounds.x - 12, studioBounds.y + studioBounds.height + 12, tick, 0],
    [studioBounds.x - 12, studioBounds.y + studioBounds.height + 12, 0, -tick],
    [studioBounds.x + studioBounds.width + 12, studioBounds.y + studioBounds.height + 12, -tick, 0],
    [studioBounds.x + studioBounds.width + 12, studioBounds.y + studioBounds.height + 12, 0, -tick],
  ].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  });
  ctx.restore();
}

function modeLabel(mode: AsciiExperienceMode, variant: AsciiExperienceVariant, surface?: ArticleCategory) {
  if (mode === "Archive") return "archive.vault";
  const prefix = surface ? `${surface.toLowerCase()} ` : "";
  if (mode === "Development") return variant === "article" ? "development terminal" : `${prefix}development orbit field`;
  return variant === "article" ? "design studio" : `${prefix}design cortex field`;
}

export function AsciiExperience({ mode, variant = "collection", surface }: AsciiExperienceProps) {
  const showChrome = variant !== "article";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastDrawRef = useRef(0);
  const pointsRef = useRef<Point[]>([]);
  const backdropRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const sizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const mouseRef = useRef({ x: -9999, y: -9999, active: 0 });
  const burstRef = useRef({ x: -9999, y: -9999, started: 0, active: 0 });

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flatArticle = variant === "article" && (mode === "Design" || mode === "Development");
    const targetFrameMs = flatArticle ? 33 : variant === "article" ? 50 : 16;
    if (lastDrawRef.current && time - lastDrawRef.current < targetFrameMs) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }
    lastDrawRef.current = time;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const css = getComputedStyle(document.documentElement);
    const neonRgb = css.getPropertyValue("--neon-rgb").trim() || "61,36,0";
    const neon = css.getPropertyValue("--neon").trim() || "#3D2400";
    const foreground = css.getPropertyValue("--foreground").trim() || "0 0% 6%";
    const background = css.getPropertyValue("--background").trim() || "0 0% 96%";
    const isDark = hslLightness(background) < 45;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const t = time * 0.001;
    const burstAge = burstRef.current.active ? t - burstRef.current.started : 99;
    const burstPower = burstAge < 1.15 ? 1 - burstAge / 1.15 : 0;
    if (burstPower <= 0) burstRef.current.active = 0;
    const interactionPower = mouseRef.current.active;
    const interactionActive = interactionPower > 0.015;
    mouseRef.current.active *= flatArticle ? 0.955 : 0.965;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = `800 ${mode === "Development" && variant === "article" ? 10.6 : variant === "article" ? 8.8 : variant === "collection" ? 10.5 : 10}px "JetBrains Mono", "SFMono-Regular", Menlo, monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const articleScale = mode === "Design" ? 0.36 : 0.33;
    const scale = Math.min(width, height) * (variant === "article" ? articleScale : variant === "archive" ? 0.36 : 0.42);
    const cx = width * 0.5;
    const cy = height * (variant === "collection" ? 0.47 : 0.52);
    const archiveInteractionOnly = mode === "Archive";
    const hoverSpin = archiveInteractionOnly ? 0 : (mx / Math.max(width, 1) - 0.5) * mouseRef.current.active * 0.58;
    const hoverTilt = archiveInteractionOnly ? 0 : (my / Math.max(height, 1) - 0.5) * mouseRef.current.active * 0.18;

    if (flatArticle) {
      const backdropKey = `${mode}:${width}:${height}:${dpr}:${scale.toFixed(3)}:${isDark}:${neon}`;
      if (backdropRef.current?.key !== backdropKey) {
        const backdrop = document.createElement("canvas");
        backdrop.width = Math.floor(width * dpr);
        backdrop.height = Math.floor(height * dpr);
        const backdropCtx = backdrop.getContext("2d");
        if (backdropCtx) {
          backdropCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          backdropCtx.clearRect(0, 0, width, height);
          backdropCtx.imageSmoothingEnabled = false;
          if (mode === "Development") {
            drawDevelopmentTerminalShell(backdropCtx, scale, cx, cy, neon, isDark);
          } else {
            drawDesignStudioField(backdropCtx, width, height, scale, cx, cy, isDark);
          }
        }
        backdropRef.current = { key: backdropKey, canvas: backdrop };
      }
      ctx.drawImage(backdropRef.current.canvas, 0, 0, width, height);
    }

    const projected = pointsRef.current.map((point, index) => {
      let x = 0;
      let y = 0;
      let z = 0;
      let shade = point.shade;
      let angle = 0;
      let size: number | undefined;

      if (point.family === "dev-terminal") {
        x = point.x;
        y = point.y;
        z = point.z;
        if (point.zone === "cursor") shade = 0.78 + Math.abs(Math.sin(t * 3.2)) * 0.22;
      } else if (point.family === "design-studio") {
        x = point.x;
        y = point.y;
        z = point.z;
        angle = point.tilt;
        size = point.size;
      } else if (point.family === "dev-sphere") {
        const spin = t * 0.46 + hoverSpin + (variant === "article" ? 0.5 : 0);
        x = Math.cos(point.lat) * Math.cos(point.lon);
        y = Math.sin(point.lat) * 0.92;
        z = Math.cos(point.lat) * Math.sin(point.lon);
        const ry = rotateY(x, z, spin);
        const rx = rotateX(y, ry.z, -0.22 + hoverTilt);
        x = ry.x; y = rx.y; z = rx.z;
      } else if (point.family === "dev-ring") {
        const spin = t * 0.72 + hoverSpin;
        x = Math.cos(point.angle + spin) * point.radius;
        z = Math.sin(point.angle + spin) * point.radius * 0.48;
        y = Math.sin(point.angle + spin) * point.radius * (0.19 + hoverTilt * 0.08);
        const rx = rotateX(y, z, -0.34);
        y = rx.y; z = rx.z;
      } else if (point.family === "dev-comet") {
        const spin = t * (1.15 + point.lane * 0.11) + hoverSpin;
        const angle = point.angle + spin;
        const radius = point.radius + Math.sin(t * 2 + point.lane) * 0.05;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius * (0.18 + point.lane * 0.014);
        z = Math.sin(angle) * radius * 0.46 + Math.cos(angle * 2 + t) * 0.1;
      } else if (point.family === "design-brain") {
        const pulse = 1 + Math.sin(t * 1.9 + point.x * 1.8) * 0.012 + mouseRef.current.active * 0.014;
        x = point.x * pulse;
        y = point.y * (1 + Math.cos(t * 1.2 + point.y * 4) * 0.012);
        z = point.z + Math.sin(t * 1.4 + point.x * 3.2 + point.y * 1.6) * 0.035;
        const ry = rotateY(x, z, -0.24 + hoverSpin * 0.22);
        const rx = rotateX(y, ry.z, 0.08 + hoverTilt * 0.5);
        x = ry.x;
        y = rx.y;
        z = rx.z;
      } else if (point.family === "design-node") {
        const pulse = 1 + Math.sin(t * 2.4 + point.pulse) * 0.06 + mouseRef.current.active * 0.03;
        x = point.x * pulse;
        y = point.y * pulse;
        z = point.z + Math.sin(t * 2 + point.pulse + point.x * 2.2) * 0.05;
        const ry = rotateY(x, z, -0.16 + hoverSpin * 0.18);
        const rx = rotateX(y, ry.z, 0.05 + hoverTilt * 0.45);
        x = ry.x;
        y = rx.y;
        z = rx.z;
      } else if (point.family === "news-signal") {
        const spin = t * (0.48 + point.lane * 0.05) + hoverSpin * 0.7;
        const angle = point.angle + spin;
        const pulse = Math.sin(t * 2.4 + point.lane) * 0.04;
        x = Math.cos(angle) * (point.radius + pulse);
        y = Math.sin(angle) * point.radius * (0.32 + point.lane * 0.014);
        z = Math.sin(angle + point.lane * 0.3) * 0.52;
      } else if (point.family === "resource-frame") {
        const inset = point.lane * 0.16;
        const widthFrame = 2.18 + inset;
        const heightFrame = 1.18 + inset * 0.68;
        const progress = point.progress * 2 - 1;
        if (point.side === 0) {
          x = progress * widthFrame;
          y = -heightFrame;
        } else if (point.side === 1) {
          x = widthFrame;
          y = progress * heightFrame;
        } else if (point.side === 2) {
          x = -progress * widthFrame;
          y = heightFrame;
        } else {
          x = -widthFrame;
          y = -progress * heightFrame;
        }
        const twist = Math.sin(t * 0.72 + point.lane) * 0.055 + hoverSpin * 0.08;
        const cos = Math.cos(twist);
        const sin = Math.sin(twist);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        x = rotatedX;
        y = rotatedY + Math.sin(t + point.progress * Math.PI * 2) * 0.025;
        z = Math.cos(point.progress * Math.PI * 2 + t + point.lane) * 0.22;
      } else if (point.family === "archive-slab") {
        const layerOffset = (point.layer - 3.5) * 0.13;
        const widthFrame = 1.8 - point.layer * 0.035;
        const heightFrame = 0.88 - point.layer * 0.018;
        const progress = point.progress * 2 - 1;
        if (point.side === 0) {
          x = progress * widthFrame;
          y = -heightFrame;
        } else if (point.side === 1) {
          x = widthFrame;
          y = progress * heightFrame;
        } else if (point.side === 2) {
          x = -progress * widthFrame;
          y = heightFrame;
        } else {
          x = -widthFrame;
          y = -progress * heightFrame;
        }
        y += layerOffset * 0.92 + Math.sin(t * 0.55 + point.layer) * 0.012;
        z = layerOffset;
        const ry = rotateY(x, z, -0.48 + t * 0.22 + hoverSpin * 0.7);
        const rx = rotateX(y, ry.z, -0.18 + hoverTilt * 0.35);
        x = ry.x;
        y = rx.y;
        z = rx.z;
      } else if (point.family === "archive-globe") {
        const spin = t * 0.38 + hoverSpin;
        x = Math.cos(point.lat) * Math.cos(point.lon);
        y = Math.sin(point.lat) * 0.92;
        z = Math.cos(point.lat) * Math.sin(point.lon);
        const ry = rotateY(x, z, spin);
        const rx = rotateX(y, ry.z, -0.15 + hoverTilt);
        x = ry.x; y = rx.y; z = rx.z;
      } else {
        const spin = t * 0.12 + hoverSpin * 0.18;
        const ry = rotateY(point.x, point.z, spin);
        x = ry.x;
        y = point.y + Math.sin(t * 0.7 + point.x) * 0.035;
        z = ry.z;
      }

      const depth = 1 / (2.65 - z * 0.58);
      const spreadX = variant === "article" ? 1.42 : 1.92;
      const spreadY = variant === "article" ? 1.24 : 1.52;
      let sx = cx + x * scale * depth * spreadX;
      let sy = cy + y * scale * depth * spreadY;
      const dx = sx - mx;
      const dy = sy - my;
      let dist = 1;
      let field = 0;
      if (interactionActive) {
        const fieldRadius = point.family === "design-studio"
          ? 220
          : variant === "collection" ? 170 : variant === "article" ? 145 : 130;
        if (Math.abs(dx) < fieldRadius && Math.abs(dy) < fieldRadius) {
          const distSq = dx * dx + dy * dy;
          const radiusSq = fieldRadius * fieldRadius;
          if (distSq < radiusSq) {
            dist = Math.sqrt(distSq);
            field = (1 - dist / fieldRadius) * interactionPower;
          }
        }
      }
      if (field > 0) {
        const ripple = Math.sin(dist * 0.11 - t * 6) * field;
        sx += (dx / Math.max(dist, 1)) * field * 26 + ripple * 6;
        sy += (dy / Math.max(dist, 1)) * field * 22 + ripple * 4;
      }
      if (point.family === "design-studio" && field > 0) {
        const jitter = Math.sin(t * 5.8 + point.pulse) * field;
        const isText = point.zone === "brand" || point.zone === "copy" || point.zone === "note" || point.zone === "panel";
        const isSurface = point.zone === "shape" || point.zone === "swatch" || point.zone === "artboard";
        const drift = isText ? 34 : isSurface ? 24 : point.zone === "dust" ? 42 : 14;
        sx += (dx / Math.max(dist, 1)) * field * drift + Math.cos(t * 4.4 + point.pulse) * field * (isText ? 16 : 8);
        sy += (dy / Math.max(dist, 1)) * field * (drift * 0.58) + Math.sin(t * 3.7 + point.pulse) * field * (isText ? 14 : 7);
        angle += jitter * (isText ? 0.42 : isSurface ? 0.18 : 0.1);
        shade += field * (isText ? 0.52 : 0.36);
        size = (size ?? 8.6) + field * (isText ? 2.5 : point.zone === "dust" ? 1.8 : 1.2);
      }
      if (burstPower > 0) {
        const bdx = sx - burstRef.current.x;
        const bdy = sy - burstRef.current.y;
        const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
        const wave = burstAge * (variant === "collection" ? 620 : variant === "article" ? 520 : 410);
        const ring = Math.exp(-Math.pow((bdist - wave) / 46, 2)) * burstPower;
        if (ring > 0.006) {
          sx += (bdx / Math.max(bdist, 1)) * ring * 42;
          sy += (bdy / Math.max(bdist, 1)) * ring * 24;
          shade += ring * 0.75;
        }
      }
      shade = Math.max(0.08, Math.min(1, shade + z * 0.2 + field * 0.62));

      return {
        sx,
        sy,
        z,
        shade,
        char: point.family === "design-studio"
          ? point.char
          : field > 0.18
            ? glyph(mode === "Design" ? DESIGN_RAMP : mode === "Archive" ? ARCHIVE_RAMP : DEV_RAMP, index + Math.floor(time / 45), z)
            : point.char,
        tint: "tint" in point ? point.tint : undefined,
        family: point.family,
        zone: point.family === "dev-terminal" ? point.zone : undefined,
        studioZone: point.family === "design-studio" ? point.zone : undefined,
        rawX: x,
        rawY: y,
        angle,
        size,
      };
    });

    if (!(variant === "article" && (mode === "Design" || mode === "Development"))) {
      projected.sort((a, b) => a.z - b.z);
    }

    let lastStudioFont = "";
    for (const point of projected) {
      const alpha = Math.max(0.08, Math.min(0.98, (variant === "article" ? 0.32 : 0.24) + point.shade * 0.7));
      if (point.family === "design-studio") {
        const studioAlpha = Math.max(0.12, Math.min(0.98, alpha));
        const studioOnDarkSurface =
          point.studioZone === "toolbar" ||
          point.studioZone === "panel" ||
          point.studioZone === "frame" ||
          point.studioZone === "chrome" ||
          (point.studioZone === "note" && point.rawX > 1.65);
        const color = point.tint === "amber"
          ? (studioOnDarkSurface ? `rgba(255,225,90,${studioAlpha})` : `rgba(172,112,22,${studioAlpha})`)
          : point.tint === "slate"
            ? (studioOnDarkSurface ? `rgba(205,199,181,${studioAlpha * 0.9})` : `rgba(110,108,96,${studioAlpha})`)
            : point.tint === "vermillion"
              ? (studioOnDarkSurface ? `rgba(255,146,100,${studioAlpha})` : `rgba(201,89,50,${studioAlpha})`)
              : point.tint === "blue"
                ? (studioOnDarkSurface ? `rgba(150,175,255,${studioAlpha})` : `rgba(70,102,214,${studioAlpha})`)
                : point.tint === "sage"
                  ? (studioOnDarkSurface ? `rgba(166,220,142,${studioAlpha})` : `rgba(125,180,110,${studioAlpha})`)
                  : point.tint === "charcoal"
                    ? (studioOnDarkSurface ? `rgba(245,237,214,${studioAlpha})` : `rgba(28,28,28,${studioAlpha})`)
                    : point.studioZone === "dust"
                      ? (isDark ? `rgba(255,225,90,${studioAlpha * 0.28})` : `rgba(61,36,0,${studioAlpha * 0.34})`)
                      : (studioOnDarkSurface ? `rgba(245,237,214,${studioAlpha * 0.82})` : `rgba(44,36,28,${studioAlpha * 0.82})`);
        const studioFont = `800 ${Math.round(point.size ?? 8.4)}px "JetBrains Mono", "SFMono-Regular", Menlo, monospace`;
        if (studioFont !== lastStudioFont) {
          ctx.font = studioFont;
          lastStudioFont = studioFont;
        }
        ctx.save();
        ctx.translate(point.sx, point.sy);
        ctx.rotate(point.angle);
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.fillText(point.char, 0, 0);
        ctx.restore();
        continue;
      }
      if (point.family === "dev-terminal") {
        const terminalAlpha = Math.max(0.12, Math.min(0.96, point.zone === "screen" ? alpha * 0.4 : alpha));
        const terminalInk = isDark ? "245,237,214" : "61,36,0";
        const terminalMuted = isDark ? "190,184,166" : "166,164,154";
        const terminalAmber = isDark ? "255,225,90" : "214,152,53";
        ctx.shadowBlur = point.zone === "cursor" ? 16 : point.shade > 0.84 ? 10 : 0;
        ctx.shadowColor = point.zone === "cursor" ? "rgba(57, 255, 93, 0.88)" : neon;
        if (point.zone === "cursor") {
          ctx.fillStyle = `rgba(57,255,93,${terminalAlpha})`;
        } else if (point.zone === "screen") {
          ctx.fillStyle = `rgba(${terminalMuted},${terminalAlpha})`;
        } else if (point.zone === "code") {
          ctx.fillStyle = point.tint === "amber"
            ? `rgba(${terminalAmber},${terminalAlpha})`
            : `rgba(235,229,209,${terminalAlpha})`;
        } else if (point.zone === "data") {
          ctx.fillStyle = point.tint === "amber"
            ? `rgba(${terminalAmber},${terminalAlpha * 0.78})`
            : `rgba(${terminalInk},${terminalAlpha * 0.74})`;
        } else {
          ctx.fillStyle = point.tint === "amber"
            ? `rgba(${terminalAmber},${terminalAlpha})`
            : `rgba(${terminalInk},${terminalAlpha * 0.86})`;
        }
        ctx.fillText(point.char, point.sx, point.sy);
        continue;
      }
      const tintColor = point.tint === "amber"
        ? `rgba(214,152,53,${alpha})`
        : point.tint === "vermillion"
          ? `rgba(201,89,50,${alpha})`
          : point.tint === "blue"
            ? `rgba(70,102,214,${alpha})`
            : point.tint === "sage"
              ? `rgba(110,138,96,${alpha})`
              : point.tint === "slate"
                ? `rgba(109,109,112,${alpha})`
                : point.tint === "charcoal"
                  ? `rgba(70,60,54,${alpha})`
                  : null;
      ctx.shadowBlur = point.shade > 0.82 ? (variant === "article" ? 24 : 18) : point.shade > 0.68 ? 7 : 0;
      ctx.shadowColor = tintColor ?? neon;
      ctx.fillStyle = tintColor ?? (point.shade > 0.55
        ? `rgba(${neonRgb},${alpha})`
        : `hsl(${foreground} / ${alpha * 0.62})`);
      ctx.fillText(point.char, point.sx, point.sy);
    }

    const shouldContinue = variant !== "article" || mouseRef.current.active > 0.02 || burstRef.current.active === 1;
    rafRef.current = shouldContinue ? requestAnimationFrame(draw) : null;
  }, [mode, variant]);

  const setup = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    const flatArticle = variant === "article" && (mode === "Design" || mode === "Development");
    const dpr = Math.min(window.devicePixelRatio || 1, flatArticle ? 1.35 : 2);
    sizeRef.current = { width, height, dpr };
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    pointsRef.current = buildPoints(mode, variant, surface);
    backdropRef.current = null;
    lastDrawRef.current = 0;
  }, [mode, surface, variant]);

  useEffect(() => {
    const requestFreshDraw = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    setup();
    requestFreshDraw();
    const wrap = wrapRef.current;
    const observer = new ResizeObserver(() => {
      setup();
      requestFreshDraw();
    });
    if (wrap) observer.observe(wrap);
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [draw, setup]);

  return (
    <div
      ref={wrapRef}
      className={`ascii-experience ascii-experience-${variant} ascii-experience-${String(mode).toLowerCase()}`}
      data-cursor-hover
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseRef.current.x = event.clientX - rect.left;
        mouseRef.current.y = event.clientY - rect.top;
        mouseRef.current.active = 1;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        burstRef.current.x = event.clientX - rect.left;
        burstRef.current.y = event.clientY - rect.top;
        burstRef.current.started = performance.now() * 0.001;
        burstRef.current.active = 1;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
      }}
      onPointerLeave={() => {
        mouseRef.current.x = -9999;
        mouseRef.current.y = -9999;
      }}
    >
      {showChrome && (
        <div className="ascii-experience-bar">
          <span>{modeLabel(mode, variant, surface)}</span>
          <span>{mode === "Design" ? "kinetic lens" : mode === "Archive" ? "index vault" : "orbital trace"}</span>
        </div>
      )}
      <canvas ref={canvasRef} aria-label={`${mode} ASCII experience`} />
    </div>
  );
}
