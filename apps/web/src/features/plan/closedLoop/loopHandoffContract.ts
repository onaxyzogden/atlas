/**
 * loopHandoffContract - the CROSS-PHASE contract (Slice A4). Pure, render-free.
 *
 * `buildLoopActPayload` maps a project's approved closed-loop design onto the
 * EXISTING `ActHandoffPackageSchema` (no schema change): MaterialFlow throughput
 * -> handoff materials, per-flow cadence -> monitoring requirements, closed
 * flows -> success criteria, and the source->sink graph -> an ordered sequence.
 * It returns a `Partial<ActHandoffPackage>` (only the enriched arrays + a
 * workScope summary; id / projectId / planDecisionRecordId / createdAt stay with
 * the store's createPackage) plus a `LoopActSummary` for the preview panel.
 *
 * This is what Phase B consumes to GENERATE stewardship routines. Pure: no store
 * import, no React; MaterialFlow / FertilityInfra / ClosedLoopNode are type-only
 * imports (erased at runtime).
 */

import type {
  MaterialFlow,
  FertilityInfra,
} from '../../../store/closedLoopStore.js';
import type { ClosedLoopNode } from '../useClosedLoopValidation.js';
import type {
  ActHandoffPackage,
  HandoffMaterial,
  HandoffMonitoringRequirement,
  HandoffSuccessCriterion,
} from '@ogden/shared';
import { cadenceLabel } from './flowStatusModel.js';

export interface LoopActSummary {
  /** Total project-scoped flows considered. */
  flowCount: number;
  /** Flows with both endpoints pinned (closed-loop credit). */
  closedLoopCount: number;
  /** Flows carrying an explicit cadence. */
  withCadenceCount: number;
  /** Flows carrying mass or volume throughput. */
  withThroughputCount: number;
  /** Materials emitted onto the payload. */
  materialCount: number;
  /** Monitoring requirements emitted onto the payload. */
  monitoringCount: number;
  /** Sequence steps emitted onto the payload. */
  sequenceCount: number;
}

export interface LoopHandoffResult {
  payload: Partial<ActHandoffPackage>;
  summary: LoopActSummary;
}

/** Minimal validation slice the builder needs (full ClosedLoopValidation fits). */
export interface LoopHandoffValidation {
  nodes: ReadonlyArray<Pick<ClosedLoopNode, 'id' | 'label'>>;
}

function isClosed(f: MaterialFlow): boolean {
  return !!f.sourceId && !!f.sinkId;
}

function hasThroughput(f: MaterialFlow): boolean {
  return (
    (f.massKgPerMonth ?? 0) > 0 ||
    (f.volumeLPerMonth ?? 0) > 0 ||
    (f.energyKwhPerMonth ?? 0) > 0
  );
}

/**
 * Order flows upstream-to-downstream. A flow is "ready" once nothing still
 * pending produces its source. Closed loops are intentionally cyclic, so when no
 * flow is ready (a pure cycle) we break deterministically at the first remaining
 * flow (stable, input order). Linear chains come out fully topologically sorted.
 */
function orderFlowsByTopology(flows: MaterialFlow[]): MaterialFlow[] {
  const remaining = [...flows];
  const ordered: MaterialFlow[] = [];
  while (remaining.length > 0) {
    const pendingSinks = new Set(
      remaining.map((f) => f.sinkId).filter((id): id is string => !!id),
    );
    let idx = remaining.findIndex(
      (f) => !f.sourceId || !pendingSinks.has(f.sourceId),
    );
    if (idx === -1) idx = 0; // cycle: stable break
    ordered.push(remaining[idx]!);
    remaining.splice(idx, 1);
  }
  return ordered;
}

/**
 * Build the loop -> Act handoff payload + summary.
 *
 * @param project    the owning project (only id is read)
 * @param flows      project-scoped MaterialFlow records
 * @param infra      project-scoped fertility infra (via-node labels fallback)
 * @param validation validation slice carrying node labels
 */
