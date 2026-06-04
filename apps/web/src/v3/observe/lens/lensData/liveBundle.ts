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
import {
  useProjectStore,
  normalizeProjectType,
  type LocalProject,
} from '../../../../store/projectStore.js';
import { FRESHNESS, TYPE_ICON } from '../mockData.js';
import {
  buildSpecialisedForLens,
  type SlotResolver,
} from './specialisedBuilders.js';
import type {
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
      return 'Not yet observed';
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

// ── data-point row mapping ────────────────────────────────────────────────────

function toDataPoint(p: ObserveDataPoint): DataPoint {
  const m = readMeasurement(p);
  const divergent = DIVERGENT_STATUSES.has(p.statusOutput);
  const c = coordsOf(p);
  return {
    id: p.id,
    type: divergent ? 'divergence' : iconKeyForSource(p.sourceType),
    label: m.label ?? UNIVERSAL_DOMAIN_LABELS[p.domainId],
    location: c ? `${c[1].toFixed(4)}, ${c[0].toFixed(4)}` : undefined,
    observedAt: calendarDate(p.capturedAt),
    recordedAt: calendarDate(p.capturedAt),
    cycle: `Cycle ${p.cycleId + 1}`,
    confidence: 'medium',
    isSuperseded: p.isSuperseded,
    supersededBy: p.supersededBy ?? null,
    notes: m.note,
    isDivergence: divergent || undefined,
    divergenceStatus: divergent ? statusLabel(p.statusOutput) : undefined,
  };
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
}

const NOMINAL_PHASE_BOUNDS: ReadonlyArray<Omit<LensCyclePhase, 'status'>> = [
  { id: 'plan', label: 'Plan', color: '#4A8FD4', startPct: 0, endPct: 22, days: 40 },
  { id: 'act', label: 'Act', color: '#8A6AB4', startPct: 22, endPct: 72, days: 90 },
  { id: 'obs', label: 'Observe', color: '#5AAF72', startPct: 72, endPct: 100, days: 50 },
];
const NOMINAL_TOTAL_DAYS = 180;

/**
 * Pure mapper: live ObserveDataPoint[] -> LensDataBundle. No React, no stores.
 */
export function buildLiveLensBundle(input: LiveBundleInput): LensDataBundle {
  const { points, nowMs, projectName, projectTypeLabel } = input;
  const getSlot: SlotResolver = input.getSlot ?? (() => undefined);
  const activePoints = points.filter((p) => !p.isSuperseded);
  const rollups = computeDomainRollups(points, nowMs);

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
      return {
        label: UNIVERSAL_DOMAIN_LABELS[d],
        value: s.observationCount > 0 ? statusLabel(s.latestStatus) : 'Not yet observed',
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
      const pts = (activeByDomain.get(d) ?? []).map(toDataPoint);
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
    cycle,
    freshness: FRESHNESS,
    typeIcon: TYPE_ICON,
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

// ── the hook ──────────────────────────────────────────────────────────────────

/**
 * Live LensDataBundle for a project. Thin wrapper over `buildLiveLensBundle`:
 * reads the project's points + record from the stores and runs the pure mapper.
 */
export function useLiveLensBundle(projectId: string): LensDataBundle {
  const byProject = useObserveDataPointStore((s) => s.byProject);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  // Baseline "now" once per mount so freshness pills / ages don't flicker.
  const nowMs = useMemo(() => Date.now(), []);
  const points = byProject[projectId] ?? [];
  const projectName = project?.name ?? 'Project';
  const projectTypeLabel = resolveProjectTypeLabel(project);

  return useMemo(
    () =>
      buildLiveLensBundle({
        points,
        nowMs,
        projectName,
        projectTypeLabel,
        getSlot: getMeasurementSlot,
      }),
    [points, nowMs, projectName, projectTypeLabel],
  );
}
