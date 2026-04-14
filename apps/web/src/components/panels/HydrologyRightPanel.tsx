/**
 * HydrologyRightPanel — redesigned map-view right sidebar for Hydrology.
 *
 * Two modes (tab-switched):
 *   Real-Time Analysis — live runoff/infiltration/discharge metrics, sub-basin chart,
 *                        storm simulation bar, critical alerts, site layer data
 *   Design Parameters  — catchment volume, pond depth, seepage risk, AI siting support,
 *                        water system interventions, annual water budget
 *
 * All metrics computed from real siteDataStore data (climate, watershed, wetlands_flood,
 * elevation, soils layers) via hydrologyMetrics utility.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { computeHydrologyMetrics, fmtGal, parseHydrologicGroup, HYDRO_DEFAULTS } from '../../lib/hydrologyMetrics.js';
import { Spinner } from '../ui/Spinner.js';
import { status as statusToken, semantic, confidence, error as errorToken, water } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';
import s from './HydrologyRightPanel.module.css';

interface HydrologyRightPanelProps {
  project: LocalProject;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
}
interface WatershedSummary {
  watershed_name?: string;
  nearest_stream_m?: number | string;
  catchment_area_ha?: number | string;
  flow_direction?: string;
}
interface WetlandsFloodSummary {
  flood_zone?: string;
  flood_risk?: string;
  wetland_pct?: number | string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
}
interface SoilsSummary {
  hydrologic_group?: string;
  drainage_class?: string;
  organic_matter_pct?: number;
  // Sprint S: extended SSURGO fields
  bulk_density_g_cm3?: number | null;
  ec_ds_m?: number | null;
  sodium_adsorption_ratio?: number | null;
  rooting_depth_cm?: number | null;
  fertility_index?: number | null;
  kfact?: number | null;
}
interface LandCoverSummary {
  tree_canopy_pct?: number;
}
interface GroundwaterSummary {
  groundwater_depth_m?: number | null;
  station_nearest_km?: number | null;
  station_name?: string | null;
  measurement_date?: string | null;
}
interface WaterQualitySummary {
  ph_value?: number | null;
  ph_date?: string | null;
  dissolved_oxygen_mg_l?: number | null;
  do_date?: string | null;
  nitrate_mg_l?: number | null;
  station_nearest_km?: number | null;
  station_name?: string | null;
  last_measured?: string | null;
}
interface SuperfundSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  nearest_site_status?: string | null;
  sites_within_5km?: number | null;
}
interface CriticalHabitatSummary {
  on_site?: boolean;
  species_on_site?: number | null;
  species_nearby?: number | null;
  primary_species?: string | null;
  primary_status?: string | null;
  species_list?: string[];
}
interface StormEventsSummary {
  disaster_count_10yr?: number | null;
  latest_disaster_title?: string | null;
  latest_disaster_date?: string | null;
  most_common_type?: string | null;
}
interface CropValidationSummary {
  cdl_crop_name?: string | null;
  land_use_class?: string | null;
  is_agricultural?: boolean;
  is_cropland?: boolean;
  cdl_year?: number | null;
}

type PanelMode = 'realtime' | 'design';

const INTERVENTIONS = [
  { icon: '◉', label: 'Keyline pond (1 acre)',         phase: 'Phase 2', color: water[400] },
  { icon: '≡', label: 'Swale network on contour',      phase: 'Phase 2', color: water[400] },
  { icon: '▼', label: 'Roof catchment system',          phase: 'Phase 1', color: confidence.high },
  { icon: '○', label: 'Wetland restoration buffer',     phase: 'Phase 3', color: confidence.medium },
  { icon: '◆', label: 'Tile drain control structures',  phase: 'Phase 1', color: confidence.high },
  { icon: '~', label: 'Riparian planting (30m buffer)', phase: 'Phase 2', color: water[400] },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

function BigMetric({ label, value, unit, bar = 0, note }: {
  label: string;
  value: string;
  unit?: string;
  bar?: number;   // 0–1
  note?: string;
}) {
  return (
    <div className={s.bigMetric}>
      <span className={s.bigMetricLabel}>{label}</span>
      <div className={s.bigMetricValueRow}>
        <span className={s.bigMetricValue}>{value}</span>
        {unit && <span className={s.bigMetricUnit}>{unit}</span>}
      </div>
      {bar > 0 && (
        <div className={s.thinBarTrack}>
          <div className={s.thinBarFill} style={{ width: `${Math.min(bar * 100, 100)}%` }} />
        </div>
      )}
      {note && <span className={s.bigMetricNote}>{note}</span>}
    </div>
  );
}

function SegmentedBar({ value, max, segments = 8 }: { value: number; max: number; segments?: number }) {
  const filled = Math.round((value / max) * segments);
  return (
    <div className={s.segBar}>
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className={i < filled ? s.segFilled : s.segEmpty} />
      ))}
    </div>
  );
}

function StatusWord({ label, value, icon, description, color }: {
  label: string;
  value: string;
  icon: string;
  description: string;
  color: string;
}) {
  return (
    <div className={s.statusBlock}>
      <span className={s.bigMetricLabel}>{label}</span>
      <div className={s.statusWordRow}>
        <span className={s.statusWord} style={{ color }}>{value}</span>
        <span className={s.statusIcon}>{icon}</span>
      </div>
      <p className={s.statusDesc}>{description}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HydrologyRightPanel({ project }: HydrologyRightPanelProps) {
  const [mode, setMode] = useState<PanelMode>('realtime');
  const siteData = useSiteData(project.id);

  const { live, metrics } = useMemo(() => {
    const loading = !siteData || siteData.status !== 'complete';

    const climate      = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate')             : null;
    const watershed    = siteData ? getLayerSummary<WatershedSummary>(siteData, 'watershed')         : null;
    const wetFlood     = siteData ? getLayerSummary<WetlandsFloodSummary>(siteData, 'wetlands_flood'): null;
    const elevation    = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation')         : null;
    const soils        = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils')                 : null;
    const landCover    = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover')       : null;
    const groundwater  = siteData ? getLayerSummary<GroundwaterSummary>(siteData, 'groundwater')          : null;
    const waterQuality = siteData ? getLayerSummary<WaterQualitySummary>(siteData, 'water_quality')     : null;
    const superfund    = siteData ? getLayerSummary<SuperfundSummary>(siteData, 'superfund')                : null;
    const critHabitat  = siteData ? getLayerSummary<CriticalHabitatSummary>(siteData, 'critical_habitat') : null;
    const stormEvents  = siteData ? getLayerSummary<StormEventsSummary>(siteData, 'storm_events')         : null;
    const cropValid    = siteData ? getLayerSummary<CropValidationSummary>(siteData, 'crop_validation')   : null;

    const precipMm   = climate?.annual_precip_mm ?? HYDRO_DEFAULTS.precipMm;
    const tempC      = climate?.annual_temp_mean_c ?? HYDRO_DEFAULTS.annualTempC;
    const isLive     = siteData?.isLive ?? false;

    const inputs = {
      precipMm,
      catchmentHa:    (() => { const v = parseFloat(String(watershed?.catchment_area_ha ?? '')); return isFinite(v) ? v : null; })(),
      propertyAcres:  project.acreage ?? HYDRO_DEFAULTS.propertyAcres,
      slopeDeg:       elevation?.mean_slope_deg ?? HYDRO_DEFAULTS.slopeDeg,
      hydrologicGroup: parseHydrologicGroup(soils?.hydrologic_group),
      drainageClass:  soils?.drainage_class ?? HYDRO_DEFAULTS.drainageClass,
      floodZone:      wetFlood?.flood_zone ?? HYDRO_DEFAULTS.floodZone,
      wetlandPct:     Number(wetFlood?.wetland_pct ?? HYDRO_DEFAULTS.wetlandPct),
      annualTempC:    tempC,
    };

    const m = computeHydrologyMetrics(inputs);

    // Annual water budget formatted strings
    const budget = {
      precip:    `~${fmtGal(m.annualRainfallGal)} gal/yr`,
      retention: `~${fmtGal(m.currentRetentionGal)} gal (${Math.round(m.currentRetentionGal / m.annualRainfallGal * 100)}%)`,
      target:    `~${fmtGal(m.targetRetentionGal)} gal (${Math.round(m.targetRetentionGal / m.annualRainfallGal * 100)}%)`,
      demand:    `~${fmtGal(m.irrigationDemandGal)} gal/yr`,
      surplus:   `+${fmtGal(Math.max(m.surplusGal, 0))} gal`,
    };

    // Sprint Q: Biomass energy potential (GJ/ha/yr)
    let biomassGjHa = 0;
    const cropName = (cropValid?.cdl_crop_name ?? '').toLowerCase();
    if (cropValid?.is_cropland) {
      const residueTHa = cropName.includes('corn') ? 7 : cropName.includes('wheat') ? 5
        : cropName.includes('soy') ? 3 : cropName.includes('rice') ? 6 : 4;
      biomassGjHa = Math.round(residueTHa * 15);
    } else if (cropValid?.is_agricultural) {
      biomassGjHa = Math.round(3 * 12);
    } else {
      const treeCanopy = landCover?.tree_canopy_pct ?? 0;
      if (treeCanopy > 20) biomassGjHa = Math.round((treeCanopy / 100) * 120);
    }
    if ((soils?.organic_matter_pct ?? 0) > 3 && biomassGjHa > 0) {
      biomassGjHa = Math.round(biomassGjHa * (1 + ((soils?.organic_matter_pct ?? 3) - 3) * 0.05));
    }

    // Sprint Q: Micro-hydro potential (kW)
    let microhydroKw = 0;
    if (precipMm > 0) {
      const slopeDeg = elevation?.mean_slope_deg ?? 0;
      const nearestStreamM = Number(watershed?.nearest_stream_m ?? 0);
      const catchRaw = parseFloat(String(watershed?.catchment_area_ha ?? ''));
      const catchHa = isFinite(catchRaw) ? catchRaw : 0;
      const precipM = precipMm / 1000;
      const catchM2 = catchHa * 10000;
      const annualRunoffM3 = precipM * catchM2 * 0.3;
      const meanDischargeM3s = catchHa > 0 ? annualRunoffM3 / (365.25 * 86400) : 0;
      const headM = slopeDeg > 0 && nearestStreamM > 0
        ? Math.min(nearestStreamM * Math.tan(slopeDeg * Math.PI / 180), 50)
        : slopeDeg > 2 ? Math.min(slopeDeg * 3, 30) : 0;
      if (meanDischargeM3s > 0.01 && headM > 1) {
        microhydroKw = Math.round(meanDischargeM3s * headM * 9.81 * 0.7 * 10) / 10;
      }
    }

    // Sprint R: Carbon sequestration flux (tCO₂/ha/yr)
    const cTreeCanopy   = landCover?.tree_canopy_pct ?? 0;
    const cWetlandPct   = Number(wetFlood?.wetland_pct ?? 0);
    const cOmPct        = soils?.organic_matter_pct ?? 0;
    const forestSeqRate  = (cTreeCanopy / 100) * 4.5;
    const wetlandSeqRate = (isFinite(cWetlandPct) ? cWetlandPct : 0) / 100 * 6.0;
    const soilSeqRate    = cOmPct > 3 ? 1.5 : cOmPct > 2 ? 0.8 : cOmPct > 1 ? 0.3 : 0;
    const cropPenalty    = cropValid?.is_cropland ? -0.5 : 0;
    const carbonSeqHaYr  = Math.round(Math.max(0, forestSeqRate + wetlandSeqRate + soilSeqRate + cropPenalty) * 100) / 100;
    // Total site: convert acres → ha (1 acre = 0.404686 ha)
    const siteHa         = (project.acreage ?? 0) * 0.404686;
    const carbonSeqTotalYr = siteHa > 0 ? Math.round(carbonSeqHaYr * siteHa * 10) / 10 : null;
    const carbonClass    = carbonSeqHaYr >= 2 ? 'Sink' : carbonSeqHaYr >= 0.5 ? 'Weak Sink' : carbonSeqHaYr > 0 ? 'Near-Neutral' : 'Source';

    return {
      live: {
        rainfall:             `${precipMm} mm/yr`,
        rainfallNote:         isLive ? 'NOAA/ECCC 30-yr avg' : 'Estimated',
        watershed:            watershed?.watershed_name ?? '—',
        nearestStream:        watershed?.nearest_stream_m != null ? `${watershed.nearest_stream_m}m` : '—',
        flowDirection:        watershed?.flow_direction ?? '—',
        floodZone:            wetFlood?.flood_zone ?? '—',
        wetlandPct:           wetFlood?.wetland_pct != null ? `${wetFlood.wetland_pct}%` : '—',
        retScore:             m.retentionScore,
        budget:               loading ? null : budget,
        groundwaterDepth:     groundwater?.groundwater_depth_m != null
          ? `${Number(groundwater.groundwater_depth_m).toFixed(1)}m below surface` : '—',
        groundwaterStation:   groundwater?.station_name ?? null,
        waterQualityPH:       waterQuality?.ph_value != null
          ? `pH ${Number(waterQuality.ph_value).toFixed(1)}` : '—',
        waterQualityDO:       waterQuality?.dissolved_oxygen_mg_l != null
          ? `${Number(waterQuality.dissolved_oxygen_mg_l).toFixed(1)} mg/L` : '—',
        waterQualityStation:  waterQuality?.station_name ?? null,
        superfundNearest:     superfund?.nearest_site_km != null
          ? `${Number(superfund.nearest_site_km).toFixed(1)} km` : '—',
        superfundName:        superfund?.nearest_site_name ?? null,
        superfundStatus:      superfund?.nearest_site_status ?? null,
        superfundCount5km:    superfund?.sites_within_5km ?? 0,
        critHabitatOnSite:    critHabitat?.on_site ?? false,
        critHabitatSpecies:   critHabitat?.primary_species ?? null,
        critHabitatStatus:    critHabitat?.primary_status ?? null,
        critHabitatNearby:    critHabitat?.species_nearby ?? 0,
        disasterCount10yr:    stormEvents?.disaster_count_10yr ?? null,
        latestDisaster:       stormEvents?.latest_disaster_title ?? null,
        latestDisasterDate:   stormEvents?.latest_disaster_date ?? null,
        mostCommonDisaster:   stormEvents?.most_common_type ?? null,
        cdlCropName:          cropValid?.cdl_crop_name ?? null,
        cdlLandUse:           cropValid?.land_use_class ?? null,
        cdlIsAgricultural:    cropValid?.is_agricultural ?? false,
        cdlYear:              cropValid?.cdl_year ?? null,
        meanSlopeDeg:         elevation?.mean_slope_deg ?? null,
        minElevM:             elevation?.min_elevation_m ?? null,
        maxElevM:             elevation?.max_elevation_m ?? null,
        biomassGjHa,
        microhydroKw,
        carbonSeqHaYr,
        carbonSeqTotalYr,
        carbonClass,
      },
      metrics: m,
    };
  }, [siteData, project.acreage]);

  const isLoading = siteData?.status === 'loading';

  return (
    <div className={p.container}>
      {/* Mode toggle */}
      <div className={s.modeToggle}>
        <button
          className={mode === 'realtime' ? s.modeTabActive : s.modeTab}
          onClick={() => setMode('realtime')}
        >
          Real-Time
        </button>
        <button
          className={mode === 'design' ? s.modeTabActive : s.modeTab}
          onClick={() => setMode('design')}
        >
          Design
        </button>
      </div>

      {mode === 'realtime' ? (
        <RealtimePanel live={live} metrics={metrics} isLoading={isLoading} />
      ) : (
        <DesignPanel live={live} metrics={metrics} />
      )}
    </div>
  );
}

