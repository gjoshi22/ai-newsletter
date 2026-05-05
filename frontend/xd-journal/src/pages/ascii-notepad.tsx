import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const FRAME_COUNT = 72;
const WIDTH = 78;
const HEIGHT = 31;
const PAGE_X = 17;
const PAGE_Y = 7;
const PAGE_W = 44;
const PAGE_H = 17;

type Point = { x: number; y: number };

const SCRIBBLE_PATH: Point[] = [
  { x: 26, y: 13 }, { x: 27, y: 12 }, { x: 29, y: 12 }, { x: 30, y: 13 },
  { x: 31, y: 14 }, { x: 33, y: 14 }, { x: 34, y: 13 }, { x: 35, y: 12 },
  { x: 37, y: 12 }, { x: 38, y: 13 }, { x: 39, y: 14 }, { x: 41, y: 14 },
  { x: 42, y: 13 }, { x: 43, y: 12 }, { x: 45, y: 12 }, { x: 46, y: 13 },
  { x: 47, y: 15 }, { x: 45, y: 16 }, { x: 43, y: 16 }, { x: 41, y: 15 },
  { x: 39, y: 15 }, { x: 37, y: 16 }, { x: 35, y: 17 }, { x: 33, y: 16 },
  { x: 31, y: 16 }, { x: 29, y: 17 }, { x: 27, y: 18 }, { x: 29, y: 19 },
  { x: 31, y: 19 }, { x: 33, y: 18 }, { x: 36, y: 18 }, { x: 38, y: 19 },
  { x: 40, y: 20 }, { x: 42, y: 20 }, { x: 44, y: 19 }, { x: 46, y: 18 },
  { x: 48, y: 18 }, { x: 49, y: 19 }, { x: 50, y: 20 }, { x: 48, y: 21 },
  { x: 46, y: 21 }, { x: 44, y: 22 }, { x: 42, y: 22 }, { x: 40, y: 21 },
  { x: 38, y: 21 }, { x: 36, y: 22 }, { x: 34, y: 23 }, { x: 32, y: 22 },
];

const drawLine = (grid: string[][], from: Point, to: Point, char: string) => {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let err = dx - dy;
  let x = from.x;
  let y = from.y;

  while (true) {
    if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) grid[y][x] = char;
    if (x === to.x && y === to.y) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
};

const createGrid = () => Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => " "));

const put = (grid: string[][], x: number, y: number, value: string) => {
  if (y < 0 || y >= HEIGHT) return;
  [...value].forEach((char, index) => {
    const px = x + index;
    if (px >= 0 && px < WIDTH) grid[y][px] = char;
  });
};

const drawDesk = (grid: string[][], frame: number) => {
  for (let y = 2; y < HEIGHT - 2; y += 4) {
    for (let x = 4 + ((y + frame) % 3); x < WIDTH - 4; x += 9) {
      if ((x + y + frame) % 5 === 0) grid[y][x] = ".";
    }
  }
  put(grid, 8, 27, "          .----------------------------------------------.");
  put(grid, 8, 28, "        .'                                                '.");
};

const drawPageFrame = (grid: string[][], frame: number) => {
  const flipStart = 44;
  const flipProgress = frame >= flipStart ? Math.min(1, (frame - flipStart) / 16) : 0;
  const curl = Math.floor(flipProgress * 15);
  const right = PAGE_X + PAGE_W - 1 - Math.min(curl, PAGE_W - 8);
  const top = PAGE_Y;
  const bottom = PAGE_Y + PAGE_H - 1;

  put(grid, PAGE_X + 1, PAGE_Y - 2, "o     o     o     o     o     o");
  for (let x = PAGE_X + 1; x < right; x += 1) {
    grid[top][x] = "-";
    grid[bottom][x] = "-";
  }
  for (let y = top + 1; y < bottom; y += 1) {
    grid[y][PAGE_X] = "|";
    if (right > PAGE_X + 7) grid[y][right] = flipProgress > 0.08 ? ")" : "|";
  }

  grid[top][PAGE_X] = ".";
  grid[top][Math.max(right, PAGE_X + 1)] = ".";
  grid[bottom][PAGE_X] = "'";
  grid[bottom][Math.max(right, PAGE_X + 1)] = "'";

  for (let y = PAGE_Y + 3; y < PAGE_Y + PAGE_H - 2; y += 3) {
    for (let x = PAGE_X + 3; x < right - 2; x += 1) {
      if ((x + y) % 2 === 0) grid[y][x] = ".";
    }
  }

  if (flipProgress > 0) {
    const foldX = Math.max(PAGE_X + 8, right - 2);
    const foldHeight = Math.min(8, Math.max(2, Math.floor(flipProgress * 10)));
    for (let i = 0; i < foldHeight; i += 1) {
      const yTop = top + i;
      const yBottom = bottom - i;
      const x = foldX + Math.floor(i * 1.2);
      if (x < WIDTH - 2) {
        grid[yTop][x] = "/";
        grid[yBottom][x] = "\\";
      }
    }
    for (let y = top + 2; y < bottom - 1; y += 1) {
      const x = right + Math.floor(Math.sin(y + frame) * 2) + 2;
      if (x > PAGE_X && x < WIDTH - 3) put(grid, x, y, flipProgress > 0.55 ? "||" : "))");
    }
  }

  if (flipProgress > 0.72) {
    for (let y = PAGE_Y + 2; y < PAGE_Y + PAGE_H - 2; y += 1) {
      for (let x = PAGE_X + 4; x < PAGE_X + PAGE_W - 4; x += 1) {
        if (grid[y][x] !== "|" && grid[y][x] !== "\\" && grid[y][x] !== "/") grid[y][x] = " ";
      }
    }
  }
};

