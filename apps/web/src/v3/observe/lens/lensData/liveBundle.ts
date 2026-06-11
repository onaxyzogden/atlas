// liveBundle.ts -- builds a LensDataBundle from LIVE project data.
//
// The Observe lens surface renders one resolved `LensDataBundle` (see
// ../types.ts) exposed through LensDataContext. `mockBundle.ts` packs the
// canonical mock fixtures; THIS module packs the same shape from the live
// observe substrate (`useObserveDataPointStore` active points) so the exact
// same components light up on real captures.
//
// PURE-FIRST: the whole mapping is a pure function `buildLiveLensBundle(input)`
// over plain data (the project's ObserveDataPoint[] + nowMs + resolved name /
// type label). `useLiveLensBundle(projectId)` is a thin hook that reads the
// store + project record and calls the pure builder. This keeps the mapping
// unit-testable without React (see __tests__/liveBundle.test.ts).
//
// DEGRADE BOUNDARY (documented in the approved plan): seeded
// ObserveDataPoint.measurementValue is only { label, note } -- there is NO live
// numeric series. So every DomainDetail emits `specialised: { type: 'none' }`
// (the graceful-degrade variant) and the cycle's Plan/Act/Observe phase
// BOUNDARIES are nominal (no live schedule exists). Everything with a real
// source -- counts, freshness, last-observed, divergence, pins, data-point
// rows, summary, stale/ageing domains, obs ticks -- is wired from live data.

import { useMemo } from 'react';
import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  OBSERVE_DOMAIN_CATALOG,
  OBSERVE_LENSES,
  DOMAIN_TO_LENS,
  computeDomainFreshness,
  findProjectType,
  getMeasurementSlot,
  type ObserveDataPoint,
  type ObserveStatusOutput,
  type ObserveDataPointSourceType,
  type ObserveFreshness,
  type UniversalDomain,
  type ObserveLensId,
  type FieldActionProofItem,
} from '@ogden/shared';
import { format, formatDistanceStrict } from 'date-fns';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import {
  useObserveFeedStore,
  type ObserveFeedEntry,
} from '../../../../store/observeFeedStore.js';
import {
  useProjectStore,
  normalizeProjectType,
  type LocalProject,
} from '../../../../store/projectStore.js';
import { findObjectiveGlobally } from '../../../plan/objectiveCatalog.js';
import {
  routeToDataPoint,
  type ResolveDomainForObjective,
} from '../../dashboard/domain/routeToDataPoint.js';
import { resolveDomainByObjectiveId } from '../../dashboard/revision/resolveDomainForObjective.js';
import { FRESHNESS, TYPE_ICON } from '../mockData.js';
import { VISION_QUESTIONS } from '../../../stage-zero/data/visionBuilderQuestions.js';
import {
  buildSpecialisedForLens,
  type SlotResolver,
} from './specialisedBuilders.js';
import { OBSERVE_COPY } from '../../../copy/index.js';
import type {
  BBox,
  Confidence,
  DataPoint,
  DomainDetail,
  Freshness,
  KeyDatum,
  LensCycle,
  LensCyclePhase,
  LensDataBundle,
  LensDisplay,
  LensProject,
  MockObservation,
  ObserveMapData,
  ObserveMapMarker,
  PlanRevisionTrigger,
  Subdomain,
} from '../types.js';

const DAY_MS = 86_400_000;

const DIVERGENT_STATUSES: ReadonlySet<ObserveStatusOutput> = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);
// The two "serious" statuses that escalate a plan-revision trigger to high.
const SEVERE_STATUSES: ReadonlySet<ObserveStatusOutput> = new Set([
  'major_constraint',
  'potential_disqualifier',
]);

// ── small label helpers ─────────────────────────────────────────────────────

function statusLabel(s: ObserveStatusOutput | null): string {
  switch (s) {
    case 'clear':
      return 'Clear';
    case 'needs_investigation':
      return 'Needs investigation';
    case 'major_constraint':
      return 'Major constraint';
    case 'potential_disqualifier':
      return 'Potential disqualifier';
    case 'unknown':
      return 'Unknown';
    default:
      return OBSERVE_COPY.notYetRead;
  }
}

function confidenceFromFreshness(f: ObserveFreshness): Confidence {
  switch (f) {
    case 'current':
      return 'high';
    case 'ageing':
      return 'medium';
    default:
      return 'low';
  }
}

