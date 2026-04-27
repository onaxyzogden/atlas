/**
 * §22 RevenueRampProjectionCard — projects the steward's per-stream
 * mature-year gross (from EnterpriseRevenueMixCard) over a 5-year
 * ramp curve. Different enterprises mature at different speeds:
 * orchards lag (no fruit until canopy fills), livestock and retreats
 * ramp fast (months, not years), education and agritourism need a
 * cohort/marketing build period.
 *
 * Inputs:
 *   - Per-stream "mature gross" from the same five enterprise
 *     placeholders (orchard / livestock / retreat / education /
 *     agritourism). Reads the same localStorage key the mix card
 *     writes (`ogden-enterprise-revenue-mix-<projectId>`) — when
 *     unset, falls back to entity-derived defaults so the chart still
 *     renders.
 *   - Hard-coded ramp templates (5-year, 0..1):
 *       orchard      [0.10, 0.30, 0.60, 0.90, 1.00]
 *       livestock    [0.40, 0.80, 1.00, 1.00, 1.00]
 *       retreat      [0.50, 0.80, 1.00, 1.00, 1.00]
 *       education    [0.30, 0.60, 0.90, 1.00, 1.00]
 *       agritourism  [0.50, 1.00, 1.00, 1.00, 1.00]
 *
 * Output:
 *   - Stacked area chart (inline SVG) of per-stream gross by year,
 *     y0..y4 (Year 1..5)
 *   - Per-year totals row beneath the chart
 *   - Y1 vs Y5 callout (catch-up gap)
 *
 * Pure presentation — no engine writes, no shared math, no new
 * entities. Closes manifest §22
 * `enterprise-revenue-templates-ramp-timeline` (P3) planned -> done.
 */

import { useEffect, useMemo, useState } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import css from './RevenueRampProjectionCard.module.css';

interface Props {
  projectId: string;
}

type StreamId = 'orchard' | 'livestock' | 'retreat' | 'education' | 'agritourism';

const MIX_STORAGE_PREFIX = 'ogden-enterprise-revenue-mix-';

const STREAM_ORDER: StreamId[] = [
  'orchard',
  'livestock',
  'retreat',
  'education',
  'agritourism',
];

const STREAM_LABEL: Record<StreamId, string> = {
  orchard: 'Orchard / food forest',
  livestock: 'Livestock',
  retreat: 'Retreat / lodging',
  education: 'Education',
  agritourism: 'Agritourism',
};

const RAMP: Record<StreamId, number[]> = {
  orchard: [0.10, 0.30, 0.60, 0.90, 1.00],
  livestock: [0.40, 0.80, 1.00, 1.00, 1.00],
  retreat: [0.50, 0.80, 1.00, 1.00, 1.00],
  education: [0.30, 0.60, 0.90, 1.00, 1.00],
  agritourism: [0.50, 1.00, 1.00, 1.00, 1.00],
};

const RETREAT_TYPES = new Set([
  'cabin',
  'yurt',
  'tent_glamping',
  'earthship',
  'pavilion',
]);

const EDUCATION_TYPES = new Set(['classroom']);

