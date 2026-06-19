import { useQuery } from "@tanstack/react-query";
import { fetchArchiveArticles } from "@/lib/article-api";

export function useArchiveArticles() {
  return useQuery({
    queryKey: ["articles", "archive"],
    queryFn: fetchArchiveArticles,
    staleTime: 60_000,
  });
}
