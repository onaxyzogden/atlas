/**
 * flowFormUtils - small pure helpers shared by the MaterialFlow authoring form
 * (WasteVectorListView) and the per-flow editor (FlowDetailPanel, Slice A2).
 *
 * Extracted so both callers parse throughput inputs identically and the
 * "empty vs zero vs typed" distinction stays in ONE place. Pure: no store,
 * no React.
 */

/** Parse a form input to a positive number. Returns undefined for empty / NaN /
 *  zero / negative - that's the signal to OMIT the field from the persisted
 *  MaterialFlow so legacy flows and "I do not have a number yet" stay distinct. */
export function parsePositive(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
