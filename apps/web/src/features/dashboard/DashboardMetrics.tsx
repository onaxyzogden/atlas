/**
 * DashboardMetrics — contextual right sidebar with metric cards.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { computeHydrologyMetrics, fmtGal, parseHydrologicGroup, HYDRO_DEFAULTS } from '../../lib/hydrologyMetrics.js';
import MetricCard from './components/MetricCard.js';
import { semantic } from '../../lib/tokens.js';
import css from './DashboardMetrics.module.css';

// ─── Layer summary types ──────────────────────────────────────────────────────
interface ClimateSummary   { annual_precip_mm?: number; annual_temp_mean_c?: number; growing_season_days?: number; hardiness_zone?: string; first_frost_date?: string; last_frost_date?: string; }
interface WatershedSummary { catchment_area_ha?: number | string; }
interface WetlandsFlood    { flood_zone?: string; wetland_pct?: number | string; }
interface ElevationSummary {
  mean_slope_deg?: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
  predominant_aspect?: string;
}
interface SoilsSummary {
  hydrologic_group?: string;
  drainage_class?: string;
  organic_matter_pct?: number | string;
  ph_range?: string;
  farmland_class?: string;
}
interface LandCoverSummary { tree_canopy_pct?: number | string; }

interface DashboardMetricsProps {
  section: string;
  project: LocalProject;
}

export default function DashboardMetrics({ section, project }: DashboardMetricsProps) {
  const siteData = useSiteData(project.id);

  const hydroCards = useMemo(() => {
    if (section !== 'hydrology-dashboard') return null;
    const climate   = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate')         : null;
    const watershed = siteData ? getLayerSummary<WatershedSummary>(siteData, 'watershed')     : null;
    const wetFlood  = siteData ? getLayerSummary<WetlandsFlood>(siteData, 'wetlands_flood')   : null;
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation')     : null;
    const soils     = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils')             : null;
    const m = computeHydrologyMetrics({
      precipMm:        climate?.annual_precip_mm      ?? HYDRO_DEFAULTS.precipMm,
      catchmentHa:     (() => { const v = parseFloat(String(watershed?.catchment_area_ha ?? '')); return isFinite(v) ? v : null; })(),
      propertyAcres:   project.acreage                ?? HYDRO_DEFAULTS.propertyAcres,
      slopeDeg:        elevation?.mean_slope_deg      ?? HYDRO_DEFAULTS.slopeDeg,
      hydrologicGroup: parseHydrologicGroup(soils?.hydrologic_group),
      drainageClass:   soils?.drainage_class          ?? HYDRO_DEFAULTS.drainageClass,
      floodZone:       wetFlood?.flood_zone           ?? HYDRO_DEFAULTS.floodZone,
      wetlandPct:      Number(wetFlood?.wetland_pct   ?? HYDRO_DEFAULTS.wetlandPct),
      annualTempC:     climate?.annual_temp_mean_c    ?? HYDRO_DEFAULTS.annualTempC,
    });
    return [
      { label: 'Water Resilience Score', value: String(m.resilienceScore),       unit: '/100',   trendPositive: m.resilienceScore >= 70 },
      { label: 'Total Storage',          value: fmtGal(m.totalStorageGal),       unit: 'Gallons' },
      { label: 'Catchment Potential',    value: fmtGal(m.catchmentPotentialGal), unit: 'Gal/Yr'  },
      { label: 'Drought Buffer',         value: String(m.droughtBufferDays),     unit: 'Days',   trend: `${m.droughtBufferDays} days estimated`, trendPositive: m.droughtBufferDays > 100 },
    ];
  }, [section, siteData, project.acreage]);

  const terrainCards = useMemo(() => {
    if (section !== 'terrain-dashboard') return null;
    const elev  = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils')         : null;
    const minE  = elev?.min_elevation_m ?? 368;
    const maxE  = elev?.max_elevation_m ?? 412;
    const slopeDeg = elev?.mean_slope_deg ?? 3.5;
    const slopePct = Math.round(Math.tan(slopeDeg * Math.PI / 180) * 100 * 10) / 10;
    const relief   = Math.round(maxE - minE);
    const drain    = (soils?.drainage_class ?? '').toLowerCase();
    const group    = soils?.hydrologic_group?.match(/[ABCD]/)?.[0] ?? 'B';
    let risk = 'Low';
    if (slopeDeg > 15 && 'CD'.includes(group)) risk = 'High';
    else if (slopeDeg > 10 || (slopeDeg > 5 && 'CD'.includes(group))) risk = 'Moderate–High';
    else if (slopeDeg > 5) risk = 'Low–Moderate';
    return [
      { label: 'Site Elevation',      value: String(Math.round(maxE)), unit: 'm ASL', description: 'Centre point elevation' },
      { label: 'Local Relief (500m)', value: String(relief),           unit: 'm',     description: 'Elevation range within 500m radius' },
      { label: 'Avg Slope',           value: String(slopePct),         unit: '%'     },
      { label: 'Erosion Risk',        value: risk },
    ];
  }, [section, siteData]);

  const ecoCards = useMemo(() => {
    if (section !== 'ecological') return null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om    = isFinite(omRaw) ? omRaw : 4.5;
    const ph    = soils?.ph_range ?? '—';
    // Derive score same way as EcologicalDashboard
    let score = 40;
    if (isFinite(omRaw)) {
      if (omRaw >= 5) score += 25; else if (omRaw >= 3) score += 18; else if (omRaw >= 1) score += 10; else score += 3;
    } else score += 10;
    const drain = (soils?.drainage_class ?? '').toLowerCase();
    if (drain.includes('well')) score += 15; else if (!drain.includes('poor')) score += 10; else score += 4;
    if (/6\.[0-9]|7\.[0-5]/.test(ph)) score += 12; else if (ph !== '—') score += 7; else score += 5;
    if ((soils?.farmland_class ?? '').toLowerCase().includes('prime')) score += 7; else score += 3;
    score = Math.min(Math.max(score, 30), 99);
    return [
      { label: 'Regenerative Potential', value: String(score),          unit: '/100' },
      { label: 'Organic Matter',         value: om.toFixed(1),           unit: '%'   },
      { label: 'pH Range',               value: ph },
      { label: 'Drainage Class',         value: soils?.drainage_class ?? '—' },
    ];
  }, [section, siteData]);

  const forestCards = useMemo(() => {
    if (section !== 'forest-hub') return null;
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const omRaw    = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om       = isFinite(omRaw) ? omRaw : 4.5;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy   = isFinite(canopyRaw) ? canopyRaw : 45;
    const drain    = (soils?.drainage_class ?? '').toLowerCase();
    const omBonus  = om >= 5 ? 15 : om >= 3 ? 10 : om >= 1 ? 6 : 2;
    const drainBonus = drain.includes('well') ? 8 : drain.includes('poor') ? 2 : 5;
    const healthIdx = Math.min(Math.max(Math.round(55 + (canopy / 100 * 20) + omBonus + drainBonus), 0), 99);
    const ndvi = Math.round((canopy / 100) * 0.9 * 100) / 100;
    const wellDrained = drain.includes('well');
    const fbRatio = (om >= 5 && wellDrained) ? '4.2:1' : om >= 3 ? '3.2:1' : '1.8:1';
    const mycOm = om >= 5 ? 20 : om >= 3 ? 15 : 5;
    const myc = Math.min(50 + mycOm + (wellDrained ? 8 : 0), 95);
    return [
      { label: 'Tree Health Index', value: String(healthIdx), unit: '%', trendPositive: healthIdx >= 80 },
      { label: 'Canopy Vitality',   value: ndvi.toFixed(2),   unit: 'NDVI' },
      { label: 'F:B Ratio',         value: fbRatio,           description: 'Optimal for forest: 2.0–5.0' },
      { label: 'Mycorrhizal',       value: String(myc),       unit: '%' },
    ];
  }, [section, siteData]);

  const carbonCards = useMemo(() => {
    if (section !== 'carbon-diagnostic') return null;
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const landCover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const climate  = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const omRaw    = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om       = isFinite(omRaw) ? omRaw : 4.0;
    const canopyRaw = parseFloat(String(landCover?.tree_canopy_pct ?? ''));
    const canopy   = isFinite(canopyRaw) ? canopyRaw : 40;
    const precip   = climate?.annual_precip_mm ?? 800;
    const canopyBonus = canopy > 60 ? 2.0 : canopy > 30 ? 1.2 : canopy > 10 ? 0.5 : 0.1;
    const omBonus     = om >= 5 ? 1.5 : om >= 3 ? 1.0 : 0.3;
    const maturity    = Math.min(Math.max(5.0 + canopyBonus + omBonus, 1.0), 10.0);
    const carbonSeq   = Math.max((canopy / 100 * 35) + (om / 10 * 12) + (precip / 1000 * 5), 5.0);
    const biomassYoY  = Math.round(8 + (canopy / 100 * 15) + (om / 5 * 5));
    return [
      { label: 'Maturity Score',      value: maturity.toFixed(1), description: maturity >= 8 ? 'Prime Growth' : 'Establishing' },
      { label: 'Carbon Seq.',         value: carbonSeq.toFixed(1), unit: 'TCO2e/HA' },
      { label: 'Biomass Accumulation', value: `+${biomassYoY}`,   unit: '% YoY', trendPositive: true },
      { label: 'Canopy Cover',        value: String(Math.round(canopy)), unit: '%' },
    ];
  }, [section, siteData]);

  const plantingCards = useMemo(() => {
    if (section !== 'planting-tool') return null;
    const elev    = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const aspect  = (elev?.predominant_aspect ?? 'S').toUpperCase().trim();
    const slope   = elev?.mean_slope_deg ?? 3;
    const zone    = climate?.hardiness_zone ?? '—';
    const growSeason = climate?.growing_season_days ?? 165;
    const lastFrost  = climate?.last_frost_date ?? '—';
    const inRowFt = slope >= 8 ? 25 : slope < 3 ? 15 : 20;
    let orientation = 'NW–SE';
    if (['N', 'NE', 'NW'].includes(aspect)) orientation = 'E–W';
    else if (['S', 'SE', 'SW'].includes(aspect)) orientation = 'N–S';
    return [
      { label: 'Hardiness Zone',  value: zone },
      { label: 'Growing Season',  value: String(growSeason), unit: 'Days' },
      { label: 'Last Frost',      value: lastFrost },
      { label: 'Row Orientation', value: orientation, description: `In-row: ${inRowFt}ft` },
    ];
  }, [section, siteData]);

  const grazingCards = useMemo(() => {
    if (section !== 'grazing-analysis') return null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const precip  = climate?.annual_precip_mm ?? 440;
    const growSeason = climate?.growing_season_days ?? 165;
    const omRaw  = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om     = isFinite(omRaw) ? omRaw : 3.5;
    const drain  = (soils?.drainage_class ?? '').toLowerCase();
    const forageQ = (om >= 5 && growSeason > 180) ? 'High Quality' : om >= 3 ? 'Good' : 'Moderate';
    const status  = (om >= 4 && drain.includes('well')) ? 'Stable' : om < 2 ? 'Monitor' : 'Stable';
    return [
      { label: 'Precipitation',   value: String(precip), unit: 'mm/yr' },
      { label: 'Organic Matter',  value: om.toFixed(1),  unit: '%' },
      { label: 'Forage Quality',  value: forageQ },
      { label: 'Season Status',   value: status, trendPositive: status === 'Stable' },
    ];
  }, [section, siteData]);

  const livestockCards = useMemo(() => {
    if (section !== 'livestock-inventory') return null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils   = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const growSeason = climate?.growing_season_days ?? 165;
    const zone       = climate?.hardiness_zone ?? '—';
    const omRaw  = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om     = isFinite(omRaw) ? omRaw : 3.5;
    const drain  = soils?.drainage_class ?? '—';
    const forageQ = (om >= 5 && growSeason > 180) ? 'High Quality' : om >= 3 ? 'Good' : 'Moderate';
    return [
      { label: 'Forage Quality',  value: forageQ },
      { label: 'Growing Season',  value: String(growSeason), unit: 'Days' },
      { label: 'Drainage Class',  value: drain },
      { label: 'Organic Matter',  value: om.toFixed(1), unit: '%' },
    ];
  }, [section, siteData]);

  const activeCards = hydroCards ?? terrainCards ?? ecoCards ?? forestCards ?? carbonCards ?? plantingCards ?? grazingCards ?? livestockCards;

  return (
    <aside className={css.sidebar}>
      <h3 className={css.title}>
        {SECTION_TITLES[section] ?? 'Regenerative Metrics'}
      </h3>
      <div className={css.cards}>
        {(activeCards ?? getMetricsForSection(section)).map((m, i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>

      {/* Stewardship guidance card */}
      <div className={css.guidanceCard}>
        <div className={css.guidanceIcon}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={semantic.sidebarActive} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
          </svg>
        </div>
        <p className={css.guidanceTitle}>Teaming With Life</p>
        <p className={css.guidanceDesc}>
          Soil microbiology is responding to the current stewardship protocol. Continue monitoring for seasonal shifts.
        </p>
      </div>
    </aside>
  );
}