// ─── Real-Time Analysis panel ─────────────────────────────────────────────────

function RealtimePanel({ live, metrics, isLoading }: {
  live: ReturnType<typeof buildLive>;
  metrics: ReturnType<typeof buildMetrics>;
  isLoading: boolean;
}) {
  const [storm, setStorm] = useState<'baseline' | 'frequent' | 'active' | 'catastrophic'>('active');

  return (
    <>
      <div className={s.panelSection}>
        <span className={s.sectionTag}>REAL-TIME ANALYSIS</span>
        {isLoading && (
          <div className={s.loadingRow}>
            <Spinner size="sm" />
            <span className={s.loadingText}>Fetching water data…</span>
          </div>
        )}

        <BigMetric
          label="RUNOFF VELOCITY"
          value={metrics.runoffVelocity.toFixed(2)}
          unit="m/s"
          bar={Math.min(metrics.runoffVelocity / 5, 1)}
        />
        <BigMetric
          label="INFILTRATION RATE"
          value={metrics.infiltrationRate.toFixed(1)}
          unit="mm/hr"
          bar={Math.min(metrics.infiltrationRate / 30, 1)}
        />
        <BigMetric
          label="PEAK DISCHARGE"
          value={metrics.peakDischarge.toFixed(1)}
          unit="m³/s"
          bar={Math.min(metrics.peakDischarge / 500, 1)}
          note="ESTIMATED AT WATERSHED OUTLET"
        />

        {/* Sub-basin loading chart */}
        <div className={s.subBasinBlock}>
          <span className={s.bigMetricLabel}>SUB-BASIN LOADING</span>
          <div className={s.subBasinBars}>
            {metrics.subBasinBars.map((h, i) => {
              const peak = Math.max(...metrics.subBasinBars);
              return (
                <div key={i} className={s.subBasinBarWrap}>
                  <div
                    className={s.subBasinBar}
                    style={{
                      height: `${(h / peak) * 100}%`,
                      background: h === peak ? statusToken.good : 'rgba(138,154,116,0.3)',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical alert */}
      <div className={s.alertCard}>
        <div className={s.alertHeader}>
          <span className={s.alertIcon}>
            <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1L12.5 11.5H0.5L6.5 1Z" stroke={semantic.sidebarActive} strokeWidth={1.4} strokeLinejoin="round"/>
              <line x1="6.5" y1="5" x2="6.5" y2="8.5" stroke={semantic.sidebarActive} strokeWidth={1.4} strokeLinecap="round"/>
              <circle cx="6.5" cy="10" r="0.6" fill={semantic.sidebarActive}/>
            </svg>
          </span>
          <span className={s.alertTitle}>SITE ALERT</span>
        </div>
        <p className={s.alertText}>{metrics.alertText}</p>
      </div>

      {/* Storm simulation bar */}
      <div className={s.stormBar}>
        <span className={s.stormLabel}>Storm Event Simulation</span>
        <div className={s.stormScale}>
          {(['baseline', 'frequent', 'active', 'catastrophic'] as const).map((level) => (
            <button
              key={level}
              className={storm === level ? s.stormSegActive : s.stormSeg}
              onClick={() => setStorm(level)}
            >
              {level === 'active' && <span className={s.stormActiveLabel}>50-Year Storm</span>}
              <span className={s.stormSegLabel}>{level.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live site data */}
      <div className={s.panelSection} style={{ marginTop: 16 }}>
        <span className={s.sectionTag}>SITE WATER DATA</span>
        <div className={s.dataRows}>
          <DataRow label="Annual Rainfall"  value={live?.rainfall ?? '—'}      note={live?.rainfallNote} />
          <DataRow label="Watershed"        value={live?.watershed ?? '—'} />
          <DataRow label="Nearest Stream"   value={live?.nearestStream ?? '—'} />
          <DataRow label="Flow Direction"   value={live?.flowDirection ?? '—'} />
          <DataRow label="Flood Zone"       value={live?.floodZone ?? '—'}
            color={/Zone X|minimal|not regulated/i.test(live?.floodZone ?? '') ? confidence.high : errorToken.DEFAULT} />
          <DataRow label="Wetland Coverage" value={live?.wetlandPct ?? '—'} />
          <DataRow label="Retention Score"  value={live?.retScore ? `${live.retScore}/100` : '—'} color={semantic.sidebarActive} />
          <DataRow label="Groundwater Depth"
            value={live?.groundwaterDepth ?? '—'}
            note={live?.groundwaterStation ?? undefined} />
          <DataRow label="Water Quality pH"
            value={live?.waterQualityPH ?? '—'}
            note={live?.waterQualityStation ?? undefined} />
          <DataRow label="Dissolved Oxygen"
            value={live?.waterQualityDO ?? '—'} />
        </div>
      </div>

      {/* Sprint N: Hydrology Intelligence — computed metrics surfacing */}
      <div className={s.panelSection} style={{ marginTop: 16 }}>
        <span className={s.sectionTag}>HYDROLOGY INTELLIGENCE</span>
        <div className={s.dataRows}>
          <DataRow label="Evapotranspiration"
            value={`${Math.round(metrics.annualEtMm)} mm/yr`}
            note="Blaney-Criddle estimate" />
          <DataRow label="Potential ET (PET)"
            value={`${Math.round(metrics.petMm)} mm/yr`} />
          <DataRow label="Aridity Index"
            value={`${metrics.aridityIndex.toFixed(2)} (${metrics.aridityClass})`}
            color={metrics.aridityClass === 'Humid' || metrics.aridityClass === 'Dry sub-humid' ? confidence.high
              : metrics.aridityClass === 'Semi-arid' ? confidence.medium : errorToken.DEFAULT} />
          <DataRow label="Water Balance"
            value={`${metrics.waterBalanceMm >= 0 ? '+' : ''}${Math.round(metrics.waterBalanceMm)} mm/yr`}
            color={metrics.waterBalanceMm >= 0 ? confidence.high : errorToken.DEFAULT} />
          <DataRow label="Irrigation Deficit"
            value={metrics.irrigationDeficitMm > 0 ? `${Math.round(metrics.irrigationDeficitMm)} mm/yr` : 'None'}
            color={metrics.irrigationDeficitMm === 0 ? confidence.high : confidence.medium} />
          <DataRow label="GW Recharge Est."
            value={`${Math.round(metrics.groundwaterRechargeMm)} mm/yr`} />
          <DataRow label="Growing Period"
            value={metrics.lgpDays > 0 ? `${metrics.lgpDays} days` : '—'}
            note={metrics.lgpClass || undefined} />
        </div>
      </div>

      {/* Sprint O: Environmental Risk & Ecological */}
      <div className={s.panelSection} style={{ marginTop: 16 }}>
        <span className={s.sectionTag}>ENVIRONMENTAL & ECOLOGICAL</span>
        <div className={s.dataRows}>
          <DataRow label="Superfund Nearest"
            value={live?.superfundNearest ?? '—'}
            note={live?.superfundName ?? undefined}
            color={live?.superfundCount5km && live.superfundCount5km > 0 ? errorToken.DEFAULT : confidence.high} />
          {live?.superfundCount5km != null && live.superfundCount5km > 0 && (
            <DataRow label="Sites within 5km"
              value={`${live.superfundCount5km} site${live.superfundCount5km > 1 ? 's' : ''}`}
              color={errorToken.DEFAULT} />
          )}
          <DataRow label="Critical Habitat"
            value={live?.critHabitatOnSite ? 'ON SITE' : live?.critHabitatNearby ? `${live.critHabitatNearby} species nearby` : 'None found'}
            note={live?.critHabitatSpecies ?? undefined}
            color={live?.critHabitatOnSite ? errorToken.DEFAULT : confidence.high} />
          {live?.critHabitatStatus && (
            <DataRow label="ESA Status"
              value={live.critHabitatStatus} />
          )}
          <DataRow label="Disasters (10yr)"
            value={live?.disasterCount10yr != null ? `${live.disasterCount10yr} declarations` : '—'}
            note={live?.mostCommonDisaster ?? undefined}
            color={live?.disasterCount10yr != null && live.disasterCount10yr >= 4 ? errorToken.DEFAULT : confidence.high} />
          {live?.latestDisaster && (
            <DataRow label="Latest Event"
              value={live.latestDisaster}
              note={live?.latestDisasterDate ?? undefined} />
          )}
        </div>
      </div>

      {/* Sprint P: Crop Validation — Sprint S: show when either crop name or land use class is available */}
      {(live?.cdlCropName || live?.cdlLandUse) && (
        <div className={s.panelSection} style={{ marginTop: 16 }}>
          <span className={s.sectionTag}>CROP VALIDATION</span>
          <div className={s.dataRows}>
            {live.cdlCropName && (
              <DataRow label="Observed Crop"
                value={live.cdlCropName}
                note={live.cdlYear ? `USDA CDL ${live.cdlYear}` : undefined} />
            )}
            <DataRow label="Land Use Class"
              value={live.cdlLandUse ?? '—'}
              color={live.cdlIsAgricultural ? confidence.high : confidence.medium} />
          </div>
        </div>
      )}

      {/* Sprint Q: Renewable Energy Potential */}
      {(live.biomassGjHa > 0 || live.microhydroKw > 0) && (
        <div className={s.panelSection} style={{ marginTop: 16 }}>
          <span className={s.sectionTag}>RENEWABLE ENERGY</span>
          <div className={s.dataRows}>
            {live.biomassGjHa > 0 && (
              <DataRow label="Biomass Energy"
                value={`${live.biomassGjHa} GJ/ha/yr`}
                color={live.biomassGjHa >= 80 ? confidence.high : live.biomassGjHa >= 40 ? confidence.medium : confidence.low} />
            )}
            {live.microhydroKw > 0 && (
              <DataRow label="Micro-Hydro"
                value={`${live.microhydroKw} kW`}
                color={live.microhydroKw >= 10 ? confidence.high : live.microhydroKw >= 5 ? confidence.medium : confidence.low} />
            )}
          </div>
        </div>
      )}

      {/* Sprint R: Carbon Sequestration */}
      <div className={s.panelSection} style={{ marginTop: 16 }}>
        <span className={s.sectionTag}>CARBON SEQUESTRATION</span>
        <div className={s.dataRows}>
          <DataRow label="Seq. Rate"
            value={`${live.carbonSeqHaYr.toFixed(2)} tCO₂/ha/yr`}
            color={live.carbonSeqHaYr >= 2 ? confidence.high : live.carbonSeqHaYr >= 0.5 ? confidence.medium : confidence.low} />
          <DataRow label="Carbon Class"
            value={live.carbonClass}
            color={live.carbonClass === 'Sink' ? confidence.high : live.carbonClass === 'Weak Sink' ? confidence.medium : confidence.low} />
          {live.carbonSeqTotalYr !== null && (
            <DataRow label="Total Site"
              value={`${live.carbonSeqTotalYr} tCO₂/yr`}
              note="based on parcel area" />
          )}
        </div>
      </div>

      {/* Sprint S: Terrain */}
      {(live.meanSlopeDeg !== null || live.minElevM !== null) && (
        <div className={s.panelSection} style={{ marginTop: 16 }}>
          <span className={s.sectionTag}>TERRAIN</span>
          <div className={s.dataRows}>
            {live.meanSlopeDeg !== null && (
              <DataRow label="Mean Slope"
                value={`${live.meanSlopeDeg.toFixed(1)}°`}
                color={live.meanSlopeDeg > 15 ? errorToken.DEFAULT : live.meanSlopeDeg > 8 ? confidence.medium : confidence.high} />
            )}
            {live.minElevM !== null && live.maxElevM !== null && (
              <DataRow label="Elevation Range"
                value={`${live.minElevM}–${live.maxElevM} m`}
                note={`Δ${live.maxElevM - live.minElevM} m relief`} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Design Parameters panel ──────────────────────────────────────────────────

function DesignPanel({ live, metrics }: {
  live: ReturnType<typeof buildLive>;
  metrics: ReturnType<typeof buildMetrics>;
}) {
  const catchmentFmt = metrics.catchmentVolume >= 1000
    ? `${(metrics.catchmentVolume / 1000).toFixed(1)}k`
    : `${metrics.catchmentVolume.toFixed(0)}`;

  return (
    <>
      <div className={s.panelSection}>
        <span className={s.sectionTag}>DESIGN PARAMETERS</span>

        <BigMetric label="CATCHMENT VOLUME" value={catchmentFmt} unit="m³" bar={Math.min(metrics.catchmentVolume / 20000, 1)} />

        <div className={s.bigMetric}>
          <span className={s.bigMetricLabel}>POND DEPTH</span>
          <div className={s.bigMetricValueRow}>
            <span className={s.bigMetricValue}>{metrics.pondDepth.toFixed(1)}</span>
            <span className={s.bigMetricUnit}>meters</span>
          </div>
          <SegmentedBar value={metrics.pondDepth} max={6} segments={8} />
        </div>

        <StatusWord
          label="SEEPAGE RISK"
          value={metrics.seepageRisk}
          icon={metrics.seepageRisk === 'LOWEST' || metrics.seepageRisk === 'LOW' ? '🛡' : '⚠'}
          description={metrics.seepageDesc}
          color={metrics.seepageRiskColor}
        />
      </div>

      {/* AI Siting Support */}
      <div className={s.aiCard}>
        <div className={s.aiHeader}>
          <span className={s.aiIcon}>✦</span>
          <span className={s.aiLabel}>AI SITING SUPPORT</span>
        </div>
        <p className={s.aiText}>&ldquo;{metrics.aiSitingText}&rdquo;</p>
      </div>

      {/* Keyline insight */}
      <div className={s.quoteCard}>
        <p className={s.quoteText}>
          &ldquo;The keyline point — where valley transitions to slope — is the highest
          leverage point for water retention. A single well-placed pond here could irrigate
          40+ acres by gravity alone.&rdquo;
        </p>
        <div className={s.quoteAttr}>— Water Retention Landscape principle</div>
      </div>

      {/* Water System Interventions */}
      <div className={s.panelSection}>
        <span className={s.sectionTag}>WATER SYSTEM INTERVENTIONS</span>
        <div className={s.interventionList}>
          {INTERVENTIONS.map((item, i) => (
            <div key={i} className={s.interventionRow}>
              <span className={s.interventionIcon} style={{ color: item.color }}>{item.icon}</span>
              <span className={s.interventionLabel}>{item.label}</span>
              <span className={s.phaseBadge} style={{
                color: item.phase === 'Phase 1' ? confidence.high : item.phase === 'Phase 2' ? water[400] : confidence.medium,
                background: item.phase === 'Phase 1' ? 'rgba(45,122,79,0.1)' : item.phase === 'Phase 2' ? 'rgba(91,157,184,0.1)' : 'rgba(138,109,30,0.1)',
              }}>{item.phase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Annual Water Budget */}
      {live?.budget && (
        <div className={s.budgetCard}>
          <span className={s.sectionTag}>ANNUAL WATER BUDGET</span>
          <div className={s.budgetRows}>
            <BudgetRow label="Precipitation input"      value={live.budget.precip} />
            <BudgetRow label="Current retention"         value={live.budget.retention} />
            <BudgetRow label="Post-intervention target"  value={live.budget.target} />
            <BudgetRow label="Irrigation demand"         value={live.budget.demand} />
            <BudgetRow label="Surplus capacity"          value={live.budget.surplus} highlight />
          </div>
        </div>
      )}

      {/* Sprint N: Storage & Resilience Metrics */}
      <div className={s.panelSection} style={{ marginTop: 16 }}>
        <span className={s.sectionTag}>STORAGE & RESILIENCE</span>
        <div className={s.dataRows}>
          <DataRow label="RWH Potential"
            value={`~${fmtGal(metrics.rwhPotentialGal)} gal/yr`} />
          <DataRow label="RWH Buffer (2-wk)"
            value={`~${fmtGal(metrics.rwhStorageGal)} gal`} />
          <DataRow label="Total Site Storage"
            value={`~${fmtGal(metrics.totalStorageGal)} gal`} />
          <DataRow label="Catchment Potential"
            value={`~${fmtGal(metrics.catchmentPotentialGal)} gal`} />
          <DataRow label="Drought Buffer"
            value={`${metrics.droughtBufferDays} days`}
            color={metrics.droughtBufferDays >= 14 ? confidence.high
              : metrics.droughtBufferDays >= 7 ? confidence.medium : errorToken.DEFAULT} />
        </div>
      </div>
    </>
  );
}

// ─── Utility sub-components ───────────────────────────────────────────────────

// Dummy stubs to satisfy TypeScript return type inference for the panel props
function buildLive() { return null as unknown as {
  rainfall: string; rainfallNote: string; watershed: string;
  nearestStream: string; flowDirection: string; floodZone: string;
  wetlandPct: string; retScore: number;
  budget: { precip: string; retention: string; target: string; demand: string; surplus: string } | null;
  groundwaterDepth: string; groundwaterStation: string | null;
  waterQualityPH: string; waterQualityDO: string; waterQualityStation: string | null;
  superfundNearest: string; superfundName: string | null; superfundStatus: string | null; superfundCount5km: number;
  critHabitatOnSite: boolean; critHabitatSpecies: string | null; critHabitatStatus: string | null; critHabitatNearby: number;
  disasterCount10yr: number | null; latestDisaster: string | null; latestDisasterDate: string | null; mostCommonDisaster: string | null;
  cdlCropName: string | null; cdlLandUse: string | null; cdlIsAgricultural: boolean; cdlYear: number | null;
  meanSlopeDeg: number | null; minElevM: number | null; maxElevM: number | null;
  biomassGjHa: number; microhydroKw: number;
  carbonSeqHaYr: number; carbonSeqTotalYr: number | null; carbonClass: string;
}; }

function buildMetrics() { return null as unknown as ReturnType<typeof computeHydrologyMetrics>; }

function DataRow({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <div className={s.dataRow}>
      <span className={s.dataLabel}>{label}</span>
      <div className={s.dataValueWrap}>
        <span className={s.dataValue} style={color ? { color } : undefined}>{value}</span>
        {note && <span className={s.dataNote}>{note}</span>}
      </div>
    </div>
  );
}

function BudgetRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={s.budgetRow}>
      <span className={s.budgetLabel}>{label}</span>
      <span className={highlight ? s.budgetValueHighlight : s.budgetValue}>{value}</span>
    </div>
  );
}
