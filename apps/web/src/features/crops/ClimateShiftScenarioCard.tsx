/**
 * §16 ClimateShiftScenarioCard — climate-shift scenario overlay for placed
 * perennial blocks.
 *
 * The §16 simulation cluster already carries a `ClimateScenarioOverlay`
 * (mounted on `SolarClimatePanel`) and a back-end `computeClimateProjections`
 * helper that returns IPCC AR6 ensemble-median deltas for SSP2-4.5 (mid
 * stabilization) and SSP5-8.5 (high emission). Both surface *site-level*
 * climate change in the abstract — but neither cross-references those
 * projections against the actual species the steward has *already placed*
 * on the map. So a planner can see "+2.7 °C by 2050" and not realize that
 * the apple block they just drew sits at the warm edge of apple's zone
 * range and will fall out of viability under the projection.
 *
 * This card composes the two threads. It pulls climate normals from the
 * site-data layer, the parcel centroid from the project boundary, and the
 * IPCC regional deltas from `climateProjections.ts`, then walks each placed
 * orchard / food-forest / silvopasture / windbreak / shelterbelt block,
 * extracts the species names, and flags every species whose hardiness-zone
 * window will be crossed at mid-century under the selected scenario.
 *
 * Output is deterministic: same project state and same scenario tab always
 * produce the same risk list. No AI, no server round-trip.
 *
 * Closes manifest §16 `climate-shift-overlays` (P4) planned -> done.
 */

import { useMemo, useState } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { computeClimateProjections, type ClimateProjection } from '../../lib/climateProjections.js';
import css from './ClimateShiftScenarioCard.module.css';

interface Props {
  projectId: string;
}

interface ClimateSummary {
  annual_temp_mean_c?: number;
  annual_precip_mm?: number;
  hardiness_zone?: string;
  growing_season_days?: number;
  last_frost_date?: string;
  first_frost_date?: string;
}

type Scenario = 'mid' | 'high';

// ─── Hardiness-zone heuristic table ────────────────────────────────────────
//
// Maps a species-name substring to a [coldZone, warmZone] inclusive window
// expressed as floats — zone 5b = 5.5, 6a = 6.0, 6b = 6.5, etc.
//
// These windows are planning-grade USDA zone ranges from common nursery
// catalog data. They're not absolute biological limits — a southern-edge
// apple cultivar can survive zone 8 with marginal yield — but the 2050
// projection should be treated as a *centerline* of the new zone, so any
// crop that lands within ~0.5 zones of its window edge today is at risk.
//
// Substrings are lowercased and matched in declaration order. More-specific
// terms (e.g. "dwarf apple") must come before parent terms (e.g. "apple").
const SPECIES_ZONE_WINDOW: Array<{ match: string; cold: number; warm: number }> = [
  // tropical / subtropical fruit
  { match: 'mango', cold: 9.5, warm: 11.5 },
  { match: 'avocado', cold: 9.0, warm: 11.0 },
  { match: 'banana', cold: 9.0, warm: 11.5 },
  { match: 'papaya', cold: 9.5, warm: 11.5 },
  { match: 'citrus', cold: 8.5, warm: 11.0 },
  { match: 'lemon', cold: 8.5, warm: 11.0 },
  { match: 'orange', cold: 8.5, warm: 11.0 },
  { match: 'lime', cold: 9.0, warm: 11.0 },
  { match: 'grapefruit', cold: 8.5, warm: 11.0 },
  { match: 'olive', cold: 8.0, warm: 10.5 },
  { match: 'fig', cold: 7.0, warm: 10.5 },
  { match: 'pomegranate', cold: 7.5, warm: 10.5 },
  { match: 'persimmon', cold: 6.0, warm: 10.0 },
  // stone fruit
  { match: 'peach', cold: 5.5, warm: 9.0 },
  { match: 'nectarine', cold: 5.5, warm: 9.0 },
  { match: 'apricot', cold: 5.0, warm: 9.0 },
  { match: 'plum', cold: 4.5, warm: 9.5 },
  { match: 'cherry', cold: 4.0, warm: 8.5 },
  // pome fruit
  { match: 'apple', cold: 3.5, warm: 8.0 },
  { match: 'pear', cold: 4.0, warm: 8.5 },
  { match: 'quince', cold: 4.5, warm: 9.0 },
  // nuts
  { match: 'walnut', cold: 4.0, warm: 9.0 },
  { match: 'chestnut', cold: 4.5, warm: 8.5 },
  { match: 'pecan', cold: 5.5, warm: 9.5 },
  { match: 'hazelnut', cold: 4.0, warm: 8.5 },
  { match: 'almond', cold: 6.5, warm: 9.5 },
  { match: 'hickory', cold: 4.0, warm: 8.5 },
  // berries
  { match: 'blueberry', cold: 3.5, warm: 7.5 },
  { match: 'raspberry', cold: 3.5, warm: 8.5 },
  { match: 'blackberry', cold: 5.0, warm: 9.0 },
  { match: 'currant', cold: 3.0, warm: 7.5 },
  { match: 'gooseberry', cold: 3.0, warm: 7.5 },
  { match: 'elderberry', cold: 3.5, warm: 8.5 },
  { match: 'strawberry', cold: 3.5, warm: 9.0 },
  // hardy / cold-tolerant
  { match: 'sugar maple', cold: 3.0, warm: 7.0 },
  { match: 'maple', cold: 3.0, warm: 8.0 },
  { match: 'oak', cold: 3.5, warm: 9.5 },
  { match: 'birch', cold: 2.0, warm: 7.0 },
  { match: 'aspen', cold: 1.5, warm: 6.5 },
  { match: 'spruce', cold: 1.5, warm: 7.0 },
  { match: 'fir', cold: 2.0, warm: 7.0 },
  { match: 'pine', cold: 2.5, warm: 8.5 },
  { match: 'serviceberry', cold: 3.0, warm: 8.0 },
  { match: 'pawpaw', cold: 5.0, warm: 8.5 },
  // vine / cane
  { match: 'grape', cold: 4.5, warm: 9.5 },
  { match: 'kiwi', cold: 4.0, warm: 9.0 },
];

