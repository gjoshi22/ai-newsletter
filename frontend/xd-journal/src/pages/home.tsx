import { useMemo, useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { AsciiCard } from "@/components/AsciiCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { CustomCursor } from "@/components/CustomCursor";
import { HeroAsciiCanvas } from "@/components/HeroAsciiCanvas";
import { articles } from "@/lib/data";
import { useSeenArticles } from "@/hooks/useSeenArticles";

/* ── Scroll progress ── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

/* ── FitText: fits text to parent width, with optional size cap ── */
function FitText({ children, maxSize }: { children: string; maxSize?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    let alive = true;
    let rafId: number;
    const fit = () => {
      if (!alive || !ref.current) return;
      const w = parent.clientWidth;
      if (!w) return;
      let lo = 10, hi = maxSize ?? 700;
      el.style.fontSize = `${hi}px`;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        el.scrollWidth <= w ? (lo = mid) : (hi = mid);
      }
      el.style.fontSize = `${lo}px`;
    };
    fit();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(fit); });
    ro.observe(parent);
    return () => { alive = false; cancelAnimationFrame(rafId); ro.disconnect(); };
  }, [children, maxSize]);

  return <div ref={ref} style={{ whiteSpace: "nowrap", willChange: "font-size", display: "block" }}>{children}</div>;
}

