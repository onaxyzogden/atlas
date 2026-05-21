/**
 * WaterRouterCard — Plan Module 2 (Water), readout 4/4.
 *
 * Highest-potential water router (Rec #3 v1 from the permaculture-alignment
 * backlog, 2026-04-28 Permaculture Scholar review). Flags water-harvest
 * elements placed below the parcel's median elevation with a numeric
 * "potential gravity head lost" estimate and a suggested upper-third
 * coordinate.
 *
 * **Scholar's framing:** "Water represents potential energy, and the
 * primary rule of permaculture water design is to keep water in its place
 * of highest potential (up high) so gravity can do the work."
 *
 * **v1 elevation model.** Atlas does not currently expose a per-point DEM
 * sampler — only a site-wide elevation summary `{ min, max, predominant
 * aspect }` and per-transect profiles. v1 leans on an aspect-projected
 * heuristic: project each element's centroid onto the uphill axis
 * (aspect + 180°) within the parcel's bbox, normalise to t ∈ [0,1], and
 * estimate elevation as `min + t · (max − min)`. See `waterRouterMath.ts`
 * for the math; the `estimateElevationM` signature is the v2 swap point
 * when a real DEM sampler lands.
 *
 * **Element scope.** Water-harvest kinds from `elementCatalog.ts` `category
 * === 'water'`:
 *   - `water-tank` (point) — centroid = the point itself
 *   - `pond`       (polygon) — centroid = ring centroid
 *   - `swale`      (line) — centroid = midpoint
 *
 * **Tiers.**
 *   - `excellent`     head lost < 0.5 m   green   already high in watershed
 *   - `adequate`      0.5–2 m             neutral OK; modest improvement available
 *   - `low-potential` ≥ 2 m               red     prompt + suggested coord
 *
 * **v1 scope.** Textual prompt only; no map overlay, no one-click "move
 * to" action, no flow-path vector drawing. See backlog file for v2 follow-ups.
 */

import { useEffect, useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import EvidenceSection from '../../../../components/evidence/EvidenceSection.js';
import { selectEvidenceFor } from '@ogden/shared/evidence';
import { emitEvidenceAudit } from '../../../../lib/evidence/auditEmit.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';
import {
  aspectToBearingDeg,
  buildParcelBox,
  estimateElevationM,
  gravityHeadLostM,
  geometryCentroid,
  suggestUpperThirdCoord,
  tierForHeadLost,
  type RouterTier,
  type ParcelBox,
} from './waterRouterMath.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
  /** Phase E.5 mobile guard for Evidence disclosures. */
  compactMode?: boolean;
}

/** Element kinds counted as a "water-harvest element" for the router audit. */
const WATER_HARVEST_KINDS = new Set<string>([
  'water-tank',
  'pond',
  'swale',
]);

const KIND_LABEL: Record<string, string> = {
  'water-tank': 'Water tank',
  pond: 'Pond',
  swale: 'Swale',
};

const TIER_LABEL: Record<RouterTier, string> = {
  excellent: 'HIGH POTENTIAL',
  adequate: 'ADEQUATE',
  'low-potential': 'LOW POTENTIAL',
};

const TIER_PILL_CLASS: Record<RouterTier, string> = {
  excellent: styles.pillMet ?? '',
  adequate: styles.pillIncon ?? '',
  'low-potential': styles.pillUnmet ?? '',
};

interface ElevationSummary {
  min_elevation_m?: number;
  max_elevation_m?: number;
  predominant_aspect?: string;
  mean_slope_deg?: number;
}

interface ElementRow {
  id: string;
  kind: string;
  label: string;
  centroid: [number, number];
  elevationM: number;
  headLostM: number;
  tier: RouterTier;
  suggestion: [number, number] | null;
}

function describeElement(
  el: DesignElement,
  box: ParcelBox,
  minM: number,
  maxM: number,
): ElementRow | null {
  const centroid = geometryCentroid(el.geometry);
  if (!centroid) return null;
  const elevationM = estimateElevationM(centroid, box, minM, maxM);
  const headLostM = gravityHeadLostM(centroid, box, minM, maxM);
  const tier = tierForHeadLost(headLostM);
  return {
    id: el.id,
    kind: el.kind,
    label: el.label || KIND_LABEL[el.kind] || el.kind,
    centroid,
    elevationM,
    headLostM,
    tier,
    suggestion: tier === 'low-potential' ? suggestUpperThirdCoord(box) : null,
  };
}

