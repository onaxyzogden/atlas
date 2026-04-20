/**
 * Sprint BK — shared non-JSX helpers for SiteIntelligencePanel sections.
 *
 * Pure functions only. See `_shared.tsx` for memoized leaf components.
 */

import { confidence, error as errorToken, semantic } from '../../../lib/tokens.js';

export function severityColor(severity: string, fallback: string): string {
  switch (severity) {
    case 'critical': return errorToken.DEFAULT;
    case 'warning': return confidence.medium;
    case 'info': return fallback;
    default: return fallback;
  }
}

export function formatComponentName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function capConf(c: 'high' | 'medium' | 'low'): 'High' | 'Medium' | 'Low' {
  return (c.charAt(0).toUpperCase() + c.slice(1)) as 'High' | 'Medium' | 'Low';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return confidence.high;
  if (score >= 60) return semantic.sidebarActive;
  return confidence.low;
}

export function getHydroColor(cls: string): string {
  if (cls === 'Humid' || cls === 'Dry sub-humid') return confidence.high;
  if (cls === 'Semi-arid') return confidence.medium;
  return confidence.low;
}

export function getSoilPhColor(ph: number): string {
  if (ph >= 6.0 && ph <= 7.5) return confidence.high;
  if (ph >= 5.5 && ph <= 8.0) return confidence.medium;
  return confidence.low;
}

export function getCompactionColor(bd: number): string {
  if (bd <= 1.3) return confidence.high;
  if (bd <= 1.5) return confidence.medium;
  return confidence.low;
}
