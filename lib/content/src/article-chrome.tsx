import type { CSSProperties } from "react";

export function ArticleImageStage({
  title,
  category,
  subCategory,
  image,
}: {
  title: string;
  category: string;
  subCategory: string;
  image?: string | null;
}) {
  if (image) {
    return (
      <figure className="article-image-stage">
        <img src={image} alt="" loading="lazy" decoding="async" />
        <figcaption>{category} :: {subCategory} visual reference</figcaption>
      </figure>
    );
  }

  const words = title.split(/\s+/).filter(Boolean).slice(0, 6);
  return (
    <figure className="article-image-stage article-image-stage-fallback" aria-label={`${title} visual reference`}>
      <div className="article-image-glyphs" aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} style={{ "--i": index } as CSSProperties}>
            {word}
          </span>
        ))}
      </div>
      <div className="article-image-orbit" aria-hidden="true" />
      <figcaption>{category} :: {subCategory} generated field image</figcaption>
    </figure>
  );
}
