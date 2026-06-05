// apps/web/src/lib/evidence/selectors/waterStorage.ts
//
// Phase E.2 — WaterStorageCard evidence selector.
//
// Surfaces the storage formula per node kind, the overflow-graph
// integrity warnings, and the sponge-capacity derivation linkage to
// D.3 (so the viewer can trace storage → SOM uplift assumptions).

import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface WaterStorageEvidenceInputs {
  /** Aggregate live storage across all phases (cubic metres). */
  totalStorageM3: number;
  /** Node count by kind (tank | pond | swale | cistern | dam ...). */
  nodesByKind: Record<string, number>;
  /** Active phase id — storage is filtered to the visible phase. */
  activePhaseId?: string;
  /** Warnings raised by overflow graph integrity check. */
  overflowWarnings: ReadonlyArray<string>;
  /** Sponge capacity from D.3 link, if available (cubic metres). */
  spongeCapacityM3?: number;
}

export function selectWaterStorageEvidence(
  inputs: WaterStorageEvidenceInputs,
): EvidenceItem {
  const { totalStorageM3, nodesByKind, activePhaseId, overflowWarnings, spongeCapacityM3 } =
    inputs;

  const evidence: EvidenceFragment[] = [
    {
      label: 'Total live storage',
      value: Math.round(totalStorageM3),
      unit: 'm³',
      source: {
        kind: 'computed',
        derivation: 'sum(node.storageM3) where phase ≤ activePhase',
        confidence: 'high',
      },
      methodologyHint: 'Phase-capped: nodes whose introduction phase is unreached are excluded.',
    },
  ];

  for (const [kind, count] of Object.entries(nodesByKind)) {
    if (count <= 0) continue;
    evidence.push({
      label: `${kind} nodes`,
      value: count,
      source: {
        kind: 'computed',
        derivation: `waterNodes.kind === '${kind}'`,
        confidence: 'high',
      },
    });
  }

  if (activePhaseId) {
    evidence.push({
      label: 'Visible phase',
      value: activePhaseId,
      source: {
        kind: 'fixture',
        derivation: 'projectStore.activePhaseId',
        confidence: 'high',
      },
    });
  }

  if (typeof spongeCapacityM3 === 'number') {
    evidence.push({
      label: 'Soil sponge capacity (D.3)',
      value: Math.round(spongeCapacityM3),
      unit: 'm³',
      source: {
        kind: 'computed',
        derivation: 'projectSomTrajectory→sponge',
        confidence: 'medium',
      },
      methodologyHint: 'Volumetric water-holding capacity uplift from SOM trajectory.',
    });
  }

  if (overflowWarnings.length > 0) {
    evidence.push({
      label: 'Overflow integrity',
      value: `${overflowWarnings.length} warning${overflowWarnings.length === 1 ? '' : 's'}`,
      source: {
        kind: 'computed',
        derivation: 'overflowGraphIntegrity',
        confidence: 'medium',
      },
      methodologyHint: overflowWarnings.slice(0, 2).join(' | '),
    });
  } else {
    evidence.push({
      label: 'Overflow integrity',
      value: 'OK',
      source: {
        kind: 'computed',
        derivation: 'overflowGraphIntegrity',
        confidence: 'high',
      },
    });
  }

  return {
    panelKey: 'water-storage',
    summary: { label: 'Live storage', value: Math.round(totalStorageM3), unit: 'm³' },
    evidence,
  };
}
