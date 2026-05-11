/**
 * SlaughterThroughputCard — Plan Module 7 diagnostic.
 *
 * Heads/yr × dressed-weight × bird-time-on-line → required slaughter
 * stations vs. configured `slaughterPoints[]`. Pure presentation; the
 * inputs (annual head count, dressed-weight, processing days/yr) are
 * local state — when a steward changes them the readouts re-derive
 * via useMemo.
 *
 * Capacity rollup pulls from `agribusinessStore.slaughterPoints` so
 * the moment a Slaughter point is dropped on the map the "Configured
 * capacity" line moves.
 */

import { useMemo } from 'react';
import {
  useAgribusinessStore,
  DEFAULT_SIZING,
} from '../../store/agribusinessStore.js';
import css from './AgribusinessCard.module.css';

interface Props {
  projectId: string;
}

export default function SlaughterThroughputCard({ projectId }: Props) {
  const allPoints = useAgribusinessStore((s) => s.slaughterPoints);
  const points = useMemo(
    () => allPoints.filter((p) => p.projectId === projectId),
    [allPoints, projectId],
  );

  // Sizing lives in the store (per-project, persisted). Defaults from
  // DEFAULT_SIZING — 2,000-bird pastured viability floor named in the
  // Module 7 ADR.
  const sizing =
    useAgribusinessStore((s) => s.sizingByProject[projectId]) ?? DEFAULT_SIZING;
  const setSizing = useAgribusinessStore((s) => s.setSizing);
  const { annualHead, dressedKg, processingDays } = sizing;

  const view = useMemo(() => {
    const safeDays = Math.max(processingDays, 1);
    const headsPerDay = annualHead / safeDays;
    const peakWeekKg = (annualHead * dressedKg) / Math.max(safeDays / 5, 1);
    const configuredCapacity = points.reduce(
      (s, p) => s + (p.capacityBirdsPerDay || 0),
      0,
    );
    const ratio =
      configuredCapacity > 0 ? configuredCapacity / Math.max(headsPerDay, 1) : 0;
    const verdict =
      points.length === 0
        ? 'no-points'
        : configuredCapacity === 0
          ? 'no-capacity'
          : ratio >= 1
            ? 'ok'
            : ratio >= 0.6
              ? 'caution'
              : 'short';
    return { headsPerDay, peakWeekKg, configuredCapacity, ratio, verdict };
  }, [annualHead, dressedKg, processingDays, points]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Slaughter throughput</h3>
          <p className={css.cardHint}>
            Size processing stations against the annual head count and
            dressed-weight target. Capacity rolls up from Slaughter points
            placed on the map.
          </p>
        </div>
      </header>

      <div className={css.inputs}>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Annual head</span>
          <input
            className={css.inputControl}
            type="number"
            min={0}
            value={annualHead}
            onChange={(e) =>
              setSizing(projectId, { annualHead: Number(e.target.value) })
            }
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Dressed weight (kg/bird)</span>
          <input
            className={css.inputControl}
            type="number"
            min={0}
            step={0.1}
            value={dressedKg}
            onChange={(e) =>
              setSizing(projectId, { dressedKg: Number(e.target.value) })
            }
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Processing days / yr</span>
          <input
            className={css.inputControl}
            type="number"
            min={1}
            value={processingDays}
            onChange={(e) =>
              setSizing(projectId, { processingDays: Number(e.target.value) })
            }
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Slaughter points placed</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${points.length}`}
          />
        </label>
      </div>

      <div className={css.readout}>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Required throughput</div>
          <div className={css.readoutValue}>
            {Math.round(view.headsPerDay)}
            <span className={css.readoutSuffix}>birds/day</span>
          </div>
        </div>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Configured capacity</div>
          <div className={css.readoutValue}>
            {view.configuredCapacity}
            <span className={css.readoutSuffix}>birds/day</span>
          </div>
        </div>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Peak-week pack</div>
          <div className={css.readoutValue}>
            {Math.round(view.peakWeekKg)}
            <span className={css.readoutSuffix}>kg/wk</span>
          </div>
        </div>
      </div>

      <div
        className={`${css.verdict} ${
          view.verdict === 'ok'
            ? css.verdictOk
            : view.verdict === 'caution'
              ? css.verdictCaution
              : css.verdictBlocker
        }`}
      >
        {view.verdict === 'no-points' &&
          'Drop one or more Slaughter points on the map to begin sizing capacity.'}
        {view.verdict === 'no-capacity' &&
          'Slaughter points placed but capacities are 0 — edit each station and set birds/day.'}
        {view.verdict === 'ok' &&
          `Configured capacity covers required throughput (${view.ratio.toFixed(2)}× headroom).`}
        {view.verdict === 'caution' &&
          `Capacity is tight (${view.ratio.toFixed(2)}× of required). Consider a mobile or contract station for peak weeks.`}
        {view.verdict === 'short' &&
          `Capacity short of required (${view.ratio.toFixed(2)}× of need). Add stations or trim annual head until covered.`}
      </div>
    </section>
  );
}
