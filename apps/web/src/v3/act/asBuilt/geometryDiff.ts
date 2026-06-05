/**
 * geometryDiff - pure helper that turns a steward's "shape differs" capture in
 * the Act as-built popover into an `AsBuiltGeometryDiff`. Extracted (like
 * `attributeDiff.ts`) so the area-rounding + null-guard branches are unit
 * testable without rendering the popover, and so the Plan reconciliation card
 * can rely on a pinned diff shape.
 *
 * Slice 5: area-delta + note MVP. The steward records that reality's footprint
 * diverges from the drawn plan via a free-text note plus an OPTIONAL approximate
 * as-built area.
 *
 * Slice 6 (capture-and-apply): the steward may ALSO redraw the real as-built
 * polygon on the Act map. When a captured polygon is supplied it is stamped into
 * `asBuilt.capturedGeometry`, and - if no explicit area was typed - the as-built
 * area is derived from that polygon (geodesic `parcelAreaM2`). Plan's
 * "Apply to design" then writes the captured polygon to the feature store; a
 * note-or-area-only diff (no captured polygon) stays read-only evidence as
 * before (`canApplyDiff` only accepts geometry diffs that carry a polygon).
 */

import type { AsBuiltGeometryDiff } from '@ogden/shared';
import { parcelAreaM2 } from '../../../lib/geo.js';

/** Round to whole m2 - areas are approximate, sub-m2 precision is noise.
 *  Returns undefined for null/NaN/Infinity so the field is simply omitted. */
function roundArea(m2: number | null | undefined): number | undefined {
  if (m2 == null || !Number.isFinite(m2)) return undefined;
  return Math.round(m2);
}

/**
 * Build a geometry deviation diff. Returns null when there is nothing to
 * record - a blank note AND no as-built area AND no captured polygon (a bare
 * toggle with no detail is not a divergence). The planned area (from the drawn
 * polygon) is always carried when known so the card can show an area delta.
 *
 * When `capturedGeometry` is supplied (Slice 6 - the steward redrew the real
 * footprint on the Act map) it is stamped into `asBuilt.capturedGeometry`, and
 * if no explicit as-built area was typed the area is derived from that polygon
 * via geodesic `parcelAreaM2`. A captured polygon alone (blank note, no typed
 * area) is itself a recordable divergence - it is what Plan's "Apply to design"
 * consumes.
 */
export function buildGeometryDiff(
  plannedAreaM2: number | null,
  note: string,
  asBuiltAreaM2?: number | null,
  capturedGeometry?: GeoJSON.Polygon,
): AsBuiltGeometryDiff | null {
  const trimmedNote = note.trim();
  // Typed area wins; else derive from the captured polygon when present.
  const derivedArea =
    capturedGeometry != null ? parcelAreaM2(capturedGeometry) : null;
  const builtArea = roundArea(asBuiltAreaM2 ?? derivedArea);
  if (trimmedNote === '' && builtArea == null && capturedGeometry == null) {
    return null;
  }

  const asPlanned: AsBuiltGeometryDiff['asPlanned'] = {};
  const plannedArea = roundArea(plannedAreaM2);
  if (plannedArea != null) asPlanned.areaM2 = plannedArea;

  const asBuilt: AsBuiltGeometryDiff['asBuilt'] = {};
  if (trimmedNote !== '') asBuilt.note = trimmedNote;
  if (builtArea != null) asBuilt.areaM2 = builtArea;
  if (capturedGeometry != null) asBuilt.capturedGeometry = capturedGeometry;

  return { kind: 'geometry', field: 'geometry', asPlanned, asBuilt };
}
