/**
 * HydrologyRightPanel — water systems analysis for the right sidebar.
 * Shows rainfall, watershed, flood zone, wetland data, water retention score,
 * keyline insight quote, and water system intervention recommendations.
 * Reads from cached layer data when available; falls back to estimates.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { getCachedLayers } from '../../lib/layerFetcher.js';
import p from '../../styles/panel.module.css';
import s from './HydrologyRightPanel.module.css';

interface HydrologyRightPanelProps {
  project: LocalProject;
}

function getWaterMetrics(project: LocalProject) {
  // Compute center from boundary and read cached environmental data
  let center: [number, number] | null = null;
  if (project.parcelBoundaryGeojson) {
    try {
      const boundary = typeof project.parcelBoundaryGeojson === 'string'
        ? JSON.parse(project.parcelBoundaryGeojson)
        : project.parcelBoundaryGeojson;
      if (boundary?.features?.[0]?.geometry?.coordinates) {
        const coords = boundary.features[0].geometry.coordinates.flat(2);
        let sumLng = 0, sumLat = 0, n = 0;
        for (let i = 0; i < coords.length; i += 2) { sumLng += coords[i]; sumLat += coords[i + 1]; n++; }
        if (n > 0) center = [sumLng / n, sumLat / n];
      }
    } catch { /* */ }
  }
  const cached = center ? getCachedLayers(center, project.country) : null;

  if (cached?.layers) {
    const climate = cached.layers.find((l) => l.layer_type === 'climate')?.summary ?? {};
    const wetFlood = cached.layers.find((l) => l.layer_type === 'wetlands_flood')?.summary ?? {};
    const watershed = cached.layers.find((l) => l.layer_type === 'watershed')?.summary ?? {};

    const precipMm = climate.precip_mm as number | undefined;
    const rainfall = precipMm
      ? `${(precipMm / 25.4).toFixed(1)}"`
      : '—';
    const rainfallDetail = cached.isLive ? 'NOAA 30-yr avg' : 'Estimated';

    const floodZone = (wetFlood.flood_zone as string) ?? 'Zone X';
    const floodRisk = (wetFlood.flood_risk as string) ?? '';
    const floodDetail = floodRisk === 'High' ? 'High risk' : floodRisk === 'Moderate' ? 'Moderate risk' : 'Minimal risk';

    const wetlandVal = (wetFlood.wetland_pct as string) ?? 'Unknown';
    const wetlandDetail = cached.isLive ? 'NWI classified' : 'Estimated';

    const watershedName = (watershed.watershed_name as string) ?? '—';
    const watershedArea = project.acreage ? `~${Math.round(project.acreage * 1.5)} ac` : '—';

    // Simple retention score based on rainfall
    const retScore = precipMm ? Math.min(95, Math.round(50 + precipMm / 30)) : 72;

    return [
      { label: 'Annual Rainfall', value: rainfall, detail: rainfallDetail, color: '#5b9db8' },
      { label: 'Watershed Area', value: watershedArea, detail: watershedName || 'Full property drainage', color: '#5b9db8' },
      { label: 'Flood Zone', value: String(floodZone), detail: floodDetail, color: floodZone !== 'Zone X' ? '#c44e3f' : '#2d7a4f' },
      { label: 'Wetland Area', value: String(wetlandVal), detail: wetlandDetail, color: '#2d7a4f' },
      { label: 'Water Retention Score', value: `${retScore}/100`, detail: retScore >= 70 ? 'Good potential' : 'Moderate potential', color: '#c4a265' },
    ];
  }

  // Fallback static data
  return [
    { label: 'Annual Rainfall', value: '—', detail: 'Set boundary to fetch data', color: '#5b9db8' },
    { label: 'Watershed Area', value: '—', detail: 'Pending', color: '#5b9db8' },
    { label: 'Flood Zone', value: '—', detail: 'Pending', color: '#9a8a74' },
    { label: 'Wetland Area', value: '—', detail: 'Pending', color: '#9a8a74' },
    { label: 'Water Retention Score', value: '—', detail: 'Pending', color: '#9a8a74' },
  ];
}

const INTERVENTIONS = [
  { icon: '◉', label: 'Keyline pond (1 acre)', phase: 'Phase 2', color: '#5b9db8' },
  { icon: '≡', label: 'Swale network on contour', phase: 'Phase 2', color: '#5b9db8' },
  { icon: '▼', label: 'Roof catchment system', phase: 'Phase 1', color: '#2d7a4f' },
  { icon: '○', label: 'Wetland restoration buffer', phase: 'Phase 3', color: '#8a6d1e' },
  { icon: '◆', label: 'Tile drain control structures', phase: 'Phase 1', color: '#2d7a4f' },
  { icon: '~', label: 'Riparian planting (30m buffer)', phase: 'Phase 2', color: '#5b9db8' },
];

export default function HydrologyRightPanel({ project }: HydrologyRightPanelProps) {
  const waterMetrics = useMemo(() => getWaterMetrics(project), [project]);

  return (
    <div className={p.container}>
      <h2 className={p.title}>Hydrology</h2>

      {/* Water metrics */}
      <div className={p.mb24}>
        {waterMetrics.map((m) => (
          <div key={m.label} className={s.metricRow}>
            <span className={s.metricLabel}>{m.label}</span>
            <div className={s.metricValueWrap}>
              <div className={s.metricValue} style={{ color: m.color }}>{m.value}</div>
              <div className={s.metricDetail}>{m.detail}</div>
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
          <BudgetRow label="Precipitation input" value="~14.2M gal/yr" />
          <BudgetRow label="Current retention" value="~2.1M gal (15%)" />
          <BudgetRow label="Post-intervention target" value="~8.5M gal (60%)" />
          <BudgetRow label="Irrigation demand (12 ac)" value="~3.2M gal/yr" />
          <div className={s.budgetDivider}>
            <BudgetRow label="Surplus capacity" value="+5.3M gal" highlight />
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
