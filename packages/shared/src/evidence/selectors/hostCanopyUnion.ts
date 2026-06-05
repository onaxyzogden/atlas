// packages/shared/src/evidence/selectors/hostCanopyUnion.ts
//
// Phase H.1 — Tooltip Evidence retrofit: silvopasture host-canopy union.
//
// Surfaces the de-overlapped canopy union area per host, the naive raw
// sum (overlap-inclusive), and the per-host overlap ratio as a confidence
// proxy. This is the 9th live panel under the Evidence selector dispatch
// and powers the Evidence section inside `HostUnionDrilldownCard` (the
// right-click sticky detail card over a silvopasture host union on the
// Plan map).
//
// Pure function — no React, no DOM, no Zustand. Inputs are scalar
// projections of the displayed union state already computed in
// `PlanDataLayers.tsx`.

import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface HostCanopyUnionEntry {
  /** Stable host identifier (e.g., 'host:apple-1'). */
  readonly hostId: string;
  /** Human-readable host common name. */
  readonly hostName: string;
  /** De-overlapped canopy union area in square metres. */
  readonly unionAreaM2: number;
  /** Naive sum of individual canopy areas (overlap-inclusive), m². */
  readonly rawSumM2: number;
  /** Number of distinct guilds represented under this host. */
  readonly guildCount: number;
  /** Number of plant members (rows) under this host. */
  readonly memberCount: number;
}

export interface HostCanopyUnionEvidenceInputs {
  readonly entries: ReadonlyArray<HostCanopyUnionEntry>;
}

/**
 * Confidence rule of thumb on the overlap ratio (unionAreaM2 / rawSumM2):
 *   - high   when ratio ∈ [0.9, 1.0]  (negligible overlap; geometry stable)
 *   - medium when ratio ∈ [0.5, 0.9)  (meaningful overlap correction applied)
 *   - low    when ratio  < 0.5        (heavy overlap; small geometry tweaks
 *                                      can swing the union materially)
 */
function confidenceFromRatio(ratio: number): 'low' | 'medium' | 'high' {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'low';
  if (ratio >= 0.9) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

export function selectHostCanopyUnionEvidence(
  inputs: HostCanopyUnionEvidenceInputs,
): EvidenceItem {
  const { entries } = inputs;

  const totalUnion = entries.reduce((acc, e) => acc + (e.unionAreaM2 || 0), 0);
  const totalRaw = entries.reduce((acc, e) => acc + (e.rawSumM2 || 0), 0);
  const aggregateRatio = totalRaw > 0 ? totalUnion / totalRaw : 0;

  const evidence: EvidenceFragment[] = [];

  evidence.push({
    label: 'Hosts in union',
    value: entries.length,
    source: {
      kind: 'computed',
      derivation: 'resolveSilvopastureHosts→displayedUnion.entries.length',
      confidence: 'high',
    },
  });

  if (entries.length > 0) {
    evidence.push({
      label: 'Aggregate canopy union',
      value: Math.round(totalUnion),
      unit: 'm²',
      source: {
        kind: 'computed',
        derivation: 'sum(entry.unionAreaM2)',
        confidence: 'high',
      },
      methodologyHint: 'De-overlapped canopy footprint across all hosts in this union.',
    });

    evidence.push({
      label: 'Naive raw sum',
      value: Math.round(totalRaw),
      unit: 'm²',
      source: {
        kind: 'computed',
        derivation: 'sum(entry.rawSumM2)',
        confidence: 'high',
      },
      methodologyHint: 'Sum of individual canopy areas before overlap subtraction.',
    });

    evidence.push({
      label: 'Overlap correction',
      value: `${Math.round(aggregateRatio * 100)}%`,
      source: {
        kind: 'computed',
        derivation: 'unionAreaM2 / rawSumM2',
        confidence: confidenceFromRatio(aggregateRatio),
      },
      methodologyHint:
        'Ratio of de-overlapped union to naive sum. Lower ratios indicate heavier overlap and more geometry sensitivity.',
    });
  }

  // Per-host fragments (cap at 6 to stay within the 3-8 EvidenceFragment guideline).
  const HOST_CAP = 6;
  const visible = entries.slice(0, HOST_CAP);
  for (const entry of visible) {
    const ratio = entry.rawSumM2 > 0 ? entry.unionAreaM2 / entry.rawSumM2 : 0;
    evidence.push({
      label: entry.hostName,
      value: Math.round(entry.unionAreaM2),
      unit: 'm²',
      source: {
        kind: 'computed',
        derivation: `host:${entry.hostId}`,
        confidence: confidenceFromRatio(ratio),
      },
      methodologyHint: `${entry.memberCount} member${
        entry.memberCount === 1 ? '' : 's'
      } across ${entry.guildCount} guild${entry.guildCount === 1 ? '' : 's'}; overlap-corrected from ${Math.round(
        entry.rawSumM2,
      )} m² raw.`,
    });
  }

  if (entries.length > HOST_CAP) {
    evidence.push({
      label: 'Additional hosts',
      value: entries.length - HOST_CAP,
      source: {
        kind: 'computed',
        derivation: 'entries.length - HOST_CAP',
        confidence: 'medium',
      },
      methodologyHint: `${entries.length - HOST_CAP} more host${
        entries.length - HOST_CAP === 1 ? '' : 's'
      } trimmed for compact display; full roster visible in drilldown.`,
    });
  }

  return {
    panelKey: 'host-canopy-union',
    summary: {
      label: 'Canopy union',
      value: Math.round(totalUnion),
      unit: 'm²',
    },
    evidence,
  };
}
