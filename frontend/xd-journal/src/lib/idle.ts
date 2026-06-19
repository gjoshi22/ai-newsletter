export function scheduleIdleWork(work: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(() => work(), { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(work, 1);
  return () => window.clearTimeout(id);
}
