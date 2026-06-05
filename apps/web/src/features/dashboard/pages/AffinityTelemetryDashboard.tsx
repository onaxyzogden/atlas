/**
 * AffinityTelemetryDashboard — read view for Act-stage interaction telemetry.
 *
 * Renders a 6×6 grid (project types × Act modules — `schedule` is currently
 * absent from the v1 affinity table). Each cell shows the touch count
 * across the 4 instrumented event types, plus avg dwell-ms when slide-up
 * events are present. Cells are color-coded by the distance between the
 * observed rank (descending touch count per row) and the v1 affinity rank
 * from projectTypeModuleAffinity.ts:
 *
 *   green  — match (Δ = 0)
 *   yellow — Δ = 1
 *   orange — Δ = 2
 *   red    — Δ ≥ 3
 *
 * The point isn't to optimize the table now; it's to surface where v1
 * disagrees with real-steward behaviour as soon as ≥1 session lands.
 *
 * No auto-refresh: GET aggregate is server-grouped and cheap, but we keep
 * the page deterministic for screenshot review. A reload button is the
 * full story.
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/apiClient.js';
import type {
  ActAffinityAggregateRow,
  ActModuleId,
  PlanProjectTypeId,
} from '@ogden/shared';
import { ACT_MODULE_TO_DOMAIN } from '@ogden/shared';
import { getModuleAffinityRank } from '../../../v3/act/data/projectTypeModuleAffinity.js';
import css from './AffinityTelemetryDashboard.module.css';

const PROJECT_TYPES: PlanProjectTypeId[] = [
  'regenerative_farm',
  'homestead',
  'retreat_center',
  'educational_farm',
  'conservation',
  'multi_enterprise',
];

const PROJECT_TYPE_LABEL: Record<PlanProjectTypeId, string> = {
  regenerative_farm: 'Regenerative Farm',
  homestead: 'Homestead',
  retreat_center: 'Retreat Center',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-enterprise',
};

const MODULES: ActModuleId[] = [
  'tracker',
  'build',
  'maintain',
  'livestock',
  'harvest',
  'review',
  'network',
  'schedule',
];

const MODULE_LABEL: Record<ActModuleId, string> = {
  tracker: 'Tracker',
  build: 'Build',
  maintain: 'Maintain',
  livestock: 'Livestock',
  harvest: 'Harvest',
  review: 'Review',
  network: 'Network',
  schedule: 'Schedule',
};

interface CellData {
  touchCount: number;
  avgDwellMs: number | null;
  distinctSessions: number;
}

type Grid = Record<PlanProjectTypeId, Record<ActModuleId, CellData>>;

function emptyGrid(): Grid {
  const g = {} as Grid;
  for (const t of PROJECT_TYPES) {
    g[t] = {} as Record<ActModuleId, CellData>;
    for (const m of MODULES) {
      g[t][m] = { touchCount: 0, avgDwellMs: null, distinctSessions: 0 };
    }
  }
  return g;
}

function buildGrid(rows: ActAffinityAggregateRow[]): Grid {
  const grid = emptyGrid();
  // dwell stats are weighted by session count for combination across event types.
  const dwellSums: Record<string, { total: number; weight: number }> = {};
  for (const row of rows) {
    if (!row.projectType) continue;
    const cell = grid[row.projectType][row.module];
    cell.touchCount += row.touchCount;
    cell.distinctSessions = Math.max(cell.distinctSessions, row.distinctSessions);
    if (row.avgDwellMs != null) {
      const key = `${row.projectType}|${row.module}`;
      const acc = dwellSums[key] ?? { total: 0, weight: 0 };
      acc.total += row.avgDwellMs * row.touchCount;
      acc.weight += row.touchCount;
      dwellSums[key] = acc;
    }
  }
  for (const t of PROJECT_TYPES) {
    for (const m of MODULES) {
      const acc = dwellSums[`${t}|${m}`];
      if (acc && acc.weight > 0) grid[t][m].avgDwellMs = acc.total / acc.weight;
    }
  }
  return grid;
}

/** Observed rank per row: highest touchCount → 0, ties broken by module order. */
function observedRank(grid: Grid, type: PlanProjectTypeId): Map<ActModuleId, number> {
  const ranked = MODULES
    .filter((m) => m !== 'schedule') // schedule absent from v1 table
    .map((m, idx) => ({ m, count: grid[type][m].touchCount, idx }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.idx - b.idx;
    });
  const out = new Map<ActModuleId, number>();
  ranked.forEach((entry, i) => out.set(entry.m, i));
  return out;
}

