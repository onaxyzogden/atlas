/**
 * communityMeetingPlace — pure helpers for the communal meeting/decision map
 * marker.
 *
 * The community (ecovillage) work-management layer generates governance
 * meetings, commons reviews, adaptive reviews, five-year reviews, and member
 * ratifications as confirmable work. The steward asked for these to surface as
 * a single pulsing ring at the communal meeting place on both the Act tier map
 * and the Observe lens.
 *
 * Two pure, framework-free concerns live here so they can be unit-tested and
 * reused by both surfaces:
 *
 *   1. `resolveMeetingPlaceCoords` — turn the steward's explicit designation
 *      (a gathering structure OR a dropped pin) into `[lng, lat]`. The
 *      designation is EXPLICIT by covenant decision: no designation, or a
 *      dangling feature id, yields `null` — the caller renders no marker. There
 *      is deliberately NO centroid-of-boundary fallback.
 *
 *   2. `selectUpcomingCommunityMeetings` — the confirmed meetings/decisions due
 *      within a horizon. We read CONFIRMED PROPOSALS, not spine rows: the
 *      confirmed spine WorkItem carries no `kind` (community has no
 *      `extraSpineFields`), but the matching proposal carries `instance.kind`
 *      and `confirmedWorkItemId` (`= cmw__<key>`). The spine is consulted only
 *      to drop rows the steward already marked done/cancelled.
 *
 * Covenant: meetings/decisions only. Onboarding steps, legal reviews, and
 * settlement milestones are excluded (not gatherings). No financial framing —
 * `ev-s7-financial-plan` is already excluded as a generation source upstream.
 */

import * as turf from '@turf/turf';
import { addDaysISO } from '@ogden/shared';
import type {
  BuiltEnvironmentEntity,
  CommunityWorkKind,
} from '@ogden/shared';
import type { CommunityWorkProposal } from '../../store/communityWorkPlanStore.js';

/**
 * The community work kinds that represent communal gatherings/decisions worth
 * pinning at the meeting place. Onboarding steps, legal reviews, settlement
 * milestones, and custom work are deliberately excluded — they are not
 * gatherings (locked steward decision).
 */
export const MEETING_DECISION_KINDS: ReadonlySet<CommunityWorkKind> = new Set<
  CommunityWorkKind
>([
  'governance-meeting',
  'commons-review',
  'adaptive-review',
  'five-year-review',
  'member-ratification',
]);

/**
 * The steward's explicit communal-meeting-place designation for a project.
 * Either a reference to an existing gathering structure (resolved to its
 * centroid at read time) or a directly dropped pin.
 */
export type CommunityMeetingPlace =
  | { kind: 'feature'; featureId: string }
  | { kind: 'point'; coordinates: [number, number]; label?: string };

/** One upcoming meeting/decision surfaced by the marker. */
export interface CommunityMeetingEntry {
  /** Spine work-item id (`cmw__<key>`) of the confirmed work. */
  workItemId: string;
  title: string;
  /** Due date, `YYYY-MM-DD`. */
  dueDate: string;
  kind: CommunityWorkKind;
}

/**
 * Resolve a designation to `[lng, lat]`, or `null` when there is no marker to
 * draw.
 *
 * - `point` → its coordinates (guarded for finiteness).
 * - `feature` → the centroid of the referenced built-environment entity's
 *   geometry, looked up by id.
 * - undesignated (`undefined`) or a dangling feature id → `null`.
 *
 * The explicit-designation contract means there is NO fallback to a boundary
 * centroid: no place ⇒ no marker.
 */
export function resolveMeetingPlaceCoords(
  place: CommunityMeetingPlace | undefined,
  entities: BuiltEnvironmentEntity[],
): [number, number] | null {
  if (!place) return null;

  if (place.kind === 'point') {
    const [lng, lat] = place.coordinates;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  }

  const entity = entities.find((e) => e.id === place.featureId);
  if (!entity) return null;

  try {
    const c = turf.centroid(entity.geometry as turf.AllGeoJSON);
    const lng = c.geometry.coordinates[0];
    const lat = c.geometry.coordinates[1];
    // GeoJSON `Position` is a loose `number[]`; narrow before returning a tuple.
    if (typeof lng !== 'number' || typeof lat !== 'number') return null;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  } catch {
    return null;
  }
}

/**
 * Confirmed community meetings/decisions due within `[todayISO, todayISO +
 * horizonDays]`, sorted by due date ascending.
 *
 * Pure — `todayISO` is injected (never reads the clock). Reads CONFIRMED
 * proposals (the only place `kind` lives); applies the operator's edited due
 * date when present. When a `spineStatusById` map is supplied, entries whose
 * spine row is `done` or `cancelled` are dropped (the steward has closed them).
 */
export function selectUpcomingCommunityMeetings(
  proposals: CommunityWorkProposal[],
  projectId: string,
  todayISO: string,
  horizonDays: number,
  spineStatusById?: Map<string, string>,
): CommunityMeetingEntry[] {
  const horizonISO = addDaysISO(todayISO, horizonDays);
  const out: CommunityMeetingEntry[] = [];

  for (const p of proposals) {
    if (p.projectId !== projectId) continue;
    if (p.status !== 'confirmed') continue;
    if (!MEETING_DECISION_KINDS.has(p.instance.kind)) continue;

    const dueDate = p.editedFields?.dueDate ?? p.instance.dueDate;
    if (!dueDate || dueDate < todayISO || dueDate > horizonISO) continue;

    const workItemId = p.confirmedWorkItemId ?? '';
    if (workItemId && spineStatusById) {
      const status = spineStatusById.get(workItemId);
      if (status === 'done' || status === 'cancelled') continue;
    }

    out.push({
      workItemId,
      title: p.instance.title,
      dueDate,
      kind: p.instance.kind,
    });
  }

  out.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return out;
}
