/**
 * §17 EcologicalRiskWarningsCard — scans site-data layers + entity
 * placements for ecological risk patterns and surfaces severity-tagged
 * interpretation lines. Pairs with the §17 detector cluster
 * (Assumption / NeedsSiteVisit / AlternativeLayout / DesignBrief) by
 * naming the *concrete failure modes* the steward should design
 * against, not just the gaps in input data.
 *
 * Each warning carries:
 *   - Title: the pattern detected
 *   - Why: which inputs and which placed entities trigger it
 *   - Interpretation: the ecological consequence the steward should
 *     plan around
 *
 * Pure deterministic scan — no shared math, no LLM call. The "AI DRAFT"
 * badge tracks the §17 spec language only.
 *
 * Closes manifest §17 `ai-risk-warnings-ecological-interpretation`
 * (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './EcologicalRiskWarningsCard.module.css';

interface Props {
  project: LocalProject;
}

type Severity = 'high' | 'medium' | 'low';
type Category = 'erosion' | 'flooding' | 'water_quality' | 'biodiversity' | 'placement';

interface Warning {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  why: string;
  interpretation: string;
}

interface SoilSummary {
  hydrologic_group?: string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
  impervious_pct?: number | string;
}
interface WetlandsSummary {
  wetland_pct?: number;
  riparian_buffer_m?: number;
  flood_zone?: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  erosion: 'Erosion & soil loss',
  flooding: 'Flooding & regulated water',
  water_quality: 'Water quality',
  biodiversity: 'Biodiversity & habitat',
  placement: 'Placement constraints',
};

const CATEGORY_ORDER: Category[] = [
  'erosion',
  'flooding',
  'water_quality',
  'biodiversity',
  'placement',
];

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};

const FEMA_HIGH_RISK_ZONES = new Set(['A', 'AE', 'AH', 'AO', 'AR', 'V', 'VE']);

const TILLED_CROP_TYPES = new Set(['row_crop', 'market_garden', 'garden_bed']);

function parsePct(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EcologicalRiskWarningsCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const siteData = useSiteData(project.id);

  const warnings = useMemo<Warning[]>(() => {
    const out: Warning[] = [];
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const elevation = siteData
      ? getLayerSummary<ElevationSummary>(siteData, 'elevation')
      : null;
    const landcover = siteData
      ? getLayerSummary<LandCoverSummary>(siteData, 'landcover')
      : null;
    const wetlands = siteData
      ? getLayerSummary<WetlandsSummary>(siteData, 'wetlands')
      : null;

    const slopeDeg = elevation?.mean_slope_deg;
    const canopyPct = parsePct(landcover?.tree_canopy_pct);
    const imperviousPct = parsePct(landcover?.impervious_pct);
    const wetlandPct = wetlands?.wetland_pct;
    const floodZone = wetlands?.flood_zone;
    const isHighRiskFlood =
      typeof floodZone === 'string' && FEMA_HIGH_RISK_ZONES.has(floodZone.toUpperCase());

    // ── erosion ───────────────────────────────────────────────────────
    if (typeof slopeDeg === 'number' && slopeDeg > 12 && canopyPct != null && canopyPct < 20) {
      out.push({
        id: 'erosion-steep-bare',
        category: 'erosion',
        severity: 'high',
        title: `Steep slope (${slopeDeg.toFixed(1)}\u00B0) with low tree canopy (${canopyPct.toFixed(0)}%)`,
        why:
          'Mean slope exceeds 12\u00B0 and tree canopy sits under 20% \u2014 the parcel lacks the rooted-ground cover needed to anchor soil at this gradient.',
        interpretation:
          'High sediment-loss exposure: rill and gully formation likely after intense rain, with topsoil moving downhill into drainage paths. Plan keyline swales, contour planting, or perennial cover before clearing or grazing.',
      });
    } else if (typeof slopeDeg === 'number' && slopeDeg > 8 && canopyPct != null && canopyPct < 30) {
      out.push({
        id: 'erosion-moderate-thin',
        category: 'erosion',
        severity: 'medium',
        title: `Moderate slope (${slopeDeg.toFixed(1)}\u00B0) with thin canopy (${canopyPct.toFixed(0)}%)`,
        why:
          'Slope and canopy sit just inside the watch range \u2014 not catastrophic, but the soil-retention margin is thin.',
        interpretation:
          'Sheet erosion will progress slowly under rain events. Acceptable for established perennial systems; risky for tilled annuals or intensive grazing.',
      });
    }

    const tilledOnSlope = cropAreas.filter(
      (c) => TILLED_CROP_TYPES.has(c.type),
    ).length;
    if (
      typeof slopeDeg === 'number' &&
      slopeDeg > 6 &&
      tilledOnSlope > 0
    ) {
      out.push({
        id: 'erosion-tilled-on-slope',
        category: 'erosion',
        severity: 'medium',
        title: `${tilledOnSlope} tilled crop area${tilledOnSlope === 1 ? '' : 's'} on ${slopeDeg.toFixed(1)}\u00B0 slope`,
        why:
          'Row-crop, market-garden, or garden-bed polygons are placed on a parcel with mean slope above 6\u00B0.',
        interpretation:
          'Tillage on slope drives downhill soil movement at every cultivation pass. Strongly consider contour beds, cover-crop rotation, or converting upper polygons to perennial.',
      });
    }

    // ── flooding & regulated water ────────────────────────────────────
    if (isHighRiskFlood && structures.length > 0) {
      out.push({
        id: 'flooding-structures-in-zone',
        category: 'flooding',
        severity: 'high',
        title: `${structures.length} structure${structures.length === 1 ? '' : 's'} placed inside FEMA Zone ${floodZone}`,
        why:
          'Parcel sits in a FEMA-mapped Special Flood Hazard Area. Any structure footprint inside that boundary triggers building-permit, insurance, and (often) elevation-certificate requirements.',
        interpretation:
          'Permit and insurance pathway changes substantially. Verify each footprint\u2019s location relative to the flood polygon; consider re-siting to higher ground or designing the lowest floor above base-flood elevation.',
      });
    } else if (isHighRiskFlood) {
      out.push({
        id: 'flooding-zone-exists',
        category: 'flooding',
        severity: 'medium',
        title: `Parcel intersects FEMA flood Zone ${floodZone}`,
        why:
          'No structures placed yet, but the regulated flood polygon is within the parcel and will constrain future siting.',
        interpretation:
          'Treat the flood polygon as a hard constraint when siting future buildings, septic, wells, and high-value annuals. Note it on the master plan.',
      });
    }

    if (typeof wetlandPct === 'number' && wetlandPct > 10 && structures.length > 0) {
      out.push({
        id: 'flooding-wetland-structures',
        category: 'flooding',
        severity: 'high',
        title: `${wetlandPct.toFixed(1)}% wetland coverage with ${structures.length} structure${structures.length === 1 ? '' : 's'} placed`,
        why:
          'NWI wetland coverage is meaningful and at least one structure is on the map. Wetlands are federally regulated under Clean Water Act \u00A7404 \u2014 placing fill or footprints inside (or adjacent to) wetland boundaries can trigger Army Corps permitting.',
        interpretation:
          'Confirm each footprint is outside the delineated wetland and any required buffer. Even a 10-foot setback can be the difference between a routine permit and a Section 404 review.',
      });
    }

    // ── water quality ─────────────────────────────────────────────────
    const hasRiparian = typeof wetlands?.riparian_buffer_m === 'number';
    if (paddocks.length > 0 && typeof wetlandPct === 'number' && wetlandPct > 0 && !hasRiparian) {
      out.push({
        id: 'water-quality-paddock-no-buffer',
        category: 'water_quality',
        severity: 'medium',
        title: `${paddocks.length} paddock${paddocks.length === 1 ? '' : 's'} placed with wetland coverage and no recorded riparian buffer`,
        why:
          'Wetland features are present on the parcel but no riparian-buffer width is logged in the wetlands layer. Livestock manure and direct stream access are the dominant non-point-source pathways.',
        interpretation:
          'Plan a vegetated buffer (typically 30\u201350 ft for grazing land) between paddock fences and any flowing water, with off-stream watering. This is also the cheapest form of water-quality regulatory compliance.',
      });
    }

    if (
      soil?.hydrologic_group === 'D' &&
      cropAreas.filter((c) => TILLED_CROP_TYPES.has(c.type)).length > 0
    ) {
      out.push({
        id: 'water-quality-hsg-d-tilled',
        category: 'water_quality',
        severity: 'medium',
        title: 'Tilled annuals on hydrologic-group D soil',
        why:
          'Soil hydrologic group D drains very slowly; combined with tilled annuals it sets up high runoff coefficients during storms.',
        interpretation:
          'Expect ponding after heavy rain and amplified surface runoff carrying nutrients off-site. Cover crops, residue retention, and contour shaping all help; subsurface drainage is the heavy intervention.',
      });
    }

    // ── biodiversity / habitat ────────────────────────────────────────
    if (canopyPct != null && canopyPct < 5 && paddocks.length > 0) {
      out.push({
        id: 'biodiversity-paddock-no-canopy',
        category: 'biodiversity',
        severity: 'medium',
        title: `Paddocks placed with under 5% tree canopy (${canopyPct.toFixed(0)}%)`,
        why:
          'NLCD reports near-zero canopy and at least one paddock is on the map.',
        interpretation:
          'Livestock heat stress and welfare risk in summer; predator-cover gradient is also poor for ground-nesting birds. Even sparse silvopasture (one tree per 0.1\u20130.2 ac) measurably lifts both signals.',
      });
    }

    if (canopyPct != null && canopyPct < 10 && cropAreas.length === 0 && paddocks.length === 0) {
      out.push({
        id: 'biodiversity-bare-parcel',
        category: 'biodiversity',
        severity: 'low',
        title: `Parcel reads as functionally bare (${canopyPct.toFixed(0)}% canopy, no perennial polygons)`,
        why:
          'Land cover and entity stores both indicate minimal woody / perennial structure.',
        interpretation:
          'Pollinator, soil-microbe, and insectivorous-bird baselines are all near zero \u2014 useful for the §11 ecology rollup to flag as "developing" rather than "depleted." Establishing even a single hedgerow or windbreak measurably lifts the baseline.',
      });
    }

    // ── placement / site context ──────────────────────────────────────
    if (typeof slopeDeg === 'number' && slopeDeg > 15 && structures.length > 0) {
      out.push({
        id: 'placement-structures-steep',
        category: 'placement',
        severity: 'medium',
        title: `${structures.length} structure${structures.length === 1 ? '' : 's'} on parcel averaging ${slopeDeg.toFixed(1)}\u00B0 slope`,
        why:
          'Mean slope exceeds 15\u00B0 across the parcel. Steeper micro-sites are likely under any given footprint.',
        interpretation:
          'Foundation cost and complexity rise sharply (engineered footings, retaining, terracing). Drainage routing becomes a design constraint rather than an afterthought. Consider concentrating structures on the flattest contour shoulder.',
      });
    }

    if (
      imperviousPct != null &&
      imperviousPct > 25 &&
      typeof wetlandPct === 'number' &&
      wetlandPct > 0
    ) {
      out.push({
        id: 'placement-impervious-near-wetland',
        category: 'placement',
        severity: 'medium',
        title: `${imperviousPct.toFixed(0)}% impervious cover with wetland features present`,
        why:
          'Impervious surface is meaningful and the parcel hosts NWI wetland features.',
        interpretation:
          'Concentrated stormwater runoff is reaching sensitive areas. Sheet-flow disconnection \u2014 splash blocks, vegetated swales, gravel-shoulder drives \u2014 is the highest-leverage retrofit.',
      });
    }

    return out.sort((a, b) => {
      const da = CATEGORY_ORDER.indexOf(a.category);
      const db = CATEGORY_ORDER.indexOf(b.category);
      if (da !== db) return da - db;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
  }, [project, structures, cropAreas, paddocks, siteData]);

  const counts = useMemo(() => {
    const total = warnings.length;
    const high = warnings.filter((w) => w.severity === 'high').length;
    const medium = warnings.filter((w) => w.severity === 'medium').length;
    const categories = new Set(warnings.map((w) => w.category)).size;
    return { total, high, medium, categories };
  }, [warnings]);

  const overallTone =
    counts.total === 0
      ? css.tone_good
      : counts.high > 0
        ? css.tone_poor
        : counts.medium > 0
          ? css.tone_fair
          : css.tone_muted;

  const grouped = useMemo(() => {
    const map: Partial<Record<Category, Warning[]>> = {};
    for (const w of warnings) {
      const arr = map[w.category] ?? [];
      arr.push(w);
      map[w.category] = arr;
    }
    return CATEGORY_ORDER.flatMap((c) => {
      const items = map[c];
      if (!items || items.length === 0) return [];
      return [{ category: c, items }];
    });
  }, [warnings]);

  return (
    <section className={css.card} aria-label="Ecological risk warnings">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Ecological risk warnings</h3>
          <p className={css.cardHint}>
            Concrete failure modes detected by crossing site-data layers
            (slope, canopy, hydrologic group, flood zone, wetlands) with
            placed entities. Each row names the{' '}
            <em>ecological consequence</em> a steward should plan around &mdash;
            not just a data gap.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={`${css.summaryRow} ${overallTone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.total}</div>
          <div className={css.summaryLabel}>Warnings</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.categories}</div>
          <div className={css.summaryLabel}>Categories</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.high}</div>
          <div className={css.summaryLabel}>High risk</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.medium}</div>
          <div className={css.summaryLabel}>Medium risk</div>
        </div>
      </div>

      {counts.total === 0 && (
        <div className={css.empty}>
          No ecological-risk patterns matched. Either the underlying
          site-data layers and entity placements don&rsquo;t trigger the
          watched patterns yet, or the inputs aren&rsquo;t loaded &mdash;
          revisit after adding layers or placing entities.
        </div>
      )}

      {grouped.map(({ category, items }) => (
        <div key={category} className={css.categoryBlock}>
          <h4 className={css.categoryTitle}>{CATEGORY_LABEL[category]}</h4>
          <ul className={css.list}>
            {items.map((w) => (
              <li
                key={w.id}
                className={`${css.row} ${
                  w.severity === 'high'
                    ? css.sev_high
                    : w.severity === 'medium'
                      ? css.sev_med
                      : css.sev_low
                }`}
              >
                <div className={css.rowHead}>
                  <span
                    className={`${css.sevTag} ${
                      w.severity === 'high'
                        ? css.tag_high
                        : w.severity === 'medium'
                          ? css.tag_med
                          : css.tag_low
                    }`}
                  >
                    {SEVERITY_LABEL[w.severity]}
                  </span>
                  <span className={css.rowTitle}>{w.title}</span>
                </div>
                <div className={css.rowBody}>
                  <div className={css.line}>
                    <span className={css.lineLabel}>Trigger:</span> {w.why}
                  </div>
                  <div className={css.line}>
                    <span className={css.lineLabel}>Interpretation:</span>{' '}
                    {w.interpretation}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How warnings are detected:</em> deterministic threshold checks
        crossing slope, canopy, soil hydrologic group, FEMA flood zone,
        NWI wetland coverage, and impervious surface against placed
        structures, paddocks, and crop areas. Same inputs always produce
        the same warnings &mdash; no LLM call. Severity bands are
        calibrated for an early-stage steward audience, not a regulatory
        review.
      </p>
    </section>
  );
}
