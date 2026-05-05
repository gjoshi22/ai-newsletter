import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleCategory, ArticleSubCategory } from "@/lib/data";
import { debugGame } from "@/lib/game-debug";

type ModeGameToggleProps = {
  category: ArticleCategory;
  activeMode: ArticleSubCategory;
  counts: Record<ArticleSubCategory, number>;
  onModeChange: (mode: ArticleSubCategory) => void;
  showGame?: boolean;
  autoFocusGame?: boolean;
};

export type SpriteRect = { x: number; y: number; w: number; h: number };
type SpriteSource = HTMLImageElement | HTMLCanvasElement;
type GameTheme = ReturnType<typeof readTheme>;

type ToolLogo = { label: string; full: string; logo: string; power?: boolean };
type TokenLogoMap = Partial<Record<string, HTMLImageElement>>;
type SolidKind = "ground" | "brick" | "question" | "used";

type SolidBlock = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: SolidKind;
  tool?: ToolLogo;
  used: boolean;
  bounce: number;
  breakLife: number;
};

type Enemy = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  patrolLeft: number;
  patrolRight: number;
  speed: number;
  dead: boolean;
  dying: number;
  flip: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  text: string;
};

type Cloud = { x: number; y: number; scale: number };
type Hitbox = { offsetX: number; offsetY: number; w: number; h: number };

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hitbox: Hitbox;
  ax: number;
  standing: boolean;
  canJump: boolean;
  jumping: number;
  maxSpeed: number;
  moveAcc: number;
  level: number;
  invulnerable: number;
  powerPulse: number;
  jumpSquash: number;
  landSquash: number;
  facingLeft: boolean;
  dying: number;
  noInput: boolean;
};

type InputState = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
};

type GameState = {
  width: number;
  height: number;
  worldWidth: number;
  mode: ArticleSubCategory;
  stage: number;
  lives: number;
  running: boolean;
  complete: boolean;
  gameOver: boolean;
  readyPulse: number;
  player: Player;
  solids: SolidBlock[];
  enemies: Enemy[];
  clouds: Cloud[];
  sparks: Spark[];
  tokens: number;
  lastTime: number;
  camera: number;
  message: string;
};

const TOTAL_STAGES = 1;
const HUD_HEIGHT = 28;
const TILE = 32;
const GROUND_ROWS = 2;
const ASSET_BASE = import.meta.env.BASE_URL;
const ENEMY_PATH = `${ASSET_BASE}sprites/bumpy_single.png`;
const BUMPY_FRAME: SpriteRect = { x: 137, y: 61, w: 417, h: 433 };

const TOOL_BOXES: Record<ArticleSubCategory, ToolLogo[]> = {
  Design: [
    { label: "FIG", full: "Figma", logo: "figma" },
    { label: "CNV", full: "Canva", logo: "canva" },
    { label: "ADB", full: "Adobe", logo: "adobe" },
    { label: "VEE", full: "Veeva", logo: "veeva" },
  ],
  Development: [
    { label: "OAI", full: "OpenAI", logo: "openai" },
    { label: "ANT", full: "Anthropic", logo: "anthropic" },
    { label: "GEM", full: "Gemini", logo: "gemini" },
    { label: "CUR", full: "Cursor", logo: "cursor" },
  ],
};

const MODE_COPY: Record<ArticleSubCategory, { title: string; token: string }> = {
  Design: {
    title: "design",
    token: "design tokens",
  },
  Development: {
    title: "dev",
    token: "build tokens",
  },
};

const LEVEL_UP_BOX: ToolLogo = { label: "LVL", full: "Level up", logo: "levelup", power: true };

export const SPRITE_PATHS: Record<ArticleSubCategory, string> = {
  Design: `${ASSET_BASE}sprites/sher_sprite.png`,
  Development: `${ASSET_BASE}sprites/gj_dev_sprite.png`,
};

const TOKEN_LOGO_PATHS: Record<string, string> = {
  figma: `${ASSET_BASE}sprites/tokens/design/figma.svg`,
  canva: `${ASSET_BASE}sprites/tokens/design/canva.svg`,
  adobe: `${ASSET_BASE}sprites/tokens/design/adobe.svg`,
  veeva: `${ASSET_BASE}sprites/tokens/design/veeva.svg`,
  openai: `${ASSET_BASE}sprites/tokens/dev/openai.svg`,
  anthropic: `${ASSET_BASE}sprites/tokens/dev/anthropic.svg`,
  gemini: `${ASSET_BASE}sprites/tokens/dev/gemini.svg`,
  cursor: `${ASSET_BASE}sprites/tokens/dev/cursor.svg`,
};

export const WALK_FRAMES: SpriteRect[] = [
  { x: 74, y: 494, w: 138, h: 283 },
  { x: 277, y: 494, w: 139, h: 283 },
  { x: 470, y: 494, w: 146, h: 283 },
  { x: 672, y: 494, w: 133, h: 283 },
  { x: 860, y: 494, w: 141, h: 283 },
  { x: 1056, y: 494, w: 136, h: 283 },
];

