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
 * **v1 scope.** Textual prompt only. The shape-variant generators
 * (peninsula / scalloped / keyhole) are deferred to a follow-up — flagged
 * as the "biggest unknown" in the backlog rationale and isolated here so
 * v1 lands inside the 0.5-sprint estimate.
 *
 * **Why landDesignStore.** Planting-class kinds (orchard, silvopasture,
 * pasture-mix, paddock) live in `landDesignStore` as `DesignElement`
 * polygons after the BE V2 unification. Guilds (polycultureStore) are
 * points — out of scope for an edge-to-area metric. Closes Rec #4 v1.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
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
}

/**
 * Local copies of useDesignMetrics.ts's polygonAreaM2 / polygonPerimeterM
 * (file-private there; mirrors the codebase's per-card pattern of holding
 * its own geometry math — see also QuietCirculationRouteCard's sampleAlong
 * and FertilityColocationCard's centroid math). Extracting to a shared
 * util is a separate refactor; for v1 of this readout, duplicate.
 */
function polygonAreaM2(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const ax = a[0]! * mPerDegLng;
    const ay = a[1]! * mPerDegLat;
    const bx = b[0]! * mPerDegLng;
    const by = b[1]! * mPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeterM(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let perim = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const dx = (b[0]! - a[0]!) * mPerDegLng;
    const dy = (b[1]! - a[1]!) * mPerDegLat;
    perim += Math.sqrt(dx * dx + dy * dy);
  }
  return perim;
}

/** Polsby-Popper compactness. 1.0 = circle, 0 = infinitely indented. */
function polsbyPopper(areaM2: number, perimeterM: number): number {
  if (perimeterM <= 0) return 0;
  return (4 * Math.PI * areaM2) / (perimeterM * perimeterM);
}

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
  };
}

export default function EdgeConnectivityCard({ project }: Props) {
  const byProject = useLandDesignStore((s) => s.byProject);

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
                    <div className={styles.hint}>
                      Carve out edges, peninsulas, or marginal borders for
                      companion plants. A scalloped border or keyhole
                      carve-out increases edge length without reducing
                      total area — try a 5–10% perimeter perturbation
                      along the longest straight run.
                    </div>
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