const drawScribble = (grid: string[][], frame: number) => {
  const reveal = frame < 44 ? Math.floor((frame / 43) * SCRIBBLE_PATH.length) : SCRIBBLE_PATH.length;
  const fade = frame >= 44 ? Math.max(0, 1 - (frame - 44) / 12) : 1;
  const chars = fade > 0.7 ? ["'", "-", "~", "^"] : [".", ":", "'", "`"];

  for (let index = 0; index < reveal; index += 1) {
    const point = SCRIBBLE_PATH[index];
    const char = chars[index % chars.length];
    if (point.y >= 0 && point.y < HEIGHT && point.x >= 0 && point.x < WIDTH) {
      grid[point.y][point.x] = char;
    }
  }
};

const drawPen = (grid: string[][], frame: number) => {
  const drawingIndex = Math.min(
    SCRIBBLE_PATH.length - 1,
    Math.max(0, Math.floor((Math.min(frame, 43) / 43) * (SCRIBBLE_PATH.length - 1))),
  );
  const resetProgress = frame >= 60 ? (frame - 60) / 12 : 0;
  const activePoint = SCRIBBLE_PATH[drawingIndex];
  const startPoint = SCRIBBLE_PATH[0];
  const tip = frame < 60
    ? activePoint
    : {
        x: Math.round(activePoint.x + (startPoint.x - activePoint.x) * resetProgress),
        y: Math.round(activePoint.y + (startPoint.y - activePoint.y) * resetProgress),
      };

  const tail = {
    x: tip.x + 13,
    y: tip.y - 7 + Math.round(Math.sin(frame / 3) * 1),
  };

  drawLine(grid, tail, tip, "\\");
  put(grid, tail.x - 4, tail.y - 1, "PEN");
  if (tip.y >= 0 && tip.y < HEIGHT && tip.x >= 0 && tip.x < WIDTH) grid[tip.y][tip.x] = frame >= 44 && frame < 60 ? "'" : "*";
  put(grid, tip.x + 1, tip.y - 1, "/");
};

const renderFrame = (frame: number) => {
  const grid = createGrid();
  drawDesk(grid, frame);
  drawPageFrame(grid, frame);
  drawScribble(grid, frame);
  drawPen(grid, frame);
  put(grid, 3, 3, ".-- paperweight ------------------------------------------.");
  put(grid, 3, 4, "| tape 04 / frame lock                                   |");
  put(grid, 3, 5, "'--------------------------------------------------------'");
  return grid.map((row) => row.join("").trimEnd()).join("\n");
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export default function AsciiNotepadPage() {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const art = useMemo(() => renderFrame(reducedMotion ? 18 : frame), [frame, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    let lastTick = 0;

    const tick = (time: number) => {
      if (time - lastTick > 95) {
        setFrame((current) => (current + 1) % FRAME_COUNT);
        lastTick = time;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [reducedMotion]);

  return (
    <main className="ascii-notepad-page min-h-screen overflow-hidden">
      <div className="ascii-notepad-noise" />
      <Link href="/" className="ascii-notepad-home" aria-label="Back to home">
        /home
      </Link>
      <section className="ascii-notepad-stage" aria-label="ASCII animation of a pen scribbling on a notepad while pages flip">
        <pre className="ascii-notepad-art" aria-hidden="true">{art}</pre>
      </section>
      <p className="sr-only">A looping ASCII animation shows a pen scribbling on a notepad, the page flipping, and the drawing starting again.</p>
    </main>
  );
}
