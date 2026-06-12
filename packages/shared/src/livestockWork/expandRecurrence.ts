/**
 * expandRecurrence — deterministic rule → dated-instance expansion.
 *
 * PURE: no Date.now(), no locale, no timezone — all date math is done on
 * UTC days parsed from YYYY-MM-DD strings. Determinism matters twice over:
 * the same rule + range must expand identically on every device (sync),
 * and instance keys (`<ruleKey>__<dueDate>`) must be stable across daily
 * regenerations so the diff layer can honour dismissed-stays-dismissed.
 *
 * Stability strategy — due dates are CALENDAR-ANCHORED, never anchored to
 * the regeneration day:
 *   daily          every date in range
 *   weekly         every Monday
 *   monthly        the 1st of each month
 *   quarterly      Jan/Apr/Jul/Oct 1st
 *   annual         Jan 1st (or the seasonal window when one is set)
 *   biennial       Jan 1st of even years
 *   every-3-years  Jan 1st of years divisible by 3
 * A rolling horizon regenerated tomorrow therefore re-emits the SAME keys
 * for every overlapping date — only the trailing edge advances.
 *
 * Seasonal windows: the rule stores a hemisphere-neutral season key; this
 * module resolves it to quarter months matching the grazing capture's
 * framing (southern autumn = Apr-Jun, etc.; northern shifted six months).
 * A seasonal rule emits ONE instance per window occurrence, due on the
 * window's first day, carrying `windowEnd` — and the instance is included
 * whenever the WINDOW overlaps the range (a window already underway at
 * the range start still surfaces, with its stable past-dated key, rather
 * than re-keying to the regeneration day).
 */

import type { WorkItemRecurrence } from '../schemas/workItem.schema.js';
import type {
  LivestockSeasonKey,
  LivestockWorkInstance,
  LivestockWorkRule,
} from '../schemas/livestockWork/livestockWork.schema.js';

/** Hard per-rule occurrence cap (a 90-day daily rule emits ~91). */
export const MAX_INSTANCES_PER_RULE = 200;

/** YYYY-MM-DD + n days (UTC, deterministic). '' on garbage input. */
export function addDaysISO(iso: string, days: number): string {
  const ms = parseISODate(iso);
  if (!Number.isFinite(ms)) return '';
  return toISODate(ms + days * DAY_MS);
}

