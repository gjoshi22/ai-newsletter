export function isGameDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("debugGame") || window.localStorage.getItem("xd-game-debug") === "1";
  } catch {
    return false;
  }
}

export function debugGame(event: string, details?: Record<string, unknown>) {
  if (!isGameDebugEnabled()) return;
  console.debug(`[xd-game] ${event}`, details ?? {});
}
