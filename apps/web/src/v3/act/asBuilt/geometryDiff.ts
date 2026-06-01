/**
 * geometryDiff - pure helper that turns a steward's "shape differs" capture in
 * the Act as-built popover into an `AsBuiltGeometryDiff`. Extracted (like
 * `attributeDiff.ts`) so the area-rounding + null-guard branches are unit
 * testable without rendering the popover, and so the Plan reconciliation card
 * can rely on a pinned diff shape.
 *
 * Slice 5: area-delta + note MVP. There is NO polygon re-draw - the steward
 * records that reality's footprint diverges from the drawn plan via a free-text
 * note plus an OPTIONAL approximate as-built area. The Plan card renders it
 * read-only (`canApplyDiff` rejects geometry); shape is recorded as evidence
 * only, matching the operator decision "fix attributes, not shape."
 */

import type { AsBuiltGeometryDiff } from '@ogden/shared';

/** Round to whole m2 - areas are approximate, sub-m2 precision is noise.
 *  Returns undefined for null/NaN/Infinity so the field is simply omitted. */
function roundArea(m2: number | null | undefined): number | undefined {
  if (m2 == null || !Number.isFinite(m2)) return undefined;
  return Math.round(m2);
}

/**
 * Build a geometry deviation diff. Returns null when there is nothing to
 * record - a blank note AND no as-built area (a bare toggle with no detail is
 * not a divergence). The planned area (from the drawn polygon) is always
 * carried when known so the card can show an area delta.
 */
export function buildGeometryDiff(
  plannedAreaM2: number | null,
  note: string,
  asBuiltAreaM2?: number | null,
): AsBuiltGeometryDiff | null {
  const trimmedNote = note.trim();
  const builtArea = roundArea(asBuiltAreaM2);
  if (trimmedNote === '' && builtArea == null) return null;

  const asPlanned: AsBuiltGeometryDiff['asPlanned'] = {};
  const plannedArea = roundArea(plannedAreaM2);
  if (plannedArea != null) asPlanned.areaM2 = plannedArea;

  const asBuilt: AsBuiltGeometryDiff['asBuilt'] = {};
  if (trimmedNote !== '') asBuilt.note = trimmedNote;
  if (builtArea != null) asBuilt.areaM2 = builtArea;

  return { kind: 'geometry', field: 'geometry', asPlanned, asBuilt };
}
