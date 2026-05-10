/**
 * MarketDistributionCard — Plan Module 7 diagnostic.
 *
 * Sums `marketNodes[].weeklyDemandKg` and compares to the steady-state
 * weekly product throughput from the slaughter line. Also rolls up the
 * mix of node kinds (farmstand / wholesale / restaurant / csa-dropoff)
 * so the steward can see whether they're over-concentrated in one
 * channel — Newman's "agribusiness interface" warning.
 */

import { useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import {
  useAgribusinessStore,
  type MarketKind,
} from '../../store/agribusinessStore.js';
import css from './AgribusinessCard.module.css';

interface Props {
  projectId: string;
}

const KIND_LABEL: Record<MarketKind, string> = {
  farmstand: 'Farmstand',
  wholesale: 'Wholesale',
  restaurant: 'Restaurant',
  'csa-dropoff': 'CSA drop-off',
};

export default function MarketDistributionCard({ projectId }: Props) {
  const allNodes = useAgribusinessStore((s) => s.marketNodes);
  const allSlaughter = useAgribusinessStore((s) => s.slaughterPoints);
  const nodes = useMemo(
    () => allNodes.filter((n) => n.projectId === projectId),
    [allNodes, projectId],
  );
  const slaughterPoints = useMemo(
    () => allSlaughter.filter((p) => p.projectId === projectId),
    [allSlaughter, projectId],
  );

  // Steady-state weekly product throughput — defaults to the same
  // 720 kg/wk peak from the throughput card. Independent input.
  const [weeklyProductKg, setWeeklyProductKg] = useState(720);
  // Great-circle distance × detour multiplier ÷ avg speed → drive minutes.
  // Defaults: 1.3 covers typical rural road meander vs. straight line;
  // 60 km/h is the steady-state avg between farm-stand drops and town runs.
  const [detourMultiplier, setDetourMultiplier] = useState(1.3);
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(60);

  const view = useMemo(() => {
    const totalDemand = nodes.reduce((s, n) => s + (n.weeklyDemandKg || 0), 0);
    const byKind: Record<MarketKind, number> = {
      farmstand: 0,
      wholesale: 0,
      restaurant: 0,
      'csa-dropoff': 0,
    };
    for (const n of nodes) {
      byKind[n.kind] += n.weeklyDemandKg || 0;
    }
    const concentration =
      totalDemand > 0
        ? Math.max(...Object.values(byKind)) / totalDemand
        : 0;
    const coverage =
      weeklyProductKg > 0 ? (totalDemand / weeklyProductKg) * 100 : 0;
    const verdict =
      nodes.length === 0
        ? 'no-nodes'
        : totalDemand === 0
          ? 'no-demand'
          : coverage < 80
            ? 'undersold'
            : coverage > 120
              ? 'oversold'
              : concentration > 0.7
                ? 'concentrated'
                : 'ok';

    // Drive-time rollup. Hub = arithmetic centroid of slaughter points
    // (great-circle distance is symmetric so a centroid is a good
    // single-hop proxy for "the line").
    let hub: GeoJSON.Point | null = null;
    if (slaughterPoints.length > 0) {
      let lon = 0;
      let lat = 0;
      for (const p of slaughterPoints) {
        const [lng, lt] = p.geometry.coordinates as [number, number];
        lon += lng;
        lat += lt;
      }
      hub = {
        type: 'Point',
        coordinates: [lon / slaughterPoints.length, lat / slaughterPoints.length],
      };
    }
    const safeSpeed = Math.max(avgSpeedKmh, 1);
    const safeMult = Math.max(detourMultiplier, 1);
    const driveTimes = hub
      ? nodes
          .map((n) => {
            const km = turf.distance(hub!, n.geometry, { units: 'kilometers' });
            const roadKm = km * safeMult;
            const minutes = (roadKm / safeSpeed) * 60;
            return { id: n.id, name: n.name, kind: n.kind, km: roadKm, minutes };
          })
          .sort((a, b) => a.minutes - b.minutes)
      : [];
    const avgMinutes =
      driveTimes.length > 0
        ? driveTimes.reduce((s, r) => s + r.minutes, 0) / driveTimes.length
        : 0;

    return {
      totalDemand,
      byKind,
      concentration,
      coverage,
      verdict,
      driveTimes,
      avgMinutes,
      hasHub: hub !== null,
    };
  }, [nodes, slaughterPoints, weeklyProductKg, detourMultiplier, avgSpeedKmh]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Market distribution</h3>
          <p className={css.cardHint}>
            Match weekly buyer demand against the slaughter line&rsquo;s
            steady-state throughput. Concentration above 70 % in one channel
            (e.g. a single wholesaler) is the most common single point of
            failure in pastured-broiler operations.
          </p>
        </div>
      </header>

      <div className={css.inputs}>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Weekly product (kg)</span>
          <input
            className={css.inputControl}
            type="number"
            min={0}
            value={weeklyProductKg}
            onChange={(e) => setWeeklyProductKg(Number(e.target.value))}
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Market nodes placed</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${nodes.length}`}
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Total demand</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${view.totalDemand} kg/wk`}
          />
        </label>
        <label className={css.inputField}>
          <span className={css.inputLabel}>Largest channel share</span>
          <input
            className={css.inputControl}
            type="text"
            readOnly
            value={`${Math.round(view.concentration * 100)} %`}
          />
        </label>
      </div>

      <div className={css.readout}>
        {(Object.keys(KIND_LABEL) as MarketKind[]).map((k) => (
          <div key={k} className={css.readoutCell}>
            <div className={css.readoutLabel}>{KIND_LABEL[k]}</div>
            <div className={css.readoutValue}>
              {view.byKind[k]}
              <span className={css.readoutSuffix}>kg/wk</span>
            </div>
          </div>
        ))}
      </div>

      <div className={css.driveBlock}>
        <div className={css.driveHead}>
          <div className={css.driveTitle}>Drive-time rollup</div>
          <div className={css.driveSubtitle}>
            Great-circle distance from the slaughter-point centroid × detour
            multiplier ÷ avg speed.
          </div>
        </div>
        <div className={css.inputs}>
          <label className={css.inputField}>
            <span className={css.inputLabel}>Detour multiplier</span>
            <input
              className={css.inputControl}
              type="number"
              min={1}
              step={0.1}
              value={detourMultiplier}
              onChange={(e) => setDetourMultiplier(Number(e.target.value))}
            />
          </label>
          <label className={css.inputField}>
            <span className={css.inputLabel}>Avg speed (km/h)</span>
            <input
              className={css.inputControl}
              type="number"
              min={1}
              value={avgSpeedKmh}
              onChange={(e) => setAvgSpeedKmh(Number(e.target.value))}
            />
          </label>
          <label className={css.inputField}>
            <span className={css.inputLabel}>Avg drive time</span>
            <input
              className={css.inputControl}
              type="text"
              readOnly
              value={
                view.hasHub && view.driveTimes.length > 0
                  ? `${view.avgMinutes.toFixed(0)} min`
                  : '—'
              }
            />
          </label>
          <label className={css.inputField}>
            <span className={css.inputLabel}>Slaughter hub</span>
            <input
              className={css.inputControl}
              type="text"
              readOnly
              value={
                view.hasHub
                  ? `Centroid of ${slaughterPoints.length} point${
                      slaughterPoints.length === 1 ? '' : 's'
                    }`
                  : 'Place a Slaughter point to compute'
              }
            />
          </label>
        </div>
        {view.hasHub && view.driveTimes.length > 0 ? (
          <div className={css.driveList}>
            {view.driveTimes.map((row) => (
              <div key={row.id} className={css.driveRow}>
                <div className={css.driveName}>
                  {row.name || '(unnamed node)'}
                </div>
                <div className={css.driveKind}>{KIND_LABEL[row.kind]}</div>
                <div className={css.driveKm}>{row.km.toFixed(1)} km</div>
                <div className={css.driveMin}>{row.minutes.toFixed(0)} min</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.empty}>
            {view.hasHub
              ? 'Place one or more Market nodes to populate drive times.'
              : 'Place a Slaughter point to compute drive times from the line to each market node.'}
          </div>
        )}
      </div>

      <div
        className={`${css.verdict} ${
          view.verdict === 'ok'
            ? css.verdictOk
            : view.verdict === 'concentrated' || view.verdict === 'oversold'
              ? css.verdictCaution
              : css.verdictBlocker
        }`}
      >
        {view.verdict === 'no-nodes' &&
          'Drop one or more Market nodes on the map to begin sizing demand.'}
        {view.verdict === 'no-demand' &&
          'Market nodes placed but weekly demand is 0 — edit each node and set kg/wk.'}
        {view.verdict === 'undersold' &&
          `Demand covers only ${Math.round(view.coverage)} % of weekly product. Add buyers or scale back the line.`}
        {view.verdict === 'oversold' &&
          `Demand is ${Math.round(view.coverage)} % of weekly product — you can't fill every order from this line.`}
        {view.verdict === 'concentrated' &&
          `One channel takes ${Math.round(view.concentration * 100)} % of demand. Diversify before that buyer becomes the whole business.`}
        {view.verdict === 'ok' &&
          `Demand balanced (${Math.round(view.coverage)} % coverage, top channel ${Math.round(view.concentration * 100)} %).`}
      </div>
    </section>
  );
}
