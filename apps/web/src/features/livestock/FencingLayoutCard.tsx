/**
 * §16 FencingLayoutCard — costs out the linear fencing requirement, gate
 * count, and shared-edge savings between paddock cell siblings. Pure
 * presentation: reads useLivestockStore + computes via turf, no shared math.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useLivestockStore, type Paddock, type FenceType } from '../../store/livestockStore.js';
import css from './FencingLayoutCard.module.css';

interface FencingLayoutCardProps {
  projectId: string;
}

interface FenceSpec {
  label: string;
  costLowPerM: number;
  costHighPerM: number;
  note: string;
}

const FENCE_SPECS: Record<FenceType, FenceSpec> = {
  electric: { label: 'Electric', costLowPerM: 1.5, costHighPerM: 3.5, note: 'Lowest material cost; needs energizer + ground rods.' },
  post_wire: { label: 'Post + wire', costLowPerM: 4, costHighPerM: 7, note: 'Workhorse perimeter fence; durable for cattle.' },
  post_rail: { label: 'Post + rail', costLowPerM: 15, costHighPerM: 30, note: 'High visual + livestock containment; horse-grade.' },
  woven_wire: { label: 'Woven wire', costLowPerM: 5, costHighPerM: 10, note: 'Sheep / goat / poultry tight mesh.' },
  temporary: { label: 'Temporary', costLowPerM: 0.8, costHighPerM: 1.5, note: 'Step-in posts + polywire for short rotations.' },
  none: { label: 'None', costLowPerM: 0, costHighPerM: 0, note: 'No physical containment specified.' },
};

interface PaddockMetrics {
  paddock: Paddock;
  perimeterM: number;
  fenceSpec: FenceSpec;
  costLow: number;
  costHigh: number;
  gateCount: number;
}

interface GroupRollup {
  group: string | null; // null = ungrouped
  paddocks: Paddock[];
  rawPerimeterSum: number;
  unionPerimeterM: number;
  sharedEdgeM: number;
  effectivePerimeterM: number;
  costLow: number;
  costHigh: number;
  gateCount: number;
  longUnbrokenRunsCount: number; // paddocks > 400m perimeter with no neighbor
}

const GATE_INTERVAL_M = 200;
const LONG_RUN_THRESHOLD_M = 400;

function ringsPerimeter(rings: GeoJSON.Position[][]): number {
  let sum = 0;
  for (const ring of rings) {
    if (ring.length < 2) continue;
    try {
      sum += turf.length(turf.lineString(ring), { units: 'meters' });
    } catch {
      // skip degenerate ring
    }
  }
  return sum;
}

function polygonPerimeter(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  if (geom.type === 'Polygon') return ringsPerimeter(geom.coordinates);
  let sum = 0;
  for (const poly of geom.coordinates) sum += ringsPerimeter(poly);
  return sum;
}

function safePolygonPerimeter(geometry: GeoJSON.Polygon): number {
  try {
    return polygonPerimeter(geometry);
  } catch {
    return 0;
  }
}

function paddockMetrics(p: Paddock): PaddockMetrics {
  const perimeterM = safePolygonPerimeter(p.geometry);
  const fenceSpec = FENCE_SPECS[p.fencing];
  const costLow = perimeterM * fenceSpec.costLowPerM;
  const costHigh = perimeterM * fenceSpec.costHighPerM;
  // Estimate one gate per cell entry (1) + 1 per GATE_INTERVAL_M of perimeter
  const gateCount = Math.max(1, Math.ceil(perimeterM / GATE_INTERVAL_M));
  return { paddock: p, perimeterM, fenceSpec, costLow, costHigh, gateCount };
}

function rollupGroup(group: string | null, paddocks: Paddock[]): GroupRollup {
  const metrics = paddocks.map(paddockMetrics);
  const rawPerimeterSum = metrics.reduce((acc, m) => acc + m.perimeterM, 0);

  let unionPerimeterM = rawPerimeterSum;
  if (paddocks.length > 1 && group !== null) {
    try {
      let acc: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = null;
      for (const p of paddocks) {
        const f = turf.polygon(p.geometry.coordinates);
        if (!acc) {
          acc = f;
          continue;
        }
        const merged = turf.union(turf.featureCollection([acc, f]));
        if (merged) acc = merged as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
      }
      if (acc) {
        unionPerimeterM = polygonPerimeter(acc.geometry);
      }
    } catch {
      unionPerimeterM = rawPerimeterSum;
    }
  }

  const sharedEdgeM = Math.max(0, (rawPerimeterSum - unionPerimeterM) / 2);
  // Effective perimeter: external perimeter (union) + internal cell dividers (shared edges count once between siblings)
  const effectivePerimeterM = unionPerimeterM + sharedEdgeM;
  const costLow = metrics.reduce((acc, m) => acc + m.costLow, 0);
  const costHigh = metrics.reduce((acc, m) => acc + m.costHigh, 0);
  const gateCount = metrics.reduce((acc, m) => acc + m.gateCount, 0);
  const longUnbrokenRunsCount = metrics.filter((m) => m.perimeterM > LONG_RUN_THRESHOLD_M && m.gateCount < 3).length;

  return {
    group,
    paddocks,
    rawPerimeterSum,
    unionPerimeterM,
    sharedEdgeM,
    effectivePerimeterM,
    costLow,
    costHigh,
    gateCount,
    longUnbrokenRunsCount,
  };
}

function fmtM(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function fmtUsd(n: number): string {
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1_000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${Math.round(n)}`;
}

export default function FencingLayoutCard({ projectId }: FencingLayoutCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const view = useMemo(() => {
    if (paddocks.length === 0) return null;

    const groupMap = new Map<string | null, Paddock[]>();
    for (const p of paddocks) {
      const key = p.grazingCellGroup ?? null;
      const arr = groupMap.get(key) ?? [];
      arr.push(p);
      groupMap.set(key, arr);
    }

    const rollups: GroupRollup[] = [];
    for (const [k, arr] of groupMap) {
      rollups.push(rollupGroup(k, arr));
    }
    rollups.sort((a, b) => {
      // ungrouped last; otherwise by paddock count desc, then by name
      if (a.group === null && b.group !== null) return 1;
      if (b.group === null && a.group !== null) return -1;
      if (a.paddocks.length !== b.paddocks.length) return b.paddocks.length - a.paddocks.length;
      return (a.group ?? '').localeCompare(b.group ?? '');
    });

    const totalRawPerimeter = rollups.reduce((acc, r) => acc + r.rawPerimeterSum, 0);
    const totalUnionPerimeter = rollups.reduce((acc, r) => acc + r.unionPerimeterM, 0);
    const totalSharedEdge = rollups.reduce((acc, r) => acc + r.sharedEdgeM, 0);
    const totalEffectivePerimeter = rollups.reduce((acc, r) => acc + r.effectivePerimeterM, 0);
    const totalCostLow = rollups.reduce((acc, r) => acc + r.costLow, 0);
    const totalCostHigh = rollups.reduce((acc, r) => acc + r.costHigh, 0);
    const totalGates = rollups.reduce((acc, r) => acc + r.gateCount, 0);
    const totalLongRuns = rollups.reduce((acc, r) => acc + r.longUnbrokenRunsCount, 0);
    const sharingPct = totalRawPerimeter > 0 ? Math.round((totalSharedEdge * 2 / totalRawPerimeter) * 100) : 0;

    const noFenceCount = paddocks.filter((p) => p.fencing === 'none').length;

    return {
      rollups,
      totalRawPerimeter,
      totalUnionPerimeter,
      totalSharedEdge,
      totalEffectivePerimeter,
      totalCostLow,
      totalCostHigh,
      totalGates,
      totalLongRuns,
      sharingPct,
      noFenceCount,
      paddockCount: paddocks.length,
    };
  }, [paddocks]);

  if (!view) {
    return (
      <div className={css.card ?? ''}>
        <div className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Fencing Layout & Gate Estimate</h3>
            <p className={css.cardHint ?? ''}>
              Costs out perimeter, shared-edge savings, gate count, and material spend
              across drawn paddocks.
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 16</span>
        </div>
        <div className={css.empty ?? ''}>
          No paddocks drawn yet {'\u2014'} sketch a paddock on the map to populate the
          fencing rollup.
        </div>
      </div>
    );
  }

  let verdictTier: 'green' | 'caution' | 'blocker';
  let verdictTitle: string;
  let verdictNote: string;
  if (view.noFenceCount >= Math.ceil(view.paddockCount / 2)) {
    verdictTier = 'blocker';
    verdictTitle = `${view.noFenceCount} of ${view.paddockCount} paddocks have no fence type set`;
    verdictNote = 'Set a fence type on each paddock before the cost rollup means anything.';
  } else if (view.totalLongRuns > 0) {
    verdictTier = 'caution';
    verdictTitle = `${view.totalLongRuns} long unbroken fence run${view.totalLongRuns === 1 ? '' : 's'}`;
    verdictNote = `Paddock${view.totalLongRuns === 1 ? '' : 's'} > ${LONG_RUN_THRESHOLD_M} m perimeter with fewer than 3 gates \u2014 consider adding gate intervals to keep livestock and equipment moving.`;
  } else if (view.sharingPct >= 30) {
    verdictTier = 'green';
    verdictTitle = `Strong cell-sharing (${view.sharingPct}% of edges shared)`;
    verdictNote = 'Cell-group siblings share fencing efficiently; internal divisions reuse edges instead of doubling fence runs.';
  } else if (view.sharingPct >= 10) {
    verdictTier = 'caution';
    verdictTitle = `Moderate sharing (${view.sharingPct}% shared)`;
    verdictNote = 'Some shared edges, but most paddocks fence independently. Tightening cell groups would lower spend.';
  } else {
    verdictTier = 'caution';
    verdictTitle = 'Independent paddocks (no shared edges)';
    verdictNote = 'Each paddock fences its full perimeter \u2014 no cell-group savings yet.';
  }

  const verdictClass =
    verdictTier === 'green'
      ? css.verdictGreen
      : verdictTier === 'caution'
      ? css.verdictCaution
      : css.verdictBlocker;

  return (
    <div className={css.card ?? ''}>
      <div className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>Fencing Layout & Gate Estimate</h3>
          <p className={css.cardHint ?? ''}>
            Linear fencing requirement, shared-edge savings between cell siblings, gate-count
            estimate (1 per cell + 1 per {GATE_INTERVAL_M} m), and material cost band.
          </p>
        </div>
        <span className={css.modeBadge ?? ''}>{'\u00A7'} 16</span>
      </div>

      <div className={`${css.verdictBanner ?? ''} ${verdictClass ?? ''}`}>
        <div className={css.verdictTitle ?? ''}>{verdictTitle}</div>
        <div className={css.verdictNote ?? ''}>{verdictNote}</div>
      </div>

      <div className={css.headlineGrid ?? ''}>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{fmtM(view.totalEffectivePerimeter)}</span>
          <span className={css.statLabel ?? ''}>Total fence</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{fmtM(view.totalSharedEdge)}</span>
          <span className={css.statLabel ?? ''}>Shared (saved)</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.totalGates}</span>
          <span className={css.statLabel ?? ''}>Gates est.</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>
            {fmtUsd(view.totalCostLow)}{'\u2013'}{fmtUsd(view.totalCostHigh)}
          </span>
          <span className={css.statLabel ?? ''}>Material cost</span>
        </div>
      </div>

      <div className={css.sectionLabel ?? ''}>By cell group</div>
      <div className={css.rowList ?? ''}>
        {view.rollups.map((r, idx) => {
          const groupLabel = r.group ?? 'Ungrouped';
          const sharingPct = r.rawPerimeterSum > 0 ? Math.round((r.sharedEdgeM * 2 / r.rawPerimeterSum) * 100) : 0;
          const tier =
            r.longUnbrokenRunsCount > 0
              ? css.tierCaution
              : sharingPct >= 30
              ? css.tierGreen
              : sharingPct >= 10
              ? css.tierNeutral
              : r.group === null
              ? css.tierWeak
              : css.tierNeutral;
          return (
            <div key={`${groupLabel}-${idx}`} className={`${css.areaRow ?? ''} ${tier ?? ''}`}>
              <div className={css.rowHead ?? ''}>
                <div className={css.rowMain ?? ''}>
                  <span className={css.areaName ?? ''}>{groupLabel}</span>
                  <span className={css.areaType ?? ''}>
                    {r.paddocks.length} paddock{r.paddocks.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span className={css.tierBadge ?? ''}>
                  {sharingPct >= 30 ? 'Efficient' : sharingPct >= 10 ? 'Some sharing' : r.group === null ? 'Ungrouped' : 'Independent'}
                </span>
              </div>
              <div className={css.rowMetrics ?? ''}>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Perimeter</span>
                  <span className={css.metricValue ?? ''}>{fmtM(r.effectivePerimeterM)}</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Shared</span>
                  <span className={css.metricValue ?? ''}>{fmtM(r.sharedEdgeM)}</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Gates</span>
                  <span className={css.metricValue ?? ''}>{r.gateCount}</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Cost</span>
                  <span className={css.metricValue ?? ''}>
                    {fmtUsd(r.costLow)}{'\u2013'}{fmtUsd(r.costHigh)}
                  </span>
                </div>
              </div>
              {r.longUnbrokenRunsCount > 0 && (
                <div className={css.rowFlag ?? ''}>
                  {r.longUnbrokenRunsCount} long unbroken run{r.longUnbrokenRunsCount === 1 ? '' : 's'} {'>'} {LONG_RUN_THRESHOLD_M} m {'\u2014'} consider extra gate intervals.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={css.assumption ?? ''}>
        Perimeter via turf {'\u00B7'} shared-edge length derived as
        (sum-of-perimeters {'\u2212'} union-perimeter) / 2 {'\u00B7'} gate count {'\u2248'} 1 per cell + 1 per{' '}
        {GATE_INTERVAL_M} m of perimeter {'\u00B7'} cost bands per fence type: electric $1.50{'\u2013'}3.50/m,
        post+wire $4{'\u2013'}7/m, post+rail $15{'\u2013'}30/m, woven wire $5{'\u2013'}10/m, temporary $0.80{'\u2013'}1.50/m.
        Long-run flag: paddocks {'>'} {LONG_RUN_THRESHOLD_M} m perimeter with fewer than 3 gates.
      </div>
    </div>
  );
}
