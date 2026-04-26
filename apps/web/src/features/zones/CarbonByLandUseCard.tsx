/**
 * CarbonByLandUseCard — §7 dashboard card that estimates per-zone annual
 * carbon sequestration based on land-use category and (optionally) the
 * successionStage tag a steward has captured for the zone.
 *
 * Distinct from the existing SOC card: that one reads modeled soil-organic-
 * carbon pools from SoilGrids / SSURGO. This one is a *land-use potential*
 * estimate, driven by the zones the steward has actually drawn — so it
 * answers "what can my design plausibly sequester per year?" rather than
 * "how much carbon is in the soil today?".
 *
 * Pure presentation: a small literature-default lookup table + a sum.
 * Not an LCA. Numbers are heuristics; the assumptions are listed inline so
 * the steward can sanity-check.
 *
 * Spec: §7 `carbon-sequestration-potential` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type ZoneCategory,
  type SuccessionStage,
} from '../../store/zoneStore.js';
import css from './CarbonByLandUseCard.module.css';

interface Props {
  projectId: string;
}

const M2_PER_ACRE = 4046.8564224;

/**
 * Annual carbon-sequestration rate per zone category, expressed as
 * tC/ac/yr above- + below-ground. Conservative literature midpoints:
 *
 * - Annual cropping (food_production w/o trees): Six et al. (2002)
 *   ~0.10–0.30 tC/ac/yr; we take the lower default since most "food
 *   production" zones at draw-time are not yet silvopasture/agroforestry.
 * - Managed pasture / livestock rotation: Conant et al. (2017) meta-
 *   analysis of grazing land sequestration ~0.4–0.8 tC/ac/yr.
 * - Wetland / water-retention features: Mitsch & Gosselink wetland C
 *   accumulation rates ~1.0–2.0 tC/ac/yr; we use 1.5.
 * - Forested / conservation reserves: Pan et al. (2011) global forest
 *   sink ~0.6–1.0 tC/ac/yr depending on stand age.
 * - Hedgerow / buffer strips: Falloon et al. (2004) ~0.5–1.0 tC/ac/yr
 *   on linear plantings.
 * - Built / impervious zones: zero (placeholder; embodied carbon is a
 *   different LCA conversation).
 *
 * Numbers are heuristics — every assumption is surfaced in the footer.
 */
const BASE_RATE_TC_PER_AC_YR: Record<ZoneCategory, number> = {
  habitation: 0,
  food_production: 0.15,
  livestock: 0.6,
  commons: 0.4,
  spiritual: 0.4,
  education: 0.3,
  retreat: 0.3,
  conservation: 0.8,
  water_retention: 1.5,
  infrastructure: 0,
  access: 0,
  buffer: 0.7,
  future_expansion: 0,
};

/**
 * Multiplier applied when the steward has tagged a successionStage. Bare
 * ground sequesters less than a building stand; mid-succession is the
 * peak biomass-accumulation phase; climax is near steady-state. Pioneer
 * is the baseline (1.0×).
 *
 * If successionStage is not set, the multiplier is 1.0 (we trust the
 * category default).
 */
const STAGE_MULTIPLIER: Record<SuccessionStage, number> = {
  bare: 0.3,
  pioneer: 1.0,
  mid: 1.2,
  climax: 0.4,
};

