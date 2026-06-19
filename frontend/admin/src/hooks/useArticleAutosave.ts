import { useEffect, useMemo, useRef, useState } from "react";
import { api, type ArticleInput } from "@/lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseArticleAutosaveOptions = {
  articleId: string | null;
  payload: ArticleInput;
  debounceMs?: number;
};

export function useArticleAutosave({
  articleId,
  payload,
  debounceMs = 2000,
}: UseArticleAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef("");
  const [hydrated, setHydrated] = useState(false);
  const payloadJson = JSON.stringify(payload);
  const enabled = Boolean(articleId);

  const isDirty = useMemo(
    () => enabled && hydrated && payloadJson !== lastSavedRef.current,
    [enabled, hydrated, payloadJson],
  );

  useEffect(() => {
    hydratedRef.current = false;
    lastSavedRef.current = "";
    setHydrated(false);
    setStatus("idle");
    setError("");
  }, [articleId]);

  useEffect(() => {
    if (!enabled || !articleId) return;

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      lastSavedRef.current = payloadJson;
      setHydrated(true);
      return;
    }

    if (payloadJson === lastSavedRef.current) return;

    const timer = window.setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setStatus("saving");
      setError("");
      try {
        await api.updateArticle(articleId, payload);
        lastSavedRef.current = payloadJson;
        setStatus("saved");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Autosave failed");
      } finally {
        savingRef.current = false;
      }
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [articleId, debounceMs, enabled, payloadJson, payload]);

  const markSaving = () => {
    setStatus("saving");
    setError("");
  };

  const syncSaved = (json = payloadJson) => {
    lastSavedRef.current = json;
    setStatus("saved");
    setError("");
  };

  const markError = (message: string) => {
    setStatus("error");
    setError(message);
  };

  return { status, error, isDirty, markSaving, syncSaved, markError };
}
