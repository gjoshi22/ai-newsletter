import { useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { motion, useScroll, useSpring } from "framer-motion";
import { AsciiExperience } from "@/components/AsciiExperience";
import { Navigation } from "@/components/Navigation";
import { DeferredCustomCursor } from "@/components/DeferredCustomCursor";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleBody, ArticleDeck, ArticleImageStage } from "@/components/ArticleBody";
import { usePublishedArticle, usePublishedArticles } from "@/hooks/usePublishedArticles";
import { parseContentDate } from "@/lib/date";

function formatDate(date: string) {
  return parseContentDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = usePublishedArticle(slug);
  const { data: allArticles = [] } = usePublishedArticles();
  const experienceGridRef = useRef<HTMLElement>(null);
  const related = allArticles
    .filter((item) => item.slug !== article?.slug && item.category === article?.category)
    .slice(0, 3);

  useEffect(() => {
    if (!article) return;
    const grid = experienceGridRef.current;
    const image = grid?.querySelector<HTMLElement>(".article-image-stage");
    if (!grid || !image) return;

    const syncImageHeight = () => {
      grid.style.setProperty("--article-image-stage-height", `${image.getBoundingClientRect().height}px`);
    };
    syncImageHeight();
    const observer = new ResizeObserver(syncImageHeight);
    observer.observe(image);
    window.addEventListener("resize", syncImageHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncImageHeight);
    };
  }, [article]);

  if (isLoading) {
    return null;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DeferredCustomCursor />
        <ScrollProgress />
        <Navigation />
        <main className="relative max-w-[900px] mx-auto px-6 md:px-12 pt-32">
          <p className="font-mono text-[0.65rem] tracking-[0.24em] uppercase text-neon mb-4">Article missing</p>
          <h1 className="font-mono font-bold text-4xl uppercase">Article not found</h1>
          <Link href="/" className="interactive-ink inline-flex mt-8 font-mono text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground">
            back home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DeferredCustomCursor />
      <ScrollProgress />
      <Navigation />

      <article className="relative overflow-hidden pt-11">
        <header className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0 dot-grid pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 90% 70% at 50% 28%, transparent 18%, hsl(var(--background)) 100%)" }}
          />

          <motion.div
            className="article-hero-frame relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-8 md:pt-16 md:pb-10"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase font-semibold text-neon">
                {article.category} :: {article.subCategory}
              </span>
              <span className="ml-auto hidden md:inline font-mono text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground">
                {formatDate(article.date)} {article.readingTime ? `:: ${article.readingTime} min read` : ""}
              </span>
            </div>

            <div className="article-hero-grid">
              <div className="article-title-block">
                <p className="md:hidden font-mono text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-5">
                  {formatDate(article.date)} {article.readingTime ? `:: ${article.readingTime} min read` : ""}
                </p>
                <h1 className="article-page-title">
                  {article.title}
                </h1>
                <p className="article-page-deck">
                  <ArticleDeck text={article.excerpt} />
                </p>
              </div>
            </div>

            <div className="article-dossier-strip">
              <div>
                <span>origin</span>
                <strong>{article.category}</strong>
              </div>
              <div>
                <span>discipline</span>
                <strong>{article.subCategory}</strong>
              </div>
              {article.showAuthor && article.authorName ? (
                <div>
                  <span>author</span>
                  <strong>{article.authorName}</strong>
                </div>
              ) : null}
            </div>
          </motion.div>
        </header>

        <main ref={experienceGridRef} className="article-experience-grid relative max-w-[1600px] mx-auto px-6 md:px-12 py-10 md:py-14">
          <section className="article-body-panel">
            <div className="article-body-chrome">
              <span>Article body</span>
              <span>{article.readingTime ? `${article.readingTime} min read` : "ready"}</span>
            </div>
            <ArticleImageStage
              title={article.title}
              category={article.category}
              subCategory={article.subCategory}
              image={article.image}
            />
            <div className="p-6 md:p-10">
              <ArticleBody body={article.body ?? ""} />
            </div>

            <footer className="border-t border-border p-6 md:px-10 flex flex-wrap items-center gap-5 justify-between">
              <Link href="/" className="interactive-ink font-mono text-[0.62rem] tracking-[0.18em] uppercase text-muted-foreground">
                back home
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/archive" className="interactive-ink font-mono text-[0.62rem] tracking-[0.18em] uppercase text-muted-foreground">
                  archive
                </Link>
                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="interactive-frame border border-border px-5 py-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground"
                  >
                    source
                  </a>
                )}
              </div>
            </footer>
          </section>

          <aside className="article-art-sidebar">
            <div className="article-art-sticky">
              <AsciiExperience mode={article.subCategory} variant="article" surface={article.category} />
              <div className="article-meta-rail">
                <div>
                  <p className="font-mono text-[0.52rem] tracking-[0.22em] uppercase text-muted-foreground mb-2">title</p>
                  <p className="font-mono text-[0.64rem] tracking-[0.12em] uppercase text-foreground break-words">
                    {article.slug}
                  </p>
                </div>
                {!!article.tags?.length && (
                  <div>
                    <p className="font-mono text-[0.52rem] tracking-[0.22em] uppercase text-muted-foreground mb-3">tags</p>
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
                        <span key={tag} className="font-mono text-[0.52rem] tracking-[0.14em] uppercase text-muted-foreground">
                          [{tag}]
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="article-related-rail">
                <p className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-muted-foreground">adjacent</p>
                {related.map((item) => (
                  <Link key={item.slug} href={`/dispatch/${item.slug}`} className="interactive-frame block border border-border p-4">
                    <span className="font-mono text-[0.5rem] tracking-[0.16em] uppercase text-neon">
                      {item.subCategory}
                    </span>
                    <span className="block font-mono text-[0.66rem] leading-[1.55] tracking-[0.04em] uppercase text-muted-foreground mt-3">
                      {item.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </article>
      <SiteFooter />
    </div>
  );
}
