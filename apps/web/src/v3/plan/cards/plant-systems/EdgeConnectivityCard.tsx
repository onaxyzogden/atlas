/**
 * EdgeConnectivityCard — Plan Module 4 (Plant Systems), readout.
 *
 * Edge & Connectivity Evaluator (Rec #4 from the permaculture-alignment
 * backlog, 2026-04-28 Permaculture Scholar review). Pure geometry on the
 * polygons already on the canvas — no new data, no new dependency.
 *
 * **Scholar's framing:** "Homogenized layers lack the edge necessary to
 * create niches for diverse species and predator/prey relationships that
 * keep pests in check." (Mollison; Holmgren P11 — Use edges and value the
 * marginal.)
 *
 * **Metric.** Polsby-Popper compactness (PP = 4π·A / P²) on each
 * planting-class polygon. Dimensionless 0..1: 1.0 = perfect circle
 * (maximally homogenized), values near 0 = highly indented / edge-rich.
 * Standard compactness metric in landscape ecology; scale-invariant so a
 * 1-ha and a 4-ha square score identically.
 *
 * **Tiers.**
 *   - `excellent`   PP < 0.4   green   edge-rich; supports niche diversity
 *   - `adequate`    PP 0.4–0.7 neutral OK; modest edge
 *   - `homogenized` PP ≥ 0.7   red     prompt: carve out edges
 *
 * Only polygons with area ≥ 2 000 m² (~0.5 acre) are scored — below that
 * the "diversity penalty" framing doesn't apply (a small herb spiral
 * *should* be compact). Acceptance criterion from the backlog
 * ("2-hectare uniform rectangular orchard yields Diversity below 0.5"):
 * a 2-ha rectangle has PP ≈ 0.79–0.99, comfortably above the 0.7 cut.
 *
 * **v1 scope.** Textual prompt only. **v2 (Rec #4 deferred queue, 2026-05-25)**
 * adds the shape-variant generators (peninsula / scalloped / keyhole) via
 * `../../edge/edgeVariantMath.ts`: each homogenized row can expand "Suggest edge
 * variants" and apply one directly through `landDesignStore.update`. The live
 * ghost preview overlay is deferred to a later pass — apply is direct, and the
 * steward can re-edit the polygon on the map afterward.
 *
 * **Why landDesignStore.** Planting-class kinds (orchard, silvopasture,
 * pasture-mix, paddock) live in `landDesignStore` as `DesignElement`
 * polygons after the BE V2 unification. Guilds (polycultureStore) are
 * points — out of scope for an edge-to-area metric. Closes Rec #4 v1.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import {
  generateVariants,
  polsbyPopper,
  polygonAreaM2,
  polygonPerimeterM,
  type EdgeVariant,
} from '../../edge/edgeVariantMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

/** Polygon kinds counted as a "planting zone" for the edge audit. */
const PLANTING_KINDS = new Set<string>([
  'orchard',
  'silvopasture',
  'pasture-mix',
  'paddock',
]);

const KIND_LABEL: Record<string, string> = {
  orchard: 'Orchard',
  silvopasture: 'Silvopasture',
  'pasture-mix': 'Pasture mix',
  paddock: 'Paddock',
};

/** Minimum area (m²) below which compactness isn't a useful signal. */
const MIN_SCORED_AREA_M2 = 2_000;

/** PP tier thresholds. Tunable as a single line if smoke-test demands. */
const PP_HOMOGENIZED_CUT = 0.7;
const PP_EXCELLENT_CUT = 0.4;

type Tier = 'excellent' | 'adequate' | 'homogenized';

interface ZoneRow {
  id: string;
  kind: string;
  label: string;
  areaM2: number;
  perimeterM: number;
  pp: number;
  tier: Tier;
  /** Source polygon, retained so v2 can generate edge variants on demand. */
  geometry: GeoJSON.Polygon;
}

