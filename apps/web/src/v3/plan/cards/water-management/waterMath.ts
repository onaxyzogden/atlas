/**
 * waterMath — shared helpers for the Plan Module 2 Water node-graph cards.
 *
 * Per Permaculture Scholar verdict 2026-05-07:
 *   "The core data state should be a directed graph of water nodes
 *    (Roofs → Tanks → Swales → Ponds), where each node calculates its
 *    volume (V = C × P × A) and passes the excess capacity along its
 *    overflow edge to the next node down the topographic slope."
 *
 * v1 keeps everything client-side and defers map-draw / topographic raster
 * integration. Volumes are annual (m³/yr); peak-event sizing is left as a
 * follow-up ticket.
 */

import type {
  WaterNode,
  CatchmentSurface,
  StorageNodeKind,
} from '../../../../store/waterSystemsStore.js';

const L_PER_M3 = 1000;

/** Default runoff coefficient by surface type (Mollison ch.7 + standard PDC). */
export const DEFAULT_COEFF: Record<CatchmentSurface, number> = {
  metal_roof: 0.95,
  asphalt_roof: 0.85,
  gravel: 0.6,
  pasture: 0.3,
  forest: 0.15,
};

export const SURFACE_LABEL: Record<CatchmentSurface, string> = {
  metal_roof: 'Metal / tile roof',
  asphalt_roof: 'Asphalt-shingle roof',
  gravel: 'Compacted gravel',
  pasture: 'Pasture / lawn',
  forest: 'Forested',
};

export const STORAGE_LABEL: Record<StorageNodeKind, string> = {
  cistern: 'Cistern',
  tank: 'Above-ground tank',
  pond: 'Pond',
  rain_garden: 'Rain garden',
};

/**
 * Default catchment area (m²) by surface type, so a freshly-created
 * catchment can never silently yield 0 from an unset area. Roof scales are
 * a typical house roof; ground scales a small managed patch. These are
 * defensible placeholders — flagged for product review.
 */
export const DEFAULT_AREA_M2: Record<CatchmentSurface, number> = {
  metal_roof: 80,
  asphalt_roof: 80,
  gravel: 150,
  pasture: 1000,
  forest: 1000,
};

/**
 * Surfaces that sit on the ground, so deriving their catchment area from
 * the parcel boundary is meaningful. Roofs are intentionally excluded —
 * parcel area must never auto-apply to a roof catchment.
 */
export const GROUND_SURFACES: ReadonlySet<CatchmentSurface> = new Set<CatchmentSurface>([
  'gravel',
  'pasture',
  'forest',
]);

/**
 * A catchment whose area is missing or non-positive. Such a node yields 0
 * and would silently collapse the whole balance, so the UI must surface it
 * as incomplete rather than present its 0 as a real result.
 */
export function isCatchmentAreaInvalid(node: WaterNode): boolean {
  return (
    node.kind === 'catchment' && (node.areaM2 == null || node.areaM2 <= 0)
  );
}

/** Catchment nodes with an unusable area, in input order. */
export function incompleteCatchments(nodes: WaterNode[]): WaterNode[] {
  return nodes.filter(isCatchmentAreaInvalid);
}

/**
 * Annual yield in m³/yr for a catchment node, given site precipitation in
 * mm/yr. Returns 0 if any required field is missing.
 */
export function catchmentYieldM3(node: WaterNode, precipMm: number): number {
  if (node.kind !== 'catchment') return 0;
  const a = node.areaM2 ?? 0;
  const c = node.runoffCoeff ?? 0;
  if (a <= 0 || c <= 0 || precipMm <= 0) return 0;
  return a * (precipMm / 1000) * c;
}

/** Effective storage capacity in litres, including L×W×D-derived swale capacity. */
export function effectiveCapacityL(node: WaterNode): number {
  if (node.kind === 'storage') return node.capacityL ?? 0;
  if (node.kind === 'swale') {
    if (node.capacityL && node.capacityL > 0) return node.capacityL;
    const l = node.swaleLengthM ?? 0;
    const w = node.swaleWidthM ?? 0;
    const d = node.swaleDepthM ?? 0;
    return l * w * d * L_PER_M3;
  }
  return 0;
}

