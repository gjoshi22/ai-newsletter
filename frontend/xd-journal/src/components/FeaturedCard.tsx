import { motion } from "framer-motion";
import { Link } from "wouter";
import type { Article } from "@/lib/data";
import { getAsciiArt } from "@/lib/data";
import { parseContentDate } from "@/lib/date";

interface FeaturedCardProps {
  article: Article;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function FeaturedCard({ article }: FeaturedCardProps) {
  const art  = getAsciiArt(article.asciiType);
  const d    = parseContentDate(article.date);
  const dateStr = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
  const articleHref = `/dispatch/${article.slug}`;

  return (
    <Link
      href={articleHref}
      data-cursor-hover
      aria-label={`Read ${article.title}`}
      className="group block focus-visible:outline-none"
    >
      <motion.article
        className="featured-card"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Left — image or ASCII art */}
        <div
          className="border-b md:border-b-0 md:border-r border-border relative overflow-hidden"
          style={{ minHeight: 260, background: "var(--ascii-bg)" }}
        >
          {article.image ? (
            <img
              src={article.image}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="ascii-panel h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-muted-foreground">featured</span>
                {article.isNew && <span className="badge-new">NEW</span>}
              </div>
              <pre className="ascii-art" style={{ fontSize: "0.8rem" }}>{art}</pre>
              <span
                className="absolute bottom-3 right-4 font-mono font-black select-none pointer-events-none"
                style={{ fontSize: "5rem", lineHeight: 1, color: "var(--ascii-fg)", opacity: 0.05 }}
              >
                01
              </span>
            </div>
          )}

          {/* Overlay badges when image is present */}
          {article.image && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase" style={{ color: "#fff", opacity: 0.8, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                featured
              </span>
              {article.isNew && <span className="badge-new">NEW</span>}
            </div>
          )}
        </div>

        {/* Right — Content */}
        <div className="flex flex-col justify-between p-8 md:p-10">
          <div className="flex flex-col gap-4">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.18, duration: 0.4 }}
            >
              <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase font-semibold text-neon">
                {article.category} :: {article.subCategory}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[0.62rem] text-muted-foreground">{dateStr}</span>
            </motion.div>

            <motion.h2
              className="font-sans font-black leading-[1.08] tracking-tight group-hover:text-neon transition-colors duration-300"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "-0.03em" }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.26, duration: 0.45 }}
            >
              {article.title}
            </motion.h2>

            <motion.p
              className="font-mono text-[0.72rem] text-muted-foreground leading-[1.85] max-w-[52ch]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.36, duration: 0.5 }}
            >
              {article.excerpt}
            </motion.p>
          </div>

          <motion.div
            className="flex items-center gap-5 mt-8"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.44, duration: 0.4 }}
          >
            <span className="interactive-frame font-mono text-[0.65rem] tracking-[0.18em] uppercase border border-border px-6 py-3 group-hover:border-neon group-hover:text-neon transition-all duration-200">
              read article →
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground tracking-widest uppercase">featured read</span>
          </motion.div>
        </div>
      </motion.article>
    </Link>
  );
}
