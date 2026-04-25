/**
 * §16 WindShadeCanopySimCard — canopy expansion + shade growth + windshelter
 * scenario rollup at 5/15/30 year horizons.
 *
 * Heuristic — projects per-crop-area shade footprint and (for windbreak /
 * shelterbelt areas) downwind shelter zone using species `canopySpreadM`
 * and `treeSpacingM`. Maturity scales canopy via a saturating curve so
 * the steward sees how much shade and wind buffer matures over time.
 *
 * Pure presentation — no shared-package math, no map overlays. Aggregates
 * shade % of parcel using turf.area on the parcel boundary when present.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { SPECIES_BY_ID, type PlantSpeciesInfo } from '../planting/plantSpeciesData.js';
import css from './WindShadeCanopySimCard.module.css';

// ── Heuristic constants ───────────────────────────────────────────────────

/** Saturating maturity curve constant (years to half-mature). */
const MATURITY_HALF_LIFE_YR = 8;

/** Canopy types that produce meaningful shade. */
const CANOPY_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard', 'food_forest', 'silvopasture', 'windbreak',
  'shelterbelt', 'pollinator_strip', 'nursery',
]);

/** Crop types that act as wind buffers (have downwind shelter). */
const WIND_BUFFER_TYPES: ReadonlySet<CropAreaType> = new Set([
  'windbreak', 'shelterbelt',
]);

/** Estimated mature tree height as multiple of canopy radius (rule-of-thumb). */
const HEIGHT_FROM_RADIUS_MULT = 1.8;

/** Downwind shelter reach as multiple of windbreak height (10H is conservative). */
const SHELTER_H_MULT = 10;

/** Fallback canopy spread if no species are placed. */
const FALLBACK_CANOPY_SPREAD_M = 5;
/** Fallback row spacing if no species/spacing is provided. */
const FALLBACK_SPACING_M = 4;

/** Maturity horizons surfaced to the steward. */
const HORIZONS_YR = [5, 15, 30] as const;

// ── Helpers ───────────────────────────────────────────────────────────────

function maturityFactor(years: number): number {
  // Saturating curve — 5y ≈ 0.38, 15y ≈ 0.65, 30y ≈ 0.79
  return years / (years + MATURITY_HALF_LIFE_YR);
}

function avgCanopySpreadFromSpecies(speciesIds: string[]): number {
  const spreads: number[] = [];
  for (const id of speciesIds) {
    const sp: PlantSpeciesInfo | undefined = SPECIES_BY_ID[id];
    if (sp && sp.canopySpreadM > 0) spreads.push(sp.canopySpreadM);
  }
  if (spreads.length === 0) return FALLBACK_CANOPY_SPREAD_M;
  return spreads.reduce((a, b) => a + b, 0) / spreads.length;
}

interface AreaScenario {
  areaId: string;
  areaName: string;
  type: CropAreaType;
  areaM2: number;
  matureSpreadM: number;
  spacingM: number;
  estTreeCount: number;
  /** Shade area (m²) at each horizon, indexed by HORIZONS_YR. */
  shadeAtHorizonM2: number[];
  /** Downwind shelter zone (m²) at each horizon — 0 for non-windbreak types. */
  shelterAtHorizonM2: number[];
  isWindBuffer: boolean;
  isCanopy: boolean;
}

function buildScenario(area: CropArea): AreaScenario {
  const matureSpreadM = avgCanopySpreadFromSpecies(area.species);
  const spacingM = area.treeSpacingM && area.treeSpacingM > 0
    ? area.treeSpacingM
    : matureSpreadM > 0 ? matureSpreadM : FALLBACK_SPACING_M;

  // Tree-count estimate — area / spacing² with a cap so a tiny pollinator
  // strip doesn't claim 1000 trees from generous defaults.
  const rawCount = Math.floor(area.areaM2 / Math.max(spacingM * spacingM, 1));
  const estTreeCount = Math.max(1, Math.min(rawCount, Math.ceil(area.areaM2 / 4)));

  const isCanopy = CANOPY_TYPES.has(area.type);
  const isWindBuffer = WIND_BUFFER_TYPES.has(area.type);

  const shadeAtHorizonM2: number[] = [];
  const shelterAtHorizonM2: number[] = [];

  for (const yr of HORIZONS_YR) {
    if (!isCanopy) {
      shadeAtHorizonM2.push(0);
      shelterAtHorizonM2.push(0);
      continue;
    }
    const f = maturityFactor(yr);
    const radiusM = (matureSpreadM / 2) * f;
    const perTreeShadeM2 = Math.PI * radiusM * radiusM;
    // Cap total shade at the area's footprint — once the canopy closes,
    // additional trees don't add ground shade.
    const totalShadeRaw = perTreeShadeM2 * estTreeCount;
    const totalShade = Math.min(totalShadeRaw, area.areaM2);
    shadeAtHorizonM2.push(totalShade);

    if (isWindBuffer) {
      // Approximate windward edge as sqrt(area) — a row-shaped windbreak.
      // Effective height ≈ radius × 1.8 (canopy is wider than tall in young
      // trees, becoming taller-than-wide at maturity — this is a rough mean).
      const heightM = radiusM * HEIGHT_FROM_RADIUS_MULT;
      const edgeM = Math.sqrt(area.areaM2);
      const reachM = heightM * SHELTER_H_MULT;
      shelterAtHorizonM2.push(edgeM * reachM);
    } else {
      shelterAtHorizonM2.push(0);
    }
  }

  return {
    areaId: area.id,
    areaName: area.name || '(unnamed)',
    type: area.type,
    areaM2: area.areaM2,
    matureSpreadM,
    spacingM,
    estTreeCount,
    shadeAtHorizonM2,
    shelterAtHorizonM2,
    isWindBuffer,
    isCanopy,
  };
}