// Map an ObserveDataPoint sourceType to a TYPE_ICON key (mock glyph set).
function iconKeyForSource(t: ObserveDataPointSourceType): string {
  switch (t) {
    case 'task_verification':
      return 'logged_result';
    case 'divergence_evidence':
      return 'divergence';
    case 'manual_observation':
    default:
      return 'observation_note';
  }
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

// "12 days ago" style. Deterministic: baselined on the supplied nowMs.
function humanAge(iso: string | null | undefined, nowMs: number): string | null {
  const ms = parseMs(iso);
  if (ms === null) return null;
  return formatDistanceStrict(ms, nowMs, { addSuffix: true });
}

// Compact pin age, e.g. "5h" / "12d" / "3w" / "8mo" / "2y".
function compactAge(iso: string | null | undefined, nowMs: number): string {
  const ms = parseMs(iso);
  if (ms === null) return '--';
  const diff = Math.max(0, nowMs - ms);
  const days = Math.floor(diff / DAY_MS);
  if (days < 1) return `${Math.max(1, Math.floor(diff / 3_600_000))}h`;
  if (days < 21) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

function calendarDate(iso: string | null | undefined): string | undefined {
  const ms = parseMs(iso);
  if (ms === null) return undefined;
  return format(ms, 'd MMM yyyy');
}

// Read a [lng, lat] tuple from a Point geometry, else null.
function coordsOf(p: ObserveDataPoint): [number, number] | null {
  const g = p.locationGeometry;
  if (!g || g.type !== 'Point') return null;
  const c = g.coordinates as unknown;
  if (
    Array.isArray(c) &&
    c.length >= 2 &&
    typeof c[0] === 'number' &&
    typeof c[1] === 'number'
  ) {
    return [c[0], c[1]];
  }
  return null;
}

function readMeasurement(p: ObserveDataPoint): { label?: string; note?: string } {
  const mv = p.measurementValue;
  if (mv && typeof mv === 'object') {
    const rec = mv as Record<string, unknown>;
    return {
      label: typeof rec.label === 'string' ? rec.label : undefined,
      note: typeof rec.note === 'string' ? rec.note : undefined,
    };
  }
  return {};
}

// ── pure domain snapshot (mirrors useDomainSnapshot.ts, kept pure for tests) ──

interface PureSnapshot {
  domainId: UniversalDomain;
  freshness: ObserveFreshness;
  latestStatus: ObserveStatusOutput | null;
  latest: ObserveDataPoint | null;
  observationCount: number;
  divergenceCount: number;
  lastObservedAt: string | null;
}

/**
 * Per-domain rollup over a project's points. Mirrors `useDomainSnapshots`
 * (dashboard/useDomainSnapshot.ts) exactly -- freshness uses ALL points
 * (superseded included) per OBSERVE_DOMAIN_CATALOG thresholds; counts and
 * latest use ACTIVE points only. Pure so the builder is fully testable.
 */
export function computeDomainRollups(
  points: readonly ObserveDataPoint[],
  nowMs: number,
): Map<UniversalDomain, PureSnapshot> {
  const byDomain = new Map<UniversalDomain, ObserveDataPoint[]>();
  for (const p of points) {
    const bucket = byDomain.get(p.domainId);
    if (bucket) bucket.push(p);
    else byDomain.set(p.domainId, [p]);
  }
  const out = new Map<UniversalDomain, PureSnapshot>();
  for (const domainId of UNIVERSAL_DOMAINS) {
    const domainPoints = byDomain.get(domainId) ?? [];
    const active = domainPoints.filter((p) => !p.isSuperseded);
    const freshness = computeDomainFreshness(
      domainPoints,
      nowMs,
      OBSERVE_DOMAIN_CATALOG[domainId].freshnessThresholds,
    );
    let latest: ObserveDataPoint | null = null;
    let latestMs = -Infinity;
    for (const p of active) {
      const ms = parseMs(p.capturedAt);
      if (ms !== null && ms > latestMs) {
        latest = p;
        latestMs = ms;
      }
    }
    const divergenceCount = active.reduce(
      (n, p) => n + (DIVERGENT_STATUSES.has(p.statusOutput) ? 1 : 0),
      0,
    );
    out.set(domainId, {
      domainId,
      freshness,
      latestStatus: latest?.statusOutput ?? null,
      latest,
      observationCount: active.length,
      divergenceCount,
      lastObservedAt: latest?.capturedAt ?? null,
    });
  }
  return out;
}

// Worst freshness among domains that actually carry data; else 'missing'.
const FRESHNESS_RANK: Record<Freshness, number> = {
  current: 1,
  ageing: 2,
  stale: 3,
  missing: 0,
};
function worstWithData(snaps: PureSnapshot[]): Freshness {
  const withData = snaps.filter((s) => s.observationCount > 0);
  if (withData.length === 0) return 'missing';
  return withData.reduce<Freshness>((worst, s) => {
    const f = s.freshness as Freshness;
    return FRESHNESS_RANK[f] > FRESHNESS_RANK[worst] ? f : worst;
  }, 'current');
}

// ── pin projection ───────────────────────────────────────────────────────────

const PIN_MIN = 0.08;
const PIN_SPAN = 0.84; // PIN_MIN..0.92

// Deterministic index scatter for points without geometry.
function scatter(i: number): { x: number; y: number } {
  return {
    x: PIN_MIN + (((i * 0.41 + 0.11) % 1) * PIN_SPAN),
    y: PIN_MIN + (((i * 0.27 + 0.13) % 1) * PIN_SPAN),
  };
}

/**
 * Project active points onto the pseudo-map's [0,1] square. Points with a
 * Point geometry are placed by lng/lat inside the project's padded bbox; the
 * y-axis is inverted (north -> top). Points without geometry fall back to a
 * deterministic index scatter so every observation still gets a pin.
 */
export function buildObservationPins(
  activePoints: readonly ObserveDataPoint[],
  nowMs: number,
): MockObservation[] {
  const geo = activePoints
    .map((p) => ({ p, c: coordsOf(p) }))
    .filter((g): g is { p: ObserveDataPoint; c: [number, number] } => g.c !== null);

  let project: (c: [number, number]) => { x: number; y: number };
  if (geo.length === 0) {
    project = () => ({ x: 0.5, y: 0.5 });
  } else {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const { c } of geo) {
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    }
    const lngSpan = maxLng - minLng || 1;
    const latSpan = maxLat - minLat || 1;
    project = (c) => ({
      x: PIN_MIN + ((c[0] - minLng) / lngSpan) * PIN_SPAN,
      y: PIN_MIN + (1 - (c[1] - minLat) / latSpan) * PIN_SPAN,
    });
  }

  return activePoints.map((p, i): MockObservation => {
    const c = coordsOf(p);
    const pos = c ? project(c) : scatter(i);
    const divergent = DIVERGENT_STATUSES.has(p.statusOutput);
    const m = readMeasurement(p);
    return {
      id: p.id,
      lens: DOMAIN_TO_LENS[p.domainId],
      x: pos.x,
      y: pos.y,
      type: divergent ? 'divergence' : iconKeyForSource(p.sourceType),
      label: m.label ?? UNIVERSAL_DOMAIN_LABELS[p.domainId],
      age: compactAge(p.capturedAt, nowMs),
    };
  });
}

// -- live-map payload --------------------------------------------------------

// Recursively visit every [lng, lat] pair in a GeoJSON FeatureCollection and
// fold it into a bbox. Returns null if no numeric coordinate pair was found.
function bboxFromBoundary(fc: GeoJSON.FeatureCollection | null): BBox | null {
  if (!fc) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let found = false;
  const visit = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      Number.isFinite(node[0]) &&
      Number.isFinite(node[1])
    ) {
      const lng = node[0] as number;
      const lat = node[1] as number;
      found = true;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const child of node) visit(child);
  };
  for (const f of fc.features) {
    if (!f) continue;
    const geom = f.geometry as { coordinates?: unknown } | null;
    if (geom && 'coordinates' in geom) visit(geom.coordinates);
  }
  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

