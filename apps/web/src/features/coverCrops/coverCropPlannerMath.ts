/**
 * B5.2.x — Pure helpers for the per-CropArea cover-crop planner editor.
 *
 * Component-state mutation helpers (add / remove / update window),
 * draft-vs-stored equality, default-window derivation from a catalog
 * entry, and a year-wrap-aware month-range formatter. All functions
 * are pure: no React, no store import, no side effects, fresh arrays
 * on every call. Mirrors the `livingRootsMath.ts` ↔ `LivingRootsCard.tsx`
 * split B5.1 established.
 *
 * Covenant: agronomic only — no riba / gharar / CSRA / salam / investor
 * / financing / cost-of-capital framing. Months-of-living-roots is a
 * soil-vitality projection, never a yield-as-return notion.
 */

import type { CropCoverWindow } from '../../store/cropStore.js';
import type { CoverCropEntry } from './coverCropCatalog.js';

const MONTH_LABEL_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** True iff `m` is an integer in 1..12. */
export function isValidMonth(m: number): boolean {
  return Number.isInteger(m) && m >= 1 && m <= 12;
}

/**
 * Derive a sensible default `{ startMonth, endMonth }` for a freshly-
 * picked cover-crop entry. Start = `plantingMonthWindow[0]`; end =
 * `plantingMonthWindow[1]` extended forward through the catalog
 * entry's last `livingRootSeasons` month so the window covers both
 * the seeding lead-time and the living-roots window the catalog
 * advertises. The result is always a valid 1..12 pair; the window
 * may wrap the year boundary when the living-roots tail crosses
 * December.
 */
export function defaultWindowFor(entry: CoverCropEntry): {
  startMonth: number;
  endMonth: number;
} {
  const [seedStart, seedEnd] = entry.plantingMonthWindow;
  const startMonth = isValidMonth(seedStart) ? seedStart : 1;

  const seasonTail = lastMonthOfSeasons(entry.livingRootSeasons);
  const candidate = seasonTail ?? (isValidMonth(seedEnd) ? seedEnd : startMonth);

  return { startMonth, endMonth: candidate };
}

/**
 * Last calendar month covered by the given season set (Northern-
 * hemisphere temperate default). Used to extend the default window
 * past the seeding window through the species' last living-roots
 * month. Returns null when the season set is empty or invalid.
 *
 * - winter → 2 (covers Dec–Feb; tail is Feb)
 * - spring → 5
 * - summer → 8
 * - fall   → 11
 *
 * If multiple seasons span the year-wrap (e.g. fall + winter +
 * spring on winter rye), the tail is the last season in the
 * fall → winter → spring → summer cycle that follows planting.
 */
function lastMonthOfSeasons(seasons: CoverCropEntry['livingRootSeasons']): number | null {
  if (!seasons || seasons.length === 0) return null;
  const order: Array<CoverCropEntry['livingRootSeasons'][number]> = [
    'fall', 'winter', 'spring', 'summer',
  ];
  let tail: CoverCropEntry['livingRootSeasons'][number] | null = null;
  for (const s of order) {
    if (seasons.includes(s)) tail = s;
  }
  switch (tail) {
    case 'winter': return 2;
    case 'spring': return 5;
    case 'summer': return 8;
    case 'fall':   return 11;
    default:       return null;
  }
}

/** Append a window; returns a brand-new array. */
export function addWindow(
  windows: readonly CropCoverWindow[],
  next: CropCoverWindow,
): CropCoverWindow[] {
  return [...windows, next];
}

/** Remove the entry at `index`; returns a brand-new array. */
export function removeWindow(
  windows: readonly CropCoverWindow[],
  index: number,
): CropCoverWindow[] {
  if (index < 0 || index >= windows.length) return [...windows];
  return windows.filter((_, i) => i !== index);
}

/** Patch the entry at `index`; returns a brand-new array. */
export function updateWindow(
  windows: readonly CropCoverWindow[],
  index: number,
  patch: Partial<CropCoverWindow>,
): CropCoverWindow[] {
  if (index < 0 || index >= windows.length) return [...windows];
  return windows.map((w, i) => (i === index ? { ...w, ...patch } : w));
}

/**
 * Shallow per-field equality across two window arrays. Used to
 * disable the Save button when the draft matches the stored array.
 * Order matters — reorderings count as inequal (the editor never
 * reorders; this keeps the check cheap and unambiguous).
 */
export function windowsEqual(
  a: readonly CropCoverWindow[] | undefined,
  b: readonly CropCoverWindow[] | undefined,
): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    const x = aa[i]!;
    const y = bb[i]!;
    if (
      x.speciesId !== y.speciesId ||
      x.startMonth !== y.startMonth ||
      x.endMonth !== y.endMonth ||
      x.role !== y.role
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Year-wrap-aware month-range formatter for chip labels.
 * - same start/end       → "Oct"
 * - normal range         → "Mar–Jul"
 * - wrap (end < start)   → "Oct–Mar"
 * - invalid input        → "—"
 */
export function formatMonthRange(startMonth: number, endMonth: number): string {
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) return '—';
  if (startMonth === endMonth) return MONTH_LABEL_SHORT[startMonth - 1]!;
  return `${MONTH_LABEL_SHORT[startMonth - 1]}–${MONTH_LABEL_SHORT[endMonth - 1]}`;
}
