/**
 * ColdChainCoverageCard — Plan Module 7 diagnostic.
 *
 * Sums `coldChainUnits[].capacityM3` for this project against an
 * estimated peak-week pack volume (kg → m³ via a steward-tunable
 * pack density). Newman frames cold-chain as the most common
 * silent-failure point in pastured-broiler operations: if there's
 * no freezer headroom, the slaughter line backs up.
 */

import { useMemo } from 'react';
import {
  useAgribusinessStore,
  DEFAULT_SIZING,
  computePeakWeekKg,
  computeColdChainVerdict,
} from '../../store/agribusinessStore.js';
import css from './AgribusinessCard.module.css';

interface Props {
  projectId: string;
}

export default function ColdChainCoverageCard({ projectId }: Props) {
  const allUnits = useAgribusinessStore((s) => s.coldChainUnits);
  const units = useMemo(
    () => allUnits.filter((u) => u.projectId === projectId),
    [allUnits, projectId],
  );

  // Sizing inputs are shared with SlaughterThroughputCard via the
  // store — bumping annual head in the throughput card now flows
  // through here automatically. Pack density stays adjustable for
  // carton-format tuning (frozen-bird carton averages ~250 kg/m³).
  const sizing =
    useAgribusinessStore((s) => s.sizingByProject[projectId]) ?? DEFAULT_SIZING;
  const setSizing = useAgribusinessStore((s) => s.setSizing);
  const { packDensityKgPerM3 } = sizing;

  const view = useMemo(() => {
    const peakWeekKg = computePeakWeekKg(sizing);
    const totalCapacityM3 = units.reduce((s, u) => s + (u.capacityM3 || 0), 0);
    const requiredM3 = peakWeekKg / Math.max(packDensityKgPerM3, 1);
    const coveragePct =
      requiredM3 > 0 ? Math.min(999, (totalCapacityM3 / requiredM3) * 100) : 0;
    const verdict = computeColdChainVerdict({
      unitCount: units.length,
      totalCapacityM3,
      requiredM3,
    });
    return { peakWeekKg, totalCapacityM3, requiredM3, coveragePct, verdict };
  }, [units, sizing, packDensityKgPerM3]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Cold-chain coverage</h3>
          <p className={css.cardHint}>
            Compare total freezer / chiller capacity against the peak-week
            pack volume. Aim for ≥ 120 % so an unplanned market delay
            doesn&rsquo;t back up the slaughter line.
          </p>
        </div>
      </header>

      <div className={css.inputs}>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Peak-week pack (kg)</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${Math.round(view.peakWeekKg)} (from sizing)`}
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Pack density (kg/m³)</span>
          <input
            className={css.inputControl}
            type="number"
            min={1}
            value={packDensityKgPerM3}
            onChange={(e) =>
              setSizing(projectId, {
                packDensityKgPerM3: Number(e.target.value),
              })
            }
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Cold-chain units placed</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${units.length}`}
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Required volume</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${view.requiredM3.toFixed(2)} m³`}
          />
        </label>
      </div>

      <div className={css.readout}>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Total capacity</div>
          <div className={css.readoutValue}>
            {view.totalCapacityM3.toFixed(1)}
            <span className={css.readoutSuffix}>m³</span>
          </div>
        </div>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Required</div>
          <div className={css.readoutValue}>
            {view.requiredM3.toFixed(2)}
            <span className={css.readoutSuffix}>m³</span>
          </div>
        </div>
        <div className={css.readoutCell}>
          <div className={css.readoutLabel}>Coverage</div>
          <div className={css.readoutValue}>
            {Math.round(view.coveragePct)}
            <span className={css.readoutSuffix}>%</span>
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
        {view.verdict === 'no-units' &&
          'Drop one or more Cold-chain units on the map to begin sizing capacity.'}
        {view.verdict === 'no-capacity' &&
          'Cold-chain units placed but capacities are 0 — edit each unit and set m³.'}
        {view.verdict === 'ok' &&
          'Cold-chain coverage healthy — peak-week pack volume fits with headroom for a market delay.'}
        {view.verdict === 'caution' &&
          'Cold-chain coverage tight (80-119 %). Acceptable for a steady cadence but no buffer if a market dropoff slips.'}
        {view.verdict === 'short' &&
          'Cold-chain coverage short — add a freezer or reefer, or reduce peak-week pack volume.'}
      </div>
    </section>
  );
}
