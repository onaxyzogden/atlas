// types.ts — Observe lens surface (mock-backed; not yet wired to live data)
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
  // Optional: a live capture may record pH alone. Organic-matter % and
  // compaction are not always measured, so the renderer guards these spans
  // (partial degrade). Mock fixtures supply both.
  om?: number;
  compaction?: string;
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

/**
 * Graceful-degrade variant: there is no structured measurement payload to
 * visualise. The live bundle emits this for every lens because seeded
 * ObserveDataPoint.measurementValue is only { label, note } -- it carries no
 * numeric series for the wind rose / pH bars / infiltration / slope / capacity
 * / consent charts. The detail slide-up renders an honest empty-viz note and
 * falls back to the captured data-point list. The mock bundle never uses it.
 */
export interface NoSpecialisedData {
  type: 'none';
}

export type Specialised =
  | HydrologyData
  | SoilData
  | TopographyData
  | ClimateData
  | HumanData
  | InfraEmptyData
  | NoSpecialisedData;

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

// -- Live-map payload (real MapLibre canvas) ---------------------------------
// Geographic bounding box as [minLng, minLat, maxLng, maxLat] (a maplibre-gl
// LngLatBoundsLike). Produced by buildObserveMap from the parcel boundary, or
// from the markers when no boundary exists.
export type BBox = [number, number, number, number];

/** An observation pin carrying its true geographic position. */
export type ObserveMapMarker = MockObservation & { lng: number; lat: number };

/**
 * Render-ready payload for the real Observe map. Null on the bundle means "no
 * geometry to map" -> the dashboard renders PseudoMap instead. `demoGeometry`
 * is true when the boundary/markers came from a builtin seed (drives the
 * "Sample location data" badge -- honest provenance, never mistaken for
 * surveyed ground truth).
 */
export interface ObserveMapData {
  boundary: GeoJSON.FeatureCollection | null;
  bbox: BBox;
  markers: ObserveMapMarker[];
  demoGeometry: boolean;
}

// ── Resolved lens-data bundle ───────────────────────────────────────────────
// A single render-ready bundle the dashboard resolves once (from mock fixtures
// OR from live project stores) and exposes via LensDataContext. Both sources
// conform to these shapes, so every lens component reads one typed surface
// regardless of where the data came from. The mock fixtures in mockData.ts are
// the canonical reference shapes; LensProject / LensCycle pin them so the live
// builder must match.

export interface PlanRevisionTrigger {
  domain: string;
  detail: string;
  priority: string;
}
export interface LensProject {
  name: string;
  type: string;
  cycle: number;
  totalDataPoints: number;
  domainsCurrentCount: number;
  domainsAgeingCount: number;
  domainsMissingCount: number;
  planRevision: {
    active: boolean;
    priority: string;
    count: number;
    triggers: PlanRevisionTrigger[];
  };
}

export interface LensCyclePhase {
  id: string;
  label: string;
  color: string;
  startPct: number;
  endPct: number;
  status: string;
  days: number;
}
export interface LensCycleHistory {
  number: number;
  label: string;
  endedDaysAgo: number;
  dataPoints: number;
}
export interface LensCycle {
  number: number;
  name: string;
  startDate: string;
  totalDays: number;
  elapsed: number;
  nextReviewDays: number;
  phases: LensCyclePhase[];
  history: LensCycleHistory[];
  staleDomains: string[];
  ageingDomains: string[];
}

export interface FreshnessConfig {
  color: string;
  label: string;
  dot: boolean;
}

/** One charted reading in a lens's Timeline series. */
export interface TemporalSeriesPoint {
  /** Cycle label of the carrying data point: 'Baseline' (cycle 0) or 'Cycle N'. */
  cycle: string;
  /** Short capture date, e.g. 'Oct 24'. */
  date: string;
  value: number;
  /** Where the reading was taken (zone / label / domain). */
  location: string;
}
/** The Timeline (TemporalView) series for one lens: a single metric charted
 *  across captures, ascending by capture time, always >= 2 points. */
export interface LensTemporal {
  metric: string;
  points: TemporalSeriesPoint[];
}

/** The full set of data the lens surface renders, from either source. */
export interface LensDataBundle {
  project: LensProject;
  lenses: LensDisplay[];
  domainDetail: Partial<Record<ObserveLensId, DomainDetail>>;
  observations: MockObservation[];
  /** Real-map payload; null = no geometry, render PseudoMap. */
  map: ObserveMapData | null;
  cycle: LensCycle;
  freshness: Record<Freshness, FreshnessConfig>;
  typeIcon: Record<string, string>;
  /** Per-lens Timeline series; a lens absent here renders the honest empty state. */
  temporal: Partial<Record<ObserveLensId, LensTemporal>>;
}