/**
 * Compactness helpers (polygonAreaM2 / polygonPerimeterM / polsbyPopper) now
 * live in `../../edge/edgeVariantMath.ts` so the v1 audit and the v2 variant
 * generators share one source of truth — they are imported above.
 */

function tierFor(pp: number): Tier {
  if (pp >= PP_HOMOGENIZED_CUT) return 'homogenized';
  if (pp < PP_EXCELLENT_CUT) return 'excellent';
  return 'adequate';
}

const TIER_LABEL: Record<Tier, string> = {
  excellent: 'EDGE-RICH',
  adequate: 'ADEQUATE',
  homogenized: 'HOMOGENIZED',
};

const TIER_PILL_CLASS: Record<Tier, string> = {
  excellent: styles.pillMet ?? '',
  adequate: styles.pillIncon ?? '',
  homogenized: styles.pillUnmet ?? '',
};

function formatArea(m2: number): string {
  if (m2 < 10_000) return `${Math.round(m2).toLocaleString()} m²`;
  const ha = m2 / 10_000;
  return `${ha.toFixed(ha >= 10 ? 1 : 2)} ha`;
}

function describeZone(el: DesignElement): ZoneRow | null {
  if (el.geometry.type !== 'Polygon') return null;
  const areaM2 = polygonAreaM2(el.geometry);
  if (areaM2 < MIN_SCORED_AREA_M2) return null;
  const perimeterM = polygonPerimeterM(el.geometry);
  const pp = polsbyPopper(areaM2, perimeterM);
  const tier = tierFor(pp);
  return {
    id: el.id,
    kind: el.kind,
    label: el.label || KIND_LABEL[el.kind] || el.kind,
    areaM2,
    perimeterM,
    pp,
    tier,
    geometry: el.geometry,
  };
}

function formatPct(frac: number): string {
  return `${frac >= 0 ? '+' : ''}${Math.round(frac * 100)}%`;
}

