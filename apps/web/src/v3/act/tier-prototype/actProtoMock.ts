// actProtoMock.ts
//
// PROTOTYPE-ONLY mock data for the Act tier shell visual prototype.
// None of this is wired to a store or schema; it exists so the four-rail
// composition renders with representative content. The tier-objective seed
// carries title / focusedQuestion / checklist but NOT the concept screenshot's
// per-objective coordinates, priority, or live status -- those are mocked here.
//
// Delete this file with the rest of the tier-prototype/ folder.

import type { PlanTierObjectiveStatus } from '@ogden/shared';

export type ProtoPriority = 'High' | 'Medium' | 'Low';

// Mock tier states matching the concept screenshot: T0 done, T1 open, the
// rest locked. Keyed by PlanTier.id (see PLAN_TIERS in @ogden/shared).
export const PROTO_TIER_STATES: Record<string, PlanTierObjectiveStatus> = {
  't0-project-foundation': 'complete',
  't1-land-reading': 'available',
  't2-systems-reading': 'locked',
  't3-foundation-decisions': 'locked',
  't4-system-design': 'locked',
  't5-integration-design': 'locked',
  't6-phasing-resourcing': 'locked',
};

export function protoTierState(tierId: string): PlanTierObjectiveStatus {
  return PROTO_TIER_STATES[tierId] ?? 'locked';
}

// Objective status derived from its tier's mock state:
//   tier complete  -> objective complete
//   tier locked    -> objective locked
//   tier available -> first objective active, the rest available
export function protoObjectiveStatus(
  tierId: string,
  indexInTier: number,
): PlanTierObjectiveStatus {
  const tier = protoTierState(tierId);
  if (tier === 'complete') return 'complete';
  if (tier === 'locked') return 'locked';
  return indexInTier === 0 ? 'active' : 'available';
}

const PRIORITY_CYCLE: ProtoPriority[] = ['High', 'Medium', 'Medium', 'Low'];

export function protoPriority(index: number): ProtoPriority {
  return PRIORITY_CYCLE[index % PRIORITY_CYCLE.length] ?? 'Medium';
}

// Deterministic pseudo-coordinates offset from the parcel centroid, so the
// SEED badges and map pins read as real field locations without any geo data.
export interface ProtoSeed {
  lng: number;
  lat: number;
  label: string;
}

export function protoSeed(
  centroid: [number, number],
  index: number,
): ProtoSeed {
  const [baseLng, baseLat] = centroid;
  const ring = Math.floor(index / 4) + 1;
  const angle = (index % 4) * (Math.PI / 2) + ring * 0.6;
  const radius = 0.0015 * ring;
  const lng = baseLng + Math.cos(angle) * radius;
  const lat = baseLat + Math.sin(angle) * radius;
  const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { lng, lat, label };
}

// Priority -> map-pin / badge colour. Literal hexes (data-viz colours, same
// convention as BaseMapCard's overlay swatches).
export const PROTO_PRIORITY_COLOR: Record<ProtoPriority, string> = {
  High: '#e0683c',
  Medium: '#c4a265',
  Low: '#5b8aa8',
};
