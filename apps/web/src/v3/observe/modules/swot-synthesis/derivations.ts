/**
 * derivations — pure helpers for the v3 SWOT Synthesis module.
 * Maps `useSwotStore` entries into counts, KPI strips, and journal metrics.
 */

import type { SwotEntry } from '../../../../store/swotStore.js';

// ── KpiItem (same contract as other modules) ──────────────────────────────────

export type KpiIconKey = 'shield' | 'triangle' | 'lightbulb' | 'cloud' | 'book';

export interface KpiItem {
  iconKey: KpiIconKey;
  label: string;
  value: string;
  note: string;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'dim';
}

export interface MetricItem {
  iconKey: KpiIconKey;
  label: string;
  value: string;
  delta: string;
}

const DASH = '—';

// ── swotCounts ────────────────────────────────────────────────────────────────

export interface SwotCounts {
  total: number;
  S: number;
  W: number;
  O: number;
  T: number;
}

export function swotCounts(entries: SwotEntry[]): SwotCounts {
  const counts: SwotCounts = { total: 0, S: 0, W: 0, O: 0, T: 0 };
  for (const e of entries) {
    counts.total++;
    counts[e.bucket]++;
  }
  return counts;
}

// ── swotKpis (dashboard quadrant strip) ──────────────────────────────────────

export function swotKpis(entries: SwotEntry[]): KpiItem[] {
  const c = swotCounts(entries);
  return [
    {
      iconKey: 'shield',
      label: 'Strengths',
      value: c.S > 0 ? String(c.S) : DASH,
      note: c.S > 0 ? 'Internal assets' : 'None yet',
      tone: c.S > 0 ? 'green' : 'dim',
    },
    {
      iconKey: 'triangle',
      label: 'Weaknesses',
      value: c.W > 0 ? String(c.W) : DASH,
      note: c.W > 0 ? 'Internal gaps' : 'None yet',
      tone: c.W > 0 ? 'gold' : 'dim',
    },
    {
      iconKey: 'lightbulb',
      label: 'Opportunities',
      value: c.O > 0 ? String(c.O) : DASH,
      note: c.O > 0 ? 'External leverage' : 'None yet',
      tone: c.O > 0 ? 'blue' : 'dim',
    },
    {
      iconKey: 'cloud',
      label: 'Threats',
      value: c.T > 0 ? String(c.T) : DASH,
      note: c.T > 0 ? 'External risks' : 'None yet',
      tone: c.T > 0 ? 'red' : 'dim',
    },
  ];
}

// ── journalMetrics (journal page metric strip, 5 items) ───────────────────────

export function journalMetrics(entries: SwotEntry[]): MetricItem[] {
  const c = swotCounts(entries);
  return [
    { iconKey: 'shield',    label: 'Strengths',     value: c.S     > 0 ? String(c.S)     : DASH, delta: c.S     > 0 ? 'Logged' : 'None yet'    },
    { iconKey: 'triangle',  label: 'Weaknesses',    value: c.W     > 0 ? String(c.W)     : DASH, delta: c.W     > 0 ? 'Logged' : 'None yet'    },
    { iconKey: 'lightbulb', label: 'Opportunities', value: c.O     > 0 ? String(c.O)     : DASH, delta: c.O     > 0 ? 'Logged' : 'None yet'    },
    { iconKey: 'cloud',     label: 'Threats',       value: c.T     > 0 ? String(c.T)     : DASH, delta: c.T     > 0 ? 'Logged' : 'None yet'    },
    { iconKey: 'book',      label: 'Total entries', value: c.total > 0 ? String(c.total) : DASH, delta: 'This project' },
  ];
}
