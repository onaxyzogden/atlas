/**
 * B5.2.x.c — Pure month → ISO date inference for cover-crop windows.
 *
 * A `CropCoverWindow` carries only `startMonth` / `endMonth` (1..12) with
 * wrap semantics: when `endMonth < startMonth`, the window crosses a year
 * boundary (e.g. winter rye Oct→Mar). This helper rebases those months onto
 * a project start year and emits ISO YYYY-MM-DD strings suitable for the
 * spine's `scheduledStart` / `scheduledEnd`.
 *
 * Day-clamps: `start` always day-01, `end` always day-28 (safe for every
 * month including February). Stewards can refine via override edits if
 * needed; the inference is a "good-enough scheduling anchor", not a precise
 * agronomic date.
 *
 * Pure / no I/O / no React.
 */

import type { CropCoverWindow } from '../../store/cropStore.js';

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/**
 * Resolve a project start year from a `LocalProject.startDate`-style ISO
 * string. Returns the current calendar year when the input is null,
 * empty, or unparseable.
 */
export function resolveProjectStartYear(
  startDateIso: string | null | undefined,
  nowFn: () => Date = () => new Date(),
): number {
  if (!startDateIso) return nowFn().getFullYear();
  const parsed = new Date(startDateIso);
  const y = parsed.getFullYear();
  if (!Number.isFinite(y)) return nowFn().getFullYear();
  return y;
}

/**
 * Build scheduledStart / scheduledEnd ISO strings for a single cover-crop
 * window pinned to `projectStartYear`. Wrap-aware: when `endMonth <
 * startMonth`, the end-year is `projectStartYear + 1`. When `endMonth ===
 * startMonth`, treated as a single-month window (no wrap).
 */
export function inferCoverCropDates(
  window: Pick<CropCoverWindow, 'startMonth' | 'endMonth'>,
  projectStartYear: number,
): { start: string; end: string } {
  const sm = clampMonth(window.startMonth);
  const em = clampMonth(window.endMonth);
  const wrap = em < sm;
  const endYear = wrap ? projectStartYear + 1 : projectStartYear;
  return {
    start: `${projectStartYear}-${pad2(sm)}-01`,
    end: `${endYear}-${pad2(em)}-28`,
  };
}

function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return 1;
  const i = Math.round(n);
  if (i < 1) return 1;
  if (i > 12) return 12;
  return i;
}