/* ── Ticker ── */
function Ticker() {
  const doubled = [...articles.slice(0, 8), ...articles.slice(0, 8)];
  return (
    <div className="border-t border-b border-border overflow-hidden" style={{ background: "var(--ticker-bg)" }}>
      <div className="marquee-track py-[8px]">
        {doubled.map((a, i) => (
          <span key={i} className="flex items-center shrink-0">
            <span className="font-mono text-[0.58rem] tracking-[0.16em] uppercase px-4 text-neon" style={{ opacity: 0.8 }}>
              [{a.subCategory.slice(0, 3)}]
            </span>
            <span className="font-mono text-[0.58rem] text-muted-foreground tracking-wide pr-8">{a.title}</span>
            <span className="font-mono text-[0.45rem] text-muted-foreground pr-4" style={{ opacity: 0.3 }}>::</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Scroll cue — inline between tagline pieces ── */
function ScrollCue() {
  const [hidden, setHidden] = useState(true);
  const reappearTimer = useRef<number | null>(null);
  useEffect(() => {
    const clearReappear = () => {
      if (reappearTimer.current !== null) {
        window.clearTimeout(reappearTimer.current);
        reappearTimer.current = null;
      }
    };

    const syncCue = () => {
      const atTop = window.scrollY <= 24;
      if (!atTop) {
        clearReappear();
        setHidden(true);
        return;
      }

      clearReappear();
      reappearTimer.current = window.setTimeout(() => {
        setHidden(false);
        reappearTimer.current = null;
      }, 650);
    };

    syncCue();
    window.addEventListener("scroll", syncCue, { passive: true });
    return () => {
      clearReappear();
      window.removeEventListener("scroll", syncCue);
    };
  }, []);
  return (
    <motion.div
      className="flex items-center gap-2 pointer-events-none select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ delay: hidden ? 0 : 0.12, duration: hidden ? 0.18 : 0.35 }}
    >
      <motion.div
        style={{ width: 1, height: 28, background: "var(--neon)", originY: 0 }}
        animate={{ scaleY: [0.12, 1, 0.12] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="font-mono text-[0.5rem] tracking-[0.26em] uppercase text-muted-foreground">scroll</span>
    </motion.div>
  );
}

/* ── Home ── */
export default function Home() {
  const { markSeen, isSeen } = useSeenArticles();

  const { scrollY } = useScroll();
  const heroOp = useTransform(scrollY, [0, 320], [1, 0.6]);

  const featured = useMemo(() => articles.find(a => a.isNew) ?? articles[0], []);
  const latest = useMemo(() => articles.filter(a => a.id !== featured.id).slice(0, 6), [featured]);
  const newsCount = useMemo(() => articles.filter((article) => article.category === "News").length, []);
  const resourceCount = useMemo(() => articles.filter((article) => article.category === "Resources").length, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
      <ScrollProgress />
      <Navigation />

      {/* ══════════════════════ HERO ══════════════════════ */}
      <header className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 dot-grid pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 85% 65% at 50% 45%, transparent 25%, hsl(var(--background)) 100%)" }}
        />

        <motion.div
          className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-14 pb-0"
          style={{ opacity: heroOp }}
        >
          {/* ── ASCII particle title ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[1240px] xl:max-w-[1440px] mx-auto mt-6 sm:mt-8"
          >
            <HeroAsciiCanvas />
          </motion.div>

        </motion.div>

        {/* Tagline — outside parallax so it never overlaps the ticker */}
        <motion.div
          className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between pb-5 gap-4 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.55 }}
        >
          <p className="font-mono text-[0.68rem] text-muted-foreground tracking-[0.16em] uppercase">
            Built for builders.
          </p>
          <ScrollCue />
          <div className="flex items-center gap-2 font-mono text-[0.58rem] text-muted-foreground">
            <span className="text-neon cursor-blink">▊</span>
            <span>ready</span>
          </div>
        </motion.div>

        <Ticker />
      </header>

      {/* ══════════════════════ FEATURED ══════════════════════ */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 pt-10">
        <motion.div
          className="flex items-center gap-4 mb-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
        >
          <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-muted-foreground">featured article</span>
          <motion.div
            className="flex-1 h-px bg-border line-draw"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            style={{ originX: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
        <FeaturedCard article={featured} isSeen={isSeen(featured.id)} onSeen={() => markSeen(featured.id)} />
      </section>

      {/* ══════════════════════ COLLECTION PATHS ══════════════════════ */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link href="/news" className="collection-link interactive-frame">
            <span>News</span>
            <strong>{newsCount} articles</strong>
            <p>Signals, launches, analysis, and field notes.</p>
          </Link>
          <Link href="/resources" className="collection-link interactive-frame">
            <span>Resources</span>
            <strong>{resourceCount} references</strong>
            <p>Playbooks, workflows, checklists, and reusable guides.</p>
          </Link>
        </div>
      </section>

      {/* ══════════════════════ CURATED GRID ══════════════════════ */}
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10">
        <motion.div
          className="flex items-center gap-4 mb-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
        >
          <span className="font-mono text-[0.62rem] tracking-[0.2em] uppercase text-muted-foreground">Quick Reads</span>
          <motion.div
            className="flex-1 h-px bg-border line-draw"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            style={{ originX: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {latest.map((article, i) => (
            <AsciiCard key={article.id} article={article} index={i} isSeen={isSeen(article.id)} onSeen={() => markSeen(article.id)} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 flex flex-col items-center gap-5">
      <pre className="font-mono text-[0.65rem] text-muted-foreground leading-snug select-none">
{`  ┌──────────────────────────┐
  │  $ query --filter active │
  │  > 0 results returned    │
  │  > _                     │
  └──────────────────────────┘`}
      </pre>
      <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-muted-foreground">nothing found yet</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6rem] font-bold tracking-[0.22em] uppercase">XD AI Journal</span>
          <span className="font-mono text-[0.58rem] text-muted-foreground tracking-widest">— {new Date().getFullYear()} — All articles.</span>
        </div>
        <div className="flex items-center gap-8">
          <Link
            href="/news"
            data-cursor-hover
            className="interactive-ink font-mono text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground"
          >
            news ↗
          </Link>
          <Link
            href="/resources"
            data-cursor-hover
            className="interactive-ink font-mono text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground"
          >
            resources ↗
          </Link>
          <span className="font-mono text-[0.55rem] text-muted-foreground tracking-widest uppercase">built for builders</span>
        </div>
      </div>
    </footer>
  );
}
