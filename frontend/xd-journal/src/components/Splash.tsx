import { motion, useReducedMotion } from "framer-motion";
import { type KeyboardEvent, type PointerEvent, useEffect, useState } from "react";

interface SplashProps {
  onComplete: () => void;
}

const SPLASH_ASCII = `
██╗  ██╗██████╗      █████╗ ██╗
╚██╗██╔╝██╔══██╗    ██╔══██╗██║
 ╚███╔╝ ██║  ██║    ███████║██║
 ██╔██╗ ██║  ██║    ██╔══██║██║
██╔╝ ██╗██████╔╝    ██║  ██║██║
╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚═╝
`;

const STREAM_GLYPHS = ["01", "10", "AI", "XD", "//", "::", "[]", "<>", "++", "##"];
const SIGNAL_STREAMS = Array.from({ length: 28 }, (_, column) => ({
  left: `${(column * 17) % 100}%`,
  delay: (column % 9) * 0.18,
  duration: 3.8 + (column % 7) * 0.34,
  opacity: 0.16 + (column % 5) * 0.024,
  hoverX: ((column % 7) - 3) * 10,
  hoverY: ((column % 5) - 2) * 8,
  hoverRotate: ((column % 6) - 2.5) * 1.2,
  glyphs: Array.from({ length: 18 }, (_, row) => STREAM_GLYPHS[(column * 3 + row * 2) % STREAM_GLYPHS.length]).join("\n"),
}));

function getStatusText(progress: number) {
  if (progress < 30) return "init environment...";
  if (progress < 60) return "loading knowledge base...";
  if (progress < 90) return "building neural index...";
  return "ready.";
}

