/**
 * Parcel-area integrity guard.
 *
 * A project whose parcel acreage is missing or zero cannot be honestly
 * assessed — site fit, water balance and the verdict all depend on a real
 * area. This module is the single place that decides "is the parcel area
 * trustworthy" and supplies the honest blocker + verdict shown when it
 * is not. It performs no area math (that stays in `lib/geo.ts`); it only
 * tests the value the wizard / Observe redraw already stored.
 */

import type { LocalProject } from '../../store/projectStore.js';
import type { Blocker, ProjectLocation, Verdict } from '../types.js';

/** A parcel area is usable only if it is a finite, strictly-positive number. */
export function isParcelAreaValid(p: Pick<LocalProject, 'acreage'>): boolean {
  const a = p.acreage;
  return typeof a === 'number' && Number.isFinite(a) && a > 0;
}

/**
 * Honest area string for any v3 Project location. Renders "Area not set"
 * when the parcel area is untrustworthy instead of a misleading "0 ha".
 */
export function formatLocationArea(
  loc: Pick<ProjectLocation, 'acreage' | 'acreageUnit' | 'areaKnown'>,
): string {
  return loc.areaKnown === false
    ? 'Area not set'
    : `${loc.acreage} ${loc.acreageUnit}`;
}

/** Surfaced as a blocking issue whenever the parcel area is not usable. */
export const INTEGRITY_BLOCKER: Blocker = {
  id: 'parcel-area-missing',
  title: 'Parcel boundary missing or zero-area',
  severity: 'blocking',
  description:
    'No usable parcel area is set for this project, so site fit cannot be assessed.',
  recommendedAction: 'Redraw the parcel boundary on the map.',
  actionLabel: 'Fix on Map',
};

/**
 * Explicit constant verdict for a zero/missing-area project. Deliberately
 * not routed through `adaptVerdict`/`VERDICT_TABLE` so a future scoring-table
 * edit can never soften a zero-area project into reading as supported.
 */
export const INSUFFICIENT_DATA_VERDICT: Verdict = {
  status: 'blocked',
  label: 'Insufficient Data — cannot assess',
  score: 0,
  scoreLabel: 'Overall Fit',
  summary:
    'Parcel boundary is missing or has zero area. Redraw the boundary before this project can be assessed.',
};