function cellTone(delta: number | null): string {
  if (delta == null) return css.toneEmpty ?? '';
  if (delta === 0) return css.toneGreen ?? '';
  if (delta === 1) return css.toneYellow ?? '';
  if (delta === 2) return css.toneOrange ?? '';
  return css.toneRed ?? '';
}

export default function AffinityTelemetryDashboard() {
  const [rows, setRows] = useState<ActAffinityAggregateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.telemetry
      .getActAffinityAggregate()
      .then((env) => {
        if (cancelled) return;
        setRows(env.data.rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load aggregate');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const grid = useMemo(() => buildGrid(rows ?? []), [rows]);
  const observedByType = useMemo(() => {
    const m = new Map<PlanProjectTypeId, Map<ActModuleId, number>>();
    for (const t of PROJECT_TYPES) m.set(t, observedRank(grid, t));
    return m;
  }, [grid]);

  const totalTouches = useMemo(
    () => (rows ?? []).reduce((sum, r) => sum + r.touchCount, 0),
    [rows],
  );

  return (
    <div className={css.container}>
      <header className={css.header}>
        <div>
          <h2 className={css.title}>Affinity telemetry</h2>
          <p className={css.subtitle}>
            Observed touch counts vs. v1 project-type → Act module ranking.
            Cell color = |observed rank − v1 rank|.
          </p>
        </div>
        <button
          type="button"
          className={css.reloadBtn}
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </header>

      <div className={css.legend}>
        <span className={`${css.legendChip} ${css.toneGreen}`}>match</span>
        <span className={`${css.legendChip} ${css.toneYellow}`}>Δ 1</span>
        <span className={`${css.legendChip} ${css.toneOrange}`}>Δ 2</span>
        <span className={`${css.legendChip} ${css.toneRed}`}>Δ ≥ 3</span>
        <span className={`${css.legendChip} ${css.toneEmpty}`}>no signal</span>
      </div>

      {error ? (
        <div className={css.errorBox}>Failed to load: {error}</div>
      ) : null}

      {!loading && totalTouches === 0 && !error ? (
        <div className={css.emptyState}>
          No telemetry yet. Open the Act stage and click around — events
          flush after 1.5s of idle.
        </div>
      ) : null}

      <div className={css.gridWrap}>
        <table className={css.grid}>
          <thead>
            <tr>
              <th aria-label="" />
              {MODULES.map((m) => (
                <th key={m} className={css.colHeader}>
                  {MODULE_LABEL[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROJECT_TYPES.map((t) => {
              const obs = observedByType.get(t) ?? new Map<ActModuleId, number>();
              return (
                <tr key={t}>
                  <th className={css.rowHeader}>{PROJECT_TYPE_LABEL[t]}</th>
                  {MODULES.map((m) => {
                    const cell = grid[t][m];
                    const v1Rank = getModuleAffinityRank(t, ACT_MODULE_TO_DOMAIN[m]);
                    const observed = obs.get(m);
                    let delta: number | null = null;
                    if (cell.touchCount > 0 && observed != null && Number.isFinite(v1Rank)) {
                      delta = Math.abs(observed - v1Rank);
                    }
                    return (
                      <td key={m} className={`${css.cell} ${cellTone(delta)}`}>
                        <div className={css.cellTouch}>{cell.touchCount}</div>
                        <div className={css.cellMeta}>
                          {cell.avgDwellMs != null
                            ? `${Math.round(cell.avgDwellMs)} ms`
                            : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className={css.footer}>
        Total events: {totalTouches}. Aggregate is server-side per requesting
        user. v2 ranking should not be touched until ≥30 sessions across ≥2
        project types — see ADR
        <code> 2026-05-10-atlas-act-affinity-telemetry-pipeline</code>.
      </footer>
    </div>
  );
}
