/**
 * Pure layout math for the Goal-Compass Build-Sequence diagram (OLOS gap #7).
 *
 * Turns the deterministic sequencing engine's `SelectedIntervention[]` (already
 * topologically ordered) into swimlane geometry: one horizontal band per *used*
 * Yeomans permanence phase (climate at top → soil at bottom), one node per
 * selected intervention placed in build order within its band, and one edge per
 * prerequisite that is itself selected.
 *
 * This module is intentionally turf-free and React-free so the geometry can be
 * unit-tested without a DOM or WebGL — mirroring the pure-core / view split used
 * elsewhere in the codebase (e.g. `packages/shared` confidence vs web turf glue).
 * The engine and `phaseStore` are NOT touched; this is a read-only projection.
 */

import { phaseIndex } from '../../types.js';
import type { PhaseKey } from '../../types.js';
import type { SelectedIntervention } from './sequencingEngine.js';
import type { BuildPhase } from '../../../../store/phaseStore.js';

// ── Tunable layout constants (named in one place per plan review) ────────────
export const LAYOUT = {
  bandHeight: 70,
  bandLabelWidth: 138,
  nodeRadius: 8,
  nodeXGap: 158,
  nodeXStart: 178, // bandLabelWidth + gutter
  padTop: 16,
  padBottom: 16,
} as const;

/**
 * Fallback phase labels — mirror the engine's private `PHASE_LABEL`. Used only
 * when a matching generated `BuildPhase` is absent (e.g. in unit tests that pass
 * `generatedPhases: []`). When the real phase is present we prefer its authored
 * name + colour so the diagram matches the Proposal tab the steward already sees.
 */
const PHASE_LABEL: Record<PhaseKey, string> = {
  climate: 'Climate & assessment',
  landshape: 'Landshape',
  water: 'Water',
  access: 'Access',
  trees: 'Trees & plantings',
  buildings: 'Buildings',
  subdivision: 'Subdivision & livestock',
  soil: 'Soil',
};

/** Earthy fallback hues per phase, used when a BuildPhase colour is unavailable. */
const PHASE_COLOR: Record<PhaseKey, string> = {
  climate: 'hsl(40, 55%, 55%)',
  landshape: 'hsl(58, 52%, 52%)',
  water: 'hsl(200, 55%, 55%)',
  access: 'hsl(28, 55%, 55%)',
  trees: 'hsl(120, 40%, 50%)',
  buildings: 'hsl(15, 45%, 55%)',
  subdivision: 'hsl(280, 32%, 58%)',
  soil: 'hsl(30, 45%, 46%)',
};

export interface SequenceBand {
  phaseKey: PhaseKey;
  /** 0-based position top→bottom (climate = 0). */
  index: number;
  label: string;
  color: string;
  /** Band top edge, px. */
  y: number;
  centerY: number;
  height: number;
}

export interface SequenceNode {
  /** Intervention id. */
  id: string;
  name: string;
  phaseKey: PhaseKey;
  startYearOffset: number;
  laborHrsTotal: number;
  costMidUSD: number;
  /** All authored prerequisites (not just selected ones) — for tooltips. */
  prerequisites: string[];
  /** Node centre, px. */
  x: number;
  y: number;
}

export interface SequenceEdge {
  /** Prerequisite (drawn as the curve source). */
  fromId: string;
  /** Dependent intervention (arrowhead lands here). */
  toId: string;
}

export interface SequenceLayout {
  bands: SequenceBand[];
  nodes: SequenceNode[];
  edges: SequenceEdge[];
  width: number;
  height: number;
}

/**
 * Build swimlane geometry from the engine's ordered selection.
 *
 * @param selected        topologically ordered interventions from `runSequencingEngine`
 * @param generatedPhases the engine's emitted BuildPhases (for authored label + colour)
 */
export function buildSequenceLayout(
  selected: SelectedIntervention[],
  generatedPhases: BuildPhase[],
): SequenceLayout {
  // Map a generated BuildPhase back to its PhaseKey by its authored name, so we
  // can borrow the real label + colour regardless of array ordering or empties.
  const labelToPhase = new Map<string, PhaseKey>(
    (Object.entries(PHASE_LABEL) as [PhaseKey, string][]).map(([k, v]) => [v, k]),
  );
  const genByPhase = new Map<PhaseKey, BuildPhase>();
  for (const gp of generatedPhases) {
    const pk = labelToPhase.get(gp.name);
    if (pk) genByPhase.set(pk, gp);
  }

  // Used phases, ordered by Yeomans permanence (climate → soil).
  const usedPhases = [...new Set(selected.map((s) => s.intervention.yeomansPhase))].sort(
    (a, b) => phaseIndex(a) - phaseIndex(b),
  );

  const bands: SequenceBand[] = usedPhases.map((pk, i) => {
    const top = LAYOUT.padTop + i * LAYOUT.bandHeight;
    const gp = genByPhase.get(pk);
    return {
      phaseKey: pk,
      index: i,
      label: gp?.name ?? PHASE_LABEL[pk],
      color: gp?.color ?? PHASE_COLOR[pk],
      y: top,
      centerY: top + LAYOUT.bandHeight / 2,
      height: LAYOUT.bandHeight,
    };
  });

  const bandCenterByPhase = new Map<PhaseKey, number>(
    bands.map((b) => [b.phaseKey, b.centerY]),
  );

  // Place nodes in build order; per-band x counter preserves the topo ordering
  // already baked into `selected`.
  const xCountByPhase = new Map<PhaseKey, number>();
  const nodes: SequenceNode[] = selected.map((s) => {
    const pk = s.intervention.yeomansPhase;
    const col = xCountByPhase.get(pk) ?? 0;
    xCountByPhase.set(pk, col + 1);
    return {
      id: s.intervention.id,
      name: s.intervention.name,
      phaseKey: pk,
      startYearOffset: s.startYearOffset,
      laborHrsTotal: s.laborHrsTotal,
      costMidUSD: s.costMidUSD,
      prerequisites: s.intervention.prerequisites,
      x: LAYOUT.nodeXStart + col * LAYOUT.nodeXGap,
      y: bandCenterByPhase.get(pk) ?? LAYOUT.padTop,
    };
  });

  // Edges: only when a prerequisite is also a selected node (skip dangling).
  const selectedIds = new Set(selected.map((s) => s.intervention.id));
  const edges: SequenceEdge[] = [];
  for (const s of selected) {
    for (const pre of s.intervention.prerequisites) {
      if (selectedIds.has(pre)) {
        edges.push({ fromId: pre, toId: s.intervention.id });
      }
    }
  }

  const maxCols = Math.max(0, ...[...xCountByPhase.values()]);
  const width = Math.max(
    LAYOUT.nodeXStart + LAYOUT.nodeXGap, // a sensible minimum
    LAYOUT.nodeXStart + maxCols * LAYOUT.nodeXGap,
  );
  const height = LAYOUT.padTop + bands.length * LAYOUT.bandHeight + LAYOUT.padBottom;

  return { bands, nodes, edges, width, height };
}
