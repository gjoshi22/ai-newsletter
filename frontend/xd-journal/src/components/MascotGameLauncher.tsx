import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  POSE_FRAMES,
  SPRITE_PATHS,
  WALK_FRAMES,
  type SpriteRect,
} from "@/components/ModeGameToggle";
import { debugGame } from "@/lib/game-debug";

type MascotGameLauncherProps = {
  category: ArticleCategory;
  activeMode: ArticleSubCategory;
  counts: Record<ArticleSubCategory, number>;
  onModeChange: (mode: ArticleSubCategory) => void;
};

type LoadedSprite = HTMLCanvasElement | HTMLImageElement | null;

const CANVAS_W = 146;
const CANVAS_H = 146;
const CATCH_RADIUS = 118;
const LEASH_DISTANCE = 132;
const LEASH_FLOOR_OFFSET = 58;
const LONG_PRESS_MS = 360;
const DRAG_DISTANCE = 7;
const GAME_KEYS = new Set([" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "k", "shift", "j"]);
const CONTROL_AVOID_SELECTOR = ".mascot-preference-control";

function distance(x: number, y: number) {
  return Math.hypot(x, y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAvoidRects() {
  return [...document.querySelectorAll<HTMLElement>(CONTROL_AVOID_SELECTOR)]
    .map((element) => element.getBoundingClientRect());
}

function pointInAvoidZone(x: number, y: number) {
  return getAvoidRects().some((rect) => (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  ));
}

function rectIntersectsAvoidZone(left: number, top: number, width: number, height: number) {
  const right = left + width;
  const bottom = top + height;
  return getAvoidRects().some((rect) => (
    left < rect.right &&
    right > rect.left &&
    top < rect.bottom &&
    bottom > rect.top
  ));
}

function drawMascot(
  ctx: CanvasRenderingContext2D,
  sprite: LoadedSprite,
  frame: SpriteRect,
  facingLeft: boolean,
  time: number,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.imageSmoothingEnabled = false;

  const bob = Math.sin(time * 0.006) * 3;
  const sourceWMax = sprite ? sprite.width : 0;
  const sourcePad = sprite ? 24 : 0;
  const sourceX = Math.max(0, frame.x - sourcePad);
  const sourceW = sprite && sourceWMax
    ? Math.min(sourceWMax - sourceX, frame.w + sourcePad * 2)
    : frame.w;
  const sourceFrame = { x: sourceX, y: frame.y, w: sourceW, h: frame.h };
  const scale = Math.min((CANVAS_W * 0.9) / sourceFrame.w, (CANVAS_H * 0.92) / sourceFrame.h);
  const drawW = Math.round(sourceFrame.w * scale);
  const drawH = Math.round(sourceFrame.h * scale);
  const drawX = Math.round((CANVAS_W - drawW) / 2);
  const drawY = Math.round(CANVAS_H - drawH - 5 + bob);

  ctx.save();
  ctx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue("--neon").trim() || "#FFE15A";
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(CANVAS_W / 2, CANVAS_H - 8, drawW * 0.32, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  if (sprite) {
    if (facingLeft) {
      ctx.translate(CANVAS_W / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, sourceFrame.x, sourceFrame.y, sourceFrame.w, sourceFrame.h, -drawW / 2, drawY, drawW, drawH);
    } else {
      ctx.drawImage(sprite, sourceFrame.x, sourceFrame.y, sourceFrame.w, sourceFrame.h, drawX, drawY, drawW, drawH);
    }
  } else {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--neon").trim() || "#FFE15A";
    ctx.fillRect(drawX + drawW * 0.25, drawY + drawH * 0.16, drawW * 0.5, drawH * 0.78);
  }
  ctx.restore();
}

export function MascotGameLauncher({ category, activeMode, counts, onModeChange }: MascotGameLauncherProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dragging, setDragging] = useState(false);
  const shellRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<LoadedSprite>(null);
  const rafRef = useRef<number | null>(null);
  const cursorRef = useRef({ x: -220, y: -220, active: false });
  const cursorVelocityRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: -220, y: -220 });
  const lastPosRef = useRef({ x: -220, y: -220 });
  const facingLeftRef = useRef(false);
  const draggingRef = useRef(false);
  const hoverLockRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const holdTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const dismissGuardUntilRef = useRef(0);
  const skipNextClickRef = useRef(false);
  const pressRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

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
  }, []);

  useEffect(() => {
    setEnabled(!window.matchMedia("(hover: none)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const image = new Image();
    image.src = SPRITE_PATHS[activeMode];
    image.onload = () => {
      if (alive) spriteRef.current = makeTransparentSprite(image);
    };
    image.onerror = () => {
      if (alive) spriteRef.current = null;
    };
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [activeMode, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = cursorRef.current;
      const overControls = pointInAvoidZone(event.clientX, event.clientY);
      cursorVelocityRef.current = {
        x: overControls ? 0 : event.clientX - previous.x,
        y: overControls ? 0 : event.clientY - previous.y,
      };
      cursorRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: !overControls,
      };
    };
    const onPointerLeave = () => {
      cursorRef.current.active = false;
    };
    const onPointerEnter = () => {
      cursorRef.current.active = true;
    };
    const onPointerCancel = () => {
      clearHoldTimer();
      pressRef.current = null;
      draggingRef.current = false;
      setDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.documentElement.addEventListener("pointerenter", onPointerEnter);
    return () => {
      clearHoldTimer();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.documentElement.removeEventListener("pointerenter", onPointerEnter);
    };
  }, [enabled]);

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
      draggingRef.current = true;
      skipNextClickRef.current = true;
      setDragging(true);
      holdTimerRef.current = null;
    }, LONG_PRESS_MS);
  }, [activeMode, clearHoldTimer, open]);

  const handleMascotPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (distance(dx, dy) > DRAG_DISTANCE) {
      press.moved = true;
      if (draggingRef.current) skipNextClickRef.current = true;
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
  }, []);

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
    } else if (press.moved) {
      skipNextClickRef.current = true;
    }
    debugGame("mascot.pointerUp", {
      moved: press.moved,
      skipNextClick: skipNextClickRef.current,
      activeMode,
    });
    hoverLockRef.current = false;
    pressRef.current = null;
  }, [activeMode, clearHoldTimer]);

  const handleMascotPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    clearHoldTimer();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    hoverLockRef.current = false;
    pressRef.current = null;
    setDragging(false);
  }, [clearHoldTimer]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tick = (time: number) => {
      const cursor = cursorRef.current;
      const pos = posRef.current;
      const cursorDistance = distance(cursor.x - pos.x, cursor.y - pos.y);
      const velocity = cursorVelocityRef.current;
      const velocityMagnitude = distance(velocity.x, velocity.y);
      const direction = velocityMagnitude > 0.8
        ? { x: velocity.x / velocityMagnitude, y: velocity.y / velocityMagnitude }
        : { x: facingLeftRef.current ? -1 : 1, y: 0 };
      const restingSide = facingLeftRef.current ? 1 : -1;
      const leashTarget = velocityMagnitude > 0.8
        ? {
            x: cursor.x - direction.x * LEASH_DISTANCE,
            y: cursor.y - direction.y * LEASH_DISTANCE + LEASH_FLOOR_OFFSET,
          }
        : {
            x: cursor.x + restingSide * LEASH_DISTANCE,
            y: cursor.y + LEASH_FLOOR_OFFSET,
          };
      const maxX = window.innerWidth - CANVAS_W / 2 - 8;
      const maxY = window.innerHeight - CANVAS_H / 2 - 8;
      const target = draggingRef.current
        ? {
            x: cursor.x - dragOffsetRef.current.x,
            y: cursor.y - dragOffsetRef.current.y,
          }
        : (cursorDistance < CATCH_RADIUS || hoverLockRef.current)
          ? { x: pos.x, y: pos.y }
          : {
              x: clamp(leashTarget.x, CANVAS_W / 2 + 8, maxX),
              y: clamp(leashTarget.y, CANVAS_H / 2 + 8, maxY),
            };
      const follow = draggingRef.current ? 0.42 : 0.1;
      pos.x += (target.x - pos.x) * follow;
      pos.y += (target.y - pos.y) * follow;

      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;
      const speed = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.25) facingLeftRef.current = dx < 0;

      const shellX = pos.x - CANVAS_W / 2;
      const shellY = pos.y - CANVAS_H / 2;
      const avoidingControls = rectIntersectsAvoidZone(shellX, shellY, CANVAS_W, CANVAS_H);

      shell.style.opacity = cursor.active && !open && !avoidingControls ? "1" : "0";
      shell.style.pointerEvents = open || avoidingControls ? "none" : "auto";
      shell.style.transform = `translate3d(${shellX}px, ${shellY}px, 0)`;

      const frame = speed > 1.15
        ? WALK_FRAMES[Math.floor(time / 86) % WALK_FRAMES.length]
        : Math.floor(time / 480) % 5 === 0
          ? POSE_FRAMES.wave
          : POSE_FRAMES.idle;
      drawMascot(ctx, spriteRef.current, frame, facingLeftRef.current, time);

      lastPosRef.current = { ...pos };
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, open]);

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
        data-open={open ? "true" : "false"}
        disabled={open}
        tabIndex={open ? -1 : 0}
        onPointerDown={handleMascotPointerDown}
        onPointerMove={handleMascotPointerMove}
        onPointerUp={handleMascotPointerUp}
        onPointerCancel={handleMascotPointerCancel}
        onPointerEnter={() => { hoverLockRef.current = true; }}
        onPointerLeave={() => {
          if (!pressRef.current) hoverLockRef.current = false;
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