export function buildLoopActPayload(
  project: { id: string },
  flows: MaterialFlow[],
  infra: FertilityInfra[],
  validation: LoopHandoffValidation,
): LoopHandoffResult {
  void project; // id is stamped by the store's createPackage, not here

  const labelById = new Map<string, string>();
  for (const n of validation.nodes) labelById.set(n.id, n.label);
  for (const i of infra) {
    if (!labelById.has(i.id)) {
      labelById.set(i.id, i.type.replace(/_/g, ' '));
    }
  }

  const endpointLabel = (id: string | null, free?: string): string =>
    (id ? labelById.get(id) : undefined) ?? free ?? id ?? 'unpinned';

  const viaLabels = (f: MaterialFlow): string[] =>
    (f.transformationNodeIds ?? []).map((id) => labelById.get(id) ?? id);

  // Materials: one per flow (the substance moved); quantity/unit from the
  // dominant throughput when present.
  const materials: HandoffMaterial[] = flows.map((f) => {
    const mass = f.massKgPerMonth ?? 0;
    const volume = f.volumeLPerMonth ?? 0;
    const energy = f.energyKwhPerMonth ?? 0;
    let quantity: number | undefined;
    let unit: string | undefined;
    if (mass > 0) {
      quantity = mass;
      unit = 'kg/month';
    } else if (volume > 0) {
      quantity = volume;
      unit = 'L/month';
    } else if (energy > 0) {
      quantity = energy;
      unit = 'kWh/month';
    }
    return {
      id: `mat-${f.id}`,
      name: f.label,
      ...(quantity != null ? { quantity, unit } : {}),
      sourceNote: `${f.materialKind}: ${endpointLabel(f.sourceId, f.sourceLabel)} -> ${endpointLabel(f.sinkId, f.sinkLabel)}`,
    };
  });

  // Monitoring: one per flow carrying an explicit cadence.
  const monitoringRequirements: HandoffMonitoringRequirement[] = flows
    .filter((f) => f.cadence != null)
    .map((f) => ({
      id: `mon-${f.id}`,
      description: `Monitor flow "${f.label}" (${f.materialKind})`,
      cadence: cadenceLabel(f.cadence),
    }));

  // Success criteria: one per closed-loop flow.
  const successCriteria: HandoffSuccessCriterion[] = flows
    .filter(isClosed)
    .map((f) => {
      const unit = materials.find((m) => m.id === `mat-${f.id}`)?.unit;
      return {
        id: `sc-${f.id}`,
        description: `"${f.label}" flowing from ${endpointLabel(f.sourceId, f.sourceLabel)} to ${endpointLabel(f.sinkId, f.sinkLabel)}`,
        ...(unit ? { measurement: unit } : {}),
      };
    });

  // Sequence: ordered upstream->downstream, naming via waypoints.
  const sequence: string[] = orderFlowsByTopology(flows).map((f) => {
    const via = viaLabels(f);
    const chain = [
      endpointLabel(f.sourceId, f.sourceLabel),
      ...via,
      endpointLabel(f.sinkId, f.sinkLabel),
    ].join(' -> ');
    return `${chain}: ${f.label}`;
  });

  const closedLoopCount = flows.filter(isClosed).length;
  const withCadenceCount = flows.filter((f) => f.cadence != null).length;
  const withThroughputCount = flows.filter(hasThroughput).length;

  const workScope =
    flows.length === 0
      ? 'Closed-loop stewardship (no flows designed yet)'
      : `Closed-loop stewardship: ${flows.length} material ${flows.length === 1 ? 'flow' : 'flows'} (${closedLoopCount} closed-loop)`;

  return {
    payload: {
      workScope,
      materials,
      monitoringRequirements,
      successCriteria,
      sequence,
    },
    summary: {
      flowCount: flows.length,
      closedLoopCount,
      withCadenceCount,
      withThroughputCount,
      materialCount: materials.length,
      monitoringCount: monitoringRequirements.length,
      sequenceCount: sequence.length,
    },
  };
}
