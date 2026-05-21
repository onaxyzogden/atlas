// apps/web/src/lib/evidence/selectors/waterRouter.ts
//
// Phase E.2 — WaterRouterCard evidence selector.
//
// Surfaces the routing heuristics (aspect-projected gradients, DEM
// sampler uncertainty, centroid estimation method) and the per-tier
// head-loss thresholds so the viewer can audit how Atlas chose the
// downstream flow path for each upstream element.

import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface WaterRouterEvidenceInputs {
  /** Total routed edges (capture node → sink node). */
  routedEdgeCount: number;
  /** Mean confidence across all routed edges (0..1). */
  meanRoutingConfidence: number;
  /** Whether DEM was available at routing time. */
  hadDem: boolean;
  /** Whether aspect data was available. */
  hadAspect: boolean;
  /** Head loss budget used (metres). */
  headLossBudgetM?: number;
  /** Warnings raised during routing. */
  warnings: ReadonlyArray<string>;
}

export function selectWaterRouterEvidence(
  inputs: WaterRouterEvidenceInputs,
): EvidenceItem {
  const {
    routedEdgeCount,
    meanRoutingConfidence,
    hadDem,
    hadAspect,
    headLossBudgetM,
    warnings,
  } = inputs;

  const evidence: EvidenceFragment[] = [
    {
      label: 'Routed edges',
      value: routedEdgeCount,
      source: {
        kind: 'computed',
        derivation: 'waterRouter.route(captures, sinks)',
        confidence: 'high',
      },
    },
    {
      label: 'Mean routing confidence',
      value: Math.round(meanRoutingConfidence * 100),
      unit: '%',
      source: {
        kind: 'computed',
        derivation: 'mean(edge.confidence)',
        confidence: meanRoutingConfidence >= 0.7 ? 'high' : 'medium',
      },
      methodologyHint: 'Combines aspect-projected gradient, DEM sampler, centroid distance.',
    },
    {
      label: 'DEM available',
      value: hadDem ? 'yes' : 'no',
      source: {
        kind: 'layer',
        layerType: 'elevation',
        confidence: hadDem ? 'high' : 'low',
      },
      methodologyHint: hadDem
        ? 'DEM head-loss sampling used.'
        : 'Fell back to aspect-only heuristic.',
    },
    {
      label: 'Aspect available',
      value: hadAspect ? 'yes' : 'no',
      source: {
        kind: 'computed',
        derivation: 'terrainAnalysis.aspect',
        confidence: hadAspect ? 'high' : 'low',
      },
    },
  ];

  if (typeof headLossBudgetM === 'number') {
    evidence.push({
      label: 'Head-loss budget',
      value: headLossBudgetM.toFixed(1),
      unit: 'm',
      source: {
        kind: 'computed',
        derivation: 'tierThresholds.headLoss',
        confidence: 'high',
      },
    });
  }

  if (warnings.length > 0) {
    evidence.push({
      label: 'Routing warnings',
      value: warnings.length,
      source: {
        kind: 'computed',
        derivation: 'waterRouter.warnings',
        confidence: 'medium',
      },
      methodologyHint: warnings.slice(0, 2).join(' | '),
    });
  }

  return {
    panelKey: 'water-router',
    summary: { label: 'Water routing', value: routedEdgeCount, unit: 'edges' },
    evidence,
  };
}