export const POSE_FRAMES: Record<"idle" | "talk" | "happy" | "wave" | "think", SpriteRect> = {
  idle: { x: 79, y: 819, w: 140, h: 352 },
  talk: { x: 263, y: 819, w: 209, h: 352 },
  happy: { x: 527, y: 819, w: 172, h: 352 },
  wave: { x: 742, y: 819, w: 181, h: 352 },
  think: { x: 1008, y: 819, w: 152, h: 352 },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hsl(value: string, alpha?: number) {
  return alpha === undefined ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
}

export function makeTransparentSprite(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18 && min > 86 && max < 236) data[i + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function levelCode(stage: number) {
  return `1-${stage}`;
}

function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const foreground = css.getPropertyValue("--foreground").trim() || "0 0% 6%";
  const background = css.getPropertyValue("--background").trim() || "44 42% 95%";
  const muted = css.getPropertyValue("--muted-foreground").trim() || "0 0% 42%";
  const border = css.getPropertyValue("--border").trim() || "42 18% 78%";
  const neon = css.getPropertyValue("--neon").trim() || "#3D2400";
  return {
    ink: hsl(foreground),
    inkSoft: hsl(foreground, 0.72),
    inkFaint: hsl(foreground, 0.18),
    paper: css.getPropertyValue("--ascii-bg").trim() || "#f5edd6",
    panel: hsl(background),
    muted: hsl(muted),
    border: hsl(border),
    neon,
    neonDim: css.getPropertyValue("--neon-dim").trim() || "rgba(61,36,0,0.16)",
    tile: "#C9922E",
    tileDark: "#6D4214",
    tileLight: "#F0CF6E",
    skyTop: "#f8eedb",
    skyBottom: "#efe0bf",
  };
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lineWidth = 1) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function floorY(state: GameState) {
  return Math.floor(state.height - TILE * GROUND_ROWS);
}

function makeEnemy(x: number, groundTop: number, speed: number, worldWidth: number, patrol = 132): Enemy {
  const left = clamp(x - patrol, 48, worldWidth - 220);
  const right = clamp(x + patrol, left + 84, worldWidth - 150);
  return {
    x,
    y: groundTop - 34,
    w: 42,
    h: 34,
    vx: -Math.abs(speed),
    vy: 0,
    patrolLeft: left,
    patrolRight: right,
    speed: Math.abs(speed),
    dead: false,
    dying: 0,
    flip: 0,
  };
}

function playerSize(level: number) {
  const scale = level > 1 ? 1.08 : 1;
  return { w: 28 * scale, h: 74 * scale };
}

function playerHitbox(player: { w: number; h: number }): Hitbox {
  const hitH = Math.min(player.h, TILE * 2);
  const hitW = Math.min(player.w * 0.68, TILE * 0.74);
  return {
    offsetX: (player.w - hitW) / 2,
    offsetY: player.h - hitH,
    w: hitW,
    h: hitH,
  };
}

function makePlayer(level = 1): Player {
  const size = playerSize(level);
  const hitbox = playerHitbox(size);
  return {
    x: 54,
    y: 0,
    w: size.w,
    h: size.h,
    vx: 0,
    vy: 0,
    hitbox,
    ax: 0,
    standing: false,
    canJump: true,
    jumping: 0,
    maxSpeed: 150,
    moveAcc: 7.2,
    level,
    invulnerable: 0,
    powerPulse: 0,
    jumpSquash: 0,
    landSquash: 0,
    facingLeft: false,
    dying: 0,
    noInput: false,
  };
}

function makeStage(mode: ArticleSubCategory, width: number, height: number, stage: number) {
  const tools = TOOL_BOXES[mode];
  const worldWidth = Math.max(width * (1.25 + stage * 0.16), 980 + stage * 230);
  const groundTop = height - TILE * GROUND_ROWS;
  const solids: SolidBlock[] = [];
  const addBlock = (x: number, y: number, kind: SolidKind, tool?: ToolLogo) => {
    if (solids.some((block) => block.x === x && block.y === y)) return;
    solids.push({ x, y, w: TILE, h: TILE, kind, tool, used: kind === "used", bounce: 0, breakLife: 0 });
  };
  const addBrickRun = (x: number, y: number, count: number) => {
    for (let index = 0; index < count; index += 1) addBlock(x + index * TILE, y, "brick");
  };
  const toolAt = (slot: number) => tools[(slot + stage - 1) % tools.length];

  for (let x = 0; x < worldWidth; x += TILE) {
    addBlock(x, groundTop, "ground");
    addBlock(x, groundTop + TILE, "ground");
  }

  const atCol = (column: number) => column * TILE;
  const lowRow = groundTop - TILE * 4;
  const highRow = groundTop - TILE * 5;
  const stepRow = groundTop - TILE * 2;

  addBlock(atCol(8), lowRow, "question", toolAt(0));
  addBlock(atCol(12), lowRow, "brick");
  addBlock(atCol(13), lowRow, "question", LEVEL_UP_BOX);
  addBlock(atCol(14), lowRow, "brick");
  addBlock(atCol(14), highRow, "question", toolAt(1));
  addBlock(atCol(15), lowRow, "question", toolAt(2));
  addBlock(atCol(16), lowRow, "brick");
  addBrickRun(atCol(20), stepRow, 2);
  addBlock(atCol(24), lowRow, "brick");
  addBlock(atCol(25), lowRow, "question", toolAt(3));
  addBlock(atCol(26), lowRow, "brick");

  if (stage >= 2) {
    addBrickRun(atCol(29), highRow, 5);
    addBlock(atCol(34), highRow, "question", toolAt(4));
    addBlock(atCol(34), lowRow, "brick");
    addBrickRun(atCol(37), lowRow, 2);
    addBlock(atCol(39), lowRow, "question", LEVEL_UP_BOX);
    addBlock(atCol(40), lowRow, "brick");
    addBrickRun(atCol(35), stepRow, 2);
  }
  if (stage >= 3) {
    addBrickRun(atCol(43), highRow, 3);
    addBlock(atCol(46), highRow, "question", toolAt(5));
    addBlock(atCol(47), highRow, "brick");
    addBlock(atCol(48), lowRow, "brick");
    addBlock(atCol(49), lowRow, "question", toolAt(6));
    addBlock(atCol(50), lowRow, "brick");
    addBrickRun(atCol(44), stepRow, 2);
  }

  const enemies: Enemy[] = [
    makeEnemy(690, groundTop, 42, worldWidth, 118),
    makeEnemy(900 + stage * 38, groundTop, 40, worldWidth, 128),
    ...(stage >= 2 ? [makeEnemy(1058 + stage * 30, groundTop, 48, worldWidth, 110)] : []),
  ];

  const clouds: Cloud[] = [
    { x: 120, y: 62, scale: 0.9 },
    { x: 404, y: 86, scale: 0.7 },
    { x: 768, y: 54, scale: 1.05 },
    { x: 1050, y: 74, scale: 0.82 },
  ];

  return { worldWidth, solids, enemies, clouds };
}

function makeGame(mode: ArticleSubCategory, width: number, height: number): GameState {
  const stage = makeStage(mode, width, height, 1);
  const player = makePlayer(1);
  player.y = height - TILE * GROUND_ROWS - player.h;
  return {
    width,
    height,
    worldWidth: stage.worldWidth,
    mode,
    stage: 1,
    lives: 3,
    running: false,
    complete: false,
    gameOver: false,
    readyPulse: 0,
    player,
    solids: stage.solids,
    enemies: stage.enemies,
    clouds: stage.clouds,
    sparks: [],
    tokens: 0,
    lastTime: 0,
    camera: 0,
    message: "click to play",
  };
}

function hasGameProgress(state: GameState) {
  return (
    state.running ||
    state.complete ||
    state.gameOver ||
    state.tokens > 0 ||
    state.stage !== 1 ||
    state.player.x !== 54 ||
    state.message !== "click to play"
  );
}

function resizeActiveGame(state: GameState, width: number, height: number) {
  const dy = height - state.height;
  state.width = width;
  state.height = height;

  if (dy !== 0) {
    state.player.y += dy;
    state.solids.forEach((block) => { block.y += dy; });
    state.enemies.forEach((enemy) => { enemy.y += dy; });
    state.sparks.forEach((spark) => { spark.y += dy; });
  }

  state.camera = clamp(state.camera, 0, Math.max(0, state.worldWidth - state.width));
}

function resetStage(state: GameState, stageNumber: number, keepPower = true) {
  const stage = makeStage(state.mode, state.width, state.height, stageNumber);
  const level = keepPower ? state.player.level : 1;
  const player = makePlayer(level);
  player.y = floorY(state) - player.h;
  state.stage = stageNumber;
  state.worldWidth = stage.worldWidth;
  state.player = player;
  state.solids = stage.solids;
  state.enemies = stage.enemies;
  state.clouds = stage.clouds;
  state.sparks = [];
  state.camera = 0;
}

function resizePlayerToLevel(state: GameState, level: number) {
  state.player.level = clamp(level, 1, 3);
  const size = playerSize(state.player.level);
  state.player.y += state.player.h - size.h;
  state.player.w = size.w;
  state.player.h = size.h;
  state.player.hitbox = playerHitbox(state.player);
}

function pushLevelUpSparks(state: GameState, x: number, y: number, leftText = "LVL", rightText = "UP") {
  state.player.powerPulse = 1;
  state.sparks.push(
    { x: x - 18, y: y - 8, vx: -18, vy: -118, life: 1, text: leftText },
    { x: x + 18, y: y - 8, vx: 18, vy: -118, life: 1, text: rightText },
  );
}

function awardToken(state: GameState, x: number, y: number, text = "+1") {
  const previousLevel = state.player.level;
  state.tokens += 1;
  resizePlayerToLevel(state, Math.max(state.player.level, Math.min(3, 1 + Math.floor(state.tokens / 2))));
  state.sparks.push({ x, y, vx: 0, vy: -96, life: 1, text });

  if (state.player.level > previousLevel) {
    state.message = `level up ${state.player.level}`;
    pushLevelUpSparks(state, x, y);
  }
}

function awardLevelUp(state: GameState, x: number, y: number) {
  const previousLevel = state.player.level;
  resizePlayerToLevel(state, state.player.level + 1);
  state.sparks.push({ x, y, vx: 0, vy: -112, life: 1, text: "POWER" });
  if (state.player.level > previousLevel) {
    state.message = `level up ${state.player.level}`;
    pushLevelUpSparks(state, x, y);
  } else {
    state.message = "max level";
    pushLevelUpSparks(state, x, y, "MAX", "LVL");
  }
}

function solidHitbox(block: SolidBlock) {
  return { x: block.x, y: block.y - block.bounce * 8, w: block.w, h: block.h };
}

function activeSolids(state: GameState) {
  return state.solids.filter((block) => block.breakLife <= 0);
}

function bonkBlock(state: GameState, block: SolidBlock) {
  block.bounce = 1;
  if (block.kind === "question" && !block.used) {
    block.used = true;
    block.kind = "used";
    if (block.tool?.power) {
      awardLevelUp(state, block.x + block.w / 2, block.y - 4);
    } else {
      state.message = `${block.tool?.full.toLowerCase() ?? "token"} token`;
      awardToken(state, block.x + block.w / 2, block.y - 4);
    }
    return;
  }
  if (block.kind === "brick" && state.player.level > 1) {
    block.breakLife = 0.5;
    state.sparks.push({ x: block.x + 16, y: block.y + 8, vx: -30, vy: -128, life: 0.8, text: "*" });
    state.sparks.push({ x: block.x + 18, y: block.y + 8, vx: 30, vy: -128, life: 0.8, text: "*" });
  }
}

function entityHitbox(entity: { x: number; y: number; w: number; h: number; hitbox?: Hitbox }) {
  const hitbox = entity.hitbox ?? { offsetX: 0, offsetY: 0, w: entity.w, h: entity.h };
  return {
    x: entity.x + hitbox.offsetX,
    y: entity.y + hitbox.offsetY,
    w: hitbox.w,
    h: hitbox.h,
    offsetX: hitbox.offsetX,
    offsetY: hitbox.offsetY,
  };
}

function collideEntityWithWorld(
  entity: { x: number; y: number; w: number; h: number; vx: number; vy: number; standing?: boolean; hitbox?: Hitbox },
  state: GameState,
  dt: number,
  onBonk?: (block: SolidBlock) => void,
) {
  entity.x += entity.vx * dt;
  for (const block of activeSolids(state)) {
    const box = entityHitbox(entity);
    const hit = solidHitbox(block);
    if (!rectsOverlap(box, hit)) continue;
    if (entity.vx > 0) entity.x = hit.x - box.w - box.offsetX;
    else if (entity.vx < 0) entity.x = hit.x + hit.w - box.offsetX;
    entity.vx = 0;
  }

  entity.y += entity.vy * dt;
  if ("standing" in entity) entity.standing = false;
  for (const block of activeSolids(state)) {
    const box = entityHitbox(entity);
    const hit = solidHitbox(block);
    if (!rectsOverlap(box, hit)) continue;
    if (entity.vy > 0) {
      entity.y = hit.y - box.h - box.offsetY;
      entity.vy = 0;
      if ("standing" in entity) entity.standing = true;
    } else if (entity.vy < 0) {
      entity.y = hit.y + hit.h - box.offsetY;
      entity.vy = 0;
      onBonk?.(block);
    }
  }
}

function handlePlayerInput(player: Player, input: InputState) {
  if (player.noInput || player.dying > 0) return;
  player.maxSpeed = input.run ? 250 : 150;
  player.moveAcc = input.run ? 12.5 : 7.2;

  if (input.left) {
    player.ax = -player.moveAcc;
    player.facingLeft = true;
  } else if (input.right) {
    player.ax = player.moveAcc;
    player.facingLeft = false;
  } else {
    player.ax = 0;
    if (Math.abs(player.vx) < 8) player.vx = 0;
  }

  if (input.jump) {
    if (player.vy > 0) return;
    if (player.jumping > 0) {
      player.jumping -= 1;
    } else if (player.standing && player.canJump) {
      player.jumping = 20;
      player.canJump = false;
      player.standing = false;
      player.vy = -525;
      player.jumpSquash = 1;
    }
  } else {
    player.canJump = true;
    if (player.jumping > 0) {
      if (player.jumping <= 16 && player.vy < 0) player.vy = 0;
      player.jumping = 0;
    }
  }
}

function damagePlayer(state: GameState) {
  const player = state.player;
  if (player.invulnerable > 0) return;

  if (player.level > 1) {
    player.level = 1;
    const size = playerSize(1);
    player.y += player.h - size.h;
    player.w = size.w;
    player.h = size.h;
    player.hitbox = playerHitbox(player);
    player.invulnerable = 2;
    state.message = "power down";
    return;
  }

  state.lives = Math.max(0, state.lives - 1);
  if (state.lives <= 0) {
    const fresh = makeGame(state.mode, state.width, state.height);
    fresh.message = "game reset";
    gameRefAssign(state, fresh);
  } else {
    const lives = state.lives;
    resetStage(state, state.stage, false);
    state.lives = lives;
    state.running = true;
    state.message = "retry";
  }
}

function gameRefAssign(target: GameState, fresh: GameState) {
  Object.assign(target, fresh);
}

function updateGame(state: GameState, input: InputState, dt: number) {
  const player = state.player;
  handlePlayerInput(player, input);

  player.vx += player.ax * 60 * dt;
  if (player.ax === 0) player.vx *= Math.pow(0.82, dt * 60);
  if (Math.abs(player.vx) > player.maxSpeed) player.vx -= Math.sign(player.vx) * 3 * 60 * dt;
  player.vx = clamp(player.vx, -player.maxSpeed * 1.1, player.maxSpeed * 1.1);
  player.vy += 1050 * dt;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.powerPulse = Math.max(0, player.powerPulse - dt * 1.15);
  player.jumpSquash = Math.max(0, player.jumpSquash - dt * 7);
  player.landSquash = Math.max(0, player.landSquash - dt * 8);
  const wasStanding = player.standing;
  collideEntityWithWorld(player, state, dt, (block) => {
    player.jumping = 0;
    bonkBlock(state, block);
  });
  if (!wasStanding && player.standing && player.vy === 0) player.landSquash = 1;
  player.x = clamp(player.x, state.camera, state.worldWidth - player.w - 28);

  if (player.y > state.height + 80) damagePlayer(state);

  state.solids = state.solids
    .map((block) => ({
      ...block,
      bounce: Math.max(0, block.bounce - dt * 5),
      breakLife: Math.max(0, block.breakLife - dt),
    }))
    .filter((block) => !(block.kind === "brick" && block.breakLife > 0));

  state.enemies.forEach((enemy) => {
    if (enemy.dead) {
      enemy.dying = Math.max(0, enemy.dying - dt);
      return;
    }
    if (enemy.x - state.camera > state.width + 140) return;
    enemy.vy += 820 * dt;
    const previousX = enemy.x;
    collideEntityWithWorld(enemy, state, dt);
    if (enemy.x <= enemy.patrolLeft) {
      enemy.x = enemy.patrolLeft;
      enemy.vx = enemy.speed;
    } else if (enemy.x + enemy.w >= enemy.patrolRight) {
      enemy.x = enemy.patrolRight - enemy.w;
      enemy.vx = -enemy.speed;
    } else if (enemy.vx === 0 || (dt > 0 && Math.abs(enemy.x - previousX) < 0.01)) {
      enemy.vx = enemy.vx <= 0 ? enemy.speed : -enemy.speed;
    }
    if (enemy.x < state.camera - 80 || enemy.y > state.height + 80) enemy.dead = true;
  });

  state.enemies.forEach((enemy) => {
    if (enemy.dead || player.invulnerable > 0) return;
    const playerRect = entityHitbox(player);
    if (!rectsOverlap(playerRect, enemy)) return;
    if (player.vy > 0 && playerRect.y + playerRect.h - player.vy * dt <= enemy.y + 12) {
      enemy.dead = true;
      enemy.dying = 0.42;
      enemy.vx = 0;
      player.vy = -245;
      player.standing = false;
      state.message = "stomp";
      awardToken(state, enemy.x + enemy.w / 2, enemy.y, "+1");
    } else {
      damagePlayer(state);
    }
  });

  state.sparks = state.sparks
    .map((spark) => ({
      ...spark,
      x: spark.x + spark.vx * dt,
      y: spark.y + spark.vy * dt,
      vy: spark.vy + 210 * dt,
      life: spark.life - dt * 1.7,
    }))
    .filter((spark) => spark.life > 0);

  const scrollEdge = state.camera + state.width * 0.36;
  if (player.x > scrollEdge) state.camera = clamp(player.x - state.width * 0.36, 0, state.worldWidth - state.width);

  if (player.x > state.worldWidth - 86) {
    if (state.stage >= TOTAL_STAGES) {
      state.running = false;
      state.complete = true;
      state.message = "course clear";
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.standing = true;
      state.player.noInput = true;
      state.player.facingLeft = false;
      state.enemies = [];
      state.camera = clamp(state.worldWidth - state.width, 0, state.worldWidth - state.width);
      state.player.x = clamp(
        state.camera + Math.min(state.width * 0.58, state.width - 148),
        54,
        state.worldWidth - state.player.w - 124,
      );
      state.player.y = floorY(state) - state.player.h;
    } else {
      resetStage(state, state.stage + 1, true);
      state.running = true;
      state.message = `level ${levelCode(state.stage)}`;
    }
  }
}

function drawTokenLogo(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, logo: string, x: number, y: number, size: number, theme: GameTheme) {
  ctx.save();
  const logoBacking = logo === "cursor" ? "#ffffff" : "rgba(255, 247, 221, 0.9)";
  roundedRect(ctx, x - 2, y - 2, size + 4, size + 4, 5, logoBacking, theme.ink, 1);
  if (logo === "levelup") {
    ctx.fillStyle = theme.neon;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 2);
    ctx.lineTo(x + size - 3, y + 10);
    ctx.lineTo(x + size / 2 + 4, y + 10);
    ctx.lineTo(x + size / 2 + 4, y + size - 3);
    ctx.lineTo(x + size / 2 - 4, y + size - 3);
    ctx.lineTo(x + size / 2 - 4, y + 10);
    ctx.lineTo(x + 3, y + 10);
    ctx.closePath();
    ctx.fill();
  } else if (image?.complete && image.naturalWidth > 0) {
    const maxW = size - 2;
    const maxH = size - 2;
    const ratio = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const drawW = Math.max(1, Math.round(image.naturalWidth * ratio));
    const drawH = Math.max(1, Math.round(image.naturalHeight * ratio));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, Math.round(x + size / 2 - drawW / 2), Math.round(y + size / 2 - drawH / 2), drawW, drawH);
  } else {
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 10px "JetBrains Mono", monospace`;
    ctx.fillText(logo.slice(0, 2).toUpperCase(), x + size / 2, y + size / 2);
  }
  ctx.restore();
}

function drawBlock(ctx: CanvasRenderingContext2D, block: SolidBlock, time: number, theme: GameTheme, tokenLogos: TokenLogoMap) {
  const x = block.x;
  const y = block.y - block.bounce * 8;
  if (block.breakLife > 0) return;

  if (block.kind === "ground") {
    pixelRect(ctx, x, y, TILE, TILE, theme.tile);
    pixelRect(ctx, x, y, TILE, 4, theme.tileLight);
    pixelRect(ctx, x + TILE - 4, y, 4, TILE, theme.tileDark);
    pixelRect(ctx, x, y + TILE - 4, TILE, 4, theme.tileDark);
    pixelRect(ctx, x + 8, y + 9, 3, 3, theme.paper);
    pixelRect(ctx, x + 20, y + 18, 3, 3, theme.paper);
    return;
  }

  if (block.kind === "brick") {
    pixelRect(ctx, x, y, TILE, TILE, "#B8732B");
    pixelRect(ctx, x, y, TILE, 4, "#E6B15D");
    pixelRect(ctx, x, y + 14, TILE, 3, theme.tileDark);
    pixelRect(ctx, x + 14, y, 3, 14, theme.tileDark);
    pixelRect(ctx, x + 3, y + 17, 3, 14, theme.tileDark);
    pixelRect(ctx, x + 26, y + 17, 3, 14, theme.tileDark);
    pixelRect(ctx, x + TILE - 3, y, 3, TILE, theme.tileDark);
    pixelRect(ctx, x, y + TILE - 3, TILE, 3, theme.tileDark);
    return;
  }

  const fill = block.kind === "used" ? hsl("42 48% 78%") : theme.tile;
  const top = block.kind === "used" ? "#f7dfa2" : "#ffd66f";
  pixelRect(ctx, x, y, TILE, TILE, fill);
  pixelRect(ctx, x, y, TILE, 4, top);
  pixelRect(ctx, x, y, 4, TILE, top);
  pixelRect(ctx, x + TILE - 4, y, 4, TILE, theme.tileDark);
  pixelRect(ctx, x, y + TILE - 4, TILE, 4, theme.tileDark);
  pixelRect(ctx, x + 5, y + 5, TILE - 10, TILE - 10, block.kind === "used" ? hsl("42 42% 72%") : hsl("43 90% 62%"));

  if (block.kind === "used" || !block.tool) {
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 15px "JetBrains Mono", monospace`;
    ctx.fillText("-", x + TILE / 2, y + TILE / 2 - 3);
  } else {
    drawTokenLogo(ctx, tokenLogos[block.tool.logo], block.tool.logo, x + 6, y + 6, 20, theme);
  }
  if (block.kind === "question") {
    ctx.globalAlpha = 0.5 + Math.sin(time * 5 + x) * 0.15;
    pixelRect(ctx, x + TILE - 9, y + 5, 3, 3, theme.neon);
    ctx.globalAlpha = 1;
  }
}