const SECTION_TITLES: Record<string, string> = {
  'grazing-analysis': 'Regenerative Metrics',
  'herd-rotation': 'Rotation Metrics',
  'paddock-design': 'Paddock Overview',
  'livestock-inventory': 'Inventory Summary',
  'health-ledger': 'Health Metrics',
  'planting-tool': 'Design Metrics',
  'forest-hub': 'Forest Metrics',
  'carbon-diagnostic': 'Carbon Metrics',
  'nursery-ledger': 'Nursery Summary',
  'hydrology-dashboard': 'Water Metrics',
  'cartographic': 'Spatial Data',
  'ecological': 'Ecological Metrics',
  'terrain-dashboard': 'Terrain Metrics',
  'stewardship': 'Stewardship Goals',
  'biomass': 'Biomass Metrics',
};

interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: string;
  trendPositive?: boolean;
}

function getMetricsForSection(section: string): MetricData[] {
  switch (section) {
    case 'grazing-analysis':
      return [
        { label: 'Forage Maturity Score', value: '8.4', trend: '+1.2 pts', trendPositive: true, description: 'Indicating high-density structural carbohydrates and optimal nutrient availability.' },
        { label: 'Soil Carbon Sequestration', value: '12.8', unit: 'TCO2E/HA', description: 'Estimated annual capture via root depth and mycorrhizal networks.' },
        { label: 'Cumulative Grazing Days', value: '1,420', unit: 'Optimal', description: 'Total pressure across all sectors. Sustainability threshold maintained.' },
      ];
    case 'herd-rotation':
      return [
        { label: 'Active Paddock', value: '09', description: 'The Basin — 4.5 acres, 3 days on site.' },
        { label: 'Herd Size', value: '142', unit: 'Head', description: 'Angus Cross herd, North Range sector.' },
        { label: 'Rest Cycle Target', value: '120', unit: 'Days', description: 'Minimum rest for structural root resilience.' },
        { label: 'Soil Moisture', value: '22.4', unit: '%', trend: '+3.1%', trendPositive: true },
      ];
    case 'paddock-design':
      return [
        { label: 'Total Paddocks', value: '6' },
        { label: 'Total Acreage', value: '20.9', unit: 'Acres' },
        { label: 'Avg Rest Period', value: '40', unit: 'Days' },
        { label: 'Active Grazing', value: '04A', description: 'The Basin — currently occupied.' },
      ];
    case 'livestock-inventory':
    case 'health-ledger':
      return [
        { label: 'Total Animal Units', value: '218.4', unit: 'AU' },
        { label: 'Total Head', value: '452' },
        { label: 'Stocking Rate', value: '1.2', unit: 'AU/Acre' },
        { label: 'Forage Demand', value: 'High' },
      ];
    case 'planting-tool':
      return [
        { label: 'Total Linear Feet', value: '2,480' },
        { label: 'Tree Count', value: '124' },
        { label: 'Canopy Cover (Yr 15)', value: '22', unit: '%' },
        { label: 'In-Row Spacing', value: '20', unit: 'ft' },
      ];
    case 'forest-hub':
      return [
        { label: 'Tree Health Index', value: '94', unit: '%', trend: '+1.2%', trendPositive: true },
        { label: 'Canopy Vitality', value: '0.82', unit: 'NDVI' },
        { label: 'F:B Ratio', value: '3.2:1', description: 'Optimal for forest — target range 2.0–5.0' },
        { label: 'Mycorrhizal Colonization', value: '78', unit: '%' },
      ];
    case 'carbon-diagnostic':
      return [
        { label: 'Maturity Score', value: '8.2', description: 'Prime Growth phase' },
        { label: 'Carbon Sequestration', value: '42.5', unit: 'TCO2e/HA' },
        { label: 'Biomass Accumulation', value: '+18', unit: '% YoY', trend: '+18%', trendPositive: true },
        { label: 'Stand Age', value: '7', unit: 'Years' },
      ];
    case 'nursery-ledger':
      return [
        { label: 'Total Trees on Site', value: '2,480' },
        { label: 'Survival Rate', value: '96', unit: '%' },
        { label: 'Planting Density', value: '120', unit: 'TPA' },
        { label: 'Avg Annual Growth', value: '2.4', unit: 'ft' },
      ];
    case 'hydrology-dashboard':
      return [
        { label: 'Water Resilience Score', value: '84', unit: '/100' },
        { label: 'Total Storage', value: '1.2M', unit: 'Gallons' },
        { label: 'Catchment Potential', value: '4.8M', unit: 'Gal/Year' },
        { label: 'Drought Buffer', value: '214', unit: 'Days', trend: '+14 days', trendPositive: true },
      ];
    case 'cartographic':
      return [
        { label: 'Active Layers', value: '5', description: 'Topographic, Watershed, Soil, Flood, Aerial' },
        { label: 'Survey Accuracy', value: '\u00b10.5', unit: 'm' },
        { label: 'Datum', value: 'NAD83' },
      ];
    case 'ecological':
      return [
        { label: 'Regenerative Potential', value: '85', unit: '/100' },
        { label: 'Organic Matter', value: '5', unit: '%' },
        { label: 'Shannon Diversity', value: '3.2', description: 'Target: >3.5 for high biodiversity' },
        { label: 'Zones Assessed', value: '4' },
      ];
    case 'terrain-dashboard':
      return [
        { label: 'Site Elevation',      value: '—', unit: 'm ASL', description: 'Loading site data…' },
        { label: 'Local Relief (500m)', value: '—', unit: 'm' },
        { label: 'Avg Slope',           value: '—', unit: '%' },
        { label: 'Erosion Risk',        value: '—' },
      ];
    case 'stewardship':
      return [
        { label: 'Goals on Track', value: '4/5' },
        { label: 'Action Items', value: '4', description: '1 high priority, 2 medium, 1 low' },
        { label: 'Carbon Target', value: '50', unit: 'TCO2e/ha', description: 'By Year 10 — currently at 85%' },
      ];
    default:
      return [
        { label: 'Data Completeness', value: '—', description: 'Metrics will appear here as data is populated.' },
      ];
  }
}
