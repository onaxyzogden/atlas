// types.ts — PROTOTYPE ONLY (deletable)
//
// Minimal interfaces to give the faithful JS→TS port a typed spine without
// over-constraining the mock fixtures. Behaviour and output match the source
// concept exactly; these types only describe the mock shapes it consumes.

import type { ObserveLensId, UniversalDomain } from '@ogden/shared';

export type Freshness = 'current' | 'ageing' | 'stale' | 'missing';
export type Confidence = 'high' | 'medium' | 'low';

/** A single observation/data point inside a sub-domain group. */
export interface DataPoint {
  id: string;
  type: string;
  label: string;
  value?: string;
  location?: string;
  observedAt?: string;
  recordedAt?: string;
  cycle?: string;
  confidence?: Confidence;
  isSuperseded?: boolean;
  supersededBy?: string | null;
  supersedesId?: string | null;
  sourceTask?: string;
  planObjective?: string;
  notes?: string;
  photos?: number;
  measurements?: string | null;
  gpsPoints?: number;
  gpsTraces?: number;
  tags?: string[];
  isDivergence?: boolean;
  divergenceStatus?: string;
  divergenceAge?: string;
}

export interface Subdomain {
  id: string;
  label: string;
  icon: string;
  collapsed: boolean;
  points: DataPoint[];
  emptyNote?: string;
}

export interface KeyDatum {
  label: string;
  value: string;
  confidence: Confidence;
}

// ── Specialised display payloads (one per lens detail view) ─────────────────
export interface InfiltrationRow {
  zone: string;
  rate: number;
  status: 'good' | 'moderate' | 'risk' | string;
  x: number;
}
export interface WaterSource {
  label: string;
  type: string;
  status: string;
  confidence: Confidence;
  divergence?: boolean;
}
export interface HydrologyData {
  type: 'hydrology';
  infiltrationData: InfiltrationRow[];
  sources: WaterSource[];
}

export interface PhRow {
  zone: string;
  ph: number;
  om: number;
  compaction: string;
}
export interface SoilData {
  type: 'soil';
  phData: PhRow[];
}

export interface ElevationZone {
  label: string;
  area: string;
  aspect: string;
  use: string;
  color: string;
}
export interface SlopeRow {
  label: string;
  pct: number;
  color: string;
}
export interface TopographyData {
  type: 'topography';
  elevationZones: ElevationZone[];
  slopeBreakdown: SlopeRow[];
}

export interface WindDir {
  dir: string;
  freq: number;
  speed: number;
}
export interface Microclimate {
  label: string;
  size: string;
  character: string;
  risk: 'low' | 'medium' | 'high' | string;
}
export interface ClimateData {
  type: 'climate';
  windRose: WindDir[];
  microclimates: Microclimate[];
}

export interface CapacityBar {
  label: string;
  pct: number;
  color: string;
}
export interface ConsentItem {
  label: string;
  status: 'pending' | 'outstanding' | 'flagged' | 'confirmed' | string;
  weeks: string;
}
export interface HumanData {
  type: 'human';
  capacityBars: CapacityBar[];
  consentItems: ConsentItem[];
}

export interface SuggestedTask {
  label: string;
  domain: string;
  priority: 'high' | 'medium' | 'low' | string;
}
export interface InfraEmptyData {
  type: 'infrastructure_empty';
  suggestedTasks: SuggestedTask[];
}

export type Specialised =
  | HydrologyData
  | SoilData
  | TopographyData
  | ClimateData
  | HumanData
  | InfraEmptyData;

/** Full per-lens detail (the slide-up payload). */
export interface DomainDetail {
  lensLabel: string;
  lensIcon: string;
  lensColor: string;
  domains: string[];
  totalPoints: number;
  freshness: Freshness;
  lastObserved: string | null;
  sourceTask?: string;
  planObjective?: string;
  subdomains: Subdomain[];
  specialised: Specialised;
}

/**
 * A lens's display row — structural identity (id/label/icon/colours/domains)
 * is sourced from the shared OBSERVE_LENSES; the rest are local mock values.
 */
export interface LensDisplay {
  id: ObserveLensId;
  label: string;
  icon: string;
  color: string;
  colorDim: string;
  mapColor: string;
  domains: readonly UniversalDomain[];
  observations: number;
  freshness: Freshness;
  lastObserved: string | null;
  summary: string | null;
  keyData: KeyDatum[];
  divergence?: { label: string; age: string; priority: string };
  planTrigger?: { label: string; priority: string };
}

export interface MockObservation {
  id: string;
  lens: ObserveLensId;
  x: number;
  y: number;
  type: string;
  label: string;
  age: string;
}
