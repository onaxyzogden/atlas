/**
 * §16 CarryingCapacityCard — site-level "what can this land carry?" rollup.
 *
 * Three lenses on the same parcel:
 *   1. Livestock — head-capacity at the property's adjusted forage quality
 *      (climate × soils × canopy × slope), referenced against currently
 *      placed paddock stocking.
 *   2. Crops — annual yield (kg) from currently placed crop areas using
 *      the existing per-species `yieldEstimate.perTreeKg`, plus an
 *      orchard-equivalent extrapolation for the property's spare acreage.
 *   3. Water — annual catchment potential (gal) from a rational-method
 *      runoff coefficient (NRCS hydrologic group), referenced against a
 *      WHO-baseline 4-person + per-acre irrigation demand.
 *
 * Pure presentation — no shared-package math, no map overlays. Re-uses
 * `computeForageQuality`, `computeYieldEstimates`, and `LIVESTOCK_SPECIES`
 * already in the app.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { computeForageQuality } from '../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../livestock/speciesData.js';
import { computeYieldEstimates } from '../planting/plantingAnalysis.js';
import css from './CarryingCapacityCard.module.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
}
interface SoilsSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

interface Props {
  project: LocalProject;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

/** NRCS-style runoff coefficient by hydrologic soil group (mixed cover). */
const RUNOFF_C: Record<string, number> = { A: 0.25, B: 0.45, C: 0.65, D: 0.80 };

/** WHO baseline domestic demand — 50 L/person/day. */
const WHO_LITERS_PER_PERSON_DAY = 50;

/** Conservative household assumption for site demand baseline. */
const ASSUMED_HOUSEHOLD_SIZE = 4;

/** Irrigation demand assumption (gal/acre/yr) — light landscape watering. */
const IRRIGATION_GAL_PER_ACRE_YR = 18000;

/** Litres per US gallon. */
const LITERS_PER_GAL = 3.785;

/** m\u00B2 per acre. */
const M2_PER_ACRE = 4046.86;

/** Acres treated as orchard-equivalent extrapolation cap (do not assume the
 *  whole farm is planted out — this is a "what if 25% of the spare acreage
 *  went to fruit trees" reference, not a recommendation). */
const ORCHARD_EQUIV_FRACTION = 0.25;

/** Per-tree yield assumption for orchard-equivalent extrapolation (kg/yr).
 *  Sits between the catalog's apple (~30 kg) and chestnut (~12 kg) so a
 *  mid-orchard species mix lands here. */
const ORCHARD_EQUIV_KG_PER_TREE = 22;

/** Orchard tree spacing assumption (m) — standard semi-dwarf grid. */
const ORCHARD_EQUIV_SPACING_M = 5;

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtNum(v: number): string {
  if (!isFinite(v) || v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000).toLocaleString()}k`;
  if (v >= 1000) return Math.round(v).toLocaleString();
  return Math.round(v).toString();
}

function fmtKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

function fmtGal(g: number): string {
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(2)}M gal`;
  if (g >= 1000) return `${Math.round(g).toLocaleString()} gal`;
  return `${Math.round(g)} gal`;
}