function bboxFromMarkers(markers: readonly ObserveMapMarker[]): BBox | null {
  if (markers.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let found = false;
  for (const m of markers) {
    if (!Number.isFinite(m.lng) || !Number.isFinite(m.lat)) continue;
    found = true;
    if (m.lng < minLng) minLng = m.lng;
    if (m.lng > maxLng) maxLng = m.lng;
    if (m.lat < minLat) minLat = m.lat;
    if (m.lat > maxLat) maxLat = m.lat;
  }
  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

/**
 * Build the real-map payload from a project's active points + parcel boundary.
 * Markers are the observation pins (same id/lens/type/label/age as the
 * PseudoMap pins) that carry a Point geometry, tagged with lng/lat. bbox comes
 * from the boundary when present, else from the markers. Returns null when
 * there is NO boundary AND zero georeferenced points (-> dashboard renders
 * PseudoMap). `demoGeometry` flags seeded/builtin geometry for the in-UI badge.
 */
export function buildObserveMap(
  activePoints: readonly ObserveDataPoint[],
  parcelBoundary: GeoJSON.FeatureCollection | null,
  nowMs: number,
  demoGeometry: boolean,
): ObserveMapData | null {
  const coordById = new Map<string, [number, number]>();
  for (const p of activePoints) {
    const c = coordsOf(p);
    if (c) coordById.set(p.id, c);
  }
  const markers: ObserveMapMarker[] = [];
  for (const pin of buildObservationPins(activePoints, nowMs)) {
    const c = coordById.get(pin.id);
    if (!c) continue;
    markers.push({ ...pin, lng: c[0], lat: c[1] });
  }
  const bbox = bboxFromBoundary(parcelBoundary) ?? bboxFromMarkers(markers);
  if (!bbox) return null;
  return { boundary: parcelBoundary, bbox, markers, demoGeometry };
}

// ── data-point row mapping ────────────────────────────────────────────────────

// Proof-class partition for the confidence heuristic: sensory/spatial evidence
// vs numeric/data evidence. 'document' counts as evidence for confidence but is
// deliberately NOT surfaced as a photo pill (a PDF is not a photo); a dedicated
// document pill is a possible follow-up.
const SENSORY_PROOFS: ReadonlySet<string> = new Set([
  'photo',
  'gps_point',
  'gps_trace',
  'document',
]);
const DATA_PROOFS: ReadonlySet<string> = new Set(['measurement', 'logged_result']);

/**
 * Evidence-based confidence heuristic over a point's proof items:
 *  - 'high'   : >=1 sensory/spatial proof (photo|gps_point|gps_trace|document)
 *               AND >=1 data proof (measurement|logged_result)
 *  - 'low'    : zero proof items
 *  - 'medium' : anything else (some proof, but not both classes)
 * The declared-intent synthetic point never passes through here -- it keeps
 * its own 'low' (buildDeclaredIntentPoint).
 */
export function deriveConfidence(p: ObserveDataPoint): Confidence {
  const items = p.proofItems ?? [];
  if (items.length === 0) return 'low';
  const sensory = items.some((i) => SENSORY_PROOFS.has(i.proofType));
  const data = items.some((i) => DATA_PROOFS.has(i.proofType));
  return sensory && data ? 'high' : 'medium';
}

// Row-level context shared by every toDataPoint call in one build pass:
// reverse supersession map + injected title resolvers (default unresolved,
// mirroring the getSlot injection pattern -- the builder stays store-free).
interface RowContext {
  nowMs: number;
  /** superseder point id -> the superseded point id it replaced */
  supersedesById: ReadonlyMap<string, string>;
  resolveActionTitle: (actionId: string) => string | undefined;
  resolveObjectiveTitle: (objectiveId: string) => string | undefined;
}

function toDataPoint(p: ObserveDataPoint, ctx: RowContext): DataPoint {
  const m = readMeasurement(p);
  const divergent = DIVERGENT_STATUSES.has(p.statusOutput);
  const c = coordsOf(p);
  const items = p.proofItems ?? [];
  const photos = items.filter((i) => i.proofType === 'photo').length;
  const gpsPoints = items.filter((i) => i.proofType === 'gps_point').length;
  const gpsTraces = items.filter((i) => i.proofType === 'gps_trace').length;
  const readings = items.filter((i) => DATA_PROOFS.has(i.proofType)).length;
  // Tags derive from REAL metadata only (provenance + georeference) -- never
  // invented content.
  const tags: string[] = [
    p.sourceType === 'task_verification'
      ? 'verified task'
      : p.sourceType === 'divergence_evidence'
        ? 'divergence evidence'
        : 'manual entry',
  ];
  if (p.sourceFeedEntryId) tags.push('field log');
  if (c) tags.push('georeferenced');
  return {
    id: p.id,
    type: divergent ? 'divergence' : iconKeyForSource(p.sourceType),
    label: m.label ?? UNIVERSAL_DOMAIN_LABELS[p.domainId],
    location: c ? `${c[1].toFixed(4)}, ${c[0].toFixed(4)}` : undefined,
    observedAt: calendarDate(p.capturedAt),
    recordedAt: calendarDate(p.capturedAt),
    cycle: `Cycle ${p.cycleId + 1}`,
    confidence: deriveConfidence(p),
    isSuperseded: p.isSuperseded,
    supersededBy: p.supersededBy ?? null,
    supersedesId: ctx.supersedesById.get(p.id) ?? null,
    sourceTask: p.sourceActionId
      ? ctx.resolveActionTitle(p.sourceActionId)
      : undefined,
    planObjective: p.sourceObjectiveId
      ? ctx.resolveObjectiveTitle(p.sourceObjectiveId)
      : undefined,
    notes: m.note,
    photos,
    gpsPoints,
    gpsTraces,
    measurements: readings > 0 ? `${readings} reading${readings === 1 ? '' : 's'}` : null,
    tags,
    isDivergence: divergent || undefined,
    divergenceStatus: divergent ? statusLabel(p.statusOutput) : undefined,
    divergenceAge: divergent ? (humanAge(p.capturedAt, ctx.nowMs) ?? undefined) : undefined,
  };
}

// ── field-log feed merge ──────────────────────────────────────────────────────

/**
 * Merge Phase 3 field-log feed entries into the point set as virtual data
 * points (same `routeToDataPoint` projection the dashboard's `useDomainPoints`
 * union uses), so lens counts / pins / rows match the dashboard.
 *
 * Dedupe contract: an entry whose id already appears in a persisted point's
 * `sourceFeedEntryId` is skipped -- no production path persists feed entries
 * as real points today, so this is defensive, but it is the schema-designated
 * key for exactly this union. Entries whose feedKey cannot resolve to a
 * domain are dropped (they stay Plan-tier-only).
 */
export function mergeFeedProjections(
  points: readonly ObserveDataPoint[],
  feedEntries: readonly ObserveFeedEntry[],
  resolveDomain: ResolveDomainForObjective,
): ObserveDataPoint[] {
  if (feedEntries.length === 0) return [...points];
  const persisted = new Set<string>();
  for (const p of points) {
    if (p.sourceFeedEntryId) persisted.add(p.sourceFeedEntryId);
  }
  const projected: ObserveDataPoint[] = [];
  for (const e of feedEntries) {
    if (persisted.has(e.id)) continue;
    const pt = routeToDataPoint(e, resolveDomain);
    if (pt) projected.push(pt);
  }
  return [...points, ...projected];
}

// ── the pure builder ──────────────────────────────────────────────────────────

export interface LiveBundleInput {
  /** ALL points for the project (active + superseded); the builder filters. */
  points: readonly ObserveDataPoint[];
  /** Baseline "now" in ms (freshness + humanized ages). */
  nowMs: number;
  /** Resolved project display name. */
  projectName: string;
  /** Resolved project-type label, e.g. "Regenerative Farm + Silvopasture". */
  projectTypeLabel: string;
  /**
   * Resolver from a proof item's slotId to its slot (carrying any
   * measurementBinding), used to compile the specialised viz payloads. Defaults
   * to a resolver that finds nothing -> every lens stays { type: 'none' }, which
   * keeps callers/tests that pass no resolver behaving exactly as before.
   */
  getSlot?: SlotResolver;
  /** Project parcel boundary (GeoJSON FeatureCollection) for the real map. */
  parcelBoundary?: GeoJSON.FeatureCollection | null;
  /** True when boundary/points came from a builtin seed (drives the badge). */
  isDemoGeometry?: boolean;
  /**
   * Read-side declared-intent projection (from buildDeclaredIntentPoint), or null
   * when the project has no declared vision. Surfaced ONLY in the vision-intent
   * domain's keyData value + subdomain row; never counted as a field observation
   * (lens.observations, project.totalDataPoints, freshness all ignore it).
   */
  declaredIntent?: DataPoint | null;
  /**
   * Resolver from a point's sourceActionId to the field-action title, for the
   * "Source task" row in the slide-up detail. Defaults to unresolved (row
   * hidden) -- same injection pattern as getSlot, keeps the builder store-free.
   */
  resolveActionTitle?: (actionId: string) => string | undefined;
  /**
   * Resolver from a point's sourceObjectiveId to the plan-objective title, for
   * the "Plan objective" row. Defaults to unresolved.
   */
  resolveObjectiveTitle?: (objectiveId: string) => string | undefined;
}

const NOMINAL_PHASE_BOUNDS: ReadonlyArray<Omit<LensCyclePhase, 'status'>> = [
  { id: 'plan', label: 'Plan', color: '#4A8FD4', startPct: 0, endPct: 22, days: 40 },
  { id: 'act', label: 'Act', color: '#8A6AB4', startPct: 22, endPct: 72, days: 90 },
  { id: 'obs', label: 'Observe', color: '#5AAF72', startPct: 72, endPct: 100, days: 50 },
];
const NOMINAL_TOTAL_DAYS = 180;

// Live row-icon table: the mock TYPE_ICON plus a glyph for the read-side
// 'declaration' type (declared intent). mockData.ts stays byte-untouched; this
// live-only extension is returned as the bundle's typeIcon so DataPointRow can
// resolve the declared-intent row. Filled diamond pairs with the Human lens '◇'.
const LIVE_TYPE_ICON: Record<string, string> = { ...TYPE_ICON, declaration: '◆' };

/**
 * Pure mapper: live ObserveDataPoint[] -> LensDataBundle. No React, no stores.
 */
export function buildLiveLensBundle(input: LiveBundleInput): LensDataBundle {
  const { points, nowMs, projectName, projectTypeLabel } = input;
  const getSlot: SlotResolver = input.getSlot ?? (() => undefined);
  const activePoints = points.filter((p) => !p.isSuperseded);
  const rollups = computeDomainRollups(points, nowMs);

  // Row context shared by every detail row in this pass: a reverse supersession
  // map (superseder id -> the point it replaced) built once over ALL points,
  // plus the injected title resolvers.
  const supersedesById = new Map<string, string>();
  for (const p of points) {
    if (p.supersededBy) supersedesById.set(p.supersededBy, p.id);
  }
  const rowCtx: RowContext = {
    nowMs,
    supersedesById,
    resolveActionTitle: input.resolveActionTitle ?? (() => undefined),
    resolveObjectiveTitle: input.resolveObjectiveTitle ?? (() => undefined),
  };

  // Active points grouped by lens (for divergence recency + detail rows).
  const activeByLens = new Map<ObserveLensId, ObserveDataPoint[]>();
  for (const p of activePoints) {
    const lensId = DOMAIN_TO_LENS[p.domainId];
    const bucket = activeByLens.get(lensId);
    if (bucket) bucket.push(p);
    else activeByLens.set(lensId, [p]);
  }
  const activeByDomain = new Map<UniversalDomain, ObserveDataPoint[]>();
  for (const p of activePoints) {
    const bucket = activeByDomain.get(p.domainId);
    if (bucket) bucket.push(p);
    else activeByDomain.set(p.domainId, [p]);
  }

  // ── lenses + domainDetail (canonical lens order) ──
  const lenses: LensDisplay[] = [];
  const domainDetail: Partial<Record<ObserveLensId, DomainDetail>> = {};

  for (const lens of OBSERVE_LENSES) {
    const domainSnaps = lens.domains.map((d) => rollups.get(d)!);
    const lensActive = activeByLens.get(lens.id) ?? [];
    const obsCount = domainSnaps.reduce((n, s) => n + s.observationCount, 0);
    const divCount = domainSnaps.reduce((n, s) => n + s.divergenceCount, 0);
    const domainsWithData = domainSnaps.filter((s) => s.observationCount > 0).length;
    const freshness = worstWithData(domainSnaps);

    let lastMs = -Infinity;
    for (const s of domainSnaps) {
      const ms = parseMs(s.lastObservedAt);
      if (ms !== null && ms > lastMs) lastMs = ms;
    }
    const lastObserved =
      lastMs > -Infinity ? humanAge(new Date(lastMs).toISOString(), nowMs) : null;

    const keyData: KeyDatum[] = lens.domains.map((d): KeyDatum => {
      const s = rollups.get(d)!;
      // A declared vision surfaces as "Declared" in the vision-intent row ONLY
      // when that domain has no real observations -- observed status always wins,
      // and the declaration never touches any count.
      if (d === 'vision-intent' && s.observationCount === 0 && input.declaredIntent) {
        return {
          label: UNIVERSAL_DOMAIN_LABELS[d],
          value: 'Declared',
          confidence: 'low',
        };
      }
      return {
        label: UNIVERSAL_DOMAIN_LABELS[d],
        value: s.observationCount > 0 ? statusLabel(s.latestStatus) : OBSERVE_COPY.notYetRead,
        confidence: confidenceFromFreshness(s.freshness),
      };
    });

    const summary =
      obsCount > 0
        ? `${obsCount} observation${obsCount === 1 ? '' : 's'} across ` +
          `${domainsWithData}/${lens.domains.length} domains` +
          (divCount > 0 ? `, ${divCount} flagged` : '')
        : null;

    let divergence: LensDisplay['divergence'];
    if (divCount > 0) {
      const divPoints = lensActive.filter((p) => DIVERGENT_STATUSES.has(p.statusOutput));
      let divMs = -Infinity;
      let severe = false;
      for (const p of divPoints) {
        const ms = parseMs(p.capturedAt);
        if (ms !== null && ms > divMs) divMs = ms;
        if (SEVERE_STATUSES.has(p.statusOutput)) severe = true;
      }
      divergence = {
        label: `${divCount} flagged observation${divCount === 1 ? '' : 's'}`,
        age: (divMs > -Infinity ? humanAge(new Date(divMs).toISOString(), nowMs) : null) ?? 'recently',
        priority: severe ? 'high' : 'medium',
      };
    }

    const planTrigger =
      freshness === 'stale'
        ? { label: `${lens.label} data needs refresh`, priority: 'high' }
        : undefined;

    lenses.push({
      id: lens.id,
      label: lens.label,
      icon: lens.icon,
      color: lens.color,
      colorDim: lens.colorDim,
      mapColor: lens.mapColor,
      domains: lens.domains,
      observations: obsCount,
      freshness,
      lastObserved,
      summary,
      keyData,
      divergence,
      planTrigger,
    });

    // domainDetail entry (one subdomain per lens domain).
    const subdomains: Subdomain[] = lens.domains.map((d): Subdomain => {
      const observed = (activeByDomain.get(d) ?? []).map((p) => toDataPoint(p, rowCtx));
      // The declared-intent row is prepended to the vision-intent slide-up as a
      // declaration; it is NOT a field observation, so it is excluded from every
      // count above (obsCount, observed.length still drive totals/freshness).
      const pts =
        d === 'vision-intent' && input.declaredIntent
          ? [input.declaredIntent, ...observed]
          : observed;
      return {
        id: d,
        label: UNIVERSAL_DOMAIN_LABELS[d],
        icon: lens.icon,
        collapsed: false,
        points: pts,
        emptyNote: pts.length === 0 ? 'No observations recorded for this domain yet.' : undefined,
      };
    });

    // Compile the specialised viz payload from any measurement-bound proof
    // items captured under this lens's active points. Emits the lens's real
    // union member when >=1 bound capture exists, else the honest
    // { type: 'none' } empty-state (same graceful degrade as before).
    const lensProofItems: FieldActionProofItem[] = lensActive.flatMap(
      (p) => p.proofItems ?? [],
    );

    domainDetail[lens.id] = {
      lensLabel: lens.label,
      lensIcon: lens.icon,
      lensColor: lens.color,
      domains: lens.domains.map((d) => UNIVERSAL_DOMAIN_LABELS[d]),
      totalPoints: obsCount,
      freshness,
      lastObserved,
      subdomains,
      specialised: buildSpecialisedForLens(lens.id, lensProofItems, getSlot),
    };
  }

  // ── project rollup (over all 16 domains) ──
  const allSnaps = UNIVERSAL_DOMAINS.map((d) => rollups.get(d)!);
  const currentCount = allSnaps.filter((s) => s.freshness === 'current').length;
  const ageingCount = allSnaps.filter(
    (s) => s.freshness === 'ageing' || s.freshness === 'stale',
  ).length;
  const missingCount = allSnaps.filter((s) => s.freshness === 'missing').length;

  let cycleNumber = 1;
  for (const p of activePoints) {
    if (p.cycleId + 1 > cycleNumber) cycleNumber = p.cycleId + 1;
  }

  const triggers: PlanRevisionTrigger[] = [];
  for (const s of allSnaps) {
    if (s.latestStatus && SEVERE_STATUSES.has(s.latestStatus)) {
      const m = s.latest ? readMeasurement(s.latest) : {};
      triggers.push({
        domain: UNIVERSAL_DOMAIN_LABELS[s.domainId],
        detail: m.label
          ? `${statusLabel(s.latestStatus)} -- ${m.label}`
          : statusLabel(s.latestStatus),
        priority: 'high',
      });
    }
  }

  const project: LensProject = {
    name: projectName,
    type: projectTypeLabel,
    cycle: cycleNumber,
    totalDataPoints: activePoints.length,
    domainsCurrentCount: currentCount,
    domainsAgeingCount: ageingCount,
    domainsMissingCount: missingCount,
    planRevision: {
      active: triggers.length > 0,
      priority: triggers.length > 0 ? 'high' : 'medium',
      count: triggers.length,
      triggers,
    },
  };

  // ── cycle (real window + ticks + stale/ageing; nominal phase boundaries) ──
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const p of activePoints) {
    const ms = parseMs(p.capturedAt);
    if (ms === null) continue;
    if (ms < minMs) minMs = ms;
    if (ms > maxMs) maxMs = ms;
  }
  const hasWindow = minMs !== Infinity;
  const elapsed = hasWindow
    ? Math.min(NOMINAL_TOTAL_DAYS, Math.max(0, Math.round((nowMs - minMs) / DAY_MS)))
    : 0;
  const elapsedPct = (elapsed / NOMINAL_TOTAL_DAYS) * 100;
  const phases: LensCyclePhase[] = NOMINAL_PHASE_BOUNDS.map((ph) => ({
    ...ph,
    status:
      elapsedPct >= ph.endPct ? 'complete' : elapsedPct >= ph.startPct ? 'active' : 'upcoming',
  }));

  // Stale / ageing surfaced as LENS labels (unique), matching the mock shape.
  const staleLensLabels = new Set<string>();
  const ageingLensLabels = new Set<string>();
  for (const s of allSnaps) {
    if (s.observationCount === 0) continue;
    const lensId = DOMAIN_TO_LENS[s.domainId];
    const lens = OBSERVE_LENSES.find((l) => l.id === lensId);
    if (!lens) continue;
    if (s.freshness === 'stale') staleLensLabels.add(lens.label);
    else if (s.freshness === 'ageing') ageingLensLabels.add(lens.label);
  }

  const cycle: LensCycle = {
    number: cycleNumber,
    name: `Cycle ${cycleNumber}`,
    startDate: hasWindow ? format(minMs, 'd MMM yyyy') : '--',
    totalDays: NOMINAL_TOTAL_DAYS,
    elapsed,
    nextReviewDays: Math.max(0, NOMINAL_TOTAL_DAYS - elapsed),
    phases,
    history: [],
    staleDomains: [...staleLensLabels],
    ageingDomains: [...ageingLensLabels],
  };

  return {
    project,
    lenses,
    domainDetail,
    observations: buildObservationPins(activePoints, nowMs),
    map: buildObserveMap(
      activePoints,
      input.parcelBoundary ?? null,
      nowMs,
      input.isDemoGeometry ?? false,
    ),
    cycle,
    freshness: FRESHNESS,
    typeIcon: LIVE_TYPE_ICON,
  };
}

// ── project-type label resolution ─────────────────────────────────────────────

/**
 * Resolve a human project-type label, composing "Primary + Secondary" from a
 * projectTypeRecord when present, else the normalized bare projectType.
 */
export function resolveProjectTypeLabel(project: LocalProject | undefined): string {
  if (!project) return 'Project';
  const rec = project.metadata?.projectTypeRecord;
  if (rec?.primaryTypeId) {
    const ids = [rec.primaryTypeId, ...(rec.secondaryTypeIds ?? [])];
    const labels = ids.map((id) => findProjectType(id)?.label ?? id);
    return labels.join(' + ');
  }
  const norm = normalizeProjectType(project.projectType);
  if (norm) {
    const def = findProjectType(norm);
    if (def) return def.label;
  }
  return project.projectType ?? 'Project';
}

// ── declared-intent (read-side projection of metadata.visionProfile) ──────────
//
// A project's declared vision lives in `metadata.visionProfile` (written by the
// Phase-2 Project Creation Wizard: a free-text statement plus structured land-use
// goals / budget / timeline / labour). The Observe "Vision & Project Intent"
// domain otherwise reads ONLY persisted ObserveDataPoint records, so a real
// project shows "Not yet observed" even when it has a stated vision. This pure
// composer projects that declaration into a single synthetic DataPoint, framed
// as a DECLARATION (confidence 'low', a dedicated 'declaration' type) -- it is
// never persisted and never counted as a field observation (see buildLiveLensBundle).

// Flat id -> human label over every Vision Builder option (authoritative source).
const VISION_OPTION_LABELS: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const q of VISION_QUESTIONS) {
    for (const o of q.options) {
      if (!m.has(o.id)) m.set(o.id, o.label);
    }
  }
  return m;
})();

