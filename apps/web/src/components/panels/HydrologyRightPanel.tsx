/**
 * HydrologyRightPanel — water systems analysis for the right sidebar.
 * Shows rainfall, watershed, flood zone, wetland data, water retention score,
 * keyline insight quote, and water system intervention recommendations.
 * Reads from siteDataStore for environmental layer data.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { Spinner } from '../ui/Spinner.js';
import p from '../../styles/panel.module.css';
import s from './HydrologyRightPanel.module.css';

interface HydrologyRightPanelProps {
  project: LocalProject;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
  hardiness_zone?: string;
}

interface WatershedSummary {
  watershed_name?: string;
  nearest_stream_m?: number | string;
  stream_order?: number;
  catchment_area_ha?: number;
}

interface WetlandsFloodSummary {
  flood_zone?: string;
  flood_risk?: string;
  wetland_pct?: number | string;
  wetland_types?: string[];
  riparian_buffer_m?: number;
}

type MetricRow = {
  label: string;
  value: string;
  detail: string;
  color: string;
};

const INTERVENTIONS = [
  { icon: '\u25C9', label: 'Keyline pond (1 acre)', phase: 'Phase 2', color: '#5b9db8' },
  { icon: '\u2261', label: 'Swale network on contour', phase: 'Phase 2', color: '#5b9db8' },
  { icon: '\u25BC', label: 'Roof catchment system', phase: 'Phase 1', color: '#2d7a4f' },
  { icon: '\u25CB', label: 'Wetland restoration buffer', phase: 'Phase 3', color: '#8a6d1e' },
  { icon: '\u25C6', label: 'Tile drain control structures', phase: 'Phase 1', color: '#2d7a4f' },
  { icon: '~', label: 'Riparian planting (30m buffer)', phase: 'Phase 2', color: '#5b9db8' },
];

function buildLoadingMetrics(): MetricRow[] {
  return [
    { label: 'Annual Rainfall', value: 'Loading...', detail: '', color: '#5b9db8' },
    { label: 'Watershed', value: 'Loading...', detail: '', color: '#5b9db8' },
    { label: 'Nearest Stream', value: 'Loading...', detail: '', color: '#5b9db8' },
    { label: 'Wetland Area', value: 'Loading...', detail: '', color: '#2d7a4f' },
    { label: 'Flood Zone', value: 'Loading...', detail: '', color: '#9a8a74' },
    { label: 'Water Retention Score', value: 'Loading...', detail: '', color: '#c4a265' },
  ];
}

function buildNoDataMetrics(): MetricRow[] {
  return [
    { label: 'Annual Rainfall', value: '\u2014', detail: 'No boundary data', color: '#5b9db8' },
    { label: 'Watershed', value: '\u2014', detail: 'No boundary data', color: '#5b9db8' },
    { label: 'Nearest Stream', value: '\u2014', detail: 'No boundary data', color: '#5b9db8' },
    { label: 'Wetland Area', value: '\u2014', detail: 'No boundary data', color: '#9a8a74' },
    { label: 'Flood Zone', value: '\u2014', detail: 'No boundary data', color: '#9a8a74' },
    { label: 'Water Retention Score', value: '\u2014', detail: 'No boundary data', color: '#9a8a74' },
  ];
}

export default function HydrologyRightPanel({ project }: HydrologyRightPanelProps) {
  const siteData = useSiteData(project.id);

  const waterMetrics = useMemo((): MetricRow[] => {
    if (!siteData) return buildNoDataMetrics();
    if (siteData.status === 'loading') return buildLoadingMetrics();
    if (siteData.status !== 'complete') return buildNoDataMetrics();

    const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
    const watershed = getLayerSummary<WatershedSummary>(siteData, 'watershed');
    const wetFlood = getLayerSummary<WetlandsFloodSummary>(siteData, 'wetlands_flood');

    const precipMm = climate?.annual_precip_mm;
    const rainfall = precipMm ? `${precipMm} mm/yr` : '\u2014';
    const rainfallDetail = siteData.isLive ? 'NOAA 30-yr avg' : 'Estimated';

    const watershedName = watershed?.watershed_name ?? '\u2014';

    const nearestStream = watershed?.nearest_stream_m;
    const nearestStreamVal = nearestStream != null ? `${nearestStream}m` : '\u2014';

    const wetlandPct = wetFlood?.wetland_pct;
    const wetlandVal = wetlandPct != null ? `${wetlandPct}%` : '\u2014';
    const wetlandDetail = siteData.isLive ? 'NWI classified' : 'Estimated';

    const floodZone = wetFlood?.flood_zone ?? '\u2014';
    const floodRisk = wetFlood?.flood_risk ?? '';
    const floodDetail = floodRisk.includes('High') ? 'High risk'
      : floodRisk.includes('Moderate') ? 'Moderate risk'
      : 'Minimal risk';

    // Simple retention score based on rainfall
    const retScore = precipMm ? Math.min(95, Math.round(50 + precipMm / 30)) : 72;

    return [
      { label: 'Annual Rainfall', value: rainfall, detail: rainfallDetail, color: '#5b9db8' },
      { label: 'Watershed', value: watershedName, detail: '', color: '#5b9db8' },
      { label: 'Nearest Stream', value: nearestStreamVal, detail: '', color: '#5b9db8' },
      { label: 'Wetland Area', value: String(wetlandVal), detail: wetlandDetail, color: '#2d7a4f' },
      { label: 'Flood Zone', value: String(floodZone), detail: floodDetail, color: floodZone.includes('Zone X') || floodZone === '\u2014' ? '#2d7a4f' : '#c44e3f' },
      { label: 'Water Retention Score', value: `${retScore}/100`, detail: retScore >= 70 ? 'Good potential' : 'Moderate potential', color: '#c4a265' },
    ];
  }, [siteData]);

  const waterBudget = useMemo(() => {
    if (!siteData || siteData.status !== 'complete') return null;

    const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
    const precipMm = climate?.annual_precip_mm;
    const acreage = project.acreage;

    if (!precipMm || !acreage) return null;

    const isMetric = (project as { units?: string }).units === 'metric';

    if (isMetric) {
      // hectares * mm = liters (1 ha * 1mm = 10 L, so ha * mm * 10 = liters)
      const hectares = acreage * 0.404686;
      const totalLiters = hectares * precipMm * 10;
      const totalM3 = totalLiters / 1000;
      const fmt = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`;
      return {
        precip: `~${fmt(totalM3)} m\u00B3/yr`,
        retention: `~${fmt(totalM3 * 0.15)} m\u00B3 (15%)`,
        target: `~${fmt(totalM3 * 0.60)} m\u00B3 (60%)`,
        demand: `~${fmt(totalM3 * 0.23)} m\u00B3/yr`,
        surplus: `+${fmt(totalM3 * 0.60 - totalM3 * 0.23)} m\u00B3`,
      };
    }

    // Imperial: acreage * precipMm * 0.001 (m) * 264.172 (gal/m3) * 4046.86 (m2/ac)
    // Simplified: acreage * precipMm * 1.069 gallons
    const totalGallons = acreage * precipMm * 0.001 * 4046.86 * 264.172;
    const fmt = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`;
    return {
      precip: `~${fmt(totalGallons)} gal/yr`,
      retention: `~${fmt(totalGallons * 0.15)} gal (15%)`,
      target: `~${fmt(totalGallons * 0.60)} gal (60%)`,
      demand: `~${fmt(totalGallons * 0.23)} gal/yr`,
      surplus: `+${fmt(totalGallons * 0.60 - totalGallons * 0.23)} gal`,
    };
  }, [siteData, project.acreage, (project as { units?: string }).units]);

  return (
    <div className={p.container}>
      <h2 className={p.title}>Hydrology</h2>

      {/* Water metrics */}
      <div className={p.mb24}>
        {siteData?.status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Spinner size="sm" />
            <span style={{ fontSize: 11, color: '#9a8a74' }}>Fetching water data...</span>
          </div>
        )}
        {waterMetrics.map((m) => (
          <div key={m.label} className={s.metricRow}>
            <span className={s.metricLabel}>{m.label}</span>
            <div className={s.metricValueWrap}>
              <div className={s.metricValue} style={{ color: m.color }}>{m.value}</div>
              {m.detail && <div className={s.metricDetail}>{m.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Keyline insight quote */}
      <div className={s.quoteCard}>
        <p className={s.quoteText}>
          &ldquo;The keyline point &mdash; where valley transitions to slope &mdash; is the highest leverage point for water retention. A single well-placed pond here could irrigate 40+ acres by gravity alone.&rdquo;
        </p>
        <div className={s.quoteAttr}>
          &mdash; Water Retention Landscape zone
        </div>
      </div>

      {/* Water System Interventions */}
      <h3 className={p.sectionLabel}>Water System Interventions</h3>
      <div className={`${p.section} ${p.sectionGapLg}`}>
        {INTERVENTIONS.map((item, i) => (
          <div key={i} className={s.interventionRow}>
            <span className={s.interventionIcon} style={{ color: item.color }}>
              {item.icon}
            </span>
            <span className={s.interventionLabel}>{item.label}</span>
            <span
              className={p.badge}
              style={{
                background: item.phase === 'Phase 1'
                  ? 'rgba(45, 122, 79, 0.12)'
                  : item.phase === 'Phase 2'
                    ? 'rgba(91, 157, 184, 0.12)'
                    : 'rgba(138, 109, 30, 0.12)',
                color: item.phase === 'Phase 1'
                  ? '#2d7a4f'
                  : item.phase === 'Phase 2'
                    ? '#5b9db8'
                    : '#8a6d1e',
              }}
            >
              {item.phase}
            </span>
          </div>
        ))}
      </div>

      {/* Water budget summary */}
      <div className={s.budgetCard}>
        <h3 className={p.sectionLabel}>Annual Water Budget</h3>
        <div className={`${p.section} ${p.sectionGapSm}`} style={{ fontSize: 11 }}>
          <BudgetRow label="Precipitation input" value={waterBudget?.precip ?? '\u2014'} />
          <BudgetRow label="Current retention" value={waterBudget?.retention ?? '\u2014'} />
          <BudgetRow label="Post-intervention target" value={waterBudget?.target ?? '\u2014'} />
          <BudgetRow label="Irrigation demand" value={waterBudget?.demand ?? '\u2014'} />
          <div className={s.budgetDivider}>
            <BudgetRow label="Surplus capacity" value={waterBudget?.surplus ?? '\u2014'} highlight />
          </div>
        </div>
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
