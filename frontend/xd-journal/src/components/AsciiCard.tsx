import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, useCallback } from "react";
import { Link } from "wouter";
import type { Article } from "@/lib/data";
import { parseContentDate } from "@/lib/date";

interface AsciiCardProps {
  article: Article;
  index: number;
  isSeen?: boolean;
  onSeen?: () => void;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function AsciiCard({ article, index, isSeen, onSeen }: AsciiCardProps) {
  const d = parseContentDate(article.date);
  const dateStr = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const num = String(index + 1).padStart(2, "0");
  const articleHref = `/dispatch/${article.slug}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sX = useSpring(rotX, { stiffness: 280, damping: 26 });
  const sY = useSpring(rotY, { stiffness: 280, damping: 26 });
  const glow = useMotionValue(0);
  const glowS = useSpring(glow, { stiffness: 180, damping: 20 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    rotX.set(-((e.clientY - top) / height - 0.5) * 10);
    rotY.set(((e.clientX - left) / width - 0.5) * 10);
    glow.set(1);
  }, [rotX, rotY, glow]);

  const onLeave = useCallback(() => {
    rotX.set(0); rotY.set(0); glow.set(0);
  }, [rotX, rotY, glow]);

  return (
    <motion.div
      style={{ perspective: "900px" }}
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: Math.min(index * 0.07, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
      onViewportEnter={onSeen}
    >
      <Link
        href={articleHref}
        data-cursor-hover
        aria-label={`Read ${article.title}`}
        className="group block h-full focus-visible:outline-none"
      >
        <motion.article
          ref={cardRef}
          className="article-card h-full"
          style={{
            rotateX: sX,
            rotateY: sY,
            transformStyle: "preserve-3d",
            boxShadow: glowS.get() > 0.5
              ? "0 0 0 1px var(--neon-dim), 0 16px 48px rgba(0,0,0,0.45), 0 0 60px var(--neon-dim)"
              : undefined,
          }}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {/* ── Image panel ── */}
          <div
            className="relative overflow-hidden block"
            style={{ minHeight: 160, background: "var(--ascii-bg)" }}
          >
            {article.image ? (
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
                style={{ minHeight: 160, display: "block" }}
              />
            ) : (
              /* Placeholder: category label + grid texture */
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: "var(--ascii-bg)",
                  backgroundImage:
                    "repeating-linear-gradient(0deg,transparent 0,transparent 22px,hsl(var(--foreground)/0.04) 22px,hsl(var(--foreground)/0.04) 23px)," +
                    "repeating-linear-gradient(90deg,transparent 0,transparent 22px,hsl(var(--foreground)/0.04) 22px,hsl(var(--foreground)/0.04) 23px)",
                }}
              >
                <span
                  className="font-mono tracking-[0.22em] uppercase select-none"
                  style={{ fontSize: "0.6rem", color: "var(--ascii-fg)", opacity: 0.28 }}
                >
                  {article.subCategory}
                </span>
              </div>
            )}

            {/* Issue number watermark */}
            <span
              className="absolute bottom-1.5 right-3 font-mono font-black select-none pointer-events-none"
              style={{
                fontSize: "3.8rem",
                lineHeight: 1,
                color: article.image ? "#fff" : "var(--ascii-fg)",
                opacity: 0.08,
                mixBlendMode: article.image ? "overlay" : "normal",
              }}
            >
              {num}
            </span>

            {/* Category + NEW badge */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              {!article.image && (
                <span
                  className="font-mono text-[0.58rem] tracking-[0.2em] uppercase"
                  style={{ color: "var(--ascii-fg)", opacity: 0.55 }}
                >
                  {article.subCategory}
                </span>
              )}
              {article.isNew && (
                <span className={`badge-new ${!article.image ? "" : "ml-auto"}`}>NEW</span>
              )}
            </div>

            {/* Bottom gold sweep on hover */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{ background: "var(--neon)", scaleX: glowS, originX: 0 }}
            />
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col flex-1 p-5 gap-3">
            <span className="font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
              {dateStr}
            </span>

            <h3 className="font-sans font-bold text-[1.05rem] leading-[1.28] text-foreground group-hover:text-neon transition-colors duration-200">
              {article.title}
            </h3>

            <p className="font-mono text-[0.7rem] text-muted-foreground leading-[1.8] line-clamp-3 flex-1">
              {article.excerpt}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
              <span className="font-mono text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground">
                {article.category}
              </span>
              <span className="font-mono text-[0.65rem] tracking-wide transition-all duration-200 flex items-center gap-2">
                {isSeen && (
                  <span
                    className="font-mono text-[0.55rem] tracking-[0.18em] uppercase select-none"
                    style={{ color: "var(--neon)", opacity: 0.38 }}
                  >
                    [seen]
                  </span>
                )}
                <span className="text-neon opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  read →
                </span>
              </span>
            </div>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}
