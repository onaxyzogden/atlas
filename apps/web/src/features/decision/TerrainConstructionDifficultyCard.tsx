/**
 * §21 TerrainConstructionDifficultyCard — slope premium for placed
 * structures.
 *
 * For each structure on the project, looks up the per-type slope
 * tolerance (a greenhouse needs near-flat terrain; a lookout tolerates
 * steep ground) and compares against the site's `elevation.mean_slope_deg`
 * to classify each structure into a difficulty band: trivial / moderate /
 * challenging / severe / prohibitive. Each band carries a cost-multiplier
 * heuristic (1.0x .. 3.5x) which is multiplied by `deriveInfrastructureCost`
 * to surface an estimated construction premium.
 *
 * The site's elevation summary only carries mean and max slope (no DEM
 * grid is exposed client-side), so individual structure-centroid slope
 * is approximated by the project mean. Where `max_slope_deg` is much
 * greater than the mean, some structures *will* be on steeper terrain
 * than the model assumes — surfaces a hint when the spread is wide.
 *
 * Pure presentation; reads `getLayerSummary<ElevationSummary>` and
 * `useStructureStore`. No shared-package math; no AI.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { deriveInfrastructureCost } from '../structures/footprints.js';
import css from './TerrainConstructionDifficultyCard.module.css';

interface Props {
  project: LocalProject;
}

interface ElevationSummary {
  mean_slope_deg?: number;
  max_slope_deg?: number;
  aspect_dominant?: string;
  min_elevation_m?: number;
  max_elevation_m?: number;
}

// ─── Per-type slope tolerance (degrees) ─────────────────────────────────
// A structure's "moderate" threshold — slopes at or under this value are
// fully workable for that type without exotic engineering. Steeper than
// 1.5x of this puts the project into challenging territory; 2x = severe.
const TYPE_SLOPE_TOLERANCE_DEG: Record<StructureType, number> = {
  greenhouse: 2,        // beds need flat
  classroom: 3,
  bathhouse: 3,
  prayer_space: 3,
  pavilion: 4,
  barn: 4,
  workshop: 4,
  storage: 5,
  cabin: 6,
  yurt: 6,
  earthship: 8,         // designed for hillside cut-and-fill
  animal_shelter: 6,
  compost_station: 5,
  water_pump_house: 5,
  tent_glamping: 7,
  fire_circle: 8,
  lookout: 18,          // hilltop placement is the point
  solar_array: 8,
  well: 10,
  water_tank: 5,
};

const TYPE_LABEL: Record<StructureType, string> = {
  cabin: 'Cabin',
  yurt: 'Yurt',
  pavilion: 'Pavilion',
  greenhouse: 'Greenhouse',
  barn: 'Barn',
  workshop: 'Workshop',
  prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse',
  classroom: 'Classroom',
  storage: 'Storage',
  animal_shelter: 'Animal shelter',
  compost_station: 'Compost station',
  water_pump_house: 'Pump house',
  tent_glamping: 'Tent glamping',
  fire_circle: 'Fire circle',
  lookout: 'Lookout',
  earthship: 'Earthship',
  solar_array: 'Solar array',
  well: 'Well',
  water_tank: 'Water tank',
};

// ─── Difficulty bands ───────────────────────────────────────────────────

type Band = 'trivial' | 'moderate' | 'challenging' | 'severe' | 'prohibitive';

interface BandSpec {
  label: string;
  multiplier: number;
  className: string;
  rationale: string;
}

const BAND_SPEC: Record<Band, BandSpec> = {
  trivial: {
    label: 'Trivial',
    multiplier: 1.0,
    className: '',
    rationale: 'Slope well within type tolerance; standard pad prep.',
  },
  moderate: {
    label: 'Moderate',
    multiplier: 1.3,
    className: '',
    rationale: 'At type tolerance; minor cut-and-fill, leveling pad.',
  },
  challenging: {
    label: 'Challenging',
    multiplier: 1.7,
    className: '',
    rationale: 'Above type tolerance; step foundation, retaining wall likely.',
  },
  severe: {
    label: 'Severe',
    multiplier: 2.4,
    className: '',
    rationale: 'Significant excavation, structural engineering needed.',
  },
  prohibitive: {
    label: 'Prohibitive',
    multiplier: 3.5,
    className: '',
    rationale: 'Reconsider placement; cost dominates everything else.',
  },
};

function bandFor(slopeDeg: number, toleranceDeg: number): Band {
  if (slopeDeg <= toleranceDeg * 0.5) return 'trivial';
  if (slopeDeg <= toleranceDeg) return 'moderate';
  if (slopeDeg <= toleranceDeg * 1.5) return 'challenging';
  if (slopeDeg <= toleranceDeg * 2) return 'severe';
  return 'prohibitive';
}

// ─── Card ───────────────────────────────────────────────────────────────

interface StructureRow {
  id: string;
  name: string;
  type: StructureType;
  toleranceDeg: number;
  slopeDeg: number;
  band: Band;
  baselineCostUsd: number;
  premiumUsd: number;
  totalCostUsd: number;
}

export default function TerrainConstructionDifficultyCard({ project }: Props) {
  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(
    () => allStructures.filter((x) => x.projectId === project.id),
    [allStructures, project.id],
  );

  const siteData = useSiteData(project.id);
  const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;

  const meanSlope = elevation?.mean_slope_deg ?? null;
  const maxSlope = elevation?.max_slope_deg ?? null;

  const rows: StructureRow[] = useMemo(() => {
    if (meanSlope == null) return [];
    return structures.map((st) => {
      const tolerance = TYPE_SLOPE_TOLERANCE_DEG[st.type] ?? 5;
      const band = bandFor(meanSlope, tolerance);
      const cost = deriveInfrastructureCost(st);
      const baselineCostUsd = cost.mid;
      const multiplier = BAND_SPEC[band].multiplier;
      const totalCostUsd = baselineCostUsd * multiplier;
      const premiumUsd = totalCostUsd - baselineCostUsd;
      return {
        id: st.id,
        name: st.name,
        type: st.type,
        toleranceDeg: tolerance,
        slopeDeg: meanSlope,
        band,
        baselineCostUsd,
        premiumUsd,
        totalCostUsd,
      };
    });
  }, [structures, meanSlope]);

  const totals = useMemo(() => {
    const baseline = rows.reduce((a, r) => a + r.baselineCostUsd, 0);
    const total = rows.reduce((a, r) => a + r.totalCostUsd, 0);
    const premium = total - baseline;
    const pct = baseline > 0 ? (premium / baseline) * 100 : 0;
    const bandCounts: Record<Band, number> = {
      trivial: 0, moderate: 0, challenging: 0, severe: 0, prohibitive: 0,
    };
    for (const r of rows) bandCounts[r.band] += 1;
    return { baseline, total, premium, pct, bandCounts };
  }, [rows]);

  const projectBand = useMemo<Band | null>(() => {
    if (meanSlope == null) return null;
    if (meanSlope < 3) return 'trivial';
    if (meanSlope < 7) return 'moderate';
    if (meanSlope < 12) return 'challenging';
    if (meanSlope < 20) return 'severe';
    return 'prohibitive';
  }, [meanSlope]);

  const slopeSpread = (maxSlope ?? 0) - (meanSlope ?? 0);
  const wideSpread = meanSlope != null && maxSlope != null && slopeSpread > 8;

  const top5 = useMemo(() => [...rows].sort((a, b) => b.premiumUsd - a.premiumUsd).slice(0, 5), [rows]);

  if (meanSlope == null) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Terrain Construction Difficulty</h3>
            <p className={css.cardHint}>
              No elevation summary available. Pull the terrain layer to surface
              per-structure slope-difficulty bands and construction-premium estimates.
            </p>
          </div>
          <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
        </div>
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Terrain Construction Difficulty</h3>
            <p className={css.cardHint}>
              Site mean slope: <strong>{meanSlope.toFixed(1)}{'\u00B0'}</strong>. Place
              structures to surface per-type slope-difficulty bands.
            </p>
          </div>
          <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Terrain Construction Difficulty</h3>
          <p className={css.cardHint}>
            Each structure type has a slope tolerance {'\u2014'} a greenhouse needs near-flat
            terrain; a lookout tolerates a hilltop. The site{'\u2019'}s mean slope is compared
            against each placed structure{'\u2019'}s tolerance to surface where construction
            costs will balloon.
          </p>
        </div>
        <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
      </div>

      {/* ── Headline: project slope band ── */}
      <div className={css.headline}>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Mean slope</div>
          <div className={css.headlineValue}>{meanSlope.toFixed(1)}{'\u00B0'}</div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Max slope</div>
          <div className={css.headlineValue}>{maxSlope != null ? `${maxSlope.toFixed(1)}\u00B0` : '\u2014'}</div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Site band</div>
          <div className={`${css.headlineValue} ${projectBand ? bandToneClass(projectBand) : ''}`}>
            {projectBand ? BAND_SPEC[projectBand].label : '\u2014'}
          </div>
        </div>
        <div className={css.headlineCell}>
          <div className={css.headlineLabel}>Construction premium</div>
          <div className={css.headlineValue}>
            +${Math.round(totals.premium / 1000).toLocaleString()}K{' '}
            <span className={css.headlinePct}>(+{totals.pct.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {wideSpread && (
        <div className={css.spreadBanner}>
          Slope spread is wide (mean {meanSlope.toFixed(1)}{'\u00B0'}, max {maxSlope?.toFixed(1) ?? '\u2014'}{'\u00B0'}).
          Some structures may sit on terrain steeper than this rollup assumes {'\u2014'} the model
          uses the project mean as a single proxy.
        </div>
      )}

      {/* ── Band tally ── */}
      <div className={css.bandTally}>
        {(Object.keys(BAND_SPEC) as Band[]).map((b) => {
          const count = totals.bandCounts[b];
          if (count === 0) return null;
          return (
            <span key={b} className={`${css.bandChip} ${bandToneClass(b)}`}>
              <strong>{count}</strong> {BAND_SPEC[b].label.toLowerCase()}
            </span>
          );
        })}
      </div>

      {/* ── Top 5 hotspots ── */}
      <h4 className={css.sectionLabel}>Top hotspots</h4>
      <div className={css.hotspotList}>
        {top5.map((r) => (
          <div key={r.id} className={css.hotspotRow}>
            <div className={css.hotspotMain}>
              <span className={css.hotspotName}>{r.name}</span>
              <span className={css.hotspotType}>
                {TYPE_LABEL[r.type]} {'\u00B7'} tolerates ~{r.toleranceDeg}{'\u00B0'}
              </span>
            </div>
            <div className={css.hotspotRight}>
              <span className={`${css.hotspotBand} ${bandToneClass(r.band)}`}>
                {BAND_SPEC[r.band].label}
              </span>
              <span className={css.hotspotPremium}>
                {r.premiumUsd > 0 ? `+$${Math.round(r.premiumUsd / 1000).toLocaleString()}K` : 'baseline'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Full structure table ── */}
      {rows.length > 5 && (
        <details className={css.fullList}>
          <summary className={css.fullListSummary}>
            All {rows.length} structure{rows.length === 1 ? '' : 's'}
          </summary>
          <div className={css.fullTable}>
            {rows.map((r) => (
              <div key={r.id} className={css.fullTableRow}>
                <span className={css.fullTableName}>{r.name}</span>
                <span className={css.fullTableType}>{TYPE_LABEL[r.type]}</span>
                <span className={`${css.fullTableBand} ${bandToneClass(r.band)}`}>
                  {BAND_SPEC[r.band].label}
                </span>
                <span className={css.fullTableCost}>
                  ${Math.round(r.totalCostUsd / 1000).toLocaleString()}K
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className={css.footnote}>
        Heuristic. Slope tolerances are textbook owner-builder rules of thumb; cost multipliers
        (1.0{'\u00D7'} / 1.3{'\u00D7'} / 1.7{'\u00D7'} / 2.4{'\u00D7'} / 3.5{'\u00D7'}) reflect typical contractor
        premiums for pad excavation, retaining walls and step-foundation work. Site slope is
        modeled as the project mean {'\u2014'} no per-structure DEM lookup is performed.
      </div>
    </div>
  );
}

function bandToneClass(b: Band): string {
  switch (b) {
    case 'trivial': return css.bandTrivial ?? '';
    case 'moderate': return css.bandModerate ?? '';
    case 'challenging': return css.bandChallenging ?? '';
    case 'severe': return css.bandSevere ?? '';
    case 'prohibitive': return css.bandProhibitive ?? '';
  }
}