// "snake_case" / "kebab-case" id -> "Snake case" fallback for ids not in the
// option vocabulary (e.g. wizard-local labour ids).
function humanizeOptionId(id: string): string {
  const s = id.replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : id;
}

function labelForOptionId(id: string): string {
  return VISION_OPTION_LABELS.get(id) ?? humanizeOptionId(id);
}

/**
 * Compose the read-side "declared intent" DataPoint from a project's structured
 * visionProfile, or null when the project carries no surfaceable vision content.
 * Pure + store-free (mirrors resolveProjectTypeLabel); unit-tested.
 */
export function buildDeclaredIntentPoint(
  project: LocalProject | undefined,
): DataPoint | null {
  const vp = project?.metadata?.visionProfile;
  if (!vp) return null;

  const statement = vp.landIdentity
    ?.find((s) => typeof s === 'string' && s.trim().length > 0)
    ?.trim();
  const outcomes = (vp.primaryOutcomes ?? []).map(labelForOptionId);
  const budget = vp.budgetRange ? labelForOptionId(vp.budgetRange) : undefined;
  const timeline = vp.timelineProgress
    ? labelForOptionId(vp.timelineProgress)
    : undefined;
  const labour = vp.resourceConstraints?.[0]
    ? labelForOptionId(vp.resourceConstraints[0])
    : undefined;

  const hasContent =
    Boolean(statement) ||
    outcomes.length > 0 ||
    Boolean(budget) ||
    Boolean(timeline) ||
    Boolean(labour);
  if (!hasContent) return null;

  const value = statement ?? (outcomes.length > 0 ? outcomes.join(', ') : 'Declared');

  const noteLines: string[] = [];
  if (statement) noteLines.push(`Vision: ${statement}`);
  if (outcomes.length > 0) noteLines.push(`Goals: ${outcomes.join(', ')}`);
  if (budget) noteLines.push(`Budget: ${budget}`);
  if (timeline) noteLines.push(`Timeline: ${timeline}`);
  if (labour) noteLines.push(`Labour: ${labour}`);
  const notes = noteLines.length > 0 ? noteLines.join('\n') : undefined;

  const when = calendarDate(vp.updatedAt ?? vp.completedAt);

  return {
    id: 'declared-intent',
    type: 'declaration',
    label: 'Declared project intent',
    value,
    notes,
    observedAt: when,
    recordedAt: when,
    confidence: 'low',
  };
}

