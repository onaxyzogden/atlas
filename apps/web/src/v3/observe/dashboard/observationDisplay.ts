// observationDisplay.ts
//
// Shared display helpers for rendering ObserveDataPoint activity rows. Extracted
// from ActTierExecutionPanel so the Act exec-panel feed and the Observe
// objective-rollup surface (Surface 4) render observations identically from one
// definition. Pure; no React or store deps.

/**
 * Pull a human-readable note out of an observation's measurementValue, which is
 * typed `unknown` on the schema. The Act write path stores either
 * `{ label }` or `{ label, note }`, so read `.note` defensively.
 */
export function readNote(mv: unknown): string | null {
  if (mv && typeof mv === 'object' && 'note' in mv) {
    const note = (mv as { note?: unknown }).note;
    if (typeof note === 'string' && note.trim().length > 0) return note;
  }
  return null;
}

/** Compact local timestamp for an activity row (no date util imported here). */
export function formatActyTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
