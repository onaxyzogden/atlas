/**
 * §12 ShadeSuccessionForecastCard — multi-decade canopy / shade succession arc.
 *
 * For each perennial cluster (orchard / food_forest / silvopasture / windbreak /
 * shelterbelt), project shade footprint at Y5 / Y10 / Y20 / Y50. Logistic-ish
 * growth curve to maturity, then senescence applied to short-lived pioneers
 * (lifespan < 35y) so their shade contribution drops to 0 by Y50.
 *
 * Surfaces successional choices: which species are pioneers (drop out by Y30-40),
 * which are climax (still going at Y50), and where shade gaps will emerge as
 * pioneers senesce without successional understory placed.
 *
 * Pure presentation: reads cropStore only. No new entities, no shared math.
 */

import { useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import s from './ShadeSuccessionForecastCard.module.css';

interface Props {
  projectId: string;
}

const ORCHARD_LIKE_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard',
  'food_forest',
  'silvopasture',
  'windbreak',
  'shelterbelt',
]);

type SuccessionRole = 'pioneer' | 'midstory' | 'climax' | 'unknown';

interface SpeciesEntry {
  key: string;
  diameterM: number;
  lifespanY: number;
  role: SuccessionRole;
}

/**
 * Species → {mature canopy, lifespan, successional role}. Substring match,
 * lowercase. Lifespans from Mollison/Jacke/Shepard + USDA hardwood references.
 * Roles classify by lifespan: pioneer <35y, midstory 35-80y, climax >80y.
 */
const SUCCESSION_TABLE: ReadonlyArray<SpeciesEntry> = [
  // dwarves first (substring race)
  { key: 'dwarf', diameterM: 3.5, lifespanY: 25, role: 'pioneer' },
  { key: 'semi-dwarf', diameterM: 4.5, lifespanY: 30, role: 'pioneer' },
  { key: 'semidwarf', diameterM: 4.5, lifespanY: 30, role: 'pioneer' },
  // long-lived nuts (climax)
  { key: 'walnut', diameterM: 14, lifespanY: 150, role: 'climax' },
  { key: 'pecan', diameterM: 12, lifespanY: 200, role: 'climax' },
  { key: 'chestnut', diameterM: 14, lifespanY: 200, role: 'climax' },
  { key: 'oak', diameterM: 16, lifespanY: 250, role: 'climax' },
  // medium-lived nuts / mulberry (midstory)
  { key: 'almond', diameterM: 9, lifespanY: 50, role: 'midstory' },
  { key: 'mulberry', diameterM: 9, lifespanY: 100, role: 'climax' },
  { key: 'persimmon', diameterM: 8, lifespanY: 75, role: 'midstory' },
  // pome fruit (midstory — typically 50y commercial life)
  { key: 'apple', diameterM: 7, lifespanY: 60, role: 'midstory' },
  { key: 'pear', diameterM: 7, lifespanY: 75, role: 'midstory' },
  { key: 'quince', diameterM: 5, lifespanY: 50, role: 'midstory' },
  // stone fruit (pioneer — short commercial life 20-25y)
  { key: 'plum', diameterM: 6, lifespanY: 25, role: 'pioneer' },
  { key: 'apricot', diameterM: 6, lifespanY: 25, role: 'pioneer' },
  { key: 'peach', diameterM: 5.5, lifespanY: 20, role: 'pioneer' },
  { key: 'nectarine', diameterM: 5.5, lifespanY: 20, role: 'pioneer' },
  { key: 'cherry', diameterM: 6, lifespanY: 35, role: 'midstory' },
  // mediterranean (climax — olives can live centuries)
  { key: 'olive', diameterM: 8, lifespanY: 300, role: 'climax' },
  { key: 'fig', diameterM: 6, lifespanY: 70, role: 'midstory' },
  { key: 'pomegranate', diameterM: 4, lifespanY: 200, role: 'climax' },
  { key: 'citrus', diameterM: 6, lifespanY: 50, role: 'midstory' },
  { key: 'lemon', diameterM: 5, lifespanY: 50, role: 'midstory' },
  { key: 'orange', diameterM: 6, lifespanY: 60, role: 'midstory' },
  // shrubs
  { key: 'hazel', diameterM: 4.5, lifespanY: 80, role: 'midstory' },
  { key: 'filbert', diameterM: 4.5, lifespanY: 80, role: 'midstory' },
  { key: 'elder', diameterM: 4, lifespanY: 60, role: 'midstory' },
  { key: 'blueberry', diameterM: 1.5, lifespanY: 50, role: 'midstory' },
  { key: 'currant', diameterM: 1.5, lifespanY: 15, role: 'pioneer' },
  { key: 'gooseberry', diameterM: 1.5, lifespanY: 15, role: 'pioneer' },
  { key: 'raspberry', diameterM: 1.2, lifespanY: 10, role: 'pioneer' },
  { key: 'blackberry', diameterM: 1.5, lifespanY: 12, role: 'pioneer' },
  // windbreak / nitrogen (mostly pioneers; pine/cedar climax)
  { key: 'poplar', diameterM: 8, lifespanY: 30, role: 'pioneer' },
  { key: 'willow', diameterM: 7, lifespanY: 30, role: 'pioneer' },
  { key: 'alder', diameterM: 7, lifespanY: 40, role: 'midstory' },
  { key: 'locust', diameterM: 9, lifespanY: 90, role: 'climax' },
  { key: 'mesquite', diameterM: 8, lifespanY: 200, role: 'climax' },
  { key: 'pine', diameterM: 9, lifespanY: 200, role: 'climax' },
  { key: 'cedar', diameterM: 8, lifespanY: 300, role: 'climax' },
  { key: 'cypress', diameterM: 6, lifespanY: 600, role: 'climax' },
];

