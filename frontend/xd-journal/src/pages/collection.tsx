import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { AsciiCard } from "@/components/AsciiCard";
import { CustomCursor } from "@/components/CustomCursor";
import { HeroAsciiCanvas, type HeroAsciiLine } from "@/components/HeroAsciiCanvas";
import { MascotGameLauncher } from "@/components/MascotGameLauncher";
import { ModeGameToggle } from "@/components/ModeGameToggle";
import { Navigation } from "@/components/Navigation";
import { useSeenArticles } from "@/hooks/useSeenArticles";
import { articles, type ArticleCategory, type ArticleSubCategory } from "@/lib/data";

type CollectionPageProps = {
  category: ArticleCategory;
};

const MASCOT_STORAGE_KEY = "xd-ai-journal-mascot-enabled-v1";

export default function CollectionPage({ category }: CollectionPageProps) {
  const defaultFilter: ArticleSubCategory = category === "Resources" ? "Design" : "Development";
  const [activeFilter, setActiveFilter] = useState<ArticleSubCategory>(defaultFilter);
  const [mascotEnabled, setMascotEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(MASCOT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { markSeen, isSeen } = useSeenArticles();

  const collection = useMemo(
    () => articles.filter((article) => article.category === category),
    [category],
  );
  const filtered = useMemo(
    () => collection.filter((article) => article.subCategory === activeFilter),
    [collection, activeFilter],
  );
  const counts = useMemo(
    () => ({
      Development: collection.filter((article) => article.subCategory === "Development").length,
      Design: collection.filter((article) => article.subCategory === "Design").length,
    }),
    [collection],
  );
  const totalCount = collection.length;
  const heroLines = useMemo<HeroAsciiLine[]>(
    () => [
      {
        text: category.toUpperCase(),
        targetWidth: category === "Resources" ? 0.9 : 0.52,
        maxSize: category === "Resources" ? 166 : 184,
        xScale: category === "Resources" ? 1.04 : 1.08,
        trackingEm: category === "Resources" ? 0.038 : 0.075,
      },
    ],
    [category],
  );
  const handleMascotEnabledChange = useCallback((checked: boolean) => {
    setMascotEnabled(checked);
    try {
      window.localStorage.setItem(MASCOT_STORAGE_KEY, checked ? "1" : "0");
    } catch {
      /* ignore storage availability issues and keep the in-memory preference */
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
      <Navigation />
      {mascotEnabled && (
        <MascotGameLauncher
          category={category}
          activeMode={activeFilter}
          counts={counts}
          onModeChange={setActiveFilter}
        />
      )}

      <header className="collection-hero pt-12 border-b border-border">
        <div className="absolute inset-0 dot-grid pointer-events-none" />
        <div className="collection-hero-pulse" aria-hidden="true" />
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 py-8 md:py-10">
          <motion.div
            className="collection-hero-layout"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="collection-title-block">
              <div className="collection-hero-kicker">
                <span>/{category.toLowerCase()}</span>
                <span>{String(totalCount).padStart(2, "0")} indexed</span>
              </div>
              <div className="collection-ascii-title" aria-hidden="true">
                <HeroAsciiCanvas lines={heroLines} ariaLabel={category} />
              </div>
              <h1 className="sr-only">{category}</h1>
              <p className="collection-hero-deck">
                {category === "News"
                  ? "Current signals, analysis, and field notes from the AI frontier."
                  : "Reusable playbooks, checklists, workflows, and build references."}
              </p>
            </div>

            <aside className="collection-hero-console" aria-label={`${category} collection controls`}>
              <button
                type="button"
                className="mascot-preference-control"
                role="switch"
                aria-checked={mascotEnabled}
                aria-label={`Turn mascot ${mascotEnabled ? "off" : "on"}`}
                data-state={mascotEnabled ? "checked" : "unchecked"}
                data-cursor-compact
                onClick={() => handleMascotEnabledChange(!mascotEnabled)}
              >
                <span>Mascot</span>
                <span className="mascot-toggle-rail" aria-hidden="true">
                  <span className="mascot-toggle-thumb" />
                </span>
                <strong>{mascotEnabled ? "On" : "Off"}</strong>
              </button>
              <div className="collection-console-row">
                <span>current lens</span>
                <strong>{activeFilter === "Development" ? "dev" : "design"}</strong>
              </div>
              <div className="collection-lens-card" data-mode={activeFilter.toLowerCase()}>
                <div className="collection-lens-mark">
                  <span>{String(filtered.length).padStart(2, "0")}</span>
                  <small>{category === "News" ? "dispatches" : "refs"}</small>
                </div>
                <div className="collection-lens-copy">
                  <strong>{activeFilter === "Design" ? "Design reading stack" : "Dev reading stack"}</strong>
                  <span>
                    {category === "News"
                      ? "Signals filtered for the selected practice lens."
                      : "Reusable material filtered for the selected practice lens."}
                  </span>
                </div>
              </div>
              <div className="collection-console-stack">
                <div className={activeFilter === "Design" ? "is-active" : ""}>
                  <span>Design</span>
                  <strong>{counts.Design}</strong>
                </div>
                <div className={activeFilter === "Development" ? "is-active" : ""}>
                  <span>Dev</span>
                  <strong>{counts.Development}</strong>
                </div>
              </div>
            </aside>
          </motion.div>
        </div>
      </header>

      <main className="collection-main max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="collection-toolbar">
          <div className="collection-toolbar-copy">
            <p>{activeFilter} /// {filtered.length} dispatches</p>
            <strong>{category === "News" ? "Filed signals" : "Reusable references"}</strong>
          </div>
          <div className="collection-toolbar-controls">
            <ModeGameToggle
              category={category}
              activeMode={activeFilter}
              counts={counts}
              onModeChange={setActiveFilter}
              showGame={false}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${category}-${activeFilter}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((article, index) => (
              <AsciiCard
                key={article.id}
                article={article}
                index={index}
                isSeen={isSeen(article.id)}
                onSeen={() => markSeen(article.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex justify-center">
          <Link href="/archive" className="interactive-ink font-mono text-[0.62rem] tracking-[0.18em] uppercase text-muted-foreground">
            full archive
          </Link>
        </div>
      </main>
    </div>
  );
}
