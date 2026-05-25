/**
 * planSnapshotMerge — the pure, store-free core of the typed-design snapshot
 * adapter (Plan-Operation Phase 5b). Extracted from `planSnapshot.ts` so the
 * restore-safety invariant can be unit-tested WITHOUT importing the live
 * (zundo + persist) geometry stores, which the test harness cannot initialise
 * alongside the `syncManifest` graph.
 *
 * The 4 typed-design-feature stores each hold a flat array whose rows carry a
 * `projectId`. Capturing one project = filtering that array to the project's
 * rows; restoring = replacing ONLY that project's rows and leaving every other
 * project's rows untouched. Both operations are pure and non-mutating.
 *
 * Strictly operational — no riba/gharar/CSRA/salam/financing semantics.
 */

/** A row that may carry a `projectId` (the only field these helpers inspect). */
type ProjectTagged = { projectId?: string } | null | undefined;

function belongsTo(row: unknown, projectId: string): boolean {
  return (row as ProjectTagged)?.projectId === projectId;
}

/**
 * This project's rows. Returns a fresh array; non-array input yields `[]`.
 * Does not mutate the input.
 */
export function selectProjectRows(rows: unknown, projectId: string): unknown[] {
  return Array.isArray(rows)
    ? rows.filter((row) => belongsTo(row, projectId))
    : [];
}

/**
 * Replace this project's rows with `incoming`, preserving every OTHER project's
 * rows in place. Returns a fresh array; never mutates `existing` or `incoming`.
 * Non-array `existing` is treated as empty; non-array `incoming` contributes
 * nothing.
 */
export function mergeProjectRows(
  existing: unknown,
  projectId: string,
  incoming: unknown,
): unknown[] {
  const base = Array.isArray(existing) ? existing : [];
  const others = base.filter((row) => !belongsTo(row, projectId));
  const added = Array.isArray(incoming) ? incoming : [];
  return others.concat(added);
}
