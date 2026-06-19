import { generatedArticles } from "@/generated/articles";
import type { Article } from "@/lib/data";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

function mergeWithFallback(apiArticles: Article[]): Article[] {
  const apiSlugs = new Set(apiArticles.map((article) => article.slug));
  const fallback = generatedArticles.filter((article) => !apiSlugs.has(article.slug));
  return [...apiArticles, ...fallback].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function fetchPublishedArticles(): Promise<Article[]> {
  if (!API_BASE) return mergeWithFallback([]);

  try {
    const response = await fetch(`${API_BASE}/api/articles/public`);
    if (!response.ok) throw new Error("Articles request failed");
    const payload = await response.json() as { articles: Article[] };
    return mergeWithFallback(payload.articles ?? []);
  } catch {
    return mergeWithFallback([]);
  }
}

export async function fetchArchiveArticles(): Promise<Article[]> {
  if (!API_BASE) return mergeWithFallback([]);

  try {
    const response = await fetch(`${API_BASE}/api/articles/public/archive`);
    if (!response.ok) throw new Error("Archive request failed");
    const payload = await response.json() as { articles: Article[] };
    return mergeWithFallback(payload.articles ?? []);
  } catch {
    return mergeWithFallback([]);
  }
}

export async function fetchPublishedArticle(slug: string): Promise<Article | null> {
  if (!API_BASE) {
    return mergeWithFallback([]).find((article) => article.slug === slug) ?? null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/articles/public/${slug}`);
    if (response.status === 404) {
      return mergeWithFallback([]).find((article) => article.slug === slug) ?? null;
    }
    if (!response.ok) throw new Error("Article request failed");
    const payload = await response.json() as { article: Article };
    return payload.article ?? null;
  } catch {
    return mergeWithFallback([]).find((article) => article.slug === slug) ?? null;
  }
}
