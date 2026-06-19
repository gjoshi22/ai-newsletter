import { useQuery } from "@tanstack/react-query";
import { fetchPublishedArticle, fetchPublishedArticles } from "@/lib/article-api";

export function usePublishedArticles() {
  return useQuery({
    queryKey: ["articles", "published"],
    queryFn: fetchPublishedArticles,
    staleTime: 60_000,
  });
}

export function usePublishedArticle(slug?: string) {
  return useQuery({
    queryKey: ["articles", "published", slug],
    queryFn: () => fetchPublishedArticle(slug ?? ""),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}
