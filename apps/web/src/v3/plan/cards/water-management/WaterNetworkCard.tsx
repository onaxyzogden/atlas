/**
 * WaterNetworkCard — Plan Module 2 (Water), card 3/3.
 *
 * Renders the directed water graph as a simple SVG flow diagram and
 * surfaces validation flags for orphan overflow edges + cycles. Per
 * Permaculture Scholar verdict 2026-05-07: the architecture insight is
 * the graph itself — Roofs → Tanks → Swales → Ponds — and the steward&rsquo;s
 * job is to *see* whether their design routes overflow correctly down
 * the topographic slope.
 *
 * v1 lays out nodes by kind (catchments at the top, sinks at the bottom)
 * with overflow edges drawn as arrows. Edge thickness scales with annual
 * volume. A "Balance" panel surfaces total yield, total retained, total
 * off-site loss, and any node missing an overflow target.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useWaterSystemsStore,
  type WaterNode,
  type WaterNodeKind,
} from '../../../../store/waterSystemsStore.js';
import { useSiteData, getLayer } from '../../../../store/siteDataStore.js';
import {
  computeFlow,
  catchmentYieldM3,
  effectiveCapacityL,
  formatLitres,
} from './waterMath.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const ROW_BY_KIND: Record<WaterNodeKind, number> = {
  catchment: 0,
  storage: 1,
  swale: 2,
  sink: 3,
};

const ROW_LABEL: Record<number, string> = {
  0: 'Catchments',
  1: 'Storage',
  2: 'Swales',
  3: 'Sinks',
};

export default function WaterNetworkCard({ project }: Props) {
  const all = useWaterSystemsStore((s) => s.waterNodes);
  const siteData = useSiteData(project.id);
  const sitePrecipMm = useMemo(() => {
    if (!siteData) return null;
    const climate = getLayer(siteData, 'climate');
    const summary = climate?.summary as { annual_precip_mm?: number } | undefined;
    return summary?.annual_precip_mm ?? null;
  }, [siteData]);
  const [precipMm, setPrecipMm] = useState<number>(sitePrecipMm ?? 900);
  // Peak-event sizing — Permaculture Scholar follow-up 2026-05-07.
  // Default 100 mm / 24 hr is a rough 100-yr NOAA Atlas-14 figure for
  // mid-latitude North America; the steward should tune to their own
  // station's design storm.
  const [stormDepthMm, setStormDepthMm] = useState<number>(100);

  const nodes = useMemo(
    () => all.filter((n) => n.projectId === project.id),
    [all, project.id],
  );

  const flow = useMemo(() => computeFlow(nodes, precipMm), [nodes, precipMm]);

  // Layout: bucket nodes by row, distribute horizontally.
  const layout = useMemo(() => {
    const rows: WaterNode[][] = [[], [], [], []];
    for (const n of nodes) rows[ROW_BY_KIND[n.kind]]!.push(n);
    const W = 720;
    const H = 460;
    const positions: Record<string, { x: number; y: number }> = {};
    rows.forEach((row, ri) => {
      const y = 60 + ri * ((H - 120) / 3);
      const step = W / (row.length + 1);
      row.forEach((n, ci) => {
        positions[n.id] = { x: step * (ci + 1), y };
      });
    });
    return { rows, positions, W, H };
  }, [nodes]);

  const totalYieldM3 = useMemo(
    () =>
      nodes
        .filter((n) => n.kind === 'catchment')
        .reduce((s, n) => s + catchmentYieldM3(n, precipMm), 0),
    [nodes, precipMm],
  );
  const totalYieldL = totalYieldM3 * 1000;
  const totalRetainedL = useMemo(
    () => Object.values(flow.retainedL).reduce((s, v) => s + v, 0),
    [flow],
  );

  // Peak-event rollup. Catchment yield in m³ for an event of `stormDepthMm`
  // is exactly the same V = A × P × C formula used annually — just with the
  // storm depth as P. Total effective storage capacity is the sum of
  // capacity-bearing nodes (storage cisterns + swale L×W×D + sinks if
  // they declare capacity).
  const peakEvent = useMemo(() => {
    const peakInflowL = nodes
      .filter((n) => n.kind === 'catchment')
      .reduce((s, n) => s + catchmentYieldM3(n, stormDepthMm) * 1000, 0);
    const totalCapacityL = nodes
      .filter((n) => n.kind !== 'catchment')
      .reduce((s, n) => s + effectiveCapacityL(n), 0);
    const surplusL = peakInflowL - totalCapacityL;
    return {
      peakInflowL,
      totalCapacityL,
      surplusL,
      undersized: peakInflowL > 0 && surplusL > 0,
    };
  }, [nodes, stormDepthMm]);

  const orphans = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.kind !== 'sink' &&
          n.kind !== 'catchment' &&
          (n.overflowToNodeId === undefined || n.overflowToNodeId === null),
      ),
    [nodes],
  );
  const catchmentOrphans = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.kind === 'catchment' &&
          (n.overflowToNodeId === undefined || n.overflowToNodeId === null),
      ),
    [nodes],
  );

  // Maximum edge volume for thickness scaling
  const maxEdgeL = useMemo(() => {
    let m = 0;
    for (const v of Object.values(flow.overflowL)) m = Math.max(m, v);
    return m;
  }, [flow]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Water network &amp; balance</h1>
        <p className={styles.lede}>
          The graph reads top-down: catchments shed water into storage,
          which spills into swales, which feed sinks. Edge thickness scales
          with annual flow. Missing-overflow nodes are flagged below — the
          Scholar&rsquo;s rule is that <em>every</em> node must declare where
          excess goes.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Annual balance</h2>
        <label className={styles.field}>
          <span>Annual precip used (mm/yr)</span>
          <input
            type="number"
            min={0}
            step={10}
            value={precipMm}
            onChange={(e) => setPrecipMm(Number(e.target.value) || 0)}
          />
        </label>
        <div className={styles.statRow}>
          <span>Total yield (catchments)</span>
          <span>
            {totalYieldM3.toFixed(1)} m³ · {formatLitres(totalYieldL)}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Retained on-site (storage + swales + sinks)</span>
          <span>{formatLitres(totalRetainedL)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Lost off-site</span>
          <span style={{ color: 'rgba(220,140,120,0.95)' }}>
            {formatLitres(flow.offsiteLossL)}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Peak-event sizing</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0 8px' }}>
          Annual yield sets the steady ration; one design storm decides
          whether your spillways hold. Default 100 mm in 24 hr is a coarse
          100-yr / 24-hr figure (NOAA Atlas-14 mid-latitude NA) — tune to
          your own station. Mollison ch.7 + USDA NRCS TR-55.
        </p>
        <label className={styles.field}>
          <span>Design storm depth (mm / 24 hr)</span>
          <input
            type="number"
            min={0}
            step={5}
            value={stormDepthMm}
            onChange={(e) => setStormDepthMm(Number(e.target.value) || 0)}
          />
        </label>
        <div className={styles.statRow}>
          <span>Peak inflow from catchments</span>
          <span>{formatLitres(peakEvent.peakInflowL)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Total effective capacity</span>
          <span>{formatLitres(peakEvent.totalCapacityL)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Storm balance</span>
          <span
            style={{
              color: peakEvent.undersized
                ? 'rgba(220,140,120,0.95)'
                : 'rgba(160,200,140,0.95)',
            }}
          >
            {peakEvent.undersized
              ? `undersized — ${formatLitres(peakEvent.surplusL)} must spill to emergency overflow`
              : `${formatLitres(-peakEvent.surplusL)} headroom`}
          </span>
        </div>
        {peakEvent.undersized && (
          <p
            className={styles.empty}
            style={{ textAlign: 'left', padding: '6px 0 0', color: 'rgba(220,140,120,0.85)' }}
          >
            Storm peak exceeds total capacity. Either expand capacity (longer
            swales, deeper pond) or designate a non-erosive emergency
            spillway / vegetated overflow path. Yeomans warns rework here is
            an order of magnitude more costly than upfront sizing.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Validation</h2>
        {orphans.length === 0 && catchmentOrphans.length === 0 && flow.cycleNodes.length === 0 ? (
          <p className={styles.empty}>Every node has an overflow target. ✓</p>
        ) : (
          <ul className={styles.list}>
            {[...catchmentOrphans, ...orphans].map((n) => (
              <li key={n.id} className={styles.listRow}>
                <div>
                  <strong>{n.name}</strong>
                  <div className={styles.listMeta}>
                    {n.kind} · overflow not set — fix in the Storage tab
                  </div>
                </div>
              </li>
            ))}
            {flow.cycleNodes.map((id) => {
              const n = nodes.find((x) => x.id === id);
              return (
                <li key={`c-${id}`} className={styles.listRow}>
                  <div>
                    <strong>{n?.name ?? id}</strong>
                    <div className={styles.listMeta} style={{ color: 'rgba(220,140,120,0.95)' }}>
                      cycle / depth-limit reached — overflow loops back
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Flow graph</h2>
        {nodes.length === 0 ? (
          <p className={styles.empty}>No nodes yet — add catchments + storage to populate the graph.</p>
        ) : (
          <svg
            viewBox={`0 0 ${layout.W} ${layout.H}`}
            style={{
              width: '100%',
              height: 'auto',
              background: 'linear-gradient(to bottom, rgba(60,90,130,0.12), rgba(40,30,20,0.35))',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <defs>
              <marker
                id="water-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(120,180,210,0.85)" />
              </marker>
            </defs>

            {/* Row labels */}
            {[0, 1, 2, 3].map((ri) => (
              <text
                key={ri}
                x={8}
                y={60 + ri * ((layout.H - 120) / 3) - 16}
                fontSize={10}
                fill="rgba(232,220,200,0.5)"
              >
                {ROW_LABEL[ri]}
              </text>
            ))}

            {/* Edges */}
            {nodes.map((n) => {
              if (n.overflowToNodeId == null || n.overflowToNodeId === 'offsite') return null;
              const from = layout.positions[n.id];
              const to = layout.positions[n.overflowToNodeId];
              if (!from || !to) return null;
              const vol = flow.overflowL[n.id] ?? 0;
              const w = maxEdgeL > 0 ? 1 + (vol / maxEdgeL) * 6 : 1.5;
              return (
                <line
                  key={`e-${n.id}`}
                  x1={from.x}
                  y1={from.y + 18}
                  x2={to.x}
                  y2={to.y - 18}
                  stroke="rgba(120,180,210,0.7)"
                  strokeWidth={w}
                  markerEnd="url(#water-arrow)"
                />
              );
            })}

            {/* Off-site overflow stubs */}
            {nodes.map((n) => {
              if (n.overflowToNodeId !== 'offsite') return null;
              const from = layout.positions[n.id];
              if (!from) return null;
              return (
                <g key={`os-${n.id}`}>
                  <line
                    x1={from.x}
                    y1={from.y + 18}
                    x2={from.x}
                    y2={from.y + 50}
                    stroke="rgba(220,140,120,0.7)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    markerEnd="url(#water-arrow)"
                  />
                  <text
                    x={from.x + 6}
                    y={from.y + 50}
                    fontSize={9}
                    fill="rgba(220,140,120,0.85)"
                  >
                    off-site
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const p = layout.positions[n.id];
              if (!p) return null;
              const vol =
                n.kind === 'catchment'
                  ? catchmentYieldM3(n, precipMm) * 1000
                  : (flow.retainedL[n.id] ?? 0);
              const cap = effectiveCapacityL(n);
              const overFull = cap > 0 && (flow.inflowL[n.id] ?? 0) > cap;
              return (
                <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
                  <rect
                    x={-60}
                    y={-18}
                    width={120}
                    height={36}
                    rx={6}
                    fill={
                      n.kind === 'catchment'
                        ? 'rgba(140,180,120,0.25)'
                        : n.kind === 'storage'
                          ? 'rgba(120,180,210,0.25)'
                          : n.kind === 'swale'
                            ? 'rgba(180,150,80,0.25)'
                            : 'rgba(180,140,90,0.25)'
                    }
                    stroke={overFull ? 'rgba(220,140,120,0.95)' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={overFull ? 1.5 : 1}
                  />
                  <text
                    x={0}
                    y={-2}
                    fontSize={11}
                    fill="rgba(232,220,200,0.95)"
                    textAnchor="middle"
                  >
                    {n.name.length > 18 ? n.name.slice(0, 17) + '…' : n.name}
                  </text>
                  <text
                    x={0}
                    y={12}
                    fontSize={9}
                    fill="rgba(232,220,200,0.65)"
                    textAnchor="middle"
                  >
                    {formatLitres(vol)}/yr
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </section>
    </div>
  );
}