function pickSpriteFrame(state: GameState, time: number): SpriteRect {
  const player = state.player;
  if (state.complete) return Math.floor(time / 220) % 2 === 0 ? POSE_FRAMES.happy : POSE_FRAMES.wave;
  if (state.gameOver) return POSE_FRAMES.think;
  if (!state.running) return Math.floor(time / 260) % 2 === 0 ? POSE_FRAMES.idle : POSE_FRAMES.wave;
  if (!player.standing) {
    if (player.vy < -160) return WALK_FRAMES[2];
    if (player.vy > 140) return POSE_FRAMES.talk;
    return WALK_FRAMES[3];
  }
  if (Math.abs(player.vx) < 12) return POSE_FRAMES.idle;
  const speed = clamp(Math.abs(player.vx), 50, 260);
  return WALK_FRAMES[Math.floor(time / (24000 / speed)) % WALK_FRAMES.length];
}

function drawHeroSprite(ctx: CanvasRenderingContext2D, sprite: SpriteSource | null, state: GameState, theme: GameTheme, time: number) {
  const frame = pickSpriteFrame(state, time);
  const player = state.player;
  const pulseLift = player.powerPulse > 0 ? Math.sin((1 - player.powerPulse) * Math.PI) : 0;
  const victoryLift = state.complete ? Math.sin(time * 0.008) * 7 + 6 : 0;
  const takeoff = player.jumpSquash;
  const landing = player.landSquash;
  const airborneStretch = player.standing ? 0 : clamp(Math.abs(player.vy) / 900, 0, 0.08);
  const scaleY = 1 + pulseLift * 0.12 + takeoff * 0.1 + airborneStretch - landing * 0.12 + (state.complete ? Math.sin(time * 0.011) * 0.035 : 0);
  const scaleX = 1 - takeoff * 0.06 + landing * 0.12 + (state.complete ? Math.cos(time * 0.011) * 0.035 : 0);
  const drawHeight = player.h * 1.18 * scaleY;
  const drawWidth = Math.round((frame.w / frame.h) * drawHeight);
  const stretchedWidth = Math.round(drawWidth * scaleX);
  const drawX = Math.round(player.x + player.w / 2 - stretchedWidth / 2);
  const drawY = Math.round(player.y + player.h - drawHeight - pulseLift * 8 - victoryLift);

  if (!sprite) {
    ctx.save();
    roundedRect(ctx, player.x, player.y, player.w, player.h, 8, theme.neon, theme.ink, 2);
    ctx.restore();
    return;
  }

  ctx.save();
  if (player.invulnerable > 0 && Math.floor(time / 80) % 2 === 0) ctx.globalAlpha = 0.4;
  ctx.imageSmoothingEnabled = false;
  if (player.facingLeft) {
    ctx.translate(drawX + stretchedWidth / 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, frame.x, frame.y, frame.w, frame.h, -stretchedWidth / 2, drawY, stretchedWidth, drawHeight);
  } else {
    ctx.drawImage(sprite, frame.x, frame.y, frame.w, frame.h, drawX, drawY, stretchedWidth, drawHeight);
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, theme: GameTheme, sprite: SpriteSource | null) {
  if (enemy.dead && enemy.dying <= 0) return;
  ctx.save();
  ctx.shadowColor = theme.neonDim;
  ctx.shadowBlur = enemy.dead ? 0 : 8;
  ctx.globalAlpha = enemy.dead ? Math.max(0.16, enemy.dying / 0.42) : 1;
  if (sprite) {
    ctx.imageSmoothingEnabled = false;
    const squash = enemy.dead ? 0.34 : 1 + Math.sin(time * 0.009 + enemy.x) * 0.03;
    const drawH = enemy.h * squash;
    ctx.drawImage(sprite, BUMPY_FRAME.x, BUMPY_FRAME.y, BUMPY_FRAME.w, BUMPY_FRAME.h, enemy.x, enemy.y + enemy.h - drawH, enemy.w, drawH);
  } else {
    roundedRect(ctx, enemy.x, enemy.y, enemy.w, enemy.h, 8, "#8f5b24", theme.ink, 2);
  }
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, theme: GameTheme) {
  const w = 52 * cloud.scale;
  const h = 22 * cloud.scale;
  roundedRect(ctx, cloud.x, cloud.y + h * 0.24, w * 0.48, h * 0.76, 10, "#fffaf0", theme.border, 1);
  roundedRect(ctx, cloud.x + w * 0.18, cloud.y, w * 0.4, h * 0.9, 10, "#fffef8", theme.border, 1);
  roundedRect(ctx, cloud.x + w * 0.46, cloud.y + h * 0.18, w * 0.42, h * 0.72, 10, "#fff7ea", theme.border, 1);
}

function drawNycSkyline(ctx: CanvasRenderingContext2D, state: GameState, theme: GameTheme, depth: number) {
  const baseY = floorY(state) - (depth === 1 ? 14 : 4);
  const parallax = depth === 1 ? 0.12 : 0.23;
  const alpha = depth === 1 ? 0.16 : 0.24;
  const module = depth === 1 ? 420 : 360;
  const widthSet = depth === 1 ? [38, 54, 30, 70, 46, 62, 34] : [44, 64, 34, 76, 52, 48, 68];
  const heightSet = depth === 1 ? [94, 132, 76, 118, 154, 102, 128] : [126, 176, 92, 154, 198, 116, 166];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(-state.camera * parallax, 0);
  for (let start = -module; start < state.worldWidth + state.width + module; start += module) {
    let x = start;
    widthSet.forEach((buildingW, index) => {
      const buildingH = heightSet[index];
      const top = baseY - buildingH;
      const fill = depth === 1 ? hsl("41 28% 52%") : theme.tileDark;
      pixelRect(ctx, x, top, buildingW, buildingH, fill);
      pixelRect(ctx, x, top, buildingW, 3, hsl("42 44% 68%"));
      if (index === 1 || index === 4) pixelRect(ctx, x + buildingW / 2 - 1, top - 26, 3, 26, fill);
      if (index === 3) pixelRect(ctx, x + 10, top - 14, buildingW - 20, 14, fill);
      ctx.globalAlpha = alpha * 0.76;
      for (let wy = top + 16; wy < baseY - 8; wy += 18) {
        for (let wx = x + 9; wx < x + buildingW - 8; wx += 16) pixelRect(ctx, wx, wy, 4, 7, theme.tileLight);
      }
      ctx.globalAlpha = alpha;
      x += buildingW + 12;
    });
  }
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, state: GameState, theme: GameTheme) {
  const sky = ctx.createLinearGradient(0, HUD_HEIGHT, 0, floorY(state));
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, state.width, state.height);
  drawNycSkyline(ctx, state, theme, 1);
  drawNycSkyline(ctx, state, theme, 2);
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.translate(-state.camera * 0.08, 0);
  state.clouds.forEach((cloud) => drawCloud(ctx, cloud, theme));
  ctx.restore();
}

