/**
 * HydrologyRightPanel — water systems analysis for the right sidebar.
 * Shows rainfall, watershed, flood zone, wetland data, water retention score,
 * keyline insight quote, and water system intervention recommendations.
 * Reads from cached layer data when available; falls back to estimates.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { getCachedLayers } from '../../lib/layerFetcher.js';

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
    <div style={{ padding: 20 }}>
      <PanelTitle>Hydrology</PanelTitle>

      {/* Water metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
        {waterMetrics.map((m, i) => (
          <div
            key={m.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '14px 0',
              borderBottom: i < waterMetrics.length - 1 ? '1px solid var(--color-panel-subtle, rgba(255,255,255,0.06))' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{m.label}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{m.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Keyline insight quote */}
      <div
        style={{
          padding: 16,
          background: 'rgba(91, 157, 184, 0.06)',
          border: '1px solid rgba(91, 157, 184, 0.2)',
          borderRadius: 10,
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            fontStyle: 'italic',
            color: 'var(--color-text)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          &ldquo;The keyline point &mdash; where valley transitions to slope &mdash; is the highest leverage point for water retention. A single well-placed pond here could irrigate 40+ acres by gravity alone.&rdquo;
        </p>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          &mdash; Water Retention Landscape zone
        </div>
      </div>

      {/* Water System Interventions */}
      <SectionLabel>Water System Interventions</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {INTERVENTIONS.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 14, color: item.color, width: 20, textAlign: 'center', flexShrink: 0 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)' }}>{item.label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
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
      <div
        style={{
          marginTop: 20,
          padding: 12,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
        }}
      >
        <SectionLabel>Annual Water Budget</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
          <BudgetRow label="Precipitation input" value="~14.2M gal/yr" />
          <BudgetRow label="Current retention" value="~2.1M gal (15%)" />
          <BudgetRow label="Post-intervention target" value="~8.5M gal (60%)" />
          <BudgetRow label="Irrigation demand (12 ac)" value="~3.2M gal/yr" />
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, marginTop: 4 }}>
            <BudgetRow label="Surplus capacity" value="+5.3M gal" highlight />
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
      {children}
    </h2>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}

function BudgetRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#2d7a4f' : 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}