interface SpeciesRisk {
  name: string;
  cold: number;
  warm: number;
  inWindowToday: boolean;
  inWindowProjected: boolean;
  status: 'ok' | 'warming-edge' | 'cold-edge' | 'out-of-range' | 'unknown';
  detail: string;
}

function lookupZoneWindow(name: string): { cold: number; warm: number } | null {
  const lower = name.toLowerCase();
  for (const entry of SPECIES_ZONE_WINDOW) {
    if (lower.includes(entry.match)) return { cold: entry.cold, warm: entry.warm };
  }
  return null;
}

// Parse "5b", "6a", "5", "6" → numeric centerline (5b = 5.5, 6a = 6.0, 5 = 5.0).
function parseHardiness(zone: string | undefined | null): number | null {
  if (!zone) return null;
  const m = zone.trim().toLowerCase().match(/^(\d{1,2})\s*([ab])?$/);
  if (!m) return null;
  const num = parseInt(m[1]!, 10);
  if (isNaN(num) || num < 1 || num > 13) return null;
  const sub = m[2];
  if (sub === 'a') return num;
  if (sub === 'b') return num + 0.5;
  return num;
}

function formatHardiness(value: number): string {
  const rounded = Math.round(value * 2) / 2;
  const intPart = Math.floor(rounded);
  const frac = rounded - intPart;
  return frac >= 0.5 ? `${intPart}b` : `${intPart}a`;
}

// Hardiness-zone shift heuristic: the standard USDA-zone temperature step is
// ~2.8 °C (10 °F) between full zones and ~1.4 °C between half-zones. So
// every +1 °C in mean annual temp lifts the apparent zone by ~0.36 (call it
// 0.4 of a half-zone bin per °C). Ensemble-median deltas of +2 to +3 °C
// produce a 0.7-1.2 zone-step shift, consistent with USDA's 2023 zone-map
// revision relative to the 1990 map.
const ZONE_PER_DEG_C = 0.4;

function shiftZone(currentZone: number, tempDelta: number): number {
  return currentZone + tempDelta * ZONE_PER_DEG_C;
}

