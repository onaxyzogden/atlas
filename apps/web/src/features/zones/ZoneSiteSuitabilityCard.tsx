/**
 * §8 ZoneSiteSuitabilityCard — zone × site-data layer conflict audit.
 *
 * The existing `ZoneConflictDetector` finds geometric overlaps,
 * incompatible adjacencies (livestock vs spiritual, etc.), and regulatory
 * misfits against the zoning permitted_uses list. What it does not catch
 * is the *physical-site* dimension: a habitation zone sitting in a FEMA
 * flood zone, an annual-crop zone on poorly-drained soil, a livestock zone
 * adjacent to a significant wetland, or a structure zone implied by
 * "infrastructure" on a >15° mean-slope parcel.
 *
 * This card runs each zone × the parcel-level signals already loaded by
 * the Hydrology / Decision panels (`wetlands_flood.flood_zone`,
 * `wetlands_flood.has_significant_wetland`, `elevation.mean_slope_deg`,
 * `soils.hydrologic_group`, `soils.organic_matter_pct`) and surfaces
 * tone-coded advisories per zone. Parcel-level signals apply uniformly to
 * every zone drawn on this parcel — the card honestly says so. Pure
 * presentation, no shared math, no map writes, no zone-store mutation.
 */
import { useMemo } from 'react';
import type { LandZone, ZoneCategory } from '../../store/zoneStore.js';
import type { SiteData } from '../../store/siteDataStore.js';
import { getLayerSummary } from '../../store/siteDataStore.js';
import css from './ZoneSiteSuitabilityCard.module.css';

interface FloodWetlandSummary {
  flood_zone?: string;
  has_significant_wetland?: boolean;
}

interface ElevationSummary {
  mean_slope_deg?: number;
}

interface SoilsSummary {
  hydrologic_group?: string;
  organic_matter_pct?: number | string;
}

interface Props {
  zones: LandZone[];
  siteData: SiteData | null;
}

type Tone = 'good' | 'fair' | 'poor';

interface ZoneFinding {
  zoneId: string;
  zoneName: string;
  zoneCategory: ZoneCategory;
  tone: Tone;
  headline: string;
  detail: string;
  basis: string[];
}

const SETTLEMENT_CATS = new Set<ZoneCategory>(['habitation', 'infrastructure', 'commons', 'retreat', 'education', 'spiritual']);
const ANNUAL_CULT_CATS = new Set<ZoneCategory>(['food_production']);
const LIVESTOCK_CATS = new Set<ZoneCategory>(['livestock']);

const FLOOD_HIGH_RISK = new Set(['A', 'AE', 'AH', 'AO', 'V', 'VE', 'A99']);
const FLOOD_MOD_RISK = new Set(['B', 'X500', 'SHADED X', 'SHADED-X']);
// Hydrologic group: A = well-drained, B = moderate, C = slow, D = very slow
const POOR_DRAINAGE_GROUPS = new Set(['C', 'D', 'C/D']);