// ── the hook ──────────────────────────────────────────────────────────────────

/**
 * Live LensDataBundle for a project. Thin wrapper over `buildLiveLensBundle`:
 * reads the project's points + record from the stores and runs the pure mapper.
 */
// Plan-objective titles resolve through the static catalogues (pure module
// data, no store) -- a plain function, no memoization needed.
const resolveObjectiveTitle = (objectiveId: string): string | undefined =>
  findObjectiveGlobally(objectiveId)?.title;

export function useLiveLensBundle(projectId: string): LensDataBundle {
  const byProject = useObserveDataPointStore((s) => s.byProject);
  const actionsByProject = useFieldActionStore((s) => s.byProject);
  const feedByProject = useObserveFeedStore((s) => s.byProject);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  // Baseline "now" once per mount so freshness pills / ages don't flicker.
  const nowMs = useMemo(() => Date.now(), []);
  const points = byProject[projectId] ?? [];
  const feedEntries = feedByProject[projectId] ?? [];
  const projectName = project?.name ?? 'Project';
  const projectTypeLabel = resolveProjectTypeLabel(project);
  const parcelBoundary = project?.parcelBoundaryGeojson ?? null;
  const isDemoGeometry = project?.isBuiltin ?? false;
  // Memoized on the project ref (stable from the store selector) so the derived
  // point keeps a stable identity and does not force the bundle to rebuild.
  const declaredIntent = useMemo(() => buildDeclaredIntentPoint(project), [project]);
  // Field-log feed entries join the point set as virtual points (same union
  // the dashboard renders), routed objective -> domain by the shared resolver.
  const mergedPoints = useMemo(
    () => mergeFeedProjections(points, feedEntries, resolveDomainByObjectiveId),
    [points, feedEntries],
  );
  // Field-action id -> title map for the "Source task" row. Feed entries
  // contribute their denormalized title (survives FieldAction deletion).
  const resolveActionTitle = useMemo(() => {
    const titles = new Map<string, string>();
    for (const a of actionsByProject[projectId] ?? []) titles.set(a.id, a.title);
    for (const e of feedEntries) {
      if (e.sourceActionId && !titles.has(e.sourceActionId)) {
        titles.set(e.sourceActionId, e.sourceActionTitle);
      }
    }
    return (actionId: string) => titles.get(actionId);
  }, [actionsByProject, projectId, feedEntries]);

  return useMemo(
    () =>
      buildLiveLensBundle({
        points: mergedPoints,
        nowMs,
        projectName,
        projectTypeLabel,
        getSlot: getMeasurementSlot,
        parcelBoundary,
        isDemoGeometry,
        declaredIntent,
        resolveActionTitle,
        resolveObjectiveTitle,
      }),
    [
      mergedPoints,
      nowMs,
      projectName,
      projectTypeLabel,
      parcelBoundary,
      isDemoGeometry,
      declaredIntent,
      resolveActionTitle,
    ],
  );
}
