import { blocksToMarkdown, estimateReadingTime, type ContentBlock } from "@workspace/content";
import type { articles } from "../db/schema";

type ArticleRow = typeof articles.$inferSelect;

export function serializePublicArticle(row: ArticleRow) {
  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date,
    category: row.category,
    subCategory: row.subCategory,
    tags: row.tags ?? [],
    isNew: row.featured,
    featured: row.featured,
    status: row.status,
    asciiType: row.asciiType,
    image: row.imageUrl ?? undefined,
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl ?? undefined,
    body: row.body,
    readingTime: row.readingTime,
    authorName: row.authorName ?? undefined,
    showAuthor: row.showAuthor,
  };
}

export function serializeAdminArticle(row: ArticleRow) {
  const published = serializePublicArticle(row);
  return {
    ...published,
    id: row.id,
    featured: row.featured,
    bodyBlocks: row.bodyBlocks as ContentBlock[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export function normalizeArticleInput(input: {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  category: "News" | "Resources";
  subCategory: "Design" | "Development";
  tags?: string[];
  featured?: boolean;
  status?: "draft" | "published" | "archived";
  asciiType?: number;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  authorName?: string | null;
  showAuthor?: boolean;
  bodyBlocks: ContentBlock[];
}) {
  const body = blocksToMarkdown(input.bodyBlocks);
  return {
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    excerpt: input.excerpt.trim(),
    date: input.date,
    category: input.category,
    subCategory: input.subCategory,
    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    featured: input.status === "published" ? Boolean(input.featured) : false,
    status: input.status ?? "draft",
    asciiType: input.asciiType ?? 1,
    imageUrl: input.imageUrl?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
    authorName: input.authorName?.trim() || null,
    showAuthor: Boolean(input.showAuthor),
    body,
    bodyBlocks: input.bodyBlocks,
    readingTime: estimateReadingTime(body),
  };
}