export default function ZoneSiteSuitabilityCard({ zones, siteData }: Props) {
  const floodLayer = siteData ? getLayerSummary<FloodWetlandSummary>(siteData, 'wetlands_flood') : null;
  const elevLayer = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
  const soilsLayer = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

  const findings = useMemo<ZoneFinding[]>(() => {
    return buildFindings(zones, floodLayer, elevLayer, soilsLayer);
  }, [zones, floodLayer, elevLayer, soilsLayer]);

  const inputCount = useMemo(() => {
    let n = 0;
    if (floodLayer?.flood_zone) n++;
    if (floodLayer?.has_significant_wetland != null) n++;
    if (elevLayer?.mean_slope_deg != null) n++;
    if (soilsLayer?.hydrologic_group) n++;
    return n;
  }, [floodLayer, elevLayer, soilsLayer]);

  const counts = useMemo(() => ({
    poor: findings.filter((f) => f.tone === 'poor').length,
    fair: findings.filter((f) => f.tone === 'fair').length,
    good: findings.filter((f) => f.tone === 'good').length,
  }), [findings]);

  const inputBadgeCls = inputCount >= 3 ? css.badgeGood : inputCount >= 2 ? css.badgeFair : css.badgePoor;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Zone × Site Suitability</h3>
          <p className={css.hint}>
            Cross-references each drawn zone against parcel-level site signals
            (FEMA flood zone, significant wetland presence, mean slope, soil
            hydrologic group). Catches the physical-site conflicts the
            geometric detector cannot — a habitation in a flood zone, an
            annual crop on poorly-drained soil, livestock near a wetland.
          </p>
        </div>
        <span className={`${css.badge} ${inputBadgeCls}`}>
          {inputCount}/4 LAYERS
        </span>
      </div>

      {zones.length === 0 ? (
        <div className={css.empty}>Draw at least one zone to run the suitability audit.</div>
      ) : inputCount === 0 ? (
        <div className={css.empty}>
          No site-data signals available yet. Run a Site Intelligence pass to
          populate the wetlands/flood, elevation, and soils layers — then this
          card will surface zone-by-zone advisories.
        </div>
      ) : findings.length === 0 ? (
        <div className={`${css.summary} ${css.summary_clean}`}>
          <span className={css.summaryTag}>NO CONFLICTS</span>
          All {zones.length} zone{zones.length === 1 ? '' : 's'} pass the parcel-level
          flood, wetland, slope, and drainage checks.
        </div>
      ) : (
        <>
          <div className={css.counts}>
            {counts.poor > 0 && <span className={`${css.countChip} ${css.countPoor}`}>{counts.poor} blocking</span>}
            {counts.fair > 0 && <span className={`${css.countChip} ${css.countFair}`}>{counts.fair} caution</span>}
            {counts.good > 0 && <span className={`${css.countChip} ${css.countGood}`}>{counts.good} aligned</span>}
          </div>
          <ul className={css.list}>
            {findings.map((f, i) => (
              <li key={`${f.zoneId}-${i}`} className={`${css.row} ${css[`tone_${f.tone}`]}`}>
                <div className={css.rowHead}>
                  <div>
                    <span className={css.rowZone}>{f.zoneName}</span>
                    <span className={css.rowCat}>{categoryLabel(f.zoneCategory)}</span>
                  </div>
                  <span className={`${css.rowTone} ${css[`tag_${f.tone}`]}`}>{f.tone.toUpperCase()}</span>
                </div>
                <div className={css.rowHeadline}>{f.headline}</div>
                <div className={css.rowDetail}>{f.detail}</div>
                <div className={css.rowBasis}><em>Basis:</em> {f.basis.join(' · ')}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={css.footnote}>
        Site signals are summarized at the parcel level — they apply uniformly
        across every zone you draw. For per-zone precision (e.g., flood polygon
        intersecting a specific zone polygon), wait on the upstream
        wetlands/flood layer to expose geometry; this card catches the
        category-level mismatch without it.
      </p>
    </div>
  );
}

function buildFindings(
  zones: LandZone[],
  flood: FloodWetlandSummary | null,
  elev: ElevationSummary | null,
  soils: SoilsSummary | null,
): ZoneFinding[] {
  const out: ZoneFinding[] = [];

  const floodZone = flood?.flood_zone?.toUpperCase().trim() ?? null;
  const floodTone: Tone | null = floodZone
    ? (FLOOD_HIGH_RISK.has(floodZone) ? 'poor' : FLOOD_MOD_RISK.has(floodZone) ? 'fair' : null)
    : null;
  const hasWetland = flood?.has_significant_wetland === true;
  const slopeDeg = elev?.mean_slope_deg ?? null;
  const drainage = soils?.hydrologic_group?.toUpperCase().trim() ?? null;
  const poorDrainage = drainage ? POOR_DRAINAGE_GROUPS.has(drainage) : false;

  for (const z of zones) {
    // 1. Flood-zone conflicts for settlement-class zones
    if (floodTone && SETTLEMENT_CATS.has(z.category)) {
      out.push({
        zoneId: z.id,
        zoneName: z.name,
        zoneCategory: z.category,
        tone: floodTone,
        headline: `${categoryLabel(z.category)} on parcel mapped as flood zone ${floodZone}`,
        detail: floodTone === 'poor'
          ? `FEMA flood zone ${floodZone} is a special-flood-hazard area (1%-annual-chance flood). Building or accommodation siting here triggers floodplain-permit requirements, increased insurance premiums, and substantive risk to life-safety. Strongly consider relocating to a non-special-hazard sector or pivoting this zone to a buffer / water-retention use.`
          : `FEMA flood zone ${floodZone} is a moderate / 0.2%-annual-chance area. Habitation and infrastructure siting is permitted but warrants flood-resistant construction, raised foundations, and an evacuation plan. Document mitigation in the project notes.`,
        basis: ['wetlands/flood layer', 'zone category'],
      });
    }

    // 2. Wetland adjacency for livestock + annual crops
    if (hasWetland && (LIVESTOCK_CATS.has(z.category) || ANNUAL_CULT_CATS.has(z.category))) {
      out.push({
        zoneId: z.id,
        zoneName: z.name,
        zoneCategory: z.category,
        tone: 'fair',
        headline: `${categoryLabel(z.category)} on parcel with significant wetland`,
        detail: LIVESTOCK_CATS.has(z.category)
          ? 'Livestock on a wetland-bearing parcel risks E. coli loading, bank trampling, and nutrient runoff into surface water. Maintain ≥30 m vegetated buffers from the wetland edge, fence direct stream access, and provide off-stream water troughs.'
          : 'Annual cultivation on a wetland-bearing parcel risks fertilizer + sediment runoff into the wetland. Maintain a vegetated buffer strip on the down-gradient edge, prefer no-till / cover-cropping, and stage tillage operations away from wet conditions.',
        basis: ['wetlands/flood layer', 'zone category'],
      });
    }

    // 3. Slope conflicts for habitation/infrastructure
    if (slopeDeg != null && slopeDeg >= 15 && (z.category === 'habitation' || z.category === 'infrastructure' || z.category === 'access')) {
      out.push({
        zoneId: z.id,
        zoneName: z.name,
        zoneCategory: z.category,
        tone: slopeDeg >= 25 ? 'poor' : 'fair',
        headline: `${categoryLabel(z.category)} on parcel averaging ${slopeDeg.toFixed(1)}° slope`,
        detail: slopeDeg >= 25
          ? `Mean slope ${slopeDeg.toFixed(1)}° exceeds the 25° threshold for unmodified ${z.category} siting. Expect substantial earthwork, retaining structures, switchback access, and elevated foundation costs. Consider relocating this zone to a flatter sector or amending its boundary to capture the gentler ground.`
          : `Mean slope ${slopeDeg.toFixed(1)}° sits in the 15–25° range — workable but warranting terraces, benched pads, or stepped-foundation construction. Budget for additional grading and drainage work.`,
        basis: ['elevation layer', 'zone category'],
      });
    }

    // 4. Drainage conflicts for annual crops + habitation
    if (poorDrainage && (ANNUAL_CULT_CATS.has(z.category) || z.category === 'habitation')) {
      out.push({
        zoneId: z.id,
        zoneName: z.name,
        zoneCategory: z.category,
        tone: drainage === 'D' ? 'poor' : 'fair',
        headline: `${categoryLabel(z.category)} on hydrologic-group ${drainage} soil`,
        detail: ANNUAL_CULT_CATS.has(z.category)
          ? `Group ${drainage} soils have very slow infiltration — expect spring waterlogging, delayed planting, and crusting after heavy rain. Prefer raised beds, contour swales upslope, and crops tolerant of seasonal saturation (brassicas over alliums; rice over wheat). Drain tiling may be required for row crops.`
          : `Group ${drainage} soils sustain a high water table after rain — wet basements, septic-leachfield failure, and slab-on-grade cracking are likely. Specify perimeter drains, raised slabs, and engineered septic; consider an alternative footprint on better-drained ground.`,
        basis: ['soils layer', 'zone category'],
      });
    }
  }

  return out;
}

function categoryLabel(c: ZoneCategory): string {
  switch (c) {
    case 'habitation': return 'Habitation';
    case 'food_production': return 'Food production';
    case 'livestock': return 'Livestock';
    case 'commons': return 'Commons';
    case 'spiritual': return 'Spiritual';
    case 'education': return 'Education';
    case 'retreat': return 'Retreat';
    case 'conservation': return 'Conservation';
    case 'water_retention': return 'Water retention';
    case 'infrastructure': return 'Infrastructure';
    case 'access': return 'Access';
    case 'buffer': return 'Buffer';
    case 'future_expansion': return 'Future expansion';
    default: return String(c);
  }
}
