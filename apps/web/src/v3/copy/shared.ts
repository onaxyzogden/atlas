/**
 * Cross-surface copy helpers for the v3 Plan -> Act -> Observe surfaces.
 *
 * This `copy/` module is the single home for user-facing microcopy across the
 * three v3 surfaces (see ADR 2026-06-09-olos-uiux-copy-module). Static strings
 * live in frozen const objects; copy that depends on runtime values lives in
 * pure functions so it can be unit-tested without rendering.
 *
 * Authoring rules:
 *   - ASCII only. Author as double-quoted TS literals so apostrophes
 *     ("land's", "can't", "you'll") need no escaping.
 *   - Keep arrows/icons (->, lucide ArrowRight) in JSX, never in copy strings.
 *   - Speak the language of land, not software.
 */

/**
 * Join a list of names into a readable English clause:
 *   []            -> ""
 *   [a]           -> "a"
 *   [a, b]        -> "a and b"
 *   [a, b, c]     -> "a, b, and c"
 */
export function joinReadable(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(", ");
  return `${head}, and ${items[items.length - 1]}`;
}