export function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [showTap, setShowTap] = useState(false);
  const [tapClick, setTapClick] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const duration = prefersReducedMotion ? 900 : 2600;
    const interval = 16;
    const steps = duration / interval;
    let currentStep = 0;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

    const timer = setInterval(() => {
      currentStep += 1;
      const elapsed = Math.min(currentStep / steps, 1);
      const eased = 1 - Math.pow(1 - elapsed, 2.35);
      const nextProgress = currentStep >= steps ? 100 : Math.min(Math.floor(eased * 100), 99);

      setProgress(nextProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        readyTimer = setTimeout(() => setShowTap(true), prefersReducedMotion ? 80 : 240);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, [prefersReducedMotion]);

  const handleTap = () => {
    if (!showTap || tapClick) return;
    setTapClick(true);
    setTimeout(onComplete, prefersReducedMotion ? 120 : 620);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!showTap || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    handleTap();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    setPointer({
      x: event.clientX / window.innerWidth - 0.5,
      y: event.clientY / window.innerHeight - 0.5,
      active: true,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-[#030303] text-white outline-none"
      data-cursor-hover={showTap ? true : undefined}
      role={showTap ? "button" : "status"}
      tabIndex={showTap ? 0 : -1}
      aria-label={showTap ? "Enter XD AI Journal" : `Loading XD AI Journal ${progress}%`}
      aria-live={showTap ? undefined : "polite"}
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: prefersReducedMotion ? 1 : 1.025,
        filter: prefersReducedMotion ? "none" : "blur(10px)",
      }}
      transition={{ duration: prefersReducedMotion ? 0.18 : 0.62, ease: [0.4, 0, 0.2, 1] }}
      onClick={showTap ? handleTap : undefined}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointer((current) => ({ ...current, active: false }))}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0px, transparent 5px, rgba(255,255,255,0.2) 6px)",
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {SIGNAL_STREAMS.map((stream, index) => (
          <motion.pre
            key={index}
            className="absolute top-[-34%] font-mono text-[0.52rem] leading-4 text-[#FFE15A]"
            style={{
              left: stream.left,
              opacity: pointer.active ? Math.min(stream.opacity + 0.1, 0.42) : stream.opacity,
              x: pointer.active ? pointer.x * stream.hoverX : 0,
              rotate: pointer.active ? pointer.y * stream.hoverRotate : 0,
            }}
            initial={{ y: "-18%" }}
            animate={prefersReducedMotion ? undefined : { y: "170%" }}
            transition={{
              duration: stream.duration,
              repeat: Infinity,
              delay: stream.delay,
              ease: "linear",
            }}
          >
            {stream.glyphs}
          </motion.pre>
        ))}
      </div>

      <div className="relative z-10 flex min-h-svh flex-col items-start justify-end p-8 md:p-14">
        <AnimatedAsciiLogo reducedMotion={prefersReducedMotion} />

        <motion.div
          className="relative select-none font-sans font-black leading-none"
          style={{
            fontFamily: '"Inter", "Arial Black", "Helvetica Neue", Arial, sans-serif',
            fontSize: "clamp(4.7rem, 24vw, 20rem)",
            letterSpacing: 0,
          }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {String(progress).padStart(3, "0")}
          <span className="align-top font-mono text-[0.19em] font-bold text-zinc-500">%</span>
        </motion.div>

        <div className="mt-5 grid w-full gap-3">
          <div className="relative h-px overflow-hidden bg-zinc-800">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, transparent 0px, transparent 11px, rgba(255,255,255,0.36) 12px, rgba(255,255,255,0.36) 13px)",
              }}
            />
            <motion.div
              className="relative h-full bg-white"
              style={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.05 }}
            />
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-widest text-zinc-500">
            <span>{getStatusText(progress)}</span>
            {showTap ? (
              <AnimatedTap show={showTap} tapped={tapClick} reducedMotion={prefersReducedMotion} />
            ) : (
              <span>{progress}%</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedAsciiLogo({ reducedMotion }: { reducedMotion: boolean | null }) {
  const lines = SPLASH_ASCII.trimEnd().split("\n");
  const maxColumns = Math.max(...lines.map((line) => line.length));
  const [logoPointer, setLogoPointer] = useState({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    active: false,
  });

  const handleLogoPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setLogoPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      active: true,
    });
  };

  return (
    <motion.div
      className="mb-6 inline-block font-mono text-[0.45rem] leading-tight text-white/75 sm:text-[0.6rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.18, duration: 0.5 }}
      onPointerMove={handleLogoPointerMove}
      onPointerLeave={() => setLogoPointer((current) => ({ ...current, active: false }))}
      aria-label="XD AI"
      role="img"
    >
      {lines.map((line, row) => (
        <div key={`${line}-${row}`} className="whitespace-pre">
          {Array.from(line).map((char, column) => {
            const isTile = char !== " ";
            const seed = row * 31 + column * 17;
            const cellW = logoPointer.width / maxColumns;
            const cellH = logoPointer.height / lines.length;
            const tileX = (column + 0.5) * cellW;
            const tileY = (row + 0.5) * cellH;
            const dx = tileX - logoPointer.x;
            const dy = tileY - logoPointer.y;
            const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
            const radius = Math.max(46, Math.min(92, logoPointer.width * 0.18));
            const influence = logoPointer.active && isTile && !reducedMotion
              ? Math.max(0, 1 - distance / radius)
              : 0;
            const force = influence * influence;
            const jitterX = Math.sin(seed * 1.37) * 2.2 * force;
            const jitterY = Math.cos(seed * 1.91) * 1.8 * force;
            return (
              <motion.span
                key={`${row}-${column}`}
                className="inline-block"
                aria-hidden
                animate={{
                  x: force ? (dx / distance) * 17 * force + jitterX : 0,
                  y: force ? (dy / distance) * 13 * force + jitterY : 0,
                  rotate: force ? ((seed % 13) - 6) * 2.2 * force : 0,
                  scale: force ? 1 + 0.18 * force : 1,
                  opacity: isTile ? 0.74 + 0.26 * influence : 1,
                  color: force > 0.12 ? "#ffffff" : "rgba(255,255,255,0.78)",
                  textShadow: force > 0.12 ? "0 0 12px rgba(255,255,255,0.34)" : "0 0 0 rgba(255,255,255,0)",
                }}
                transition={{ type: "spring", stiffness: 430, damping: 20, mass: 0.28 }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}

function AnimatedTap({
  show,
  tapped,
  reducedMotion,
}: {
  show: boolean;
  tapped: boolean;
  reducedMotion: boolean | null;
}) {
  if (!show) return null;

  return (
    <motion.span
      className="border border-[#65D3FF]/50 bg-[#65D3FF]/10 px-4 py-2 font-mono text-[0.64rem] uppercase text-[#65D3FF]"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: tapped ? 0 : reducedMotion ? 1 : [0, 1, 0.66, 1],
        y: tapped ? -8 : 0,
        scale: tapped ? 0.96 : 1,
      }}
      transition={tapped ? { duration: 0.18 } : { duration: 1.25, repeat: reducedMotion ? 0 : Infinity }}
    >
      tap to enter
    </motion.span>
  );
}