const FALLBACK: SpeciesEntry = { key: '', diameterM: 6, lifespanY: 50, role: 'unknown' };

const TIMEPOINTS = [5, 10, 20, 50] as const;
type Year = (typeof TIMEPOINTS)[number];

const TYPE_LABEL: Record<CropAreaType, string> = {
  orchard: 'Orchard',
  food_forest: 'Food forest',
  silvopasture: 'Silvopasture',
  windbreak: 'Windbreak',
  shelterbelt: 'Shelterbelt',
  row_crop: 'Row crop',
  garden_bed: 'Garden bed',
  nursery: 'Nursery',
  market_garden: 'Market garden',
  pollinator_strip: 'Pollinator strip',
};

const ROLE_LABEL: Record<SuccessionRole, string> = {
  pioneer: 'Pioneer',
  midstory: 'Midstory',
  climax: 'Climax',
  unknown: 'Unknown',
};

function lookupSpecies(species: string): SpeciesEntry {
  const lc = species.toLowerCase();
  for (const e of SUCCESSION_TABLE) {
    if (lc.includes(e.key)) return e;
  }
  return { ...FALLBACK, key: species };
}

/**
 * Effective canopy diameter at year y, accounting for:
 *   - growth curve (logistic-ish: Y5 ≈ 45%, Y10 ≈ 75%, Y20 ≈ 100%)
 *   - senescence (linear taper from 80% of lifespan to lifespan = 0)
 */
function diameterAt(y: number, mature: number, lifespanY: number): number {
  // senescence: drops to zero between 80% lifespan and lifespan
  const senesceStart = lifespanY * 0.8;
  if (y >= lifespanY) return 0;
  if (y > senesceStart) {
    const remaining = (lifespanY - y) / (lifespanY - senesceStart);
    return mature * remaining;
  }
  // growth: logistic-ish, hits ~100% at year 20
  let growth: number;
  if (y <= 5) growth = 0.45 * (y / 5);
  else if (y <= 10) growth = 0.45 + 0.30 * ((y - 5) / 5);
  else if (y <= 20) growth = 0.75 + 0.25 * ((y - 10) / 10);
  else growth = 1.0;
  return mature * Math.min(1, growth);
}

