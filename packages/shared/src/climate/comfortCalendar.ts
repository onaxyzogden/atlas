/**
 * Seasonal comfort calendar — classifies each month of the year into a
 * thermal-comfort band using monthly temperature normals. Used by the
 * §6 Climate dashboard to surface outdoor-use seasonality at a glance.
 */

export type ComfortBand = 'freezing' | 'cold' | 'cool' | 'comfortable' | 'hot';

export interface MonthlyNormal {
  month: number; // 1-12
  precip_mm?: number | null;
  mean_max_c?: number | null;
  mean_min_c?: number | null;
}

export interface ComfortMonth {
  month: number;
  band: ComfortBand;
  meanMaxC: number | null;
  meanMinC: number | null;
  precipMm: number | null;
  /** True when precip >= 120 mm — flags wet-season overlay independent of thermal band. */
  wet: boolean;
}

export interface ComfortSummary {
  months: ComfortMonth[];
  comfortableMonths: number;
  outdoorSeasonStart: number | null; // 1-12, first comfortable month
  outdoorSeasonEnd: number | null;   // 1-12, last comfortable month
}

export function classifyMonthComfort(normal: MonthlyNormal): ComfortBand {
  const max = normal.mean_max_c;
  const min = normal.mean_min_c;
  if (max == null || min == null) return 'cool';
  if (min < -5) return 'freezing';
  if (max < 10) return 'cold';
  if (max < 18) return 'cool';
  if (max > 30 || min > 22) return 'hot';
  return 'comfortable';
}

export function buildComfortSummary(
  normals: MonthlyNormal[] | null | undefined,
): ComfortSummary | null {
  if (!normals || normals.length === 0) return null;

  const byMonth = new Map<number, MonthlyNormal>();
  for (const n of normals) byMonth.set(n.month, n);

  const months: ComfortMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const n = byMonth.get(m);
    if (!n) continue;
    months.push({
      month: m,
      band: classifyMonthComfort(n),
      meanMaxC: n.mean_max_c ?? null,
      meanMinC: n.mean_min_c ?? null,
      precipMm: n.precip_mm ?? null,
      wet: (n.precip_mm ?? 0) >= 120,
    });
  }

  const comfortableLike = new Set<ComfortBand>(['cool', 'comfortable']);
  const comfortableMonths = months.filter((m) => comfortableLike.has(m.band)).length;

  let start: number | null = null;
  let end: number | null = null;
  for (const m of months) {
    if (comfortableLike.has(m.band)) {
      if (start === null) start = m.month;
      end = m.month;
    }
  }

  return {
    months,
    comfortableMonths,
    outdoorSeasonStart: start,
    outdoorSeasonEnd: end,
  };
}
