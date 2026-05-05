import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Lock, Unlock } from "lucide-react";
import type { ArticleCategory, ArticleSubCategory } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  makeTransparentSprite,
  ModeGameToggle,
  POSE_FRAMES_BY_MODE,
  SPRITE_PATHS,
  WALK_DIRECTION_FRAMES_BY_MODE,
  type SpriteRect,
  type WalkDirection,
} from "@/components/ModeGameToggle";
import { debugGame } from "@/lib/game-debug";

type MascotGameLauncherProps = {
  category: ArticleCategory;
  activeMode: ArticleSubCategory;
  counts: Record<ArticleSubCategory, number>;
  onModeChange: (mode: ArticleSubCategory) => void;
};

type LoadedSprite = HTMLCanvasElement | HTMLImageElement | null;
type Point = { x: number; y: number };
type AvoidRect = Pick<DOMRect, "left" | "right" | "top" | "bottom">;
type MascotMotionKind = "idle" | "walk" | "float";
type MascotMotion = {
  dx: number;
  dy: number;
  speed: number;
  kind: MascotMotionKind;
  direction: WalkDirection;
};
type PendingMotionDirection = { direction: WalkDirection; since: number };

const CANVAS_W = 146;
const CANVAS_H = 146;
const CATCH_RADIUS = 112;
const RELEASE_RADIUS = 168;
const LEASH_DISTANCE = 132;
const LEASH_FLOOR_OFFSET = 58;
const LONG_PRESS_MS = 360;
const DRAG_DISTANCE = 7;
const AVOID_MARGIN = 18;
const FACE_FLIP_COOLDOWN_MS = 220;
const FACE_MOTION_DEAD_ZONE = 1.35;
const FACE_CURSOR_DEAD_ZONE = 72;
const MOTION_KIND_HOLD_MS = 190;
const MOTION_DIRECTION_AXIS_BIAS = 1.22;
const MOTION_DIRECTION_DEAD_ZONE = 1.05;
const DIRECTION_SWITCH_MIN_SPEED = 1.4;
const SAME_AXIS_DIRECTION_HOLD_MS = 110;
const CROSS_AXIS_DIRECTION_HOLD_MS = 170;
const TURN_SETTLE_MS = 95;
const MAX_FOLLOW_STEP = 24;
const WALK_FRAME_MS = 86;
const FLOAT_FRAME_MS = 118;
const GAME_KEYS = new Set([" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "k", "shift", "j"]);
const CONTROL_AVOID_SELECTOR = ".mascot-preference-control";

function distance(x: number, y: number) {
  return Math.hypot(x, y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAvoidRects(): AvoidRect[] {
  return [...document.querySelectorAll<HTMLElement>(CONTROL_AVOID_SELECTOR)]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - AVOID_MARGIN,
        right: rect.right + AVOID_MARGIN,
        top: rect.top - AVOID_MARGIN,
        bottom: rect.bottom + AVOID_MARGIN,
      };
    });
}

function pointInAvoidZone(x: number, y: number, avoidRects: AvoidRect[]) {
  return avoidRects.some((rect) => (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  ));
}

function rectIntersectsAvoidZone(left: number, top: number, width: number, height: number, avoidRects: AvoidRect[]) {
  const right = left + width;
  const bottom = top + height;
  return avoidRects.some((rect) => (
    left < rect.right &&
    right > rect.left &&
    top < rect.bottom &&
    bottom > rect.top
  ));
}

function viewportBounds() {
  return {
    minX: CANVAS_W / 2 + 8,
    maxX: window.innerWidth - CANVAS_W / 2 - 8,
    minY: CANVAS_H / 2 + 8,
    maxY: window.innerHeight - CANVAS_H / 2 - 8,
  };
}

function clampToViewport(point: Point) {
  const bounds = viewportBounds();
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function shellIntersectsAvoidZone(point: Point, avoidRects: AvoidRect[]) {
  return rectIntersectsAvoidZone(
    point.x - CANVAS_W / 2,
    point.y - CANVAS_H / 2,
    CANVAS_W,
    CANVAS_H,
    avoidRects,
  );
}

function keepAwayFromControls(point: Point, avoidRects: AvoidRect[]) {
  const desired = clampToViewport(point);
  if (!shellIntersectsAvoidZone(desired, avoidRects)) return desired;

  const intersecting = avoidRects.filter((rect) => (
    desired.x - CANVAS_W / 2 < rect.right &&
    desired.x + CANVAS_W / 2 > rect.left &&
    desired.y - CANVAS_H / 2 < rect.bottom &&
    desired.y + CANVAS_H / 2 > rect.top
  ));

  const candidates = intersecting.flatMap((rect) => ([
    { x: rect.left - CANVAS_W / 2, y: desired.y },
    { x: rect.right + CANVAS_W / 2, y: desired.y },
    { x: desired.x, y: rect.top - CANVAS_H / 2 },
    { x: desired.x, y: rect.bottom + CANVAS_H / 2 },
  ])).map(clampToViewport);

  const safeCandidates = candidates.filter((candidate) => !shellIntersectsAvoidZone(candidate, avoidRects));
  const pool = safeCandidates.length ? safeCandidates : candidates;
  return pool.reduce((best, candidate) => {
    const bestDistance = distance(best.x - desired.x, best.y - desired.y);
    const candidateDistance = distance(candidate.x - desired.x, candidate.y - desired.y);
    return candidateDistance < bestDistance ? candidate : best;
  }, pool[0] ?? desired);
}

function motionKindFor(dx: number, dy: number, speed: number): MascotMotionKind {
  if (speed < 0.58) return "idle";
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX >= absY * 1.08) return "walk";
  return "float";
}

function stableMotionKind(nextKind: MascotMotionKind, currentKind: MascotMotionKind, lastSwitch: number, time: number) {
  if (nextKind === currentKind) return currentKind;
  if (currentKind === "idle") return nextKind;
  if (time - lastSwitch < MOTION_KIND_HOLD_MS) return currentKind;
  return nextKind;
}

function motionDirectionFor(dx: number, dy: number, speed: number, fallback: WalkDirection): WalkDirection {
  if (speed < 0.58) return fallback;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absY > MOTION_DIRECTION_DEAD_ZONE && absY >= absX * MOTION_DIRECTION_AXIS_BIAS) {
    return dy < 0 ? "up" : "down";
  }
  if (absX > MOTION_DIRECTION_DEAD_ZONE) return dx < 0 ? "left" : "right";
  return fallback;
}