export interface FlowResult {
  /** Per-node inflow in litres/yr (from upstream catchments + overflows). */
  inflowL: Record<string, number>;
  /** Litres retained per node (capped at capacity for storage/swale). */
  retainedL: Record<string, number>;
  /** Litres spilled along each node's overflow edge per year. */
  overflowL: Record<string, number>;
  /** Litres lost off-site (overflow target = 'offsite' or null). */
  offsiteLossL: number;
  /** Order-1 cycle detection: nodes whose overflow chain feeds back. */
  cycleNodes: string[];
}

/**
 * Compute annual flow through the directed node graph for a single project.
 * Catchments are sources; storage / swale nodes retain up to capacity and
 * spill the remainder downstream. Sinks absorb everything routed to them.
 *
 * Approach: topologically order the graph by following overflow edges from
 * each catchment. v1 uses a depth-bounded traversal (max 32 hops) to avoid
 * runaway loops while flagging any cycles for the validation pane.
 */
export function computeFlow(
  nodes: WaterNode[],
  precipMm: number,
): FlowResult {
  const byId = new Map<string, WaterNode>();
  for (const n of nodes) byId.set(n.id, n);

  const inflowL: Record<string, number> = {};
  const retainedL: Record<string, number> = {};
  const overflowL: Record<string, number> = {};
  const cycleSet = new Set<string>();
  let offsiteLossL = 0;

  function push(fromId: string, amountL: number, depth: number, path: Set<string>) {
    if (amountL <= 0) return;
    const from = byId.get(fromId);
    if (!from) return;

    const target = from.overflowToNodeId;
    if (target === 'offsite' || target === undefined || target === null) {
      offsiteLossL += amountL;
      overflowL[fromId] = (overflowL[fromId] ?? 0) + amountL;
      return;
    }
    if (path.has(target) || depth > 32) {
      cycleSet.add(fromId);
      offsiteLossL += amountL;
      overflowL[fromId] = (overflowL[fromId] ?? 0) + amountL;
      return;
    }

    inflowL[target] = (inflowL[target] ?? 0) + amountL;
    overflowL[fromId] = (overflowL[fromId] ?? 0) + amountL;

    const next = byId.get(target);
    if (!next) return;

    if (next.kind === 'sink') {
      retainedL[target] = (retainedL[target] ?? 0) + amountL;
      return;
    }
    if (next.kind === 'storage' || next.kind === 'swale') {
      const cap = effectiveCapacityL(next);
      const totalIn = inflowL[target] ?? 0;
      const retained = Math.min(cap, totalIn);
      const spill = Math.max(0, totalIn - cap);
      retainedL[target] = retained;
      // Reset cumulative overflow for this node — we recompute spill from
      // the latest totalIn. (Simple model: assumes single-pass per call.)
      overflowL[target] = 0;
      const newPath = new Set(path);
      newPath.add(target);
      push(target, spill, depth + 1, newPath);
      return;
    }
    // Catchments downstream of a catchment are unusual; just pass through.
    const newPath = new Set(path);
    newPath.add(target);
    push(target, amountL, depth + 1, newPath);
  }

  for (const n of nodes) {
    if (n.kind !== 'catchment') continue;
    const yieldM3 = catchmentYieldM3(n, precipMm);
    const yieldL = yieldM3 * L_PER_M3;
    inflowL[n.id] = yieldL;
    push(n.id, yieldL, 0, new Set([n.id]));
  }

  return {
    inflowL,
    retainedL,
    overflowL,
    offsiteLossL,
    cycleNodes: [...cycleSet],
  };
}

export function formatLitres(l: number): string {
  if (l >= 1_000_000) return `${(l / 1_000_000).toFixed(2)} ML`;
  if (l >= 1_000) return `${(l / 1_000).toFixed(1)} kL`;
  return `${Math.round(l)} L`;
}