const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD as a UTC ms timestamp (midnight). NaN on garbage. */
function parseISODate(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Format a UTC ms timestamp back to YYYY-MM-DD. */
function toISODate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/**
 * First month (1-12) of each season's quarter bucket. SOUTHERN values
 * match the grazing capture's badges (Autumn Apr-Jun, Winter Jul-Sep,
 * Spring Oct-Dec, Summer Jan-Mar); northern is the same bucket + 6 months.
 */
const SEASON_START_MONTH: Record<
  LivestockSeasonKey,
  { southern: number; northern: number }
> = {
  autumn: { southern: 4, northern: 10 },
  winter: { southern: 7, northern: 1 },
  spring: { southern: 10, northern: 4 },
  summer: { southern: 1, northern: 7 },
};

/** Resolve a season window to its [startMonth, endMonth] for a hemisphere. */
export function seasonWindowMonths(
  season: LivestockSeasonKey,
  isSouthern: boolean,
): { startMonth: number; endMonth: number } {
  const entry = SEASON_START_MONTH[season];
  const startMonth = isSouthern ? entry.southern : entry.northern;
  return { startMonth, endMonth: ((startMonth - 1 + 2) % 12) + 1 };
}

/** Last day of a month (1-12) in a given year, via UTC day-0 rollover. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildInstance(
  rule: LivestockWorkRule,
  dueDate: string,
  windowEnd?: string,
): LivestockWorkInstance {
  return {
    key: `${rule.key}__${dueDate}`,
    ruleKey: rule.key,
    dueDate,
    ...(windowEnd !== undefined ? { windowEnd } : {}),
    kind: rule.kind,
    title: rule.title,
    ...(rule.detail !== undefined ? { detail: rule.detail } : {}),
    ...(rule.scopeNotes !== undefined ? { scopeNotes: rule.scopeNotes } : {}),
    sourceKind: rule.sourceKind,
    ...(rule.sourceProtocolId !== undefined
      ? { sourceProtocolId: rule.sourceProtocolId }
      : {}),
    ...(rule.sourceObjectiveId !== undefined
      ? { sourceObjectiveId: rule.sourceObjectiveId }
      : {}),
    ...(rule.species !== undefined ? { species: rule.species } : {}),
    ...(rule.paddockId !== undefined ? { paddockId: rule.paddockId } : {}),
    ...(rule.suggestedCarer !== undefined
      ? { suggestedCarer: rule.suggestedCarer }
      : {}),
    inputsHash: rule.inputsHash,
  };
}

/**
 * Seasonal expansion: one instance per window occurrence whose window
 * overlaps [from, to]. dueDate = window start (stable even when already
 * past); windowEnd = last day of the window's final month.
 */
function expandSeasonal(
  rule: LivestockWorkRule,
  season: LivestockSeasonKey,
  fromMs: number,
  toMs: number,
  isSouthern: boolean,
): LivestockWorkInstance[] {
  const { startMonth } = seasonWindowMonths(season, isSouthern);
  const fromYear = new Date(fromMs).getUTCFullYear();
  const toYear = new Date(toMs).getUTCFullYear();
  const out: LivestockWorkInstance[] = [];
  for (let year = fromYear - 1; year <= toYear + 1; year++) {
    const startMs = Date.UTC(year, startMonth - 1, 1);
    // Window spans three consecutive months from startMonth.
    const endMonthIndex = startMonth - 1 + 2; // 0-based, may roll into next year
    const endYear = year + Math.floor(endMonthIndex / 12);
    const endMonth = (endMonthIndex % 12) + 1;
    const endMs = Date.UTC(endYear, endMonth - 1, lastDayOfMonth(endYear, endMonth));
    if (endMs < fromMs || startMs > toMs) continue;
    out.push(buildInstance(rule, toISODate(startMs), toISODate(endMs)));
    if (out.length >= MAX_INSTANCES_PER_RULE) break;
  }
  return out;
}

/** True when `ms` is a calendar anchor for the recurrence. */
function isAnchorDay(ms: number, recurrence: WorkItemRecurrence): boolean {
  const d = new Date(ms);
  switch (recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return d.getUTCDay() === 1; // Monday
    case 'monthly':
      return d.getUTCDate() === 1;
    case 'quarterly':
      return d.getUTCDate() === 1 && d.getUTCMonth() % 3 === 0;
    case 'annual':
      return d.getUTCDate() === 1 && d.getUTCMonth() === 0;
    case 'biennial':
      return (
        d.getUTCDate() === 1 &&
        d.getUTCMonth() === 0 &&
        d.getUTCFullYear() % 2 === 0
      );
    case 'every-3-years':
      return (
        d.getUTCDate() === 1 &&
        d.getUTCMonth() === 0 &&
        d.getUTCFullYear() % 3 === 0
      );
    default: {
      const _exhaustive: never = recurrence;
      throw new Error(`Unknown recurrence: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Expand one rule over [fromISO, toISO] (inclusive, YYYY-MM-DD).
 * Deterministic; returns [] on an invalid/empty range; capped at
 * MAX_INSTANCES_PER_RULE.
 */
export function expandRecurrence(
  rule: LivestockWorkRule,
  fromISO: string,
  toISO: string,
  opts: { isSouthernHemisphere: boolean },
): LivestockWorkInstance[] {
  const fromMs = parseISODate(fromISO);
  const toMs = parseISODate(toISO);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return [];
  }

  if (rule.seasonalWindow) {
    return expandSeasonal(
      rule,
      rule.seasonalWindow.season,
      fromMs,
      toMs,
      opts.isSouthernHemisphere,
    );
  }

  const out: LivestockWorkInstance[] = [];
  for (let ms = fromMs; ms <= toMs; ms += DAY_MS) {
    if (!isAnchorDay(ms, rule.recurrence)) continue;
    out.push(buildInstance(rule, toISODate(ms)));
    if (out.length >= MAX_INSTANCES_PER_RULE) break;
  }
  return out;
}
