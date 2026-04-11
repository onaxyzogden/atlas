/**
 * PlantingToolDashboard — species suitability, frost-safe planting windows,
 * placement validation, spacing logic, companion planting, yield estimates.
 *
 * All data derived from site layers (climate, soils, elevation) and cropStore.
 * No hardcoded species or phenology.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import {
  filterSuitableSpecies,
  computePlantingWindows,
  validatePlacement,
  computeYieldEstimates,
  getCompanionNotes,
  computePlantingMetrics,
} from '../../planting/plantingAnalysis.js';
import css from './PlantingToolDashboard.module.css';

interface PlantingToolDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ElevationSummary { predominant_aspect?: string; mean_slope_deg?: number; }
interface SoilsSummary { predominant_texture?: string; drainage_class?: string; ph_range?: string; }
interface ClimateSummary {
  hardiness_zone?: string;
  first_frost_date?: string;
  last_frost_date?: string;
  growing_season_days?: number;
  growing_degree_days_base10c?: number;
}

export default function PlantingToolDashboard({ project, onSwitchToMap }: PlantingToolDashboardProps) {
  const siteData = useSiteData(project.id);
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const climate = useMemo(() => siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null, [siteData]);
  const soils = useMemo(() => siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null, [siteData]);
  const elevation = useMemo(() => siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null, [siteData]);

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  // Species suitability filtered by site conditions
  const suitability = useMemo(
    () => filterSuitableSpecies(climate, soils, elevation),
    [climate, soils, elevation],
  );

  // Frost-safe planting windows
  const windows = useMemo(() => computePlantingWindows(climate), [climate]);

  // Placement validation per crop area
  const validations = useMemo(
    () => cropAreas.map((area) => validatePlacement(area, climate, soils, elevation)),
    [cropAreas, climate, soils, elevation],
  );

  // Yield estimates
  const yields = useMemo(() => computeYieldEstimates(cropAreas), [cropAreas]);

  // Companion notes across all placed species
  const allSpeciesIds = useMemo(() => {
    const ids = new Set<string>();
    for (const area of cropAreas) {
      for (const s of area.species) ids.add(s);
    }
    return Array.from(ids);
  }, [cropAreas]);
  const companions = useMemo(() => getCompanionNotes(allSpeciesIds), [allSpeciesIds]);

  // Aggregate metrics
  const propertyAreaM2 = useMemo(() => {
    // Rough estimate from crop areas or project boundary
    return cropAreas.reduce((sum, a) => sum + a.areaM2, 0) * 3;
  }, [cropAreas]);
  const metrics = useMemo(
    () => computePlantingMetrics(cropAreas, propertyAreaM2),
    [cropAreas, propertyAreaM2],
  );

  // Spacing logic from elevation
  const siting = useMemo(() => {
    const aspect = (elevation?.predominant_aspect ?? 'S').toUpperCase().trim();
    const slope = elevation?.mean_slope_deg ?? 3;
    const zone = climate?.hardiness_zone ?? '6a';

    let orientation = 'NW\u2013SE rows';
    if (['N', 'NE', 'NW'].includes(aspect)) orientation = 'E\u2013W rows (maximize solar)';
    else if (['S', 'SE', 'SW'].includes(aspect)) orientation = 'N\u2013S rows (shading management)';

    let inRowFt = 20;
    let inRowLabel = '20ft';
    if (slope >= 8) { inRowFt = 25; inRowLabel = '25ft (steep terrain)'; }
    else if (slope < 3) { inRowFt = 15; inRowLabel = '15ft (flat)'; }

    const betweenRowFt = Math.round(inRowFt * 1.5 / 5) * 5;
    const inRowPct = Math.round((inRowFt / 40) * 100);
    const btRowPct = Math.round((betweenRowFt / 60) * 100);

    return { orientation, inRowLabel, inRowFt, inRowPct, betweenRowFt, btRowPct, zone };
  }, [elevation, climate]);

  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.terrainHero}>
        <div className={css.terrainOverlay}>
          <span className={css.terrainTag}>PLANTING TOOL</span>
          <h1 className={css.title}>Design Parameters</h1>
          <span className={css.terrainSub}>SITE-FILTERED SPECIES &middot; ZONE {siting.zone}</span>
        </div>
      </div>

      {/* ── Suitable Species ─────────────────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>
          SUITABLE SPECIES ({suitability.suitable.length} of {suitability.suitable.length + suitability.excluded.length})
        </h3>
        {suitability.suitable.length > 0 ? (
          <div className={css.speciesList}>
            {suitability.suitable.map((sp) => (
              <div key={sp.id} className={`${css.speciesCard} ${css.speciesActive}`}>
                <div>
                  <span className={css.speciesName}>{sp.commonName}</span>
                  <span className={css.speciesLatin}>{sp.latinName}</span>
                </div>
                <span className={css.speciesCategory}>{sp.category}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.emptyState}>No species match current site conditions.</div>
        )}
        {suitability.excluded.length > 0 && (
          <div className={css.excludedList}>
            <h3 className={css.sectionLabel} style={{ marginTop: 16 }}>EXCLUDED</h3>
            {suitability.excluded.map((ex) => (
              <div key={ex.species.id} className={css.excludedItem}>
                {ex.species.commonName}
                <span className={css.excludedReason}>\u2014 {ex.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Design Metrics ───────────────────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>DESIGN METRICS</h3>
        {cropAreas.length > 0 ? (
          <div className={css.metricsGrid}>
            <div className={css.metricBox}>
              <span className={css.metricValue}>{metrics.totalLinearFeetPerimeter.toLocaleString()}</span>
              <span className={css.metricUnit}>TOTAL LINEAR FEET</span>
            </div>
            <div className={css.metricBox}>
              <span className={css.metricValue}>{metrics.totalTrees.toLocaleString()}</span>
              <span className={css.metricUnit}>TOTAL TREE COUNT</span>
            </div>
            <div className={css.metricBoxWide}>
              <span className={css.metricValue}>{metrics.estimatedCanopyCoverPct}%</span>
              <span className={css.metricUnit}>ESTIMATED CANOPY COVER (YEAR 15)</span>
            </div>
          </div>
        ) : (
          <div className={css.emptyState}>Place crop areas on the map to see metrics.</div>
        )}
      </div>

      {/* ── Frost-Safe Planting Windows ──────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>FROST-SAFE PLANTING WINDOWS</h3>
        <div className={css.windowCard}>
          <div className={css.windowTitle}>Spring Window</div>
          <div className={css.windowDates}>{windows.springStart} \u2014 {windows.springEnd}</div>
        </div>
        <div className={css.windowCard}>
          <div className={css.windowTitle}>Fall Window</div>
          <div className={css.windowDates}>{windows.fallStart} \u2014 {windows.fallEnd}</div>
        </div>
        <div className={css.spacingRow} style={{ marginTop: 8 }}>
          <span className={css.spacingLabel}>LAST FROST</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.lastFrostRaw}</span>
        </div>
        <div className={css.spacingRow}>
          <span className={css.spacingLabel}>FIRST FROST</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.firstFrostRaw}</span>
        </div>
        <div className={css.spacingRow}>
          <span className={css.spacingLabel}>GROWING SEASON</span>
          <span className={css.spacingValue} style={{ fontSize: 14 }}>{windows.growingDays} days</span>
        </div>
      </div>

      {/* ── Spacing Logic ────────────────────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SPACING LOGIC</h3>
        <div className={css.spacingCard}>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>IN-ROW SPACING</span>
            <span className={css.spacingValue}>{siting.inRowLabel}</span>
          </div>
          <div className={css.spacingTrack}>
            <div className={css.spacingFill} style={{ width: `${siting.inRowPct}%` }} />
            <div className={css.spacingThumb} style={{ left: `${siting.inRowPct}%` }} />
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>BETWEEN-ROW SPACING</span>
            <span className={css.spacingValue}>{siting.betweenRowFt}ft</span>
          </div>
          <div className={css.spacingTrack}>
            <div className={css.spacingFill} style={{ width: `${siting.btRowPct}%` }} />
            <div className={css.spacingThumb} style={{ left: `${siting.btRowPct}%` }} />
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>ROW ORIENTATION</span>
            <span className={css.spacingValue}>{siting.orientation}</span>
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>HARDINESS ZONE</span>
            <span className={css.spacingValue}>{siting.zone}</span>
          </div>
        </div>
      </div>

      {/* ── Placement Validation ─────────────────────────────────── */}
      {validations.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>PLACEMENT VALIDATION</h3>
          {validations.map((v) => (
            <div key={v.cropAreaId} className={v.valid ? css.validationOk : css.validationWarn}>
              <div className={css.validationTitle}>
                {v.valid ? '\u2713' : '\u26A0'} {v.cropAreaName}
              </div>
              {v.warnings.map((w, i) => (
                <div key={i} className={css.validationMsg}>{w}</div>
              ))}
              {v.valid && <div className={css.validationMsg} style={{ color: 'rgba(21,128,61,0.7)' }}>All checks passed</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Companion Planting ───────────────────────────────────── */}
      {companions.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>COMPANION PLANTING NOTES</h3>
          {companions.map((c, i) => (
            <div key={i} className={css.companionRow}>
              <span className={c.relationship === 'companion' ? css.companionGood : css.companionBad}>
                {c.relationship === 'companion' ? '\u2713' : '\u2717'}
              </span>
              {c.speciesA} + {c.speciesB}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {c.relationship}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Yield Estimates ──────────────────────────────────────── */}
      {yields.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>YIELD ESTIMATES</h3>
          <span className={css.yieldBadge}>Estimate \u2014 not a projection</span>
          {yields.map((y, i) => (
            <div key={i} className={css.yieldRow}>
              <span className={css.yieldSpecies}>
                {y.species} ({y.treesEstimated} plants)
              </span>
              <span className={css.yieldValue}>
                {y.yieldKg.toLocaleString()}
                <span className={css.yieldUnit}>{y.yieldUnit}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Siting Support ────────────────────────────────────── */}
      <div className={css.aiCard}>
        <div className={css.aiHeader}>
          <span className={css.aiLabel}>AI SITING SUPPORT</span>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="rgba(21,128,61,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 2L9 4L11 3.4L10.7 5.5L12.7 6L11.4 7.5L12.7 9L10.7 9.5L11 11.6L9 11L8 13L7 11L5 11.6L5.3 9.5L3.3 9L4.6 7.5L3.3 6L5.3 5.5L5 3.4L7 4L8 2Z" />
          </svg>
        </div>
        <p className={css.aiQuote}>
          &ldquo;{siting.zone} hardiness zone with {suitability.suitable.length} suitable species.{' '}
          {siting.orientation} recommended for this aspect. Growing season: {windows.growingDays} days ({windows.lastFrostRaw} to {windows.firstFrostRaw}).{' '}
          {cropAreas.length > 0 ? `${metrics.totalTrees} trees across ${cropAreas.length} planting areas.` : 'Place crop areas on the map to generate specific recommendations.'}&rdquo;
        </p>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
