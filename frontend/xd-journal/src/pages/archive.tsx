import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { AsciiExperience } from "@/components/AsciiExperience";
import { Navigation } from "@/components/Navigation";
import { CustomCursor } from "@/components/CustomCursor";
import { articles } from "@/lib/data";
import { getContentDateTime, parseContentDate } from "@/lib/date";

function simpleSearch(query: string, items: typeof articles) {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.subCategory.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
  );
}

type GroupedArticles = { year: string; months: { month: string; items: typeof articles }[] }[];

function groupByYearMonth(items: typeof articles): GroupedArticles {
  const map = new Map<string, Map<string, typeof articles>>();
  for (const a of items) {
    const d = parseContentDate(a.date);
    const year  = d.getFullYear().toString();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    if (!map.has(year)) map.set(year, new Map());
    const ym = map.get(year)!;
    if (!ym.has(month)) ym.set(month, []);
    ym.get(month)!.push(a);
  }
  const ORDER = ["December","November","October","September","August","July","June","May","April","March","February","January"];
  return Array.from(map.entries())
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
        .map(([month, items]) => ({
          month,
          items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        })),
    }));
}

export default function Archive() {
  const [query, setQuery] = useState("");

  const allArticles = useMemo(() => [...articles].sort(
    (a, b) => getContentDateTime(b.date) - getContentDateTime(a.date)
  ), []);

  const results = useMemo(() => simpleSearch(query, allArticles), [query, allArticles]);
  const grouped = useMemo(() => groupByYearMonth(results), [results]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
      <Navigation />

      {/* ── Header ── */}
      <header className="pt-11 border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="py-9 md:py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] gap-8 items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-mono text-[0.65rem] tracking-[0.24em] uppercase text-neon mb-3">
                /archive
              </p>
              <h1 className="page-display-title">
                Past Issues
              </h1>
              <p className="font-mono text-[0.7rem] text-muted-foreground tracking-wide mt-4">
                {allArticles.length} total dispatches &nbsp;—&nbsp; full-text search below
              </p>
            </motion.div>
            <div className="-translate-y-3 md:-translate-y-4">
              <AsciiExperience mode="Archive" variant="archive" />
            </div>
          </div>

          {/* Search */}
          <motion.div
            className="relative z-20 flex items-center gap-3 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span className="font-mono text-[0.8rem] text-neon py-4 pl-1 select-none">$</span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="search titles, excerpts, categories..."
              className="flex-1 font-mono text-[0.72rem] bg-transparent py-4 outline-none text-foreground tracking-wide"
              style={{ caretColor: "var(--neon)" }}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="interactive-ink font-mono text-[0.6rem] text-muted-foreground tracking-widest uppercase px-2"
              >
                [clear]
              </button>
            )}
            <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase pr-1" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
              {results.length} found
            </span>
          </motion.div>
        </div>
      </header>

      {/* ── Archive list ── */}
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-14">
        <AnimatePresence mode="wait">
          {grouped.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center gap-5"
            >
              <pre className="font-mono text-[0.65rem] text-muted-foreground leading-snug select-none">
{`  ┌──────────────────────────────┐
  │  $ grep "${query.slice(0,14).padEnd(14)}"  │
  │  > no matches found          │
  │  > _                         │
  └──────────────────────────────┘`}
              </pre>
              <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-muted-foreground">
                nothing found
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-20"
            >
              {grouped.map(({ year, months }, yi) => (
                <motion.section
                  key={year}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: yi * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Year header */}
                  <div className="flex items-center gap-6 mb-10">
                    <span
                      className="archive-year font-sans font-black select-none leading-none"
                      style={{
                        fontSize: "clamp(4rem, 11vw, 8rem)",
                        letterSpacing: "-0.06em",
                      }}
                    >
                      {year}
                    </span>
                    <motion.div
                      className="flex-1 h-px bg-border"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: yi * 0.06 + 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{ originX: 0 }}
                    />
                    <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground">
                      {months.reduce((t, m) => t + m.items.length, 0)}&nbsp;dispatches
                    </span>
                  </div>

                  <div className="space-y-12 md:pl-6">
                    {months.map(({ month, items }) => (
                      <div key={month}>
                        {/* Month label */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-neon">
                            {month}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="font-mono text-[0.58rem] text-muted-foreground">
                            {items.length}
                          </span>
                        </div>

                        {/* Column headers */}
                        <div className="hidden sm:grid grid-cols-[130px_1fr_120px] gap-4 py-2 border-b border-border mb-1">
                          {["Date", "Title", "Tag"].map(h => (
                            <span key={h} className="font-mono text-[0.56rem] text-muted-foreground tracking-[0.2em] uppercase">
                              {h}
                            </span>
                          ))}
                        </div>

                        {/* Rows */}
                        {items.map((article, ii) => {
                          const d = parseContentDate(article.date);
                          const dateStr = d.toLocaleDateString("en-US", {
                            month: "2-digit", day: "2-digit", year: "numeric",
                          });
                          return (
                            <motion.div
                              key={article.id}
                              className="group grid grid-cols-1 sm:grid-cols-[130px_1fr_120px] gap-1 sm:gap-4 py-4 border-b border-border -mx-2 px-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: ii * 0.025 }}
                              whileHover={{ x: 4 }}
                              style={{ cursor: "none" }}
                            >
                              <span className="font-mono text-[0.65rem] text-muted-foreground tabular-nums">
                                {dateStr}
                              </span>
                              <div className="flex items-baseline gap-3">
                                <Link
                                  href={`/dispatch/${article.slug}`}
                                  data-cursor-hover
                                  className="font-sans text-[0.95rem] font-semibold leading-snug text-foreground group-hover:text-neon transition-colors duration-150"
                                >
                                  {article.title}
                                </Link>
                                {article.isNew && <span className="badge-new shrink-0">NEW</span>}
                              </div>
                              <span className="font-mono text-[0.6rem] text-muted-foreground tracking-[0.16em] uppercase">
                                {article.subCategory}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </motion.section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-7 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] text-muted-foreground tracking-widest uppercase">
            XD AI Journal — Archive — All issues
          </span>
          <Link
            href="/"
            data-cursor-hover
            className="interactive-ink font-mono text-[0.62rem] tracking-[0.18em] uppercase text-muted-foreground"
          >
            ← back to feed
          </Link>
        </div>
      </footer>
    </div>
  );
}