export default function ClimateShiftScenarioCard({ projectId }: Props) {
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === projectId),
  );
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const siteData = useSiteData(projectId);
  const climate = useMemo(
    () => (siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null),
    [siteData],
  );

  const [scenario, setScenario] = useState<Scenario>('mid');

  const centroid = useMemo(() => {
    const geojson = project?.parcelBoundaryGeojson;
    if (!geojson || typeof geojson !== 'object') return null;
    try {
      const fc = geojson as GeoJSON.FeatureCollection;
      if (!Array.isArray(fc.features) || fc.features.length === 0) return null;
      let sumLng = 0;
      let sumLat = 0;
      let count = 0;
      for (const f of fc.features) {
        if (f.geometry?.type === 'Polygon') {
          for (const coord of (f.geometry as GeoJSON.Polygon).coordinates[0] ?? []) {
            const lng = coord[0];
            const lat = coord[1];
            if (typeof lng !== 'number' || typeof lat !== 'number') continue;
            sumLng += lng;
            sumLat += lat;
            count++;
          }
        }
      }
      if (count === 0) return null;
      return { lng: sumLng / count, lat: sumLat / count };
    } catch {
      return null;
    }
  }, [project?.parcelBoundaryGeojson]);

  const projection: ClimateProjection | null = useMemo(() => {
    if (!centroid) return null;
    return computeClimateProjections({
      lat: centroid.lat,
      lng: centroid.lng,
      annualTempC: typeof climate?.annual_temp_mean_c === 'number' ? climate.annual_temp_mean_c : null,
      annualPrecipMm: typeof climate?.annual_precip_mm === 'number' ? climate.annual_precip_mm : null,
    });
  }, [centroid, climate?.annual_temp_mean_c, climate?.annual_precip_mm]);

  // Active scenario row from the projection.
  const active = useMemo(() => {
    if (!projection) return null;
    const row = scenario === 'mid' ? projection.ssp245 : projection.ssp585;
    return {
      label: scenario === 'mid' ? 'SSP2-4.5 (mid stabilization)' : 'SSP5-8.5 (high emission)',
      shortLabel: scenario === 'mid' ? 'Mid (SSP2-4.5)' : 'High (SSP5-8.5)',
      deltaTempC: row.deltaTempC,
      projectedTempC: row.projectedTempC,
      deltaPrecipPct: row.deltaPrecipPct,
      projectedPrecipMm: row.projectedPrecipMm,
    };
  }, [projection, scenario]);

  // Current zone (parsed from climate summary if present).
  const currentZoneNum = useMemo(() => parseHardiness(climate?.hardiness_zone), [climate?.hardiness_zone]);
  const projectedZoneNum = useMemo(() => {
    if (currentZoneNum == null || !active) return null;
    return shiftZone(currentZoneNum, active.deltaTempC);
  }, [currentZoneNum, active]);

  // Growing-season delta heuristic: 12 days per +1 °C.
  const projectedGrowingDays = useMemo(() => {
    if (typeof climate?.growing_season_days !== 'number' || !active) return null;
    return climate.growing_season_days + Math.round(active.deltaTempC * 12);
  }, [climate?.growing_season_days, active]);

  // Per-species risk evaluation across all placed perennial blocks.
  const speciesRisks = useMemo<SpeciesRisk[]>(() => {
    if (!cropAreas.length || currentZoneNum == null || projectedZoneNum == null) return [];
    const seen = new Map<string, SpeciesRisk>();
    for (const area of cropAreas) {
      // Only perennial blocks make sense for multi-decadal projections.
      if (!['orchard', 'food_forest', 'silvopasture', 'windbreak', 'shelterbelt'].includes(area.type)) continue;
      for (const sp of area.species) {
        const trimmed = sp.trim();
        if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
        const window = lookupZoneWindow(trimmed);
        if (!window) {
          seen.set(trimmed.toLowerCase(), {
            name: trimmed,
            cold: NaN,
            warm: NaN,
            inWindowToday: true,
            inWindowProjected: true,
            status: 'unknown',
            detail: 'Not in the planning-grade hardiness table — manual check recommended.',
          });
          continue;
        }
        const inToday = currentZoneNum >= window.cold && currentZoneNum <= window.warm;
        const inProjected = projectedZoneNum >= window.cold && projectedZoneNum <= window.warm;
        let status: SpeciesRisk['status'];
        let detail: string;
        if (!inToday) {
          status = 'out-of-range';
          detail = `Today's zone ${formatHardiness(currentZoneNum)} already sits outside this species' typical window (${formatHardiness(window.cold)}–${formatHardiness(window.warm)}).`;
        } else if (!inProjected) {
          if (projectedZoneNum > window.warm) {
            status = 'warming-edge';
            detail = `By 2050 projected zone ${formatHardiness(projectedZoneNum)} exceeds the warm edge of this species' window (${formatHardiness(window.warm)}). Plan for cultivar swap or replacement before mid-century.`;
          } else {
            status = 'cold-edge';
            detail = `By 2050 projected zone ${formatHardiness(projectedZoneNum)} sits below this species' cold edge (${formatHardiness(window.cold)}).`;
          }
        } else {
          status = 'ok';
          detail = `Window ${formatHardiness(window.cold)}–${formatHardiness(window.warm)}; projected ${formatHardiness(projectedZoneNum)} still within range.`;
        }
        seen.set(trimmed.toLowerCase(), {
          name: trimmed,
          cold: window.cold,
          warm: window.warm,
          inWindowToday: inToday,
          inWindowProjected: inProjected,
          status,
          detail,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      const order: Record<SpeciesRisk['status'], number> = {
        'out-of-range': 0,
        'warming-edge': 1,
        'cold-edge': 2,
        unknown: 3,
        ok: 4,
      };
      return order[a.status] - order[b.status];
    });
  }, [cropAreas, currentZoneNum, projectedZoneNum]);

  const summary = useMemo(() => {
    const flagged = speciesRisks.filter((r) => r.status === 'warming-edge' || r.status === 'cold-edge' || r.status === 'out-of-range').length;
    const ok = speciesRisks.filter((r) => r.status === 'ok').length;
    const unknown = speciesRisks.filter((r) => r.status === 'unknown').length;
    return { flagged, ok, unknown, total: speciesRisks.length };
  }, [speciesRisks]);

  if (!projection) {
    return (
      <section className={css.card} aria-label="Climate-shift scenario">
        <h3 className={css.title}>Climate-shift scenarios <span className={css.heuristicTag}>HEURISTIC</span></h3>
        <p className={css.empty}>
          Add a parcel boundary to enable the IPCC AR6 regional projection
          for this site. Once the project has a centroid, this card will show
          mid-century mean-temperature, precipitation, and hardiness-zone
          deltas for the two ensemble-median scenarios (SSP2-4.5 and
          SSP5-8.5) and flag any placed perennial species whose tolerance
          window may be crossed.
        </p>
      </section>
    );
  }

  return (
    <section className={css.card} aria-label="Climate-shift scenario">
      <header className={css.head}>
        <div>
          <h3 className={css.title}>
            Climate-shift scenarios <span className={css.heuristicTag}>HEURISTIC</span>
          </h3>
          <p className={css.hint}>
            Mid-century (2041&ndash;2060) projection for this site, applied
            to the placed orchard / food-forest / silvopasture / windbreak /
            shelterbelt blocks. Region: <em>{projection.region}</em>.
          </p>
        </div>
        <div className={css.scenarioTabs}>
          <button
            type="button"
            className={`${css.scenarioTab} ${scenario === 'mid' ? css.scenarioTabActive : ''}`}
            onClick={() => setScenario('mid')}
          >
            Mid <span className={css.scenarioTabSub}>SSP2-4.5</span>
          </button>
          <button
            type="button"
            className={`${css.scenarioTab} ${scenario === 'high' ? css.scenarioTabActive : ''}`}
            onClick={() => setScenario('high')}
          >
            High <span className={css.scenarioTabSub}>SSP5-8.5</span>
          </button>
        </div>
      </header>

      <div className={css.deltaGrid}>
        <div className={css.deltaCard}>
          <span className={css.deltaLabel}>Mean temperature</span>
          <div className={css.deltaRow}>
            <span className={css.deltaCurrent}>
              {projection.historicalTempC != null ? `${projection.historicalTempC.toFixed(1)}\u00B0C` : '\u2014'}
            </span>
            <span className={css.deltaArrow}>&rarr;</span>
            <span className={css.deltaProjected}>
              {active?.projectedTempC != null ? `${active.projectedTempC.toFixed(1)}\u00B0C` : '\u2014'}
            </span>
          </div>
          <span className={css.deltaSub}>+{active?.deltaTempC.toFixed(1)}&deg;C by 2050</span>
        </div>

        <div className={css.deltaCard}>
          <span className={css.deltaLabel}>Annual precip</span>
          <div className={css.deltaRow}>
            <span className={css.deltaCurrent}>
              {projection.historicalPrecipMm != null ? `${projection.historicalPrecipMm} mm` : '\u2014'}
            </span>
            <span className={css.deltaArrow}>&rarr;</span>
            <span className={css.deltaProjected}>
              {active?.projectedPrecipMm != null ? `${active.projectedPrecipMm} mm` : '\u2014'}
            </span>
          </div>
          <span className={css.deltaSub}>
            {active && active.deltaPrecipPct >= 0 ? '+' : ''}
            {active?.deltaPrecipPct}% &middot; {projection.precipTrend.toLowerCase()}
          </span>
        </div>

        <div className={css.deltaCard}>
          <span className={css.deltaLabel}>Hardiness zone</span>
          <div className={css.deltaRow}>
            <span className={css.deltaCurrent}>
              {currentZoneNum != null ? formatHardiness(currentZoneNum) : '\u2014'}
            </span>
            <span className={css.deltaArrow}>&rarr;</span>
            <span className={css.deltaProjected}>
              {projectedZoneNum != null ? formatHardiness(projectedZoneNum) : '\u2014'}
            </span>
          </div>
          <span className={css.deltaSub}>
            {currentZoneNum != null && projectedZoneNum != null
              ? `${(projectedZoneNum - currentZoneNum).toFixed(1)} half-zone shift`
              : 'Hardiness zone unavailable'}
          </span>
        </div>

        <div className={css.deltaCard}>
          <span className={css.deltaLabel}>Growing season</span>
          <div className={css.deltaRow}>
            <span className={css.deltaCurrent}>
              {typeof climate?.growing_season_days === 'number' ? `${climate.growing_season_days} d` : '\u2014'}
            </span>
            <span className={css.deltaArrow}>&rarr;</span>
            <span className={css.deltaProjected}>
              {projectedGrowingDays != null ? `${projectedGrowingDays} d` : '\u2014'}
            </span>
          </div>
          <span className={css.deltaSub}>
            {projectedGrowingDays != null && typeof climate?.growing_season_days === 'number'
              ? `+${projectedGrowingDays - climate.growing_season_days} days at ${active?.shortLabel}`
              : 'Growing-season days unavailable'}
          </span>
        </div>
      </div>

      <div className={css.advisoryBlock}>
        <span className={css.advisoryLabel}>IPCC AR6 advisory:</span>
        <p className={css.advisoryText}>{projection.advisory}</p>
      </div>

      {speciesRisks.length === 0 ? (
        <div className={css.emptySpecies}>
          No perennial blocks placed yet. Once orchard, food-forest,
          silvopasture, windbreak, or shelterbelt blocks are drawn with
          species assigned, this card will flag every species whose
          hardiness window may be crossed by the projected zone.
        </div>
      ) : (
        <>
          <div className={css.speciesSummary}>
            <div className={css.summaryStat}>
              <span className={`${css.summaryValue} ${summary.flagged > 0 ? css.toneFlagged : ''}`}>
                {summary.flagged}
              </span>
              <span className={css.summaryLabel}>Flagged</span>
            </div>
            <div className={css.summaryStat}>
              <span className={`${css.summaryValue} ${css.toneOk}`}>{summary.ok}</span>
              <span className={css.summaryLabel}>In window</span>
            </div>
            <div className={css.summaryStat}>
              <span className={css.summaryValue}>{summary.unknown}</span>
              <span className={css.summaryLabel}>Unknown</span>
            </div>
            <div className={css.summaryStat}>
              <span className={css.summaryValue}>{summary.total}</span>
              <span className={css.summaryLabel}>Species evaluated</span>
            </div>
          </div>

          <ul className={css.speciesList}>
            {speciesRisks.map((r) => (
              <li
                key={r.name.toLowerCase()}
                className={`${css.speciesRow} ${css[`status_${r.status.replace('-', '_')}`] ?? ''}`}
              >
                <div className={css.speciesHead}>
                  <span className={css.speciesName}>{r.name}</span>
                  <span className={`${css.statusTag} ${css[`statusTag_${r.status.replace('-', '_')}`] ?? ''}`}>
                    {r.status === 'ok' && 'In window'}
                    {r.status === 'warming-edge' && 'Warm edge'}
                    {r.status === 'cold-edge' && 'Cold edge'}
                    {r.status === 'out-of-range' && 'Out of range'}
                    {r.status === 'unknown' && 'Unknown'}
                  </span>
                </div>
                <span className={css.speciesDetail}>{r.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={css.footnote}>
        <em>How this is computed:</em> climate normals come from the
        site-data climate layer (NOAA ACIS / ECCC where available, otherwise
        the layer's own fallback). Mid-century deltas are the IPCC AR6
        ensemble medians for the regional reference area
        ({projection.region}); applied period {projection.referencePeriod}{' '}
        &rarr; {projection.projectionPeriod}. Hardiness-zone shift uses a
        ~0.4 half-zone-bin per &deg;C heuristic consistent with USDA's 2023
        zone-map revision. Species hardiness windows are planning-grade
        nursery-catalog ranges. This is decision-support, not a CMIP6
        downscaled point query &mdash; treat the projected zone as a
        centerline of the new band, not a hard threshold.
      </p>
    </section>
  );
}