function pickRepresentativeSpecies(
  paddockSpecies: string[],
): keyof typeof LIVESTOCK_SPECIES {
  if (paddockSpecies.length === 0) return 'cattle';
  // Most frequent species across paddocks.
  const counts = new Map<string, number>();
  for (const s of paddockSpecies) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best = paddockSpecies[0]!;
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) { best = k; bestCount = v; }
  }
  return best as keyof typeof LIVESTOCK_SPECIES;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function CarryingCapacityCard({ project }: Props) {
  const siteData = useSiteData(project.id);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  /* ── Site environment readout ─────────────────────────────────────── */

  const env = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const cover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const canopyRaw = parseFloat(String(cover?.tree_canopy_pct ?? ''));

    return {
      precipMm: climate?.annual_precip_mm ?? null,
      growingSeasonDays: climate?.growing_season_days ?? null,
      tempC: climate?.annual_temp_mean_c ?? null,
      organicMatterPct: isFinite(omRaw) ? omRaw : null,
      canopyPct: isFinite(canopyRaw) ? canopyRaw : null,
      slopeDeg: elev?.mean_slope_deg ?? null,
      hydrologicGroup: (soils?.hydrologic_group ?? '').match(/^[ABCD]/)?.[0] ?? null,
    };
  }, [siteData]);

  /* ── Forage quality (drives livestock capacity) ───────────────────── */

  const forage = useMemo(
    () => computeForageQuality(
      env.organicMatterPct ?? 3.0,
      env.canopyPct ?? 15,
      env.slopeDeg ?? 3,
      env.growingSeasonDays ?? 150,
    ),
    [env],
  );

  /* ── Lens 1: Livestock carrying capacity ───────────────────────────── */

  const livestock = useMemo(() => {
    const acres = project.acreage ?? 0;
    const ha = (acres * M2_PER_ACRE) / 10_000;

    // Representative species across placed paddocks (or cattle as default).
    const allPaddockSpecies = paddocks.flatMap((p) => p.species);
    const repId = pickRepresentativeSpecies(allPaddockSpecies);
    const repInfo = LIVESTOCK_SPECIES[repId];

    // Property-wide adjusted capacity at this forage quality.
    const propertyCapacityHead = repInfo
      ? Math.round(repInfo.typicalStocking * ha * forage.adjustedStockingMultiplier)
      : 0;

    // Currently active stocking — sum of `paddock.stockingDensity * areaHa`.
    const currentHead = paddocks.reduce((sum, p) => {
      const aHa = p.areaM2 / 10_000;
      return sum + (p.stockingDensity ?? 0) * aHa;
    }, 0);

    const utilizationPct = propertyCapacityHead > 0
      ? Math.min(999, Math.round((currentHead / propertyCapacityHead) * 100))
      : 0;

    return {
      acres,
      ha,
      forageQuality: forage.quality,
      forageBiomass: forage.biomassEstimate,
      adjustedMultiplier: forage.adjustedStockingMultiplier,
      representativeSpecies: repId,
      representativeLabel: repInfo?.label ?? repId,
      typicalStockingPerHa: repInfo?.typicalStocking ?? 0,
      propertyCapacityHead,
      currentHead: Math.round(currentHead),
      utilizationPct,
      paddockCount: paddocks.length,
    };
  }, [paddocks, forage, project.acreage]);

  /* ── Lens 2: Crop yield ────────────────────────────────────────────── */

  const crops = useMemo(() => {
    const estimates = computeYieldEstimates(cropAreas);
    const placedYieldKg = estimates.reduce((sum, e) => sum + e.yieldKg, 0);
    const placedAreaM2 = cropAreas.reduce((sum, c) => sum + c.areaM2, 0);
    const placedTreeCount = estimates.reduce((sum, e) => sum + e.treesEstimated, 0);

    // Orchard-equivalent extrapolation: 25% of remaining (un-planted)
    // acreage at standard semi-dwarf spacing, mid-yield species.
    const totalPropertyM2 = (project.acreage ?? 0) * M2_PER_ACRE;
    const sparePropertyM2 = Math.max(0, totalPropertyM2 - placedAreaM2);
    const extrapolationM2 = sparePropertyM2 * ORCHARD_EQUIV_FRACTION;
    const extrapolationTrees = Math.floor(extrapolationM2 / (ORCHARD_EQUIV_SPACING_M * ORCHARD_EQUIV_SPACING_M));
    const extrapolationKg = extrapolationTrees * ORCHARD_EQUIV_KG_PER_TREE;

    return {
      estimateCount: estimates.length,
      placedAreaM2,
      placedTreeCount,
      placedYieldKg,
      extrapolationKg,
      cropAreaCount: cropAreas.length,
    };
  }, [cropAreas, project.acreage]);

  /* ── Lens 3: Water budget ──────────────────────────────────────────── */

  const water = useMemo(() => {
    const acres = project.acreage ?? 0;
    if (!env.precipMm || acres === 0) {
      return null;
    }
    const propertyM2 = acres * M2_PER_ACRE;
    const C = env.hydrologicGroup ? (RUNOFF_C[env.hydrologicGroup] ?? 0.45) : 0.45;
    // Catchment volume m\u00B3 = precipMm/1000 * area * runoff coefficient
    const catchmentM3 = (env.precipMm / 1000) * propertyM2 * C;
    const catchmentLiters = catchmentM3 * 1000;
    const catchmentGal = catchmentLiters / LITERS_PER_GAL;

    // Demand: WHO baseline + per-acre irrigation
    const domesticLitersYr = WHO_LITERS_PER_PERSON_DAY * ASSUMED_HOUSEHOLD_SIZE * 365;
    const domesticGal = domesticLitersYr / LITERS_PER_GAL;
    const irrigationGal = IRRIGATION_GAL_PER_ACRE_YR * acres;
    const totalDemandGal = domesticGal + irrigationGal;

    const surplusGal = catchmentGal - totalDemandGal;
    const coverageRatio = totalDemandGal > 0 ? catchmentGal / totalDemandGal : 0;

    return {
      catchmentGal,
      runoffCoefficient: C,
      domesticGal,
      irrigationGal,
      totalDemandGal,
      surplusGal,
      coverageRatio,
    };
  }, [env, project.acreage]);

  /* ── Render ───────────────────────────────────────────────────────── */

  const hasAnySiteData = env.precipMm != null || env.organicMatterPct != null
    || env.slopeDeg != null || env.canopyPct != null;

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'CARRYING CAPACITY \u2014 SITE-LEVEL ROLLUP (\u00A716)'}</h3>

      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>What can this land carry?</h4>
            <p className={css.cardHint}>
              Three rollups projected from the site environment: livestock
              head-capacity at the property's adjusted forage quality, crop
              yield from placed crop areas (plus a 25% orchard-equivalent
              extrapolation), and an annual water budget against a 4-person
              + per-acre irrigation baseline.
            </p>
          </div>
          <span className={css.heuristicBadge}>Planning-grade</span>
        </div>

        {!hasAnySiteData && (
          <div className={css.fallbackBanner}>
            Site environment data not yet loaded \u2014 figures use neutral
            defaults (forage quality assumes mid-OM grass pasture, water
            budget falls back to runoff group B).
          </div>
        )}

        <div className={css.lensGrid}>
          {/* ── Livestock lens ────────────────────────────────────────── */}
          <div className={css.lens}>
            <div className={css.lensHead}>
              <span className={css.lensLabel}>LIVESTOCK</span>
              <span className={`${css.qualityChip} ${css[`q_${livestock.forageQuality}`]}`}>
                {livestock.forageQuality} forage
              </span>
            </div>
            <div className={css.lensHero}>
              {livestock.acres > 0 ? livestock.propertyCapacityHead.toLocaleString() : '\u2014'}
              <span className={css.lensHeroUnit}>head</span>
            </div>
            <div className={css.lensSub}>
              {livestock.acres > 0
                ? `at ${livestock.typicalStockingPerHa}/ha typical \u00D7 ${livestock.adjustedMultiplier.toFixed(2)} site adjustment`
                : 'parcel acreage not set'}
            </div>
            <div className={css.lensRow}>
              <span className={css.lensRowLabel}>Reference species</span>
              <span className={css.lensRowVal}>{livestock.representativeLabel}</span>
            </div>
            <div className={css.lensRow}>
              <span className={css.lensRowLabel}>Currently placed</span>
              <span className={css.lensRowVal}>
                {livestock.currentHead.toLocaleString()} head
                {livestock.paddockCount > 0 ? ` \u00B7 ${livestock.paddockCount} paddocks` : ''}
              </span>
            </div>
            {livestock.propertyCapacityHead > 0 && (
              <div className={css.utilBar}>
                <div
                  className={css.utilBarFill}
                  style={{ width: `${Math.min(100, livestock.utilizationPct)}%` }}
                />
                <span className={css.utilBarLabel}>
                  {livestock.utilizationPct}% utilization
                </span>
              </div>
            )}
          </div>

          {/* ── Crops lens ─────────────────────────────────────────────── */}
          <div className={css.lens}>
            <div className={css.lensHead}>
              <span className={css.lensLabel}>CROPS</span>
              <span className={css.qualityChipNeutral}>
                {crops.cropAreaCount} {crops.cropAreaCount === 1 ? 'area' : 'areas'}
              </span>
            </div>
            <div className={css.lensHero}>
              {fmtKg(crops.placedYieldKg)}
              <span className={css.lensHeroUnit}>/yr placed</span>
            </div>
            <div className={css.lensSub}>
              {crops.estimateCount > 0
                ? `${fmtNum(crops.placedTreeCount)} trees across ${(crops.placedAreaM2 / 10_000).toFixed(2)} ha`
                : 'no yield-bearing species placed yet'}
            </div>
            <div className={css.lensRow}>
              <span className={css.lensRowLabel}>Spare acreage extrapolation</span>
              <span className={css.lensRowVal}>+ {fmtKg(crops.extrapolationKg)}/yr</span>
            </div>
            <div className={css.lensRow}>
              <span className={css.lensRowLabel}>Total potential</span>
              <span className={css.lensRowVal}>{fmtKg(crops.placedYieldKg + crops.extrapolationKg)}/yr</span>
            </div>
            <div className={css.lensFootnote}>
              {`Extrapolation: 25% of un-planted parcel at orchard-equivalent (${ORCHARD_EQUIV_KG_PER_TREE} kg/tree, ${ORCHARD_EQUIV_SPACING_M}m spacing). Reference figure, not a recommendation.`}
            </div>
          </div>

          {/* ── Water lens ─────────────────────────────────────────────── */}
          <div className={css.lens}>
            <div className={css.lensHead}>
              <span className={css.lensLabel}>WATER</span>
              {water && (
                <span className={`${css.qualityChip} ${
                  water.coverageRatio >= 1.5 ? css.q_high
                    : water.coverageRatio >= 1 ? css.q_good
                      : water.coverageRatio >= 0.5 ? css.q_moderate : css.q_poor
                }`}>
                  {water.coverageRatio >= 1 ? 'surplus' : 'deficit'}
                </span>
              )}
            </div>
            {water ? (
              <>
                <div className={css.lensHero}>
                  {fmtGal(water.catchmentGal).replace(' gal', '')}
                  <span className={css.lensHeroUnit}>gal/yr catch</span>
                </div>
                <div className={css.lensSub}>
                  {`${env.precipMm?.toFixed(0)} mm precip \u00D7 group ${env.hydrologicGroup ?? 'B'} runoff (C=${water.runoffCoefficient.toFixed(2)})`}
                </div>
                <div className={css.lensRow}>
                  <span className={css.lensRowLabel}>Domestic baseline</span>
                  <span className={css.lensRowVal}>{fmtGal(water.domesticGal)}</span>
                </div>
                <div className={css.lensRow}>
                  <span className={css.lensRowLabel}>Irrigation @ 18k/acre</span>
                  <span className={css.lensRowVal}>{fmtGal(water.irrigationGal)}</span>
                </div>
                <div className={css.lensRow}>
                  <span className={css.lensRowLabel}>{water.surplusGal >= 0 ? 'Annual surplus' : 'Annual deficit'}</span>
                  <span className={`${css.lensRowVal} ${water.surplusGal >= 0 ? css.surplusVal : css.deficitVal}`}>
                    {water.surplusGal >= 0 ? '+' : ''}{fmtGal(water.surplusGal)}
                  </span>
                </div>
              </>
            ) : (
              <div className={css.lensEmpty}>
                {project.acreage == null
                  ? 'Set parcel acreage to compute water budget.'
                  : 'Climate precipitation data required.'}
              </div>
            )}
          </div>
        </div>

        <p className={css.footnote}>
          <em>Heuristic rollup.</em> Livestock capacity uses typical
          stocking rates (cattle 2/ha, sheep 12/ha, etc.) adjusted by the
          site's <strong>forage-quality multiplier</strong> from organic
          matter, canopy, slope, and growing-season length. Crop yield
          comes from the placed-species catalog plus a transparent 25%
          orchard-equivalent extrapolation. Water budget runs the rational
          method (precip {'\u00D7'} runoff C {'\u00D7'} area) against a 4-person
          WHO baseline + 18k gal/acre/yr light irrigation. Real-site
          carrying capacity depends on rotation discipline, species mix,
          local market access, and water-rights jurisdiction \u2014 use these
          figures as scoping references, not commitments.
        </p>
      </div>
    </div>
  );
}
