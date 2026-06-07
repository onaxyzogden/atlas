/**
 * §K.3 ZoneSomSidebar — per-zone SOM trajectory sparkline list.
 *
 * Sits beside the single-series `JCurveChart` (K.4) and gives an
 * at-a-glance comparison of each zone's SOM (soil organic matter)
 * carbon-stock trajectory. One row per zone: label, current stock,
 * a `ZoneSomSparkline`, and a Δ caption. The main chart stays
 * single-series; this is the comparison surface.
 *
 * Data: one `getSomTrajectoryByZone` (K.1) request per zone, fired in
 * parallel. Per-zone failures are isolated — one zone erroring never
 * takes the rest of the list down.
 *
 * Empty `zones` → renders nothing (composes "nothing" cleanly per the
 * EvidenceSection convention). Hidden under 720px so the mobile Overview
 * stack stays flat ([[feedback-mobile-overview-stack]]).
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * The series is a soil-carbon reading, never a return forecast.
 * See [[fiqh-csra-erased-2026-05-04]].
 */

import { useEffect, useState } from 'react';
import { api } from '../../lib/apiClient.js';
import type { SomYearRow } from './somAppreciation.js';
import ZoneSomSparkline from '../../components/charts/ZoneSomSparkline.js';
import css from './ZoneSomSidebar.module.css';

/** Minimal zone descriptor — id is the F.3 `zoneId` used at recompute. */
export interface ZoneSomDescriptor {
  id: string;
  label: string;
}

export interface ZoneSomSidebarProps {
  projectId: string;
  zones: ZoneSomDescriptor[];
  /** Optional id of an external heading for aria-labelledby. */
  ariaLabelledBy?: string;
}

type ZoneState =
  | { status: 'loading' }
  | { status: 'ok'; rows: SomYearRow[] }
  | { status: 'error' };

function fmtTc(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toFixed(1)} tC`;
}

function fmtDelta(rows: SomYearRow[]): string | null {
  if (rows.length < 2) return null;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const delta = last.som_stock_tc - first.som_stock_tc;
  const years = last.year - first.year;
  const sign = delta >= 0 ? '+' : '−';
  const span = years > 0 ? ` over ${years} yr` : '';
  return `Δ ${sign}${Math.abs(delta).toFixed(1)} tC${span}`;
}

function currentStock(rows: SomYearRow[]): number | null {
  if (rows.length === 0) return null;
  return rows[rows.length - 1]!.som_stock_tc;
}

export default function ZoneSomSidebar({
  projectId,
  zones,
  ariaLabelledBy,
}: ZoneSomSidebarProps) {
  const [states, setStates] = useState<Record<string, ZoneState>>({});

  // Signature so the effect refetches only when the zone set or project
  // actually changes — not on every parent re-render.
  const zoneSig = zones.map((z) => z.id).join('|');

  useEffect(() => {
    if (zones.length === 0) return;
    let cancelled = false;

    setStates(
      Object.fromEntries(zones.map((z) => [z.id, { status: 'loading' as const }])),
    );

    void Promise.allSettled(
      zones.map((z) => api.soilRegeneration.getSomTrajectoryByZone(projectId, z.id)),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, ZoneState> = {};
      zones.forEach((z, i) => {
        const r = results[i]!;
        next[z.id] =
          r.status === 'fulfilled'
            ? { status: 'ok', rows: r.value.data ?? [] }
            : { status: 'error' };
      });
      setStates(next);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, zoneSig]);

  // Empty zone set → render nothing (no shell).
  if (zones.length === 0) return null;

  return (
    <aside
      className={css.sidebar}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : 'Per-zone SOM trajectories'}
    >
      <h4 className={css.heading}>Per-zone SOM</h4>
      <ul className={css.list}>
        {zones.map((zone) => {
          const state = states[zone.id] ?? { status: 'loading' as const };
          return (
            <li key={zone.id} className={css.row}>
              <div className={css.rowHead}>
                <span className={css.label}>{zone.label}</span>
                {state.status === 'ok' && currentStock(state.rows) != null && (
                  <span className={css.current}>{fmtTc(currentStock(state.rows)!)}</span>
                )}
              </div>

              {state.status === 'loading' && (
                <div className={css.skeleton} aria-hidden="true" />
              )}

              {state.status === 'error' && (
                <p className={css.error}>Trajectory unavailable</p>
              )}

              {state.status === 'ok' && (
                <>
                  <div className={css.spark}>
                    <ZoneSomSparkline
                      rows={state.rows}
                      ariaLabel={`${zone.label} SOM trajectory`}
                    />
                  </div>
                  {fmtDelta(state.rows) && (
                    <span className={css.delta}>{fmtDelta(state.rows)}</span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