function formatCoord(c: [number, number]): string {
  return `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`;
}

export default function WaterRouterCard({ project, compactMode = false }: Props) {
  const siteData = useSiteData(project.id);
  const byProject = useLandDesignStore((s) => s.byProject);

  // Elevation summary — gates the audit. Without min/max + aspect we can't
  // run the heuristic at all, so the card surfaces an explicit empty state.
  const elev = useMemo(() => {
    if (!siteData) return null;
    return getLayerSummary<ElevationSummary>(siteData, 'elevation');
  }, [siteData]);

  const elevationReady =
    !!elev &&
    typeof elev.min_elevation_m === 'number' &&
    typeof elev.max_elevation_m === 'number' &&
    elev.max_elevation_m > elev.min_elevation_m;
  const aspectBearing = useMemo(
    () => aspectToBearingDeg(elev?.predominant_aspect ?? null),
    [elev?.predominant_aspect],
  );
  const aspectReady = aspectBearing !== null;

  const parcel = project.parcelBoundaryGeojson ?? null;
  const parcelReady = !!parcel && (parcel.features?.length ?? 0) > 0;

  const box = useMemo<ParcelBox | null>(() => {
    if (!parcelReady || !aspectReady) return null;
    return buildParcelBox(parcel, aspectBearing!);
  }, [parcel, parcelReady, aspectReady, aspectBearing]);

  const rows = useMemo<ElementRow[]>(() => {
    if (!box || !elevationReady) return [];
    const minM = elev!.min_elevation_m!;
    const maxM = elev!.max_elevation_m!;
    const list = byProject[project.id] ?? [];
    const out: ElementRow[] = [];
    for (const el of list) {
      if (!WATER_HARVEST_KINDS.has(el.kind)) continue;
      const row = describeElement(el, box, minM, maxM);
      if (row) out.push(row);
    }
    // Worst (most head lost) first.
    out.sort((a, b) => b.headLostM - a.headLostM);
    return out;
  }, [box, byProject, project.id, elev, elevationReady]);

  const tierCounts = useMemo(() => {
    const counts = { excellent: 0, adequate: 0, 'low-potential': 0 } as Record<
      RouterTier,
      number
    >;
    for (const r of rows) counts[r.tier]++;
    return counts;
  }, [rows]);

  const scoredCount = rows.length;
  const flaggedCount = tierCounts['low-potential'];
  const meanHeadLost =
    scoredCount === 0
      ? 0
      : rows.reduce((sum, r) => sum + r.headLostM, 0) / scoredCount;

  const elevationSpanM =
    elevationReady && elev
      ? (elev.max_elevation_m! - elev.min_elevation_m!)
      : 0;

  // Render-order: site-data gates first, then element list.
  const missing: string[] = [];
  if (!parcelReady) missing.push('parcel boundary');
  if (!elevationReady) missing.push('elevation summary (min/max)');
  if (!aspectReady) missing.push('predominant aspect');
  const gated = missing.length > 0;

  // Phase E.5 — Tier-2 Evidence inputs. Phase F.7.4 — emit audit.
  // Note: deps use primitives (parcelReady/elevationReady/aspectReady)
  // rather than the per-render `missing` array so memo identity stays
  // stable across re-renders with unchanged inputs.
  const evidenceInputs = useMemo(() => {
    // Treat each scored element as a routed edge. Confidence is a function
    // of input availability: full inputs → 0.8 baseline; missing aspect/DEM
    // depresses it. Per-tier flagged share further depresses mean confidence.
    const baseConfidence = !gated ? 0.8 : 0.3;
    const flaggedShare = scoredCount === 0 ? 0 : flaggedCount / scoredCount;
    const meanRoutingConfidence = Math.max(0, baseConfidence - 0.3 * flaggedShare);
    const warnings: string[] = [];
    if (!parcelReady) warnings.push('missing parcel boundary');
    if (!elevationReady) warnings.push('missing elevation summary (min/max)');
    if (!aspectReady) warnings.push('missing predominant aspect');
    if (flaggedCount > 0) {
      warnings.push(`${flaggedCount} low-potential placement${flaggedCount === 1 ? '' : 's'}`);
    }
    return {
      routedEdgeCount: scoredCount,
      meanRoutingConfidence,
      hadDem: elevationReady,
      hadAspect: aspectReady,
      headLossBudgetM: 2.0,
      warnings,
    };
  }, [scoredCount, flaggedCount, gated, parcelReady, elevationReady, aspectReady]);
  const evidenceItem = useMemo(
    () => selectEvidenceFor({ panelKey: 'water-router', inputs: evidenceInputs }),
    [evidenceInputs],
  );
  useEffect(() => {
    if (!evidenceItem) return;
    emitEvidenceAudit({
      projectId: project.id,
      panelKey: 'WaterRouterCard',
      selectorName: 'selectEvidenceFor(water-router)',
      inputs: evidenceInputs,
      output: evidenceItem,
    });
  }, [evidenceInputs, evidenceItem, project.id]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Highest-potential router</h1>
        <p className={styles.lede}>
          Per-element audit on drawn water-harvest elements (tanks, ponds,
          swales) — flags placements low in the watershed where gravity head
          is squandered. v1 uses an aspect-projected heuristic on the
          site&apos;s elevation summary; the estimate is directional, not a
          substitute for an on-site survey. Holmgren P2 — Catch &amp; store
          energy.
        </p>
      </header>

      {gated && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Inputs needed</h2>
          <p className={styles.empty}>
            The router needs the following to run: {missing.join(', ')}.
            Topography summary lives on the Observe stage&apos;s elevation
            layer; the parcel boundary on the project record. Once both are
            present, this card activates automatically.
          </p>
        </div>
      )}

      {!gated && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Site rollup</h2>
            <div className={styles.statRow}>
              <span>Elevation range</span>
              <span>
                {elev!.min_elevation_m!.toFixed(1)}–
                {elev!.max_elevation_m!.toFixed(1)} m
                {' · '}
                span {elevationSpanM.toFixed(1)} m
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Predominant aspect (downhill)</span>
              <span>
                {(elev?.predominant_aspect ?? '—').toUpperCase()}
                {typeof elev?.mean_slope_deg === 'number'
                  ? ` · mean slope ${elev.mean_slope_deg.toFixed(1)}°`
                  : ''}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Scored water-harvest elements</span>
              <span>{scoredCount}</span>
            </div>
            <div className={styles.statRow}>
              <span>Flagged as low-potential</span>
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
                      Mean head lost {meanHeadLost.toFixed(1)} m
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>High · Adequate · Low</span>
              <span>
                {tierCounts.excellent} · {tierCounts.adequate} ·{' '}
                {tierCounts['low-potential']}
              </span>
            </div>
          </div>

          {scoredCount === 0 && (
            <div className={styles.section}>
              <p className={styles.empty}>
                No water-harvest elements drawn yet (tank, pond, or swale).
                Draw one from the Plan tool rail (Water category) and this
                audit will activate.
              </p>
            </div>
          )}

          {scoredCount > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Per-element audit</h2>
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
                        est. elevation {r.elevationM.toFixed(1)} m · head
                        lost {r.headLostM.toFixed(1)} m · placed at{' '}
                        {formatCoord(r.centroid)}
                      </div>
                      {r.tier === 'low-potential' && r.suggestion && (
                        <div className={styles.hint}>
                          Move higher in the watershed: water is potential
                          energy, and gravity is free labour. Suggested
                          upper-third coordinate{' '}
                          <strong>{formatCoord(r.suggestion)}</strong>
                          {' '}(centroid of the parcel&apos;s upper third
                          along the predominant uphill axis). Refine with
                          on-site survey before earthworks.
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Tier-2 Evidence (Phase E.5) ────────────────────────────── */}
      <EvidenceSection item={evidenceItem} compactMode={compactMode} />
    </div>
  );
}
