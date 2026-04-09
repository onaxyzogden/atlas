/**
 * PlantingToolDashboard — Species selection, design metrics, spacing logic, AI siting.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import css from './PlantingToolDashboard.module.css';

interface PlantingToolDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ElevationSummary { predominant_aspect?: string; mean_slope_deg?: number; }
interface SoilsSummary { predominant_texture?: string; drainage_class?: string; ph_range?: string; }
interface ClimateSummary { hardiness_zone?: string; first_frost_date?: string; last_frost_date?: string; growing_season_days?: number; }

const SPECIES = [
  { name: 'Hybrid Chestnut', latin: 'CASTANEA DENTATA X MOLLISSIMA', active: true },
  { name: 'Elderberry', latin: 'SAMBUCUS CANADENSIS', active: false },
  { name: 'Black Walnut', latin: 'JUGLANS NIGRA', active: false },
  { name: 'Hazelnut', latin: 'CORYLUS AMERICANA', active: false },
];

export default function PlantingToolDashboard({ project, onSwitchToMap }: PlantingToolDashboardProps) {
  const siteData = useSiteData(project.id);

  const siting = useMemo(() => {
    const elev    = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

    const aspect  = (elev?.predominant_aspect ?? 'S').toUpperCase().trim();
    const slope   = elev?.mean_slope_deg ?? 3;
    const texture = soils?.predominant_texture ?? 'Loam';
    const drain   = soils?.drainage_class ?? 'well drained';
    const ph      = soils?.ph_range ?? '6.5–7.0';
    const zone    = climate?.hardiness_zone ?? '6a';
    const lastFrost  = climate?.last_frost_date ?? 'late April';
    const firstFrost = climate?.first_frost_date ?? 'mid October';
    const growSeason = climate?.growing_season_days ?? 165;

    // Row orientation from aspect
    let orientation = 'NW–SE rows';
    if (['N', 'NE', 'NW'].includes(aspect)) orientation = 'E–W rows (maximize solar)';
    else if (['S', 'SE', 'SW'].includes(aspect)) orientation = 'N–S rows (shading management)';

    // In-row spacing from slope
    let inRowFt = 20;
    let inRowLabel = '20ft';
    if (slope >= 8) { inRowFt = 25; inRowLabel = '25ft (steep terrain)'; }
    else if (slope < 3) { inRowFt = 15; inRowLabel = '15ft (flat)'; }

    // Between-row
    const betweenRowFt = Math.round(inRowFt * 1.5 / 5) * 5;
    const betweenRowLabel = `${betweenRowFt}ft`;

    // Spacing track fill (% of 40ft max)
    const inRowPct  = Math.round((inRowFt / 40) * 100);
    const btRowPct  = Math.round((betweenRowFt / 60) * 100);

    // AI suggestion
    const orientFirst = orientation.split(' ')[0] ?? orientation;
    const activeSpecies = SPECIES.find((s) => s.active)?.name ?? SPECIES[0]?.name ?? 'selected species';
    const aiSuggestion = `${zone} hardiness zone with ${drain.toLowerCase()} soils (pH ${ph}) and ${aspect}-facing slopes — plant ${activeSpecies} at ${inRowFt}ft in-row, oriented ${orientFirst} to maximize solar gain and minimize frost exposure. Last frost: ${lastFrost}.`;

    return { orientation, inRowLabel, inRowFt, inRowPct, betweenRowLabel, betweenRowFt, btRowPct, zone, lastFrost, firstFrost, growSeason, aiSuggestion };
  }, [siteData]);

  return (
    <div className={css.page}>
      {/* 3D terrain hero */}
      <div className={css.terrainHero}>
        <div className={css.terrainOverlay}>
          <span className={css.terrainTag}>ACTIVE ZONE: OGDEN CREST NORTH-EAST</span>
          <h1 className={css.title}>Design Parameters</h1>
          <span className={css.terrainSub}>CURRENT ACTIVE DOMAIN</span>
        </div>
      </div>

      {/* Active species */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ACTIVE SPECIES</h3>
        <div className={css.speciesList}>
          {SPECIES.map((sp) => (
            <div key={sp.name} className={`${css.speciesCard} ${sp.active ? css.speciesActive : ''}`}>
              <div>
                <span className={css.speciesName}>{sp.name}</span>
                <span className={css.speciesLatin}>{sp.latin}</span>
              </div>
              {sp.active && (
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="#8a9a74" strokeWidth={1.5} />
                  <polyline points="5.5 9.5 8 12 12.5 6.5" stroke="#8a9a74" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Design metrics */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>DESIGN METRICS</h3>
        <div className={css.metricsGrid}>
          <div className={css.metricBox}>
            <span className={css.metricValue}>2,480</span>
            <span className={css.metricUnit}>TOTAL LINEAR FEET</span>
          </div>
          <div className={css.metricBox}>
            <span className={css.metricValue}>124</span>
            <span className={css.metricUnit}>TOTAL TREE COUNT</span>
          </div>
          <div className={css.metricBoxWide}>
            <span className={css.metricValue}>22%</span>
            <span className={css.metricUnit}>ESTIMATED CANOPY COVER (YEAR 15)</span>
          </div>
        </div>
      </div>

      {/* Spacing logic */}
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
            <span className={css.spacingValue}>{siting.betweenRowLabel}</span>
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
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>GROWING SEASON</span>
            <span className={css.spacingValue}>{siting.growSeason} days</span>
          </div>
          <div className={css.spacingRow}>
            <span className={css.spacingLabel}>FROST WINDOW</span>
            <span className={css.spacingValue}>{siting.lastFrost} — {siting.firstFrost}</span>
          </div>
        </div>
      </div>

      {/* AI Siting Support */}
      <div className={css.aiCard}>
        <div className={css.aiHeader}>
          <span className={css.aiLabel}>AI SITING SUPPORT</span>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 2L9 4L11 3.4L10.7 5.5L12.7 6L11.4 7.5L12.7 9L10.7 9.5L11 11.6L9 11L8 13L7 11L5 11.6L5.3 9.5L3.3 9L4.6 7.5L3.3 6L5.3 5.5L5 3.4L7 4L8 2Z" />
          </svg>
        </div>
        <p className={css.aiQuote}>&ldquo;{siting.aiSuggestion}&rdquo;</p>
        <button className={css.aiBtn}>APPLY AI SUGGESTION</button>
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
