import type { CSSProperties } from "react";
import { Link, useParams } from "wouter";
import { motion, useScroll, useSpring } from "framer-motion";
import { AsciiExperience } from "@/components/AsciiExperience";
import { Navigation } from "@/components/Navigation";
import { CustomCursor } from "@/components/CustomCursor";
import { articles, type Article } from "@/lib/data";
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

function inlineMarkdown(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const nodes = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(<p key={`p-${nodes.length}`}>{inlineMarkdown(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        nodes.push(<pre key={`code-${nodes.length}`}><code>{code.join("\n")}</code></pre>);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      nodes.push(<h3 key={`h3-${nodes.length}`}>{inlineMarkdown(trimmed.slice(4))}</h3>);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      nodes.push(<h2 key={`h2-${nodes.length}`}>{inlineMarkdown(trimmed.slice(3))}</h2>);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      paragraph.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return <div className="article-prose">{nodes}</div>;
}

function ArticleImageStage({ article }: { article: Article }) {
  if (article.image) {
    return (
      <figure className="article-image-stage">
        <img src={article.image} alt="" />
        <figcaption>{article.category} / {article.subCategory} visual reference</figcaption>
      </figure>
    );
  }

  const words = article.title.split(/\s+/).filter(Boolean).slice(0, 6);
  return (
    <figure className="article-image-stage article-image-stage-fallback" aria-label={`${article.title} visual reference`}>
      <div className="article-image-glyphs" aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} style={{ "--i": index } as CSSProperties}>
            {word}
          </span>
        ))}
      </div>
      <div className="article-image-orbit" aria-hidden="true" />
      <figcaption>{article.category} / {article.subCategory} generated field image</figcaption>
    </figure>
  );
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((item) => item.slug === slug);
  const related = articles
    .filter((item) => item.slug !== article?.slug && item.category === article?.category)
    .slice(0, 3);

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CustomCursor />
        <ScrollProgress />
        <Navigation />
        <main className="relative max-w-[900px] mx-auto px-6 md:px-12 pt-32">
          <p className="font-mono text-[0.65rem] tracking-[0.24em] uppercase text-neon mb-4">/dispatch missing</p>
          <h1 className="font-mono font-bold text-4xl uppercase">Dispatch not found</h1>
          <Link href="/" className="interactive-ink inline-flex mt-8 font-mono text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground">
            back home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
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
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-muted-foreground">
                Vol.01 - dispatch
              </span>
              <span className="h-px w-12 bg-border" />
              <span className="font-mono text-[0.62rem] tracking-[0.22em] uppercase font-semibold text-neon">
                {article.category} / {article.subCategory}
              </span>
              <span className="ml-auto hidden md:inline font-mono text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground">
                {formatDate(article.date)} {article.readingTime ? `/// ${article.readingTime} min read` : ""}
              </span>
            </div>

            <div className="article-hero-grid">
              <div className="article-title-block">
                <p className="md:hidden font-mono text-[0.58rem] tracking-[0.16em] uppercase text-muted-foreground mb-5">
                  {formatDate(article.date)} {article.readingTime ? `/// ${article.readingTime} min read` : ""}
                </p>
                <h1 className="article-page-title">
                  {article.title}
                </h1>
                <p className="article-page-deck">
                  {article.excerpt}
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
            </div>
          </motion.div>
        </header>

        <main className="article-experience-grid relative max-w-[1600px] mx-auto px-6 md:px-12 py-10 md:py-14">
          <section className="article-body-panel">
            <div className="article-body-chrome">
              <span>/dispatch.body</span>
              <span>{article.readingTime ? `${article.readingTime} min read` : "ready"}</span>
            </div>
            <ArticleImageStage article={article} />
            <div className="p-6 md:p-10">
              <MarkdownBody body={article.body ?? ""} />
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
                  <p className="font-mono text-[0.52rem] tracking-[0.22em] uppercase text-muted-foreground mb-2">file</p>
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
    </div>
  );
}