export default function CarbonByLandUseCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);

  const { totalAcres, annualTC, twentyYearTC, byCategory, zoneCount } = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === projectId);
    let totalAc = 0;
    let total = 0;
    const cat: Record<ZoneCategory, { acres: number; tcYr: number }> = {
      habitation: { acres: 0, tcYr: 0 },
      food_production: { acres: 0, tcYr: 0 },
      livestock: { acres: 0, tcYr: 0 },
      commons: { acres: 0, tcYr: 0 },
      spiritual: { acres: 0, tcYr: 0 },
      education: { acres: 0, tcYr: 0 },
      retreat: { acres: 0, tcYr: 0 },
      conservation: { acres: 0, tcYr: 0 },
      water_retention: { acres: 0, tcYr: 0 },
      infrastructure: { acres: 0, tcYr: 0 },
      access: { acres: 0, tcYr: 0 },
      buffer: { acres: 0, tcYr: 0 },
      future_expansion: { acres: 0, tcYr: 0 },
    };

    for (const z of zones) {
      const ac = (z.areaM2 ?? 0) / M2_PER_ACRE;
      const baseRate = BASE_RATE_TC_PER_AC_YR[z.category] ?? 0;
      const mult = z.successionStage ? STAGE_MULTIPLIER[z.successionStage] : 1.0;
      const tcYr = ac * baseRate * mult;
      cat[z.category].acres += ac;
      cat[z.category].tcYr += tcYr;
      totalAc += ac;
      total += tcYr;
    }

    return {
      totalAcres: totalAc,
      annualTC: total,
      twentyYearTC: total * 20,
      byCategory: cat,
      zoneCount: zones.length,
    };
  }, [allZones, projectId]);

  if (zoneCount === 0) {
    return (
      <div className={css.section}>
        <h3 className={css.sectionLabel}>CARBON BY LAND USE</h3>
        <div className={css.empty}>
          Draw zones on the map and assign categories — this card will roll
          up a per-zone annual sequestration estimate based on each
          category&rsquo;s land-use type. Tag succession stage on each zone for
          a finer estimate.
        </div>
      </div>
    );
  }

  // Sort categories by contribution descending so the dominant land-uses
  // appear first; suppress zero-contribution categories from the legend.
  const orderedEntries = (Object.entries(byCategory) as [ZoneCategory, { acres: number; tcYr: number }][])
    .filter(([, v]) => v.acres > 0)
    .sort((a, b) => b[1].tcYr - a[1].tcYr);

  const safeTotal = annualTC > 0 ? annualTC : 1;

  // CO2-equivalent: 1 tC = 3.667 tCO2e (molar mass ratio 44/12).
  const annualCO2e = annualTC * 3.667;
  const twentyYearCO2e = twentyYearTC * 3.667;

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>CARBON BY LAND USE</h3>

      <div className={css.statsGrid}>
        <Stat
          label="Annual potential"
          value={`${annualTC.toFixed(2)} tC/yr`}
          sub={`${annualCO2e.toFixed(1)} tCO\u2082e/yr`}
        />
        <Stat
          label="20-year cumulative"
          value={`${twentyYearTC.toFixed(0)} tC`}
          sub={`${twentyYearCO2e.toFixed(0)} tCO\u2082e`}
        />
        <Stat
          label="Avg rate"
          value={totalAcres > 0 ? `${(annualTC / totalAcres).toFixed(2)} tC/ac/yr` : '\u2014'}
          sub={`${zoneCount} zones \u00B7 ${totalAcres.toFixed(1)} ac`}
        />
      </div>

      {/* Stacked bar by zone category, weighted by tC/yr contribution
          (not acres) so the visual reflects the carbon story, not the
          area story. */}
      <div className={css.barBlock}>
        <div className={css.barHeader}>
          <span className={css.barTitle}>Contribution by category</span>
          <span className={css.barMeta}>annual tC by zone type</span>
        </div>
        <div className={css.barTrack}>
          {orderedEntries.map(([cat, v]) =>
            v.tcYr > 0 ? (
              <div
                key={cat}
                className={css.barSeg}
                style={{
                  width: `${(v.tcYr / safeTotal) * 100}%`,
                  background: ZONE_CATEGORY_CONFIG[cat].color,
                }}
                title={`${ZONE_CATEGORY_CONFIG[cat].label}: ${v.tcYr.toFixed(2)} tC/yr (${v.acres.toFixed(1)} ac)`}
              />
            ) : null,
          )}
        </div>
        <div className={css.legend}>
          {orderedEntries.map(([cat, v]) => (
            <div key={cat} className={css.legendRow}>
              <span
                className={css.legendSwatch}
                style={{ background: ZONE_CATEGORY_CONFIG[cat].color }}
              />
              <span className={css.legendLabel}>
                {ZONE_CATEGORY_CONFIG[cat].icon} {ZONE_CATEGORY_CONFIG[cat].label}
              </span>
              <span className={css.legendValue}>
                {v.tcYr.toFixed(2)} tC/yr
                {v.tcYr > 0
                  ? ` (${((v.tcYr / safeTotal) * 100).toFixed(0)}%)`
                  : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={css.assumptions}>
        <strong className={css.assumptionsLabel}>Assumptions</strong>
        <ul className={css.assumptionsList}>
          <li>
            Heuristic literature midpoints per zone category (e.g.,
            managed pasture 0.6 tC/ac/yr, wetland 1.5 tC/ac/yr, forest
            0.8 tC/ac/yr, annual cropping 0.15 tC/ac/yr). Built and
            access zones contribute zero.
          </li>
          <li>
            Where a zone is tagged with a succession stage, the rate is
            multiplied by 0.3× (bare), 1.0× (pioneer), 1.2× (mid), or
            0.4× (climax).
          </li>
          <li>
            CO<sub>2</sub>e uses the molar conversion 1 tC = 3.667 tCO<sub>2</sub>e.
          </li>
          <li>
            This is an order-of-magnitude estimate, not an LCA. Soil-pool
            SOC numbers below come from modeled SSURGO/SoilGrids data —
            the two cards answer different questions.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statValue}>{value}</span>
      {sub && <span className={css.statSub}>{sub}</span>}
    </div>
  );
}
