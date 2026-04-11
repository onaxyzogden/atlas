/**
 * ForestHubDashboard — existing vegetation, forestry zones, carbon stock,
 * silvopasture, tree health, canopy succession layers.
 *
 * All data from siteDataStore layers + zoneStore + cropStore + analysis module.
 * No hardcoded alerts, maintenance, or sector data.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import {
  computeExistingVegetation,
  computeForestryZones,
  computeCarbonStock,
  computeSilvopastureOpportunities,
  computeTreeHealthIndex,
} from '../../forest/forestAnalysis.js';
import { FOOD_FOREST_LAYERS } from '../../forest/canopyLayerData.js';
import css from './ForestHubDashboard.module.css';

interface ForestHubDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary {
  organic_matter_pct?: number | string;
  drainage_class?: string;
  ph_range?: string;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
  classes?: Record<string, number>;
}
interface MicroclimateSummary {
  sun_trap_count?: number;
  frost_risk_high_pct?: number;
  wind_shelter_pct?: number;
}
interface SoilRegenSummary {
  current_soc_tcha?: number;
  potential_soc_tcha?: number;
  annual_seq_rate_tcha_yr?: number;
  silvopasture_suitability?: number;
  intervention_recommendations?: string[];
}
interface ElevationSummary {
  total_area_m2?: number;
}

export default function ForestHubDashboard({ project, onSwitchToMap }: ForestHubDashboardProps) {
  const siteData = useSiteData(project.id);
  const allZones = useZoneStore((s) => s.zones);
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id &&
      ['food_forest', 'silvopasture', 'windbreak', 'shelterbelt'].includes(c.type)),
    [allCropAreas, project.id],
  );

  const soils = useMemo(() => siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null, [siteData]);
  const landCover = useMemo(() => siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null, [siteData]);
  const microclimate = useMemo(() => siteData ? getLayerSummary<MicroclimateSummary>(siteData, 'microclimate') : null, [siteData]);
  const soilRegen = useMemo(() => siteData ? getLayerSummary<SoilRegenSummary>(siteData, 'soil_regeneration') : null, [siteData]);
  const elevation = useMemo(() => siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null, [siteData]);

  // Analysis computations
  const vegetation = useMemo(() => computeExistingVegetation(landCover), [landCover]);
  const forestryZones = useMemo(() => computeForestryZones(zones, microclimate), [zones, microclimate]);
  const totalAreaM2 = elevation?.total_area_m2 ?? zones.reduce((sum, z) => sum + z.areaM2, 0);
  const carbon = useMemo(() => computeCarbonStock(soilRegen, landCover, totalAreaM2), [soilRegen, landCover, totalAreaM2]);
  const silvopasture = useMemo(() => computeSilvopastureOpportunities(zones, soilRegen), [zones, soilRegen]);
  const treeHealth = useMemo(() => computeTreeHealthIndex(soils, landCover), [soils, landCover]);

  return (
    <div className={css.page}>
      {/* ── Status Header ──────────────────────────────────────── */}
      <div className={css.statusHeader}>
        <span className={css.statusTag}>FOREST HUB</span>
        <h1 className={css.sectorTitle}>Forest Management</h1>
        <span className={css.sectorSub}>
          {forestryZones.length} forestry zone{forestryZones.length !== 1 ? 's' : ''} &middot; {carbon.totalAreaHa} ha total
        </span>
      </div>

      {/* ── Tree Health Index ──────────────────────────────────── */}
      <div className={css.healthCard}>
        <span className={css.healthLabel}>TREE HEALTH INDEX</span>
        <div className={css.gaugeWrapper}>
          <svg viewBox="0 0 120 120" width={120} height={120}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#15803D" strokeWidth="8"
              strokeDasharray={`${treeHealth.healthIdx * 3.14} ${100 * 3.14}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)" />
          </svg>
          <div className={css.gaugeText}>
            <span className={css.gaugeValue}>{treeHealth.healthIdx}%</span>
            <span className={css.gaugeLabel}>{treeHealth.label}</span>
          </div>
        </div>
        <span className={css.gaugeTrend}>Based on site soil &amp; canopy data</span>
      </div>

      {/* ── Existing Vegetation ────────────────────────────────── */}
      {vegetation.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>EXISTING VEGETATION</h3>
          {vegetation.map((v) => (
            <div key={v.className} className={css.vegRow}>
              <span className={css.vegLabel}>{v.className}</span>
              <span className={css.vegPct}>{v.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Operational Data ───────────────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>OPERATIONAL DATA</h3>
        <div className={css.dataList}>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Soil Moisture</span>
            <span className={css.dataValue}>{treeHealth.soilMoisture} <span className={css.dataUnit}>cb</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Canopy Vitality</span>
            <span className={css.dataValue}>{treeHealth.ndvi.toFixed(2)} <span className={css.dataUnit}>NDVI</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Leaf Nutrient Levels</span>
            <span className={css.dataValue}>{treeHealth.nutrients}</span>
          </div>
        </div>
      </div>

      {/* ── Soil Biology ──────────────────────────────────────── */}
      <div className={css.soilCard}>
        <h3 className={css.sectionLabel}>SOIL BIOLOGY — FOREST CONTEXT</h3>
        <div className={css.dataList}>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Fungi:Bacteria Ratio</span>
            <span className={css.dataValue}>{treeHealth.fbRatio} <span className={css.dataOptimal}>Optimal</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Mycorrhizal Colonization</span>
            <span className={css.dataValue}>{treeHealth.myc}% <span className={css.dataUnit}>of roots</span></span>
          </div>
          <div className={css.dataRow}>
            <span className={css.dataLabel}>Target F:B Range</span>
            <span className={css.dataValue}>2.0 — 5.0 <span className={css.dataUnit}>for forest</span></span>
          </div>
        </div>
      </div>

      {/* ── Carbon Stock ──────────────────────────────────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>CARBON STOCK ESTIMATE</h3>
        <div className={css.carbonGrid}>
          <div className={css.carbonCard}>
            <span className={css.carbonValue}>{carbon.currentSOC}</span>
            <span className={css.carbonUnit}>CURRENT tC/ha</span>
          </div>
          <div className={css.carbonCard}>
            <span className={css.carbonValue}>{carbon.potentialSOC}</span>
            <span className={css.carbonUnit}>POTENTIAL tC/ha</span>
          </div>
        </div>
        <div className={css.dataList}>
          <div className={css.projectionRow}>
            <span className={css.projectionLabel}>10-yr no change</span>
            <span className={css.projectionValue}>{carbon.projection10yr.noChange.toLocaleString()} tC</span>
          </div>
          <div className={css.projectionRow}>
            <span className={css.projectionLabel}>10-yr moderate mgmt</span>
            <span className={css.projectionValue}>{carbon.projection10yr.moderate.toLocaleString()} tC</span>
          </div>
          <div className={css.projectionRow}>
            <span className={css.projectionLabel}>10-yr intensive regen</span>
            <span className={css.projectionValue}>{carbon.projection10yr.intensive.toLocaleString()} tC</span>
          </div>
          <div className={css.projectionRow}>
            <span className={css.projectionLabel}>Annual seq. rate</span>
            <span className={css.projectionValue}>{carbon.annualSeqRate} tC/ha/yr</span>
          </div>
        </div>
      </div>

      {/* ── Forestry Zones ────────────────────────────────────── */}
      {forestryZones.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>FORESTRY ZONES</h3>
          {forestryZones.map((fz) => (
            <div key={fz.zoneId} className={css.zoneCard}>
              <div className={css.zoneName}>{fz.zoneName}</div>
              <div className={css.zoneArea}>
                {(fz.areaM2 / 10000).toFixed(2)} ha &middot; {fz.category}
              </div>
              <div className={css.zoneMicro}>
                Sun: {fz.sunExposure.toFixed(0)}% &middot; Frost risk: {fz.frostRisk.toFixed(0)}% &middot; Wind shelter: {fz.windShelter.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Silvopasture Opportunities ────────────────────────── */}
      {silvopasture.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>SILVOPASTURE OPPORTUNITIES</h3>
          {silvopasture.map((sp) => (
            <div key={sp.zoneId} className={css.silvoCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={css.silvoName}>{sp.zoneName}</span>
                <span className={css.silvoScore}>{sp.suitabilityScore}%</span>
              </div>
              <div className={css.silvoRec}>{sp.recommendation}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Planting Tool Integration ─────────────────────────── */}
      {cropAreas.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>FOREST CROP AREAS</h3>
          {cropAreas.map((ca) => (
            <div key={ca.id} className={css.zoneCard}>
              <div className={css.zoneName}>{ca.name || ca.type}</div>
              <div className={css.zoneArea}>
                {ca.species.length} species &middot; {ca.type.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Canopy Succession — 7-Layer Food Forest ───────────── */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>CANOPY SUCCESSION — 7-LAYER FOOD FOREST</h3>
        {FOOD_FOREST_LAYERS.map((layer) => (
          <div key={layer.layer} className={css.canopyRow}>
            <span className={css.canopyDot} style={{ background: layer.color }} />
            <span className={css.canopyLayer}>{layer.label}</span>
            <span className={css.canopyHeight}>{layer.heightRange}</span>
            <span className={css.canopySpecies}>{layer.exampleSpecies.join(', ')}</span>
          </div>
        ))}
      </div>

      <button className={css.ctaBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