function drawFlagpole(ctx: CanvasRenderingContext2D, state: GameState, theme: GameTheme) {
  const x = state.worldWidth - 58;
  const top = floorY(state) - 148;
  pixelRect(ctx, x, top, 5, 148, theme.ink);
  pixelRect(ctx, x - 6, floorY(state) - 6, 16, 6, theme.tileDark);
  pixelRect(ctx, x - 3, top - 4, 10, 10, theme.neon);
  const flagDrop = state.complete ? 96 : Math.min(80, state.tokens * 4);
  pixelRect(ctx, x + 5, top + flagDrop, 20, 14, theme.neon);
  pixelRect(ctx, x + 6, top + flagDrop + 2, 15, 10, theme.paper);
}

function drawCourseCompleteBadge(ctx: CanvasRenderingContext2D, state: GameState, theme: GameTheme, time: number) {
  const badgeW = Math.min(204, Math.max(150, state.width * 0.22));
  const badgeH = 104;
  const x = 14;
  const y = HUD_HEIGHT + 18;
  const shimmer = 0.42 + Math.sin(time * 0.006) * 0.12;

  ctx.save();
  ctx.globalAlpha = 0.96;
  pixelRect(ctx, x, y, badgeW, badgeH, theme.paper);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, badgeW, badgeH);

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = theme.ink;
  for (let stripe = -badgeH; stripe < badgeW; stripe += 14) {
    ctx.beginPath();
    ctx.moveTo(x + stripe, y + badgeH);
    ctx.lineTo(x + stripe + 7, y + badgeH);
    ctx.lineTo(x + stripe + badgeH + 7, y);
    ctx.lineTo(x + stripe + badgeH, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  pixelRect(ctx, x, y, badgeW, 8, theme.neon);
  pixelRect(ctx, x + badgeW - 12, y + 12, 5, 5, theme.neon);
  pixelRect(ctx, x + 10, y + badgeH - 16, 5, 5, theme.neon);

  ctx.fillStyle = theme.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `900 11px "JetBrains Mono", monospace`;
  ctx.fillText("COURSE", x + 16, y + 24);
  ctx.font = `900 19px "JetBrains Mono", monospace`;
  ctx.fillText("COMPLETE", x + 16, y + 42);

  ctx.globalAlpha = shimmer;
  ctx.fillStyle = theme.neon;
  ctx.font = `900 9px "JetBrains Mono", monospace`;
  ctx.fillText(`WORLD ${levelCode(state.stage)} CLEARED`, x + 16, y + 72);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.muted;
  ctx.font = `800 8px "JetBrains Mono", monospace`;
  ctx.fillText(`${state.tokens} ${MODE_COPY[state.mode].token}`, x + 16, y + 88);
  ctx.restore();
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  theme: GameTheme,
  time: number,
  sprite: SpriteSource | null,
  enemySprite: SpriteSource | null,
  tokenLogos: TokenLogoMap,
) {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.imageSmoothingEnabled = false;
  drawBackdrop(ctx, state, theme);

  ctx.save();
  ctx.translate(-state.camera, 0);
  state.solids.forEach((block) => drawBlock(ctx, block, time * 0.001, theme, tokenLogos));
  if (!state.complete) state.enemies.forEach((enemy) => drawEnemy(ctx, enemy, time, theme, enemySprite));
  drawFlagpole(ctx, state, theme);
  state.sparks.forEach((spark) => {
    ctx.font = `900 ${spark.text.length > 2 ? 10 : 15}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = clamp(spark.life, 0, 1);
    ctx.fillStyle = theme.neon;
    ctx.fillText(spark.text, spark.x, spark.y);
  });
  ctx.globalAlpha = 1;
  drawHeroSprite(ctx, sprite, state, theme, time);
  ctx.restore();

  pixelRect(ctx, 0, 0, state.width, HUD_HEIGHT, theme.ink);
  ctx.fillStyle = theme.paper;
  ctx.font = `900 9px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  ctx.fillText(`${state.mode === "Design" ? "DESIGN" : "DEV"} TOKENS`, 14, 10);
  ctx.fillText(String(state.tokens).padStart(2, "0"), 14, 22);
  ctx.fillText(`LEVEL ${levelCode(state.stage)}`, state.width * 0.33, 10);
  ctx.fillText(`LIFE ${state.lives}  LVL ${state.player.level}`, state.width * 0.33, 22);
  ctx.fillText(state.gameOver ? "GAME" : state.complete ? "COURSE" : "CLICK", state.width - 106, 10);
  ctx.fillText(state.gameOver ? "OVER" : state.complete ? "CLEAR" : "PLAY", state.width - 106, 22);

  if (state.complete) drawCourseCompleteBadge(ctx, state, theme, time);

  if (!state.running && !state.complete) {
    state.readyPulse += 0.04;
    const panelW = Math.min(414, state.width - 44);
    const panelX = (state.width - panelW) / 2;
    const panelY = state.height / 2 - 54;
    ctx.fillStyle = hsl("0 0% 0%", 0.15 + Math.sin(state.readyPulse) * 0.03);
    ctx.fillRect(0, HUD_HEIGHT, state.width, floorY(state) - HUD_HEIGHT);
    pixelRect(ctx, panelX, panelY, panelW, 96, theme.paper);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, 96);
    ctx.fillStyle = theme.ink;
    ctx.font = `900 16px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.complete ? "COURSE CLEAR" : "CLICK TO PLAY", state.width / 2, panelY + 28);
    ctx.font = `800 8px "JetBrains Mono", monospace`;
    ctx.fillText("ARROWS/A-D MOVE / SPACE-K JUMP / SHIFT-J RUN", state.width / 2, panelY + 52);
    ctx.fillText(state.complete ? "PRESS REPLAY TO PLAY AGAIN" : `WORLD ${levelCode(state.stage)} OF ${TOTAL_STAGES}`, state.width / 2, panelY + 70);
  }
}

export function ModeGameToggle({ category, activeMode, counts, onModeChange, showGame = true, autoFocusGame = false }: ModeGameToggleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false, run: false });
  const spriteRef = useRef<Record<ArticleSubCategory, SpriteSource | null>>({ Design: null, Development: null });
  const enemySpriteRef = useRef<SpriteSource | null>(null);
  const tokenLogoRef = useRef<TokenLogoMap>({});
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const gameRef = useRef<GameState>(makeGame(activeMode, 900, 312));
  const [hud, setHud] = useState({ tokens: 0, level: 1, lives: 3, message: "click to play", stage: 1 });

  const publishHud = useCallback(() => {
    const state = gameRef.current;
    setHud({ tokens: state.tokens, level: state.player.level, lives: state.lives, message: state.message, stage: state.stage });
  }, []);

  const reset = useCallback((mode: ArticleSubCategory) => {
    const canvas = canvasRef.current;
    const width = canvas ? Number(canvas.style.width.replace("px", "")) || 900 : 900;
    const height = canvas ? Number(canvas.style.height.replace("px", "")) || 312 : 312;
    debugGame("game.reset", {
      mode,
      width,
      height,
      activeElement: document.activeElement?.tagName,
    });
    gameRef.current = makeGame(mode, width, height);
    setHud({ tokens: 0, level: 1, lives: 3, message: "click to play", stage: 1 });
  }, []);

  const startGame = useCallback(() => {
    const state = gameRef.current;
    debugGame("game.start.request", {
      running: state.running,
      complete: state.complete,
      gameOver: state.gameOver,
      mode: state.mode,
      stage: state.stage,
      activeElement: document.activeElement?.tagName,
    });
    if (state.complete) {
      state.message = "press replay";
      publishHud();
      return;
    }
    if (state.gameOver) return;
    if (!state.running) {
      state.running = true;
      state.message = `level ${levelCode(state.stage)}`;
      publishHud();
    }
  }, [publishHud]);

  const replayGame = useCallback(() => {
    const canvas = canvasRef.current;
    const width = canvas ? Number(canvas.style.width.replace("px", "")) || 900 : 900;
    const height = canvas ? Number(canvas.style.height.replace("px", "")) || 312 : 312;
    debugGame("game.replay", {
      activeMode,
      width,
      height,
      activeElement: document.activeElement?.tagName,
    });
    const fresh = makeGame(activeMode, width, height);
    fresh.running = true;
    fresh.message = `level ${levelCode(fresh.stage)}`;
    inputRef.current = { left: false, right: false, jump: false, run: false };
    gameRef.current = fresh;
    setHud({ tokens: 0, level: 1, lives: 3, message: fresh.message, stage: fresh.stage });
    wrapRef.current?.focus();
  }, [activeMode]);

  useEffect(() => {
    if (!showGame) return;
    const images = {} as Record<ArticleSubCategory, HTMLImageElement>;
    (["Design", "Development"] as ArticleSubCategory[]).forEach((mode) => {
      const image = new Image();
      image.src = SPRITE_PATHS[mode];
      images[mode] = image;
      image.onload = () => { spriteRef.current[mode] = makeTransparentSprite(image); };
      image.onerror = () => { spriteRef.current[mode] = null; };
    });
    const enemyImage = new Image();
    enemyImage.src = ENEMY_PATH;
    enemyImage.onload = () => { enemySpriteRef.current = makeTransparentSprite(enemyImage); };
    enemyImage.onerror = () => { enemySpriteRef.current = null; };
    const tokenImages = Object.entries(TOKEN_LOGO_PATHS).map(([logo, path]) => {
      const image = new Image();
      image.src = path;
      image.onload = () => { tokenLogoRef.current = { ...tokenLogoRef.current, [logo]: image }; };
      image.onerror = () => {
        const nextLogos = { ...tokenLogoRef.current };
        delete nextLogos[logo];
        tokenLogoRef.current = nextLogos;
      };
      return image;
    });
    return () => {
      Object.values(images).forEach((image) => { image.onload = null; image.onerror = null; });
      enemyImage.onload = null;
      enemyImage.onerror = null;
      tokenImages.forEach((image) => { image.onload = null; image.onerror = null; });
    };
  }, [showGame]);

  useEffect(() => { reset(activeMode); }, [activeMode, reset]);

  useEffect(() => {
    if (!showGame) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const minHeight = rect.width < 560 ? 330 : 460;
      const height = Math.max(minHeight, Math.floor(Math.min(620, Math.max(minHeight, rect.width * 0.4))));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const sizeChanged = lastSizeRef.current.width !== width || lastSizeRef.current.height !== height;
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      if (canvas.style.width !== `${width}px`) canvas.style.width = `${width}px`;
      if (canvas.style.height !== `${height}px`) canvas.style.height = `${height}px`;

      if (!sizeChanged) return;

      const state = gameRef.current;
      if (hasGameProgress(state)) {
        debugGame("game.resize.preserve", {
          width,
          height,
          rectWidth: Math.floor(rect.width),
          rectHeight: Math.floor(rect.height),
          mode: state.mode,
          wasRunning: state.running,
          activeElement: document.activeElement?.tagName,
        });
        resizeActiveGame(state, width, height);
        lastSizeRef.current = { width, height };
        return;
      }

      debugGame("game.resize", {
        width,
        height,
        rectWidth: Math.floor(rect.width),
        rectHeight: Math.floor(rect.height),
        mode: state.mode,
        wasRunning: state.running,
        activeElement: document.activeElement?.tagName,
      });
      lastSizeRef.current = { width, height };
      gameRef.current = makeGame(gameRef.current.mode, width, height);
      setHud({ tokens: 0, level: 1, lives: 3, message: "click to play", stage: 1 });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [showGame]);

  useEffect(() => {
    if (!showGame || !autoFocusGame) return;
    const frame = window.requestAnimationFrame(() => {
      debugGame("game.focus", {
        activeElementBefore: document.activeElement?.tagName,
      });
      wrapRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocusGame, showGame]);

  useEffect(() => {
    if (!showGame) return;
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "a"].includes(key)) inputRef.current.left = value;
      else if (["arrowright", "d"].includes(key)) inputRef.current.right = value;
      else if ([" ", "k", "arrowup", "w"].includes(key)) inputRef.current.jump = value;
      else if (["shift", "j"].includes(key)) inputRef.current.run = value;
      else return;
      debugGame("game.key", {
        key: event.key,
        value,
        defaultPrevented: event.defaultPrevented,
        activeElement: document.activeElement?.tagName,
      });
      event.preventDefault();
      const state = gameRef.current;
      if (value && !state.complete && !state.gameOver) startGame();
    };
    const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
    const onKeyUp = (event: KeyboardEvent) => setKey(event, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [showGame, startGame]);

  useEffect(() => {
    if (!showGame) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = (time: number) => {
      const state = gameRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dt = state.lastTime ? clamp((time - state.lastTime) / 1000, 0, 0.033) : 0;
      state.lastTime = time;

      if (state.running && !state.complete && !state.gameOver) {
        updateGame(state, inputRef.current, dt);
        publishHud();
      }

      drawWorld(ctx, gameRef.current, readTheme(), time, spriteRef.current[gameRef.current.mode], enemySpriteRef.current, tokenLogoRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [publishHud, showGame]);

  if (!showGame) {
    return (
      <section className="mode-toggle-shell" aria-label={`${category} design and development selector`}>
        <div className="mode-toggle-tabs" role="tablist" aria-label="Choose collection mode">
          {(["Design", "Development"] as ArticleSubCategory[]).map((mode) => {
            const active = activeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                data-cursor-hover
                data-mode={mode.toLowerCase()}
                className={`mode-toggle-tab ${active ? "mode-toggle-tab-active" : ""}`}
                onClick={() => onModeChange(mode)}
              >
                <span>{MODE_COPY[mode].title}</span>
                <strong>{counts[mode]}</strong>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="mode-game-shell" aria-label={`${category} design and development selector`}>
      <div className="mode-game-topline">
        <div>
          <p className="font-mono text-[0.55rem] tracking-[0.22em] uppercase text-neon">/{category.toLowerCase()}.world</p>
          <p className="font-mono text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground mt-1">
            {showGame
              ? `${hud.message} /// level ${levelCode(hud.stage)} /// ${hud.tokens} ${MODE_COPY[activeMode].token} /// level ${hud.level} /// life ${hud.lives}`
              : `${MODE_COPY[activeMode].title} mode /// ${counts[activeMode]} dispatches /// ${category.toLowerCase()}.grid`}
          </p>
        </div>
        <div className="mode-game-controls">
          <div className="mode-game-tabs" role="tablist" aria-label="Choose collection mode">
            {(["Design", "Development"] as ArticleSubCategory[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={activeMode === mode}
                data-cursor-hover
                className={`mode-game-tab ${activeMode === mode ? "mode-game-tab-active" : ""}`}
                onClick={() => onModeChange(mode)}
              >
                <span>{MODE_COPY[mode].title}</span>
                <strong>{counts[mode]} files</strong>
              </button>
            ))}
          </div>
          {showGame && (
            <button type="button" className="mode-game-replay" data-cursor-hover onClick={replayGame}>
              replay
            </button>
          )}
        </div>
      </div>

      {showGame && (
        <div
          ref={wrapRef}
          className="mode-game-canvas-frame"
          tabIndex={0}
          data-cursor-hover
          onClick={() => {
            debugGame("game.frame.click", {
              activeElement: document.activeElement?.tagName,
            });
            wrapRef.current?.focus();
            startGame();
          }}
        >
          <canvas ref={canvasRef} aria-label={`${activeMode} platformer. Click to play. Use arrows or A/D to move, Space or K to jump, Shift or J to run.`} />
          <div className="mode-game-caption">
            <span>{MODE_COPY[activeMode].title} mode /// click to play</span>
            <span>arrows or A/D /// space to jump /// shift to run</span>
          </div>
        </div>
      )}
    </section>
  );
}
