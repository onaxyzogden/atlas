/**
 * Formatting helpers for dollar values and low/high ranges used across the
 * Economics panel, Investor Summary export, Scenarios panel, etc.
 */

/** Format a number as a "$XK" abbreviation (e.g. 12345 → "$12K"). Negative values keep their sign before the dollar sign. */
export function fmtK(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n / 1000))}K`;
}

/** "$XK–$YK[suffix]" — thousands-abbreviated range with a real en-dash. */
export function formatKRange(low: number, high: number, suffix = ''): string {
  return `${fmtK(low)}–${fmtK(high)}${suffix}`;
}

/** "$X,XXX–$Y,YYY[suffix]" — locale-formatted range with thousands separators. */
export function formatUsdRange(low: number, high: number, suffix = ''): string {
  return `$${low.toLocaleString()}–$${high.toLocaleString()}${suffix}`;
}