function fmtM2(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(2)} ha`;
  if (v >= 1000) return `${Math.round(v).toLocaleString()} m\u00B2`;
  return `${Math.round(v)} m\u00B2`;
}

function fmtPct(v: number): string {
  if (v < 0.1) return '<0.1%';
  if (v < 1) return `${v.toFixed(1)}%`;
  return `${Math.round(v)}%`;
}

// ── Component ────────────────────────────────────────────────────────────

interface WindShadeCanopySimCardProps {
  projectId: string;
  parcelBoundaryGeojson: GeoJSON.FeatureCollection | null | undefined;
}

export default function WindShadeCanopySimCard({
  projectId,
  parcelBoundaryGeojson,
}: WindShadeCanopySimCardProps) {
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );

  const scenarios = useMemo(
    () => cropAreas.map(buildScenario).filter((s) => s.isCanopy),
    [cropAreas],
  );

  const parcelAreaM2 = useMemo<number | null>(() => {
    if (!parcelBoundaryGeojson || !parcelBoundaryGeojson.features?.length) return null;
    try {
      return turf.area(parcelBoundaryGeojson);
    } catch {
      return null;
    }
  }, [parcelBoundaryGeojson]);

  const totals = useMemo(() => {
    const shade = HORIZONS_YR.map((_, i) =>
      scenarios.reduce((sum, sc) => sum + (sc.shadeAtHorizonM2[i] ?? 0), 0),
    );
    const shelter = HORIZONS_YR.map((_, i) =>
      scenarios.reduce((sum, sc) => sum + (sc.shelterAtHorizonM2[i] ?? 0), 0),
    );
    const treeTotal = scenarios.reduce((sum, sc) => sum + sc.estTreeCount, 0);
    return { shade, shelter, treeTotal };
  }, [scenarios]);

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'WIND, SHADE & CANOPY MATURITY (\u00A716)'}</h3>

      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Canopy growth simulation</h4>
            <p className={css.cardHint}>
              Heuristic projection at 5 / 15 / 30-year maturity horizons.
              Shade scales with canopy radius (saturating curve); downwind
              shelter zone scales with windbreak height (~10H reach).
            </p>
          </div>
          <span className={css.heuristicBadge}>Planning-grade</span>
        </div>

        {scenarios.length === 0 ? (
          <div className={css.empty}>
            <p>
              No canopy-bearing crop areas placed yet. Add an orchard,
              food forest, silvopasture, windbreak, or shelterbelt to
              project shade and wind-shelter growth over time.
            </p>
          </div>
        ) : (
          <>
            {/* Aggregate row */}
            <div className={css.aggregate}>
              <div className={css.aggHead}>
                <span className={css.aggLabel}>All canopy areas</span>
                <span className={css.aggMeta}>
                  {scenarios.length} {scenarios.length === 1 ? 'area' : 'areas'}
                  {' \u00B7 '}~{totals.treeTotal.toLocaleString()} trees est.
                </span>
              </div>
              <div className={css.horizonGrid}>
                {HORIZONS_YR.map((yr, i) => {
                  const shade = totals.shade[i] ?? 0;
                  const shelter = totals.shelter[i] ?? 0;
                  const pctOfParcel = parcelAreaM2 && parcelAreaM2 > 0
                    ? (shade / parcelAreaM2) * 100
                    : null;
                  return (
                    <div key={yr} className={css.horizonCell}>
                      <span className={css.horizonYr}>{yr}-year</span>
                      <span className={css.horizonShade}>{fmtM2(shade)} shade</span>
                      {pctOfParcel !== null && (
                        <span className={css.horizonPct}>{fmtPct(pctOfParcel)} of parcel</span>
                      )}
                      {shelter > 0 && (
                        <span className={css.horizonShelter}>
                          + {fmtM2(shelter)} wind shelter
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-area rows */}
            <div className={css.areaList}>
              {scenarios.map((sc) => (
                <div key={sc.areaId} className={css.areaRow}>
                  <div className={css.areaRowHead}>
                    <span className={css.areaName}>{sc.areaName}</span>
                    <span className={css.areaType}>{sc.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className={css.areaMeta}>
                    {`${fmtM2(sc.areaM2)} \u00B7 ~${sc.estTreeCount} trees \u00B7 mature spread ${sc.matureSpreadM.toFixed(1)} m`}
                    {sc.isWindBuffer ? ' \u00B7 wind buffer' : ''}
                  </div>
                  <div className={css.horizonGridSm}>
                    {HORIZONS_YR.map((yr, i) => (
                      <div key={yr} className={css.horizonCellSm}>
                        <span className={css.horizonYrSm}>{yr}y</span>
                        <span className={css.horizonShadeSm}>
                          {fmtM2(sc.shadeAtHorizonM2[i] ?? 0)}
                        </span>
                        {sc.isWindBuffer && (sc.shelterAtHorizonM2[i] ?? 0) > 0 && (
                          <span className={css.horizonShelterSm}>
                            {fmtM2(sc.shelterAtHorizonM2[i] ?? 0)} buffer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className={css.footnote}>
          Shade per tree {'\u2248'} {'\u03C0r\u00B2'} where r = mature canopy radius
          {'\u00D7'} maturity factor (saturating curve, half-life {MATURITY_HALF_LIFE_YR}{' '}years).
          Aggregate shade is capped at the area&rsquo;s footprint once the canopy
          closes. Wind shelter zone uses the rule-of-thumb 10{'\u00D7'} canopy
          height for windbreak/shelterbelt rows. Species-specific growth
          rates and stand-density effects are <em>not</em> modelled at this
          stage.
        </p>
      </div>
    </div>
  );
}
