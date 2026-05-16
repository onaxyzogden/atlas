/**
 * regenerationGate — the livestock placement chokepoint for reviving
 * troubled land (iḥyāʾ al-mawāt, the Environment maqsid).
 *
 * A steward may not graze animals on a zone that carries an unfulfilled
 * regeneration plan: the land has not yet been confirmed recovered. This
 * pure helper answers one question — "does the point a steward is about to
 * place a paddock on fall inside a zone whose plan is not yet steward-
 * confirmed?" — and returns the blocking plan (or null).
 *
 * The decisive readiness rule lives in the shared evaluator
 * (`@ogden/shared/regeneration` — `ready === !!stewardReadinessConfirmedAt`).
 * This module restates only that one invariant inline (the gate has none of
 * the evaluator's advisory inputs, and `ready` is provably invariant to
 * them) and never makes an advisory judgement. A recorded `readinessOverride`
 * is a per-placement escape hatch, NOT a gate disabler: it does not flip
 * confirmation, so an overridden-but-unconfirmed plan still blocks here —
 * the override is applied at the call site, per placement, and recorded.
 *
 * Point-in-polygon is a ray cast over exterior ring(s) only (holes are
 * ignored in v1 — a zone boundary does not model interior cut-outs).
 */

import type { RegenerationPlan } from "../../store/regenerationPlanStore.js";

export interface GateZone {
  id: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

/** Ray-cast point-in-ring (even–odd rule). Ring may be open or closed. */
function pointInRing(
  point: [number, number],
  ring: GeoJSON.Position[],
): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when the point falls inside the exterior ring of any polygon part. */
function geometryContains(
  point: [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    return ring ? pointInRing(point, ring) : false;
  }
  for (const part of geometry.coordinates) {
    const ring = part[0];
    if (ring && pointInRing(point, ring)) return true;
  }
  return false;
}

/**
 * Reduces a flat plan list to exactly one active plan per zone, mirroring
 * the store's `getActivePlanForZone` resolution: prefer the zone's mapped
 * active plan; fall back to the most-recently-created plan for that zone
 * when the mapping is absent or points at a deleted plan. Scenario/history
 * plans are dropped. Pure — every gate-bearing surface feeds the gate the
 * output of this so scenarios never gate, overlap, or double-count.
 */
export function selectActivePlans(
  plans: RegenerationPlan[],
  activePlanIdByZone: Record<string, string>,
): RegenerationPlan[] {
  const byZone = new Map<string, RegenerationPlan[]>();
  for (const plan of plans) {
    const list = byZone.get(plan.zoneId);
    if (list) list.push(plan);
    else byZone.set(plan.zoneId, [plan]);
  }
  const active: RegenerationPlan[] = [];
  for (const [zoneId, zonePlans] of byZone) {
    const mappedId = activePlanIdByZone[zoneId];
    const mapped = mappedId
      ? zonePlans.find((p) => p.id === mappedId)
      : undefined;
    if (mapped) {
      active.push(mapped);
      continue;
    }
    active.push(
      zonePlans.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b)),
    );
  }
  return active;
}

/**
 * Returns the first regeneration plan that blocks a livestock placement at
 * `point`: a plan whose zone contains the point and whose readiness the
 * steward has not yet confirmed. Returns null when nothing blocks (no plan,
 * point outside every planned zone, or every covering plan is confirmed).
 */
export function findBlockingRegenerationPlan(
  point: [number, number],
  zones: GateZone[],
  plans: RegenerationPlan[],
): RegenerationPlan | null {
  const zonesById = new Map<string, GateZone>();
  for (const z of zones) zonesById.set(z.id, z);

  for (const plan of plans) {
    if (plan.stewardReadinessConfirmedAt) continue; // gate is open
    const zone = zonesById.get(plan.zoneId);
    if (!zone) continue; // plan references a missing zone — cannot gate
    if (geometryContains(point, zone.geometry)) return plan;
  }
  return null;
}
