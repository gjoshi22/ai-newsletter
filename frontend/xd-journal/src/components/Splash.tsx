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

const LOG_MESSAGES = [
  { threshold: 8, text: "SYS // INIT KERNEL BOOT SEQUENCE... [OK]" },
  { threshold: 24, text: "NET // UPLINK SYNAPSE BRIDGE... [CONNECTED]" },
  { threshold: 42, text: "AI  // ALLOCATE NEURAL DENSE MEMORY... [OK]" },
  { threshold: 60, text: "DB  // DECRYPT ARTICLE MANIFEST GRAPH... [OK]" },
  { threshold: 78, text: "SEC // LOAD SHA-256 PARITY VERIFIERS... [OK]" },
  { threshold: 92, text: "SYS // COGNITIVE CORE STEADY STATE. WELCOME." }
];

function getStatusText(progress: number) {
  if (progress < 25) return "initializing core environment...";
  if (progress < 55) return "fetching neural datasets...";
  if (progress < 85) return "compiling dynamic indexes...";
  return "uplink handshake complete.";
}

export function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [showTap, setShowTap] = useState(false);
  const [tapClick, setTapClick] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const duration = prefersReducedMotion ? 900 : 2800;
    const interval = 16;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const elapsed = Math.min(currentStep / steps, 1);
      const eased = 1 - Math.pow(1 - elapsed, 2.8);
      const nextProgress = currentStep >= steps ? 100 : Math.min(Math.floor(eased * 100), 99);

      setProgress(nextProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setShowTap(true);
      }
    }, interval);

    return () => {
      clearInterval(timer);
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

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-[#060606] text-white outline-none select-none"
      data-cursor-hover={showTap ? true : undefined}
      role={showTap ? "button" : "status"}
      tabIndex={showTap ? 0 : -1}
      aria-label={showTap ? "Enter XD AI Journal" : `Loading XD AI Journal ${progress}%`}
      aria-live={showTap ? undefined : "polite"}
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: prefersReducedMotion ? 1 : 1.015,
        filter: prefersReducedMotion ? "none" : "blur(12px)",
      }}
      transition={{ duration: prefersReducedMotion ? 0.18 : 0.65, ease: [0.4, 0, 0.2, 1] }}
      onClick={showTap ? handleTap : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Top Telemetry Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start text-[0.55rem] font-mono tracking-[0.2em] text-[#FFE15A]/40 z-20">
        <div className="flex items-center gap-3">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FFE15A] animate-pulse" />
          <span>SYS // COGNITIVE_NODE:01</span>
        </div>
        <div className="hidden sm:flex gap-8">
          <span>MEM_ALLOC: {Math.floor(64 + progress * 0.32)}%</span>
          <span>BAUD_RATE: 9600</span>
          <span>NET_ROUTE: SECURE</span>
        </div>
        <div>
          <span>UPLINK: {progress === 100 ? "READY" : "BOOTING"}</span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-svh flex-col items-start justify-between p-8 md:p-14 pt-20 w-full">
        
        {/* Upper HUD Console - System Logs */}
        <div className="w-full max-w-[460px] bg-[#0b0b0b] border border-[#FFE15A]/15 p-4 font-mono text-[0.52rem] text-[#FFE15A]/70 flex flex-col gap-2 rounded-sm shadow-2xl mt-4">
          <div className="flex items-center justify-between border-b border-[#FFE15A]/15 pb-2 mb-1">
            <span className="text-[#FFE15A]/90 font-bold uppercase tracking-widest text-[0.56rem]">BOOT DIAGNOSTICS</span>
            <span className="animate-pulse text-[#FFE15A] flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-green-500" />
              ONLINE
            </span>
          </div>
          <div className="space-y-1.5 min-h-[92px] flex flex-col justify-end">
            {LOG_MESSAGES.map((msg, i) => {
              const isVisible = progress >= msg.threshold;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -5 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-2.5 ${isVisible ? 'flex' : 'hidden'}`}
                >
                  <span className="text-zinc-500">[{msg.threshold}%]</span>
                  <span className={msg.threshold === 92 ? "text-green-400 font-bold" : ""}>
                    {msg.text}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Lower Content: Logo, percentage loader, status */}
        <div className="w-full mt-auto">
          <AnimatedAsciiLogo reducedMotion={prefersReducedMotion} />

          <div className="flex items-baseline gap-4 mt-2">
            {/* Glowing Big Percentage in Monospace */}
            <motion.div
              className="relative select-none font-bold leading-none text-white"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: "clamp(4.2rem, 16vw, 11rem)",
                letterSpacing: "-0.04em",
                textShadow: "0 0 35px rgba(255, 225, 90, 0.1)",
              }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {String(progress).padStart(3, "0")}
              <span className="align-top font-mono text-[0.2em] font-bold text-[#FFE15A]/40">%</span>
            </motion.div>
          </div>

          {/* High-tech Segmented Loader Grid */}
          <div className="mt-4 grid w-full gap-4">
            <div className="flex gap-1.5 h-2.5 items-center">
              {Array.from({ length: 25 }).map((_, i) => {
                const active = progress >= (i + 1) * 4;
                return (
                  <div
                    key={i}
                    className="flex-1 h-full rounded-[1px] transition-all duration-300"
                    style={{
                      backgroundColor: active ? "#FFE15A" : "rgba(255,225,90,0.04)",
                      border: active ? "1px solid #FFE15A" : "1px solid rgba(255,225,90,0.06)",
                      boxShadow: active ? "0 0 8px rgba(255, 225, 90, 0.5), 0 0 15px rgba(255, 225, 90, 0.2)" : "none",
                      opacity: active ? 1 : 0.4
                    }}
                  />
                );
              })}
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-widest text-zinc-500">
              <span className="text-zinc-400">{getStatusText(progress)}</span>
              {showTap ? (
                <AnimatedTap show={showTap} tapped={tapClick} reducedMotion={prefersReducedMotion} />
              ) : (
                <span className="text-[#FFE15A] font-bold">{progress}%</span>
              )}
            </div>
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
                  color: force > 0.12 ? "#FFE15A" : "rgba(255,255,255,0.78)",
                  textShadow: force > 0.12 ? "0 0 15px rgba(255,225,90,0.6)" : "0 0 0 rgba(255,255,255,0)",
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
      className="relative overflow-hidden border border-[#FFE15A] bg-[#FFE15A]/10 px-5 py-2.5 font-mono text-[0.68rem] font-bold uppercase text-[#FFE15A] tracking-[0.2em] shadow-[0_0_15px_rgba(255,225,90,0.25)] rounded-sm cursor-pointer"
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: tapped ? 0 : 1,
        y: tapped ? -10 : 0,
        boxShadow: tapped 
          ? "0 0 0px rgba(255,225,90,0)" 
          : ["0 0 10px rgba(255,225,90,0.2)", "0 0 20px rgba(255,225,90,0.5)", "0 0 10px rgba(255,225,90,0.2)"],
      }}
      transition={
        tapped 
          ? { duration: 0.2 } 
          : { 
              opacity: { duration: 0.4 },
              y: { duration: 0.4 },
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
      }
    >
      {/* Gliding scanline indicator inside button */}
      <motion.div 
        className="absolute inset-0 bg-[#FFE15A]/10 pointer-events-none"
        style={{ height: "40%", top: 0, opacity: 0.6 }}
        animate={reducedMotion ? undefined : { y: ["0%", "250%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative z-10 flex items-center gap-2">
        <span className="text-neon inline-block animate-[pulse_1s_infinite]">▶</span>
        CLICK TO ENTER
      </span>
    </motion.span>
  );
}
