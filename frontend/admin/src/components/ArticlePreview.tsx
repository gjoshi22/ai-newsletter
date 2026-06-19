import { ArticleImageStage } from "@workspace/content/chrome";
import { ArticleMarkdownBody } from "@workspace/content/render";

function formatPreviewDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function ArticlePreview({
  title,
  excerpt,
  category,
  subCategory,
  date,
  readingTime,
  imageUrl,
  authorName,
  showAuthor,
  body,
}: {
  title: string;
  excerpt: string;
  category: string;
  subCategory: string;
  date: string;
  readingTime: number;
  imageUrl?: string | null;
  authorName?: string;
  showAuthor?: boolean;
  body: string;
}) {
  const readingLabel = readingTime > 0 ? `${readingTime} min read` : "ready";

  return (
    <div className="preview-panel">
      <header className="preview-hero">
        <div className="preview-hero-meta">
          <span className="preview-hero-label">
            {category} :: {subCategory}
          </span>
          <span className="preview-hero-date">
            {formatPreviewDate(date)} :: {readingLabel}
          </span>
        </div>

        <h1 className="article-page-title">
          {title || "Untitled story"}
        </h1>

        <p className="article-page-deck">
          {excerpt || "Your subtitle will appear here."}
        </p>

        <div className="article-dossier-strip">
          <div>
            <span>origin</span>
            <strong>{category}</strong>
          </div>
          <div>
            <span>discipline</span>
            <strong>{subCategory}</strong>
          </div>
          {showAuthor && authorName ? (
            <div>
              <span>author</span>
              <strong>{authorName}</strong>
            </div>
          ) : null}
        </div>
      </header>

      <section className="article-body-panel preview-body-panel">
        <div className="article-body-chrome">
          <span>Article body</span>
          <span>{readingLabel}</span>
        </div>

        <ArticleImageStage
          title={title || "Untitled story"}
          category={category}
          subCategory={subCategory}
          image={imageUrl}
        />

        <div className="preview-body-copy">
          <ArticleMarkdownBody body={body} />
        </div>
      </section>
    </div>
  );
}