export default function EdgeConnectivityCard({ project }: Props) {
  const byProject = useLandDesignStore((s) => s.byProject);
  const updateElement = useLandDesignStore((s) => s.update);

  // Which zone row currently has its edge-variant suggestions expanded.
  const [openVariantsFor, setOpenVariantsFor] = useState<string | null>(null);

  const rows = useMemo<ZoneRow[]>(() => {
    const list = byProject[project.id] ?? [];
    const out: ZoneRow[] = [];
    for (const el of list) {
      if (!PLANTING_KINDS.has(el.kind)) continue;
      const row = describeZone(el);
      if (row) out.push(row);
    }
    // Worst (most homogenized) first so the steward's eye lands on the
    // flagged rows; ties broken by larger area first.
    out.sort((a, b) => {
      if (a.pp !== b.pp) return b.pp - a.pp;
      return b.areaM2 - a.areaM2;
    });
    return out;
  }, [byProject, project.id]);

  const tierCounts = useMemo(() => {
    const counts = { excellent: 0, adequate: 0, homogenized: 0 } as Record<
      Tier,
      number
    >;
    for (const r of rows) counts[r.tier]++;
    return counts;
  }, [rows]);

  const scoredCount = rows.length;
  const flaggedCount = tierCounts.homogenized;
  const diversityPenalty =
    scoredCount === 0 ? 0 : flaggedCount / scoredCount;

  // Edge variants for the currently-expanded row, computed on demand.
  const openVariants = useMemo<EdgeVariant[]>(() => {
    if (!openVariantsFor) return [];
    const row = rows.find((r) => r.id === openVariantsFor);
    if (!row) return [];
    return generateVariants(row.geometry);
  }, [openVariantsFor, rows]);

  function toggleVariants(rowId: string) {
    setOpenVariantsFor((cur) => (cur === rowId ? null : rowId));
  }

  function applyVariant(rowId: string, variant: EdgeVariant) {
    updateElement(project.id, rowId, { geometry: variant.geometry });
    setOpenVariantsFor(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Edge &amp; connectivity</h1>
        <p className={styles.lede}>
          Per-zone compactness audit on drawn planting and grazing
          polygons (orchard, silvopasture, pasture mix, paddock). Uses
          the Polsby-Popper index (4π·area ÷ perimeter²) — 1.0 means
          perfectly circular, lower means edge-rich. Homogenized shapes
          flagged with a textual prompt: carve out edges, peninsulas,
          or keyhole borders to create niches for diverse companion
          plantings (Holmgren P11 — Use edges and value the marginal).
        </p>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project rollup</h2>
        <div className={styles.statRow}>
          <span>Scored planting zones</span>
          <span>{scoredCount}</span>
        </div>
        <div className={styles.statRow}>
          <span>Flagged as homogenized</span>
          <span>
            {flaggedCount}
            {scoredCount > 0 && (
              <>
                {' · '}
                <span
                  className={`${styles.pill} ${
                    flaggedCount > 0
                      ? (styles.pillUnmet ?? '')
                      : (styles.pillMet ?? '')
                  }`}
                >
                  Diversity {flaggedCount > 0 ? '−' : ''}
                  {(diversityPenalty).toFixed(2)}
                </span>
              </>
            )}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Edge-rich · Adequate · Homogenized</span>
          <span>
            {tierCounts.excellent} · {tierCounts.adequate} ·{' '}
            {tierCounts.homogenized}
          </span>
        </div>
      </div>

      {scoredCount === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No planting polygons drawn yet (orchard, silvopasture, pasture
            mix, or paddock) larger than {MIN_SCORED_AREA_M2.toLocaleString()}{' '}
            m². Draw a planting zone from the Plan tool rail (Grazing
            category) and this audit will activate.
          </p>
        </div>
      )}

      {scoredCount > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Per-zone audit</h2>
          <ul className={styles.list}>
            {rows.map((r) => (
              <li key={r.id} className={styles.listRow}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{r.label}</strong>
                    <span className={styles.listMeta}>
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </span>
                    <span
                      className={`${styles.pill} ${TIER_PILL_CLASS[r.tier]}`}
                    >
                      {TIER_LABEL[r.tier]}
                    </span>
                  </div>
                  <div className={styles.listMeta}>
                    {formatArea(r.areaM2)} · perimeter{' '}
                    {Math.round(r.perimeterM).toLocaleString()} m · PP{' '}
                    {r.pp.toFixed(2)}
                  </div>
                  {r.tier === 'homogenized' && (
                    <>
                      <div className={styles.hint}>
                        Carve out edges, peninsulas, or marginal borders for
                        companion plants. A scalloped border or keyhole
                        carve-out increases edge length without reducing
                        total area — try a 5–10% perimeter perturbation
                        along the longest straight run.
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          className={styles.btn}
                          onClick={() => toggleVariants(r.id)}
                        >
                          {openVariantsFor === r.id
                            ? 'Hide edge variants'
                            : 'Suggest edge variants'}
                        </button>
                      </div>
                      {openVariantsFor === r.id && (
                        <ul
                          className={styles.list}
                          style={{ marginTop: 6, gap: 6 }}
                        >
                          {openVariants.length === 0 && (
                            <li className={styles.listMeta}>
                              No variant could be generated for this shape.
                            </li>
                          )}
                          {openVariants.map((v) => (
                            <li
                              key={v.id}
                              className={styles.listRow}
                              style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <strong>{v.label}</strong>
                                <span className={styles.listMeta}>
                                  {v.note}
                                </span>
                                <span className={styles.listMeta}>
                                  edge {formatPct(v.edgeDeltaPct)} · PP{' '}
                                  {r.pp.toFixed(2)} → {v.pp.toFixed(2)} (
                                  {formatPct(
                                    r.pp > 0 ? v.ppDelta / r.pp : 0,
                                  )}
                                  )
                                </span>
                              </div>
                              <button
                                type="button"
                                className={styles.btn}
                                onClick={() => applyVariant(r.id, v)}
                              >
                                Apply
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
