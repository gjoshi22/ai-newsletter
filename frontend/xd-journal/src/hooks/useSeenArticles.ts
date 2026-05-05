import { useState, useCallback } from "react";

const STORAGE_KEY = "xd_journal_seen_v1";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveSeen(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function useSeenArticles() {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadSeen());

  const markSeen = useCallback((id: string) => {
    setSeenIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveSeen(next);
      return next;
    });
  }, []);

  const isSeen = useCallback((id: string) => seenIds.has(id), [seenIds]);

  return { markSeen, isSeen };
}
