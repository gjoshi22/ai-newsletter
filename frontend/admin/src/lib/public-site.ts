export function publicArticleUrl(slug: string) {
  const base = (import.meta.env.VITE_JOURNAL_URL as string | undefined)?.replace(/\/$/, "")
    ?? "http://localhost:5173";
  const path = `/dispatch/${slug}`;
  return `${base}${path}`;
}