function directionAxis(direction: WalkDirection) {
  return direction === "up" || direction === "down" ? "vertical" : "horizontal";
}

function directionSwitchHold(nextDirection: WalkDirection, currentDirection: WalkDirection) {
  return directionAxis(nextDirection) === directionAxis(currentDirection)
    ? SAME_AXIS_DIRECTION_HOLD_MS
    : CROSS_AXIS_DIRECTION_HOLD_MS;
}

function motionVisuals(motion: MascotMotion, time: number) {
  const speedRatio = clamp(motion.speed / 12, 0, 1);
  const sideLean = clamp(motion.dx / 16, -1, 1);
  const verticalLean = clamp(motion.dy / 18, -1, 1);
  const walkCycle = Math.sin(time * 0.024);
  const floatCycle = Math.sin(time * 0.018);

  if (motion.kind === "walk") {
    return {
      floatY: walkCycle * 1.9 * speedRatio,
      scaleX: 1 + Math.abs(walkCycle) * 0.018 * speedRatio,
      scaleY: 1 - Math.abs(walkCycle) * 0.014 * speedRatio,
      rotation: sideLean * 0.035,
    };
  }

  if (motion.kind === "float") {
    const falling = Math.max(0, verticalLean);
    const rising = Math.max(0, -verticalLean);
    return {
      floatY: verticalLean * 2.2 + floatCycle * 1.45 * speedRatio,
      scaleX: 1 + falling * 0.022 - rising * 0.012 + Math.abs(floatCycle) * 0.012 * speedRatio,
      scaleY: 1 - falling * 0.016 + rising * 0.022 - Math.abs(floatCycle) * 0.008 * speedRatio,
      rotation: sideLean * 0.012,
    };
  }

  return {
    floatY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  };
}

type SpriteSource = Exclude<LoadedSprite, null>;

const isolatedFrameCache = new WeakMap<SpriteSource, Map<string, HTMLCanvasElement>>();

function frameKey(frame: SpriteRect) {
  return `${frame.x}:${frame.y}:${frame.w}:${frame.h}`;
}