function loadOverrides(projectId: string): Partial<Record<StreamId, number>> {
  try {
    const raw = localStorage.getItem(MIX_STORAGE_PREFIX + projectId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<Record<StreamId, number>>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export default function RevenueRampProjectionCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === projectId),
    [allStructures, projectId],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const crops = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );

  // Re-read overrides whenever the project id changes. The mix card
  // writes synchronously to localStorage but we don't have a pub/sub
  // bridge today; this card refreshes when remounted.
  const [overrides, setOverrides] = useState<Partial<Record<StreamId, number>>>(
    () => loadOverrides(projectId),
  );

  useEffect(() => {
    setOverrides(loadOverrides(projectId));
    // Listen for storage events so cross-tab edits propagate.
    const handler = (e: StorageEvent): void => {
      if (e.key === MIX_STORAGE_PREFIX + projectId) {
        setOverrides(loadOverrides(projectId));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [projectId]);

  const matureByStream = useMemo<Record<StreamId, number>>(() => {
    const orchardCount = crops.filter(
      (c) => c.type === 'orchard' || c.type === 'food_forest',
    ).length;
    const paddockCount = paddocks.length;
    const retreatCount = structures.filter((s) => RETREAT_TYPES.has(s.type)).length;
    const eduCount = structures.filter((s) => EDUCATION_TYPES.has(s.type)).length;
    const hasHospitalitySurface = retreatCount > 0;

    const defaults: Record<StreamId, number> = {
      orchard: orchardCount * 20_000,
      livestock: paddockCount * 5_000,
      retreat: retreatCount * 25_000,
      education: eduCount * 15_000,
      agritourism: hasHospitalitySurface ? 10_000 : 0,
    };

    return {
      orchard: overrides.orchard ?? defaults.orchard,
      livestock: overrides.livestock ?? defaults.livestock,
      retreat: overrides.retreat ?? defaults.retreat,
      education: overrides.education ?? defaults.education,
      agritourism: overrides.agritourism ?? defaults.agritourism,
    };
  }, [crops, paddocks, structures, overrides]);

  // Per-year, per-stream projected gross.
  const projection = useMemo(() => {
    const years: { year: number; perStream: Record<StreamId, number>; total: number }[] = [];
    for (let y = 0; y < 5; y++) {
      const perStream = {} as Record<StreamId, number>;
      let total = 0;
      for (const id of STREAM_ORDER) {
        const v = Math.round((matureByStream[id] ?? 0) * (RAMP[id][y] ?? 1));
        perStream[id] = v;
        total += v;
      }
      years.push({ year: y + 1, perStream, total });
    }
    return years;
  }, [matureByStream]);

  const matureTotal = projection[4]?.total ?? 0;
  const y1Total = projection[0]?.total ?? 0;
  const catchUpGap = matureTotal - y1Total;
  const y1Pct = matureTotal === 0 ? 0 : Math.round((y1Total / matureTotal) * 100);

  // Chart geometry — 5 years across, value axis up.
  const chartW = 320;
  const chartH = 140;
  const padTop = 8;
  const padBottom = 22;
  const padL = 8;
  const padR = 8;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padTop - padBottom;
  const colW = innerW / 5;

  const peakTotal = Math.max(matureTotal, 1);

  const yPos = (v: number): number => padTop + (1 - v / peakTotal) * innerH;
  const xPos = (i: number): number => padL + i * colW + colW / 2;

  // Build stacked area polygons — one per stream, bottom-up.
  type Layer = { id: StreamId; topPts: { x: number; y: number }[]; basePts: { x: number; y: number }[] };
  const layers: Layer[] = [];
  const runningBase = new Array(5).fill(0) as number[];
  for (const id of STREAM_ORDER) {
    const topPts: { x: number; y: number }[] = [];
    const basePts: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const baseV = runningBase[i] ?? 0;
      const segV = projection[i]?.perStream[id] ?? 0;
      const topV = baseV + segV;
      topPts.push({ x: xPos(i), y: yPos(topV) });
      basePts.push({ x: xPos(i), y: yPos(baseV) });
      runningBase[i] = topV;
    }
    layers.push({ id, topPts, basePts });
  }

  return (
    <section className={css.card} aria-label="Revenue ramp projection">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Revenue ramp &mdash; Year 1 to Year 5</h3>
          <p className={css.cardHint}>
            Projects each enterprise&rsquo;s mature gross (from the
            mix card above) along a hard-coded ramp curve. Orchards
            lag because trees take years to crop; livestock and
            retreat ramp fast; education / agritourism need a build
            period. Use this to anticipate the early-year gap
            between costs and revenue.
          </p>
        </div>
        <span className={css.heuristicBadge}>UI PRESET</span>
      </header>

      <div className={css.summaryRow}>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.tone_muted}`}>
            ${formatThousands(y1Total)}
          </div>
          <div className={css.summaryLabel}>Year 1 gross</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.tone_good}`}>
            ${formatThousands(matureTotal)}
          </div>
          <div className={css.summaryLabel}>Year 5 gross</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.tone_fair}`}>
            ${formatThousands(catchUpGap)}
          </div>
          <div className={css.summaryLabel}>Catch-up gap</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={`${css.summaryValue} ${css.tone_muted}`}>
            {y1Pct}<span className={css.summaryUnit}>%</span>
          </div>
          <div className={css.summaryLabel}>Y1 of mature</div>
        </div>
      </div>

      {matureTotal === 0 ? (
        <p className={css.empty}>
          No enterprise gross set. Enter values in the Enterprise
          Revenue Mix card above to see the projection.
        </p>
      ) : (
        <>
          <div className={css.chartWrap}>
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className={css.chartSvg}
              role="img"
              aria-label="Stacked area chart of revenue by stream over 5 years"
              preserveAspectRatio="none"
            >
              {/* Grid baseline */}
              <line
                x1={padL}
                y1={padTop + innerH}
                x2={chartW - padR}
                y2={padTop + innerH}
                stroke="rgba(232, 220, 200, 0.15)"
                strokeWidth="1"
              />

              {/* Stacked layers */}
              {layers.map((layer) => {
                const points = [
                  ...layer.topPts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`),
                  ...layer.basePts.slice().reverse().map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`),
                ].join(' ');
                return (
                  <polygon
                    key={layer.id}
                    points={points}
                    className={css[`area_${layer.id}`]}
                  />
                );
              })}

              {/* Year labels */}
              {projection.map((y, i) => (
                <text
                  key={y.year}
                  x={xPos(i)}
                  y={chartH - 6}
                  textAnchor="middle"
                  className={css.chartXLabel}
                >
                  Y{y.year}
                </text>
              ))}
            </svg>
          </div>

          <div className={css.legendRow}>
            {STREAM_ORDER.map((id) => (
              <span key={id} className={css.legendItem}>
                <span
                  className={`${css.legendSwatch} ${css[`seg_${id}`]}`}
                  aria-hidden="true"
                />
                <span className={css.legendLabel}>{STREAM_LABEL[id]}</span>
              </span>
            ))}
          </div>

          <table className={css.yearTable}>
            <thead>
              <tr>
                <th className={css.tableHead}>Stream</th>
                {projection.map((y) => (
                  <th key={y.year} className={css.tableHead}>Y{y.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STREAM_ORDER.map((id) => {
                const mature = matureByStream[id] ?? 0;
                if (mature === 0) return null;
                return (
                  <tr key={id}>
                    <td className={css.tableLabel}>
                      <span
                        className={`${css.legendSwatch} ${css[`seg_${id}`]}`}
                        aria-hidden="true"
                      />
                      {STREAM_LABEL[id]}
                    </td>
                    {projection.map((y) => (
                      <td key={y.year} className={css.tableCell}>
                        ${formatThousands(y.perStream[id] ?? 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className={css.totalRow}>
                <td className={css.tableLabel}>Total</td>
                {projection.map((y) => (
                  <td key={y.year} className={`${css.tableCell} ${css.totalCell}`}>
                    ${formatThousands(y.total)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}

      <p className={css.footnote}>
        <em>Ramp templates:</em> orchard 10/30/60/90/100; livestock
        40/80/100/100/100; retreat 50/80/100/100/100; education
        30/60/90/100/100; agritourism 50/100/100/100/100. Templates
        are presets &mdash; not crop-specific phenology, not market
        traction modelling. Steward-edited mature gross flows through
        these curves unchanged.
      </p>
    </section>
  );
}

function formatThousands(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}k`;
  }
  return String(n);
}