interface ClusterEval {
  area: CropArea;
  speciesEntries: SpeciesEntry[];
  /** total canopy m² across all species per timepoint, area-weighted by 1 tree per species nominal */
  shadeM2ByYear: Record<Year, number>;
  /** % of species count by role */
  roleMix: { pioneer: number; midstory: number; climax: number; unknown: number };
  /** shade lost between Y20 and Y50 due to pioneer senescence */
  pioneerCollapsePct: number;
  /** flagged when >50% of shade comes from pioneers and <20% from climax */
  hasGap: boolean;
}

function evaluateCluster(area: CropArea): ClusterEval {
  const species = (area.species ?? []).map(lookupSpecies);
  const pioneerCount = species.filter((s) => s.role === 'pioneer').length;
  const midstoryCount = species.filter((s) => s.role === 'midstory').length;
  const climaxCount = species.filter((s) => s.role === 'climax').length;
  const unknownCount = species.filter((s) => s.role === 'unknown').length;
  const total = species.length || 1;

  const shadeM2ByYear: Record<Year, number> = { 5: 0, 10: 0, 20: 0, 50: 0 };
  for (const sp of species) {
    for (const y of TIMEPOINTS) {
      const d = diameterAt(y, sp.diameterM, sp.lifespanY);
      // canopy area per representative tree; aggregate per species
      shadeM2ByYear[y] += Math.PI * (d / 2) ** 2;
    }
  }

  const collapse = shadeM2ByYear[20] > 0
    ? Math.max(0, 1 - shadeM2ByYear[50] / shadeM2ByYear[20])
    : 0;

  const pioneerShare = pioneerCount / total;
  const climaxShare = climaxCount / total;
  const hasGap = species.length > 0 && pioneerShare > 0.5 && climaxShare < 0.2;

  return {
    area,
    speciesEntries: species,
    shadeM2ByYear,
    roleMix: {
      pioneer: pioneerCount / total,
      midstory: midstoryCount / total,
      climax: climaxCount / total,
      unknown: unknownCount / total,
    },
    pioneerCollapsePct: collapse,
    hasGap,
  };
}

function formatShade(m2: number): string {
  if (m2 < 1) return '0 m²';
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  if (m2 >= 1000) return `${(m2 / 1000).toFixed(1)}k m²`;
  return `${Math.round(m2)} m²`;
}