function getIsolatedSpriteFrame(sprite: SpriteSource, frame: SpriteRect) {
  let spriteFrames = isolatedFrameCache.get(sprite);
  if (!spriteFrames) {
    spriteFrames = new Map();
    isolatedFrameCache.set(sprite, spriteFrames);
  }

  const key = frameKey(frame);
  const cachedFrame = spriteFrames.get(key);
  if (cachedFrame) return cachedFrame;

  const canvas = document.createElement("canvas");
  canvas.width = frame.w;
  canvas.height = frame.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
  spriteFrames.set(key, canvas);
  return canvas;
}

function drawMascot(
  ctx: CanvasRenderingContext2D,
  sprite: LoadedSprite,
  frame: SpriteRect,
  time: number,
  motion: MascotMotion,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.imageSmoothingEnabled = false;

  const bob = Math.sin(time * 0.006) * 3;
  const visual = motionVisuals(motion, time);
  const isolatedFrame = sprite ? getIsolatedSpriteFrame(sprite, frame) : null;
  const sourceFrame = isolatedFrame
    ? { x: 0, y: 0, w: isolatedFrame.width, h: isolatedFrame.height }
    : { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
  const scale = Math.min((CANVAS_W * 0.9) / sourceFrame.w, (CANVAS_H * 0.92) / sourceFrame.h);
  const drawW = Math.round(sourceFrame.w * scale);
  const drawH = Math.round(sourceFrame.h * scale);
  const drawY = Math.round(CANVAS_H - drawH - 5 + bob + visual.floatY);

  ctx.save();
  ctx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue("--neon").trim() || "#FFE15A";
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(CANVAS_W / 2, CANVAS_H - 8, drawW * 0.32 * visual.scaleX, 7 / visual.scaleY, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  const spriteCenterY = drawY + drawH / 2;
  ctx.translate(CANVAS_W / 2, spriteCenterY);
  ctx.rotate(visual.rotation);
  ctx.scale(visual.scaleX, visual.scaleY);

  if (isolatedFrame) {
    ctx.drawImage(isolatedFrame, sourceFrame.x, sourceFrame.y, sourceFrame.w, sourceFrame.h, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--neon").trim() || "#FFE15A";
    ctx.fillRect(-drawW * 0.25, -drawH * 0.34, drawW * 0.5, drawH * 0.78);
  }
  ctx.restore();
}

export function MascotGameLauncher({ category, activeMode, counts, onModeChange }: MascotGameLauncherProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockControlVisible, setLockControlVisible] = useState(false);
  const shellRef = useRef<HTMLButtonElement>(null);
  const lockControlRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<LoadedSprite>(null);
  const spriteCacheRef = useRef<Partial<Record<ArticleSubCategory, LoadedSprite>>>({});
  const rafRef = useRef<number | null>(null);
  const activeModeRef = useRef(activeMode);
  const openRef = useRef(open);
  const lockedRef = useRef(false);
  const lockControlVisibleRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const hasPositionRef = useRef(false);
  const avoidRectsRef = useRef<AvoidRect[]>([]);
  const cursorRef = useRef({ x: -220, y: -220, active: false });
  const cursorVelocityRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: -220, y: -220 });
  const lastPosRef = useRef({ x: -220, y: -220 });
  const visualVelocityRef = useRef({ x: 0, y: 0 });
  const facingLeftRef = useRef(false);
  const lastFacingFlipRef = useRef(0);
  const motionKindRef = useRef<MascotMotionKind>("idle");
  const lastMotionKindSwitchRef = useRef(0);
  const motionDirectionRef = useRef<WalkDirection>("right");
  const lastMotionDirectionSwitchRef = useRef(0);
  const pendingMotionDirectionRef = useRef<PendingMotionDirection | null>(null);
  const motionCycleStartRef = useRef(0);
  const followingRef = useRef(false);
  const draggingRef = useRef(false);
  const hoverLockRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const holdTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const lockControlTimerRef = useRef<number | null>(null);
  const dismissGuardUntilRef = useRef(0);
  const skipNextClickRef = useRef(false);
  const pressRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    activeModeRef.current = activeMode;
    spriteRef.current = spriteCacheRef.current[activeMode] ?? null;
  }, [activeMode]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    lockControlVisibleRef.current = lockControlVisible;
  }, [lockControlVisible]);

  const refreshAvoidRects = useCallback(() => {
    avoidRectsRef.current = getAvoidRects();
  }, []);

  const clearLockControlTimer = useCallback(() => {
    if (lockControlTimerRef.current !== null) {
      window.clearTimeout(lockControlTimerRef.current);
      lockControlTimerRef.current = null;
    }
  }, []);

  const hideLockControlSoon = useCallback((delay = 2800) => {
    clearLockControlTimer();
    lockControlTimerRef.current = window.setTimeout(() => {
      if (!draggingRef.current && !hoverLockRef.current) {
        lockControlVisibleRef.current = false;
        setLockControlVisible(false);
      }
      lockControlTimerRef.current = null;
    }, delay);
  }, [clearLockControlTimer]);

  const revealLockControl = useCallback((persistent = false) => {
    clearLockControlTimer();
    lockControlVisibleRef.current = true;
    setLockControlVisible(true);
    if (!persistent) hideLockControlSoon();
  }, [clearLockControlTimer, hideLockControlSoon]);

  const setMascotLocked = useCallback((nextLocked: boolean) => {
    lockedRef.current = nextLocked;
    setLocked(nextLocked);
    hoverLockRef.current = false;
    lockControlVisibleRef.current = false;
    setLockControlVisible(false);
    clearLockControlTimer();
  }, [clearLockControlTimer]);

  const seedMascotPosition = useCallback((point: Point) => {
    const avoidRects = avoidRectsRef.current;
    const seeded = keepAwayFromControls(
      {
        x: point.x - LEASH_DISTANCE * 0.72,
        y: point.y + LEASH_FLOOR_OFFSET * 0.72,
      },
      avoidRects,
    );
    posRef.current = seeded;
    lastPosRef.current = seeded;
    visualVelocityRef.current = { x: 0, y: 0 };
    followingRef.current = false;
    motionKindRef.current = "idle";
    motionDirectionRef.current = facingLeftRef.current ? "left" : "right";
    pendingMotionDirectionRef.current = null;
    motionCycleStartRef.current = window.performance.now();
    lastMotionDirectionSwitchRef.current = motionCycleStartRef.current;
    hasPositionRef.current = true;
  }, []);

  const startDragging = useCallback(() => {
    if (draggingRef.current) return;
    hasDraggedRef.current = true;
    draggingRef.current = true;
    skipNextClickRef.current = true;
    setDragging(true);
    revealLockControl(true);
  }, [revealLockControl]);

  const openGame = useCallback(() => {
    dismissGuardUntilRef.current = window.performance.now() + 650;
    debugGame("mascot.open.request", {
      activeMode,
      category,
      open,
      activeElement: document.activeElement?.tagName,
    });
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
    }
    openTimerRef.current = window.setTimeout(() => {
      debugGame("mascot.open.commit", {
        activeMode,
        category,
        activeElement: document.activeElement?.tagName,
      });
      setOpen(true);
      openTimerRef.current = null;
    }, 0);
  }, [activeMode, category, open]);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    const guarded = !nextOpen && window.performance.now() < dismissGuardUntilRef.current;
    debugGame("dialog.openChange", {
      nextOpen,
      guarded,
      activeMode,
      category,
      activeElement: document.activeElement?.tagName,
    });
    if (guarded) return;
    setOpen(nextOpen);
  }, [activeMode, category]);

  const preventGameKeyDefaults = useCallback((event: ReactKeyboardEvent) => {
    if (!GAME_KEYS.has(event.key.toLowerCase())) return;
    debugGame("dialog.key.preventDefault", {
      key: event.key,
      type: event.type,
      target: event.target instanceof HTMLElement ? event.target.tagName : "unknown",
      activeElement: document.activeElement?.tagName,
    });
    event.preventDefault();
  }, []);

  useEffect(() => () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    clearLockControlTimer();
  }, [clearLockControlTimer]);

  useEffect(() => {
    setEnabled(!window.matchMedia("(hover: none)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const images = (Object.keys(SPRITE_PATHS) as ArticleSubCategory[]).map((mode) => {
      const image = new Image();
      image.src = SPRITE_PATHS[mode];
      image.onload = () => {
        if (!alive) return;
        const sprite = makeTransparentSprite(image);
        spriteCacheRef.current[mode] = sprite;
        if (activeModeRef.current === mode) spriteRef.current = sprite;
      };
      image.onerror = () => {
        if (!alive) return;
        spriteCacheRef.current[mode] = null;
        if (activeModeRef.current === mode) spriteRef.current = null;
      };
      return image;
    });
    return () => {
      alive = false;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refreshAvoidRects();
    const queuedRefreshes = [
      window.setTimeout(refreshAvoidRects, 0),
      window.setTimeout(refreshAvoidRects, 560),
    ];
    const onRefreshLayout = () => refreshAvoidRects();
    window.addEventListener("resize", onRefreshLayout);
    window.addEventListener("scroll", onRefreshLayout, true);
    return () => {
      queuedRefreshes.forEach(window.clearTimeout);
      window.removeEventListener("resize", onRefreshLayout);
      window.removeEventListener("scroll", onRefreshLayout, true);
    };
  }, [enabled, refreshAvoidRects]);

  useEffect(() => {
    if (!enabled) return;
    refreshAvoidRects();
    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = cursorRef.current;
      const overControls = pointInAvoidZone(event.clientX, event.clientY, avoidRectsRef.current);
      if (!hasPositionRef.current && !overControls) {
        seedMascotPosition({ x: event.clientX, y: event.clientY });
      }
      cursorVelocityRef.current = {
        x: overControls || !previous.active ? 0 : event.clientX - previous.x,
        y: overControls || !previous.active ? 0 : event.clientY - previous.y,
      };
      cursorRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: !overControls,
      };
      if (overControls) followingRef.current = false;
    };
    const onPointerLeave = () => {
      cursorRef.current.active = false;
      cursorVelocityRef.current = { x: 0, y: 0 };
      followingRef.current = false;
    };
    const onPointerCancel = () => {
      clearHoldTimer();
      pressRef.current = null;
      draggingRef.current = false;
      hoverLockRef.current = false;
      setDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      clearHoldTimer();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [enabled, refreshAvoidRects, seedMascotPosition]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handleMascotPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || open) return;
    debugGame("mascot.pointerDown", {
      x: event.clientX,
      y: event.clientY,
      open,
      activeMode,
    });
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    hoverLockRef.current = true;
    skipNextClickRef.current = false;
    if (!hasPositionRef.current) {
      seedMascotPosition({ x: event.clientX, y: event.clientY });
    }
    const pos = posRef.current;
    dragOffsetRef.current = {
      x: event.clientX - pos.x,
      y: event.clientY - pos.y,
    };
    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      startDragging();
      holdTimerRef.current = null;
    }, LONG_PRESS_MS);
  }, [activeMode, clearHoldTimer, open, seedMascotPosition, startDragging]);

  const handleMascotPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (distance(dx, dy) > DRAG_DISTANCE) {
      press.moved = true;
      clearHoldTimer();
      startDragging();
    }
    if (draggingRef.current) {
      debugGame("mascot.dragging", {
        x: event.clientX,
        y: event.clientY,
        dx,
        dy,
      });
    }
    cursorRef.current = { x: event.clientX, y: event.clientY, active: true };
  }, [clearHoldTimer, startDragging]);

  const handleMascotPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press) return;
    event.stopPropagation();
    clearHoldTimer();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (draggingRef.current) {
      skipNextClickRef.current = true;
      draggingRef.current = false;
      setDragging(false);
      hideLockControlSoon();
    } else if (press.moved) {
      skipNextClickRef.current = true;
      hideLockControlSoon();
    }
    debugGame("mascot.pointerUp", {
      moved: press.moved,
      skipNextClick: skipNextClickRef.current,
      activeMode,
    });
    hoverLockRef.current = false;
    pressRef.current = null;
  }, [activeMode, clearHoldTimer, hideLockControlSoon]);

  const handleMascotPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoldTimer();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    hoverLockRef.current = false;
    pressRef.current = null;
    setDragging(false);
    hideLockControlSoon(900);
  }, [clearHoldTimer, hideLockControlSoon]);

  const handleLockControlClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    skipNextClickRef.current = true;
    const nextLocked = !lockedRef.current;
    if (!nextLocked) {
      cursorRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      };
      cursorVelocityRef.current = { x: 0, y: 0 };
    }
    setMascotLocked(nextLocked);
  }, [setMascotLocked]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;
    const lockControl = lockControlRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tick = (time: number) => {
      if (!hasPositionRef.current) {
        shell.style.opacity = "0";
        shell.style.pointerEvents = "none";
        shell.style.transform = "translate3d(-220px, -220px, 0)";
        if (lockControl) {
          lockControl.style.opacity = "0";
          lockControl.style.pointerEvents = "none";
          lockControl.style.transform = "translate3d(-220px, -220px, 0)";
        }
        drawMascot(ctx, spriteRef.current, POSE_FRAMES_BY_MODE[activeModeRef.current].idle, time, {
          dx: 0,
          dy: 0,
          speed: 0,
          kind: "idle",
          direction: motionDirectionRef.current,
        });
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const cursor = cursorRef.current;
      const pos = posRef.current;
      const velocity = cursorVelocityRef.current;
      const velocityMagnitude = distance(velocity.x, velocity.y);
      const cursorDirection = velocityMagnitude > 0.8
        ? { x: velocity.x / velocityMagnitude, y: velocity.y / velocityMagnitude }
        : { x: facingLeftRef.current ? -1 : 1, y: 0 };
      const restingSide = facingLeftRef.current ? 1 : -1;
      const verticalCursorIntent = velocityMagnitude > 0.8 && Math.abs(cursorDirection.y) > Math.abs(cursorDirection.x) * 1.2;
      const leashTarget = velocityMagnitude > 0.8
        ? verticalCursorIntent
          ? {
              x: cursor.x,
              y: cursor.y - cursorDirection.y * 70 + 18,
            }
          : {
              x: cursor.x - cursorDirection.x * LEASH_DISTANCE,
              y: cursor.y - cursorDirection.y * LEASH_DISTANCE + LEASH_FLOOR_OFFSET,
            }
        : {
            x: cursor.x + restingSide * LEASH_DISTANCE,
            y: cursor.y + LEASH_FLOOR_OFFSET,
          };
      const cursorDistance = distance(cursor.x - pos.x, cursor.y - pos.y);
      const isLocked = lockedRef.current;
      const canFollowCursor = cursor.active && hasPositionRef.current && !openRef.current && !isLocked;
      const shouldFollow = draggingRef.current || (
        canFollowCursor &&
        !hoverLockRef.current &&
        (
          followingRef.current
            ? cursorDistance > CATCH_RADIUS || velocityMagnitude > 7
            : cursorDistance > RELEASE_RADIUS || velocityMagnitude > 12
        )
      );
      followingRef.current = shouldFollow && !draggingRef.current;
      const shouldRest = isLocked || !shouldFollow;
      const rawTarget = draggingRef.current
        ? {
            x: cursor.x - dragOffsetRef.current.x,
            y: cursor.y - dragOffsetRef.current.y,
          }
        : shouldRest
          ? { x: pos.x, y: pos.y }
          : leashTarget;
      const target = keepAwayFromControls(rawTarget, avoidRectsRef.current);
      const targetDx = target.x - pos.x;
      const targetDy = target.y - pos.y;
      const targetDistance = distance(targetDx, targetDy);
      const follow = draggingRef.current ? 1 : clamp(targetDistance / 920, 0.055, 0.18);
      const desiredMoveX = targetDx * follow;
      const desiredMoveY = targetDy * follow;
      const desiredMoveDistance = distance(desiredMoveX, desiredMoveY);
      const moveLimit = draggingRef.current ? desiredMoveDistance : MAX_FOLLOW_STEP;
      const moveScale = desiredMoveDistance > moveLimit && desiredMoveDistance > 0
        ? moveLimit / desiredMoveDistance
        : 1;
      const moveX = desiredMoveX * moveScale;
      const moveY = desiredMoveY * moveScale;
      pos.x += moveX;
      pos.y += moveY;

      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;
      const speed = Math.hypot(dx, dy);
      const measuredDx = shouldFollow ? moveX : 0;
      const measuredDy = shouldFollow ? moveY : 0;
      const velocityEase = draggingRef.current ? 0.62 : 0.18;
      visualVelocityRef.current = {
        x: visualVelocityRef.current.x + (measuredDx - visualVelocityRef.current.x) * velocityEase,
        y: visualVelocityRef.current.y + (measuredDy - visualVelocityRef.current.y) * velocityEase,
      };
      const visualDx = visualVelocityRef.current.x;
      const visualDy = visualVelocityRef.current.y;
      const visualSpeed = Math.max(speed, distance(visualDx, visualDy));
      const nextMotionKind = motionKindFor(visualDx, visualDy, visualSpeed);
      const previousMotionKind = motionKindRef.current;
      const motionKind = stableMotionKind(nextMotionKind, previousMotionKind, lastMotionKindSwitchRef.current, time);
      if (motionKind !== previousMotionKind) {
        motionKindRef.current = motionKind;
        lastMotionKindSwitchRef.current = time;
        motionCycleStartRef.current = time;
      }
      const nextMotionDirection = motionDirectionFor(visualDx, visualDy, visualSpeed, motionDirectionRef.current);
      let motionDirection = motionDirectionRef.current;
      if (motionKind === "idle" || visualSpeed < DIRECTION_SWITCH_MIN_SPEED || nextMotionDirection === motionDirection) {
        pendingMotionDirectionRef.current = null;
      } else {
        const pendingDirection = pendingMotionDirectionRef.current;
        if (!pendingDirection || pendingDirection.direction !== nextMotionDirection) {
          pendingMotionDirectionRef.current = { direction: nextMotionDirection, since: time };
        } else if (time - pendingDirection.since >= directionSwitchHold(nextMotionDirection, motionDirection)) {
          motionDirection = nextMotionDirection;
          motionDirectionRef.current = motionDirection;
          lastMotionDirectionSwitchRef.current = time;
          motionCycleStartRef.current = time;
          pendingMotionDirectionRef.current = null;
        }
      }

      const cursorSideOffset = cursor.x - pos.x;
      const horizontalIntent = Math.abs(visualDx) > FACE_MOTION_DEAD_ZONE && Math.abs(visualDx) > Math.abs(visualDy) * 0.42;
      const cursorSideIntent = motionKind !== "walk" && Math.abs(cursorSideOffset) > FACE_CURSOR_DEAD_ZONE;
      const desiredFacingLeft = horizontalIntent
        ? visualDx < 0
        : cursorSideIntent
          ? cursorSideOffset < 0
          : facingLeftRef.current;
      if (
        desiredFacingLeft !== facingLeftRef.current &&
        time - lastFacingFlipRef.current > FACE_FLIP_COOLDOWN_MS
      ) {
        facingLeftRef.current = desiredFacingLeft;
        lastFacingFlipRef.current = time;
      }

      const shellX = pos.x - CANVAS_W / 2;
      const shellY = pos.y - CANVAS_H / 2;
      const avoidingControls = rectIntersectsAvoidZone(shellX, shellY, CANVAS_W, CANVAS_H, avoidRectsRef.current);

      const mascotVisible = !openRef.current && !avoidingControls && (isLocked || cursor.active);
      shell.style.opacity = mascotVisible ? "1" : "0";
      shell.style.pointerEvents = openRef.current || avoidingControls ? "none" : "auto";
      shell.style.transform = `translate3d(${shellX}px, ${shellY}px, 0)`;
      if (lockControl) {
        const lockVisible = !openRef.current && !avoidingControls && (lockControlVisibleRef.current || draggingRef.current);
        lockControl.style.opacity = lockVisible ? "1" : "0";
        lockControl.style.pointerEvents = lockVisible ? "auto" : "none";
        lockControl.style.transform = `translate3d(${shellX + 90}px, ${shellY + 10}px, 0)`;
      }

      const movingFrames = WALK_DIRECTION_FRAMES_BY_MODE[activeModeRef.current][motionDirection];
      const poseFrames = POSE_FRAMES_BY_MODE[activeModeRef.current];
      const movingFrameMs = motionDirection === "up" || motionDirection === "down" ? FLOAT_FRAME_MS : WALK_FRAME_MS;
      const motionCycleTime = Math.max(0, time - motionCycleStartRef.current);
      const directionSettling = motionKind !== "idle" && time - lastMotionDirectionSwitchRef.current < TURN_SETTLE_MS;
      const frame = motionKind === "walk" || motionKind === "float"
        ? movingFrames[directionSettling ? 0 : Math.floor(motionCycleTime / movingFrameMs) % movingFrames.length]
        : motionKind === "idle" && Math.floor(time / 520) % 5 === 0
          ? poseFrames.wave
          : poseFrames.idle;
      drawMascot(ctx, spriteRef.current, frame, time, {
        dx: visualDx,
        dy: visualDy,
        speed: visualSpeed,
        kind: motionKind,
        direction: motionDirection,
      });

      lastPosRef.current = { ...pos };
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        ref={shellRef}
        className="mascot-launcher"
        aria-label={`Open the hidden ${activeMode} game`}
        aria-hidden={open}
        data-mode={activeMode.toLowerCase()}
        data-dragging={dragging ? "true" : "false"}
        data-locked={locked ? "true" : "false"}
        data-open={open ? "true" : "false"}
        disabled={open}
        tabIndex={open ? -1 : 0}
        onPointerDown={handleMascotPointerDown}
        onPointerMove={handleMascotPointerMove}
        onPointerUp={handleMascotPointerUp}
        onPointerCancel={handleMascotPointerCancel}
        onPointerEnter={() => {
          hoverLockRef.current = true;
          if (lockedRef.current) revealLockControl(true);
        }}
        onPointerLeave={() => {
          if (!pressRef.current) hoverLockRef.current = false;
          if (!draggingRef.current) hideLockControlSoon(260);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          debugGame("mascot.keyOpen", {
            key: event.key,
            activeMode,
          });
          openGame();
        }}
        onClick={(event) => {
          event.stopPropagation();
          debugGame("mascot.click", {
            skipNextClick: skipNextClickRef.current,
            activeMode,
            open,
            activeElement: document.activeElement?.tagName,
          });
          if (open || skipNextClickRef.current) {
            event.preventDefault();
            skipNextClickRef.current = false;
            return;
          }
          openGame();
        }}
      >
        <canvas ref={canvasRef} />
        <div className="mascot-launcher-hint">
          {activeMode === "Design" ? "design" : "dev"}
        </div>
      </button>

      <button
        type="button"
        ref={lockControlRef}
        className="mascot-lock-control"
        aria-label={locked ? "Unlock mascot to follow cursor" : "Lock mascot in place"}
        aria-pressed={locked}
        data-locked={locked ? "true" : "false"}
        data-visible={lockControlVisible || dragging ? "true" : "false"}
        disabled={open}
        tabIndex={open ? -1 : 0}
        onPointerDown={(event) => {
          event.stopPropagation();
          revealLockControl(true);
        }}
        onPointerEnter={() => {
          hoverLockRef.current = true;
          revealLockControl(true);
        }}
        onPointerLeave={() => {
          hoverLockRef.current = false;
          if (!draggingRef.current) hideLockControlSoon(260);
        }}
        onClick={handleLockControlClick}
      >
        {locked
          ? <Unlock aria-hidden="true" size={15} strokeWidth={2.4} />
          : <Lock aria-hidden="true" size={15} strokeWidth={2.4} />}
        <span>{locked ? "unlock" : "lock"}</span>
      </button>

      <button
        type="button"
        className="mascot-key-launcher"
        aria-hidden={open}
        disabled={open}
        tabIndex={open ? -1 : 0}
        onClick={openGame}
      >
        Open hidden game
      </button>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="game-dialog-content"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onKeyDownCapture={preventGameKeyDefaults}
          onKeyUpCapture={preventGameKeyDefaults}
          onPointerDownOutside={(event) => {
            const guarded = window.performance.now() < dismissGuardUntilRef.current;
            debugGame("dialog.pointerDownOutside", {
              guarded,
              target: event.target instanceof HTMLElement ? event.target.tagName : "unknown",
            });
            if (guarded) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            const guarded = window.performance.now() < dismissGuardUntilRef.current;
            debugGame("dialog.interactOutside", {
              guarded,
              target: event.target instanceof HTMLElement ? event.target.tagName : "unknown",
            });
            if (guarded) event.preventDefault();
          }}
        >
          <DialogHeader className="game-dialog-header">
            <DialogTitle className="game-dialog-title">
              {category} {activeMode === "Design" ? "Design" : "Dev"} World
            </DialogTitle>
            <DialogDescription className="sr-only">
              Use arrows or A/D to move, Space or K to jump, Shift or J to run.
            </DialogDescription>
          </DialogHeader>
          <ModeGameToggle
            key={`${category}-${activeMode}-${open ? "open" : "closed"}`}
            category={category}
            activeMode={activeMode}
            counts={counts}
            onModeChange={onModeChange}
            autoFocusGame
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