export default function ShadeSuccessionForecastCard({ projectId }: Props) {
  const allCropAreas = useCropStore((st) => st.cropAreas);

  const clusters = useMemo(
    () => allCropAreas.filter((a) => a.projectId === projectId && ORCHARD_LIKE_TYPES.has(a.type)),
    [allCropAreas, projectId],
  );

  const evals = useMemo(() => clusters.map(evaluateCluster), [clusters]);

  const aggregateByYear: Record<Year, number> = useMemo(() => {
    const acc: Record<Year, number> = { 5: 0, 10: 0, 20: 0, 50: 0 };
    for (const e of evals) for (const y of TIMEPOINTS) acc[y] += e.shadeM2ByYear[y];
    return acc;
  }, [evals]);

  const peakYear: Year = TIMEPOINTS.reduce<Year>(
    (best, y) => (aggregateByYear[y] > aggregateByYear[best] ? y : best),
    5,
  );
  const peakShade = aggregateByYear[peakYear];
  const finalShade = aggregateByYear[50];
  const totalCollapsePct = peakShade > 0 ? Math.max(0, 1 - finalShade / peakShade) : 0;
  const gapClusters = evals.filter((e) => e.hasGap);

  if (clusters.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.head}>
          <h3 className={s.title}>Shade succession forecast</h3>
          <span className={s.modeBadge}>P3 {'\u00B7'} §12</span>
        </div>
        <div className={s.empty}>
          No orchard, food-forest, silvopasture, windbreak, or shelterbelt clusters placed yet.
          Place perennial clusters with species to see Y5 / Y10 / Y20 / Y50 shade arc.
        </div>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Shade succession forecast</h3>
          <p className={s.hint}>
            Multi-decade canopy arc across {clusters.length} perennial cluster(s). Pioneer species (peach, plum,
            poplar, willow, currants) senesce by Y30{'\u2013'}Y40; climax species (oak, walnut, olive, pine, cedar)
            keep going at Y50. Watch for shade collapse without successional understory.
          </p>
        </div>
        <span className={s.modeBadge}>P3 {'\u00B7'} §12</span>
      </div>

      {/* Aggregate timeline */}
      <div className={s.timelineLabel}>Total canopy area across all clusters</div>
      <div className={s.timeline}>
        {TIMEPOINTS.map((y) => {
          const v = aggregateByYear[y];
          const pct = peakShade > 0 ? (v / peakShade) * 100 : 0;
          const isPast = y === 50 && totalCollapsePct > 0.2;
          return (
            <div key={y} className={s.timelineCell}>
              <div className={s.timelineYear}>Y{y}</div>
              <div className={s.timelineBarTrack}>
                <div
                  className={`${s.timelineBarFill} ${isPast ? s.barAmber : pct >= 90 ? s.barSage : s.barNeutral}`}
                  style={{ height: `${Math.max(2, pct)}%` }}
                />
              </div>
              <div className={s.timelineValue}>{formatShade(v)}</div>
            </div>
          );
        })}
      </div>

      {/* Collapse summary */}
      {totalCollapsePct > 0.05 && (
        <div className={`${s.calloutBox} ${totalCollapsePct > 0.3 ? s.calloutRust : s.calloutAmber}`}>
          <div className={s.calloutTitle}>
            {Math.round(totalCollapsePct * 100)}% shade collapse from peak ({`Y${peakYear}`}) to Y50
          </div>
          <div className={s.calloutBody}>
            {totalCollapsePct > 0.3
              ? 'Most pioneer species will senesce before climax species mature. Plant successional understory now \u2014 climax species placed today are at full size by year 30 just in time.'
              : 'Some shade loss as pioneers senesce. Acceptable if climax species are progressing; reconsider if pioneers dominate any single cluster.'}
          </div>
        </div>
      )}

      {/* Per-cluster breakdown */}
      <div className={s.subhead}>Per cluster</div>
      <div className={s.clusterList}>
        {evals.map((e) => {
          const tone = e.hasGap ? s.clusterRust : e.pioneerCollapsePct > 0.3 ? s.clusterAmber : s.clusterSage;
          return (
            <div key={e.area.id} className={`${s.clusterRow} ${tone}`}>
              <div className={s.clusterHead}>
                <div className={s.clusterName}>
                  {e.area.name || `${TYPE_LABEL[e.area.type]} (unnamed)`}
                </div>
                <div className={s.clusterTypeBadge}>{TYPE_LABEL[e.area.type]}</div>
              </div>
              <div className={s.clusterArc}>
                {TIMEPOINTS.map((y) => (
                  <div key={y} className={s.clusterArcCell}>
                    <div className={s.clusterArcYear}>Y{y}</div>
                    <div className={s.clusterArcShade}>{formatShade(e.shadeM2ByYear[y])}</div>
                  </div>
                ))}
              </div>
              <div className={s.clusterRoles}>
                {(['pioneer', 'midstory', 'climax', 'unknown'] as SuccessionRole[]).map((r) => {
                  const pct = e.roleMix[r] * 100;
                  if (pct === 0) return null;
                  return (
                    <span key={r} className={`${s.roleChip} ${s[`role_${r}`] ?? ''}`}>
                      {ROLE_LABEL[r]} {Math.round(pct)}%
                    </span>
                  );
                })}
              </div>
              {e.hasGap && (
                <div className={s.clusterWarn}>
                  More than half of species are pioneers and fewer than 20% are climax. Shade will collapse around year 30 without successional planting.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className={s.summary}>
        <span><strong>{evals.length}</strong> cluster(s)</span>
        <span><strong>{gapClusters.length}</strong> succession gap(s)</span>
        <span>Peak shade <strong>Y{peakYear}</strong></span>
      </div>

      <div className={s.footnote}>
        Heuristic forecast {'\u2014'} growth curve (logistic-ish to year 20) and species lifespans from
        Mollison/Jacke/Shepard + USDA hardwood references. Per-species canopy aggregated as one
        representative tree per species; planting density is not modeled. Use this for successional
        framing, not stand-density planning.
      </div>
    </div>
  );
}
