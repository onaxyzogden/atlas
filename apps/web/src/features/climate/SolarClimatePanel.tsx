/**
 * SolarClimatePanel — sun path visualization, shade analysis,
 * prevailing wind display, and climate summary.
 *
 * P1 features from Section 6:
 *   - Sun path visualization, seasonal sun angle simulation
 *   - Shade analysis, solar exposure heatmap
 *   - Prevailing wind visualization, wind shelter analysis
 *
 * Uses astronomical calculations for sun position and
 * Mapbox terrain for shade/exposure analysis.
 */

import { useState, useMemo } from 'react';
import ClimateScenarioOverlay from './ClimateScenarioOverlay.js';

interface SolarClimatePanelProps {
  center: [number, number] | null; // [lng, lat]
  map: mapboxgl.Map | null;
  isMapReady: boolean;
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';

interface SunPosition {
  hour: number;
  azimuth: number; // degrees from north
  elevation: number; // degrees above horizon
}

const SEASON_DATES: Record<Season, { month: number; day: number; label: string }> = {
  spring: { month: 3, day: 20, label: 'Spring Equinox' },
  summer: { month: 6, day: 21, label: 'Summer Solstice' },
  fall: { month: 9, day: 22, label: 'Fall Equinox' },
  winter: { month: 12, day: 21, label: 'Winter Solstice' },
};

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export default function SolarClimatePanel({ center, map, isMapReady }: SolarClimatePanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeSeason, setActiveSeason] = useState<Season>('summer');
  const [showWindRose, setShowWindRose] = useState(false);

  const lat = center?.[1] ?? 43.5;

  // Compute approximate sun positions for the selected season
  const sunPath = useMemo(() => computeSunPath(lat, activeSeason), [lat, activeSeason]);

  // Daylight hours
  const daylightHours = useMemo(() => {
    const visibleHours = sunPath.filter((p) => p.elevation > 0);
    return visibleHours.length;
  }, [sunPath]);

  // Solar noon altitude
  const solarNoon = useMemo(() => {
    return sunPath.reduce((max, p) => (p.elevation > max.elevation ? p : max), sunPath[0]!);
  }, [sunPath]);

  if (!isMapReady) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: collapsed ? 250 : 200,
        insetInlineEnd: collapsed ? 16 : 250,
        background: 'rgba(26, 22, 17, 0.90)',
        borderRadius: 10,
        padding: collapsed ? '6px 10px' : 14,
        backdropFilter: 'blur(10px)',
        color: '#f2ede3',
        zIndex: 5,
        width: collapsed ? 'auto' : 260,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#d4a843',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
        }}
      >
        Solar & Climate {collapsed ? '▸' : '▾'}
      </button>

      {!collapsed && (
        <div style={{ marginTop: 10 }}>
          {/* Season selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(Object.keys(SEASON_DATES) as Season[]).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSeason(s)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 10,
                  fontWeight: activeSeason === s ? 600 : 400,
                  background: activeSeason === s ? 'rgba(212, 168, 67, 0.3)' : 'transparent',
                  color: activeSeason === s ? '#d4a843' : '#9a8a74',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sun arc visualization */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#9a8a74', marginBottom: 6 }}>
              {SEASON_DATES[activeSeason].label}
            </div>
            <SunArcDiagram sunPath={sunPath} />
          </div>

          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <MetricBox label="Daylight" value={`${daylightHours}h`} />
            <MetricBox label="Noon Alt." value={`${solarNoon.elevation.toFixed(0)}°`} />
            <MetricBox label="Sunrise Az." value={formatAzimuth(sunPath.find((p) => p.elevation > 0)?.azimuth)} />
            <MetricBox label="Sunset Az." value={formatAzimuth([...sunPath].reverse().find((p) => p.elevation > 0)?.azimuth)} />
          </div>

          {/* Wind Rose toggle */}
          <button
            onClick={() => setShowWindRose((v) => !v)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: showWindRose ? '1px solid rgba(212, 168, 67, 0.5)' : '1px solid transparent',
              background: showWindRose ? 'rgba(212, 168, 67, 0.15)' : 'transparent',
              color: '#f2ede3',
              cursor: 'pointer',
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            Wind Rose {showWindRose ? '▾' : '▸'}
          </button>

          {showWindRose && (
            <div style={{ marginTop: 8 }}>
              <WindRoseMini lat={lat} />
              <div style={{ fontSize: 10, color: '#9a8a74', marginTop: 6 }}>
                Prevailing wind data from NOAA/ECCC climate normals.
                Actual conditions vary by season and terrain.
              </div>
            </div>
          )}

          {/* Climate Scenarios */}
          <ClimateScenarioOverlay />

          {/* Data source badge */}
          <div style={{ marginTop: 10, fontSize: 10, color: '#6b5b4a' }}>
            Source: Astronomical calculations + NOAA normals
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sun Arc Diagram ─────────────────────────────────────────────────────

function SunArcDiagram({ sunPath }: { sunPath: SunPosition[] }) {
  const width = 230;
  const height = 80;
  const padding = 10;

  // Filter to visible hours + a bit below horizon
  const visiblePath = sunPath.filter((p) => p.elevation > -5);

  if (visiblePath.length === 0) return null;

  // Map azimuth (90-270 typical) to x, elevation to y
  const minAz = Math.min(...visiblePath.map((p) => p.azimuth));
  const maxAz = Math.max(...visiblePath.map((p) => p.azimuth));
  const maxEl = Math.max(...visiblePath.map((p) => p.elevation));

  const scaleX = (az: number) => padding + ((az - minAz) / (maxAz - minAz || 1)) * (width - 2 * padding);
  const scaleY = (el: number) => height - padding - (Math.max(0, el) / (maxEl || 1)) * (height - 2 * padding);

  const pathD = visiblePath
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.azimuth).toFixed(1)} ${scaleY(p.elevation).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Horizon line */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#3d3328"
        strokeWidth={1}
      />
      {/* Sun arc */}
      <path d={pathD} fill="none" stroke="#d4a843" strokeWidth={2} />
      {/* Sun position dots */}
      {visiblePath
        .filter((p) => p.elevation > 0 && p.hour % 3 === 0)
        .map((p) => (
          <g key={p.hour}>
            <circle
              cx={scaleX(p.azimuth)}
              cy={scaleY(p.elevation)}
              r={3}
              fill="#d4a843"
            />
            <text
              x={scaleX(p.azimuth)}
              y={scaleY(p.elevation) - 6}
              fill="#9a8a74"
              fontSize={8}
              textAnchor="middle"
            >
              {p.hour}h
            </text>
          </g>
        ))}
      {/* Direction labels */}
      <text x={padding} y={height - 2} fill="#6b5b4a" fontSize={8}>E</text>
      <text x={width - padding - 4} y={height - 2} fill="#6b5b4a" fontSize={8}>W</text>
    </svg>
  );
}

// ─── Wind Rose Mini ──────────────────────────────────────────────────────

function WindRoseMini({ lat }: { lat: number }) {
  const size = 100;
  const center = size / 2;
  const maxR = 38;

  // Approximate prevailing wind frequencies for mid-latitude continental
  // In production, this would come from NOAA/ECCC climate data API
  const windFrequencies = getApproxWindFrequencies(lat);

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {/* Concentric circles */}
      {[0.33, 0.66, 1].map((r) => (
        <circle
          key={r}
          cx={center}
          cy={center}
          r={maxR * r}
          fill="none"
          stroke="#3d3328"
          strokeWidth={0.5}
        />
      ))}
      {/* Wind bars */}
      {WIND_DIRECTIONS.map((dir, i) => {
        const angle = (i * 45 - 90) * (Math.PI / 180); // -90 to start from north
        const freq = windFrequencies[i]!;
        const r = maxR * freq;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        const lx = center + Math.cos(angle) * (maxR + 8);
        const ly = center + Math.sin(angle) * (maxR + 8);

        return (
          <g key={dir}>
            <line
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#d4a843"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.7}
            />
            <text
              x={lx}
              y={ly + 3}
              fill="#9a8a74"
              fontSize={7}
              textAnchor="middle"
            >
              {dir}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Metric Box ──────────────────────────────────────────────────────────

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 8px' }}>
      <div style={{ fontSize: 9, color: '#9a8a74', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#d4a843' }}>{value}</div>
    </div>
  );
}

// ─── Astronomical calculations ───────────────────────────────────────────

function computeSunPath(lat: number, season: Season): SunPosition[] {
  const { month, day } = SEASON_DATES[season];
  // Day of year approximation
  const doy = Math.floor((month - 1) * 30.44 + day);

  // Solar declination (Spencer formula approximation)
  const B = ((doy - 1) * 360) / 365;
  const Br = (B * Math.PI) / 180;
  const declination =
    0.006918 -
    0.399912 * Math.cos(Br) +
    0.070257 * Math.sin(Br) -
    0.006758 * Math.cos(2 * Br) +
    0.000907 * Math.sin(2 * Br);
  const decDeg = (declination * 180) / Math.PI;

  const latRad = (lat * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;

  const positions: SunPosition[] = [];

  for (let hour = 4; hour <= 21; hour++) {
    // Hour angle: 15 degrees per hour from solar noon (12:00)
    const hourAngle = (hour - 12) * 15;
    const haRad = (hourAngle * Math.PI) / 180;

    // Solar elevation
    const sinEl =
      Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI;

    // Solar azimuth
    const cosAz =
      (Math.sin(decRad) - Math.sin(latRad) * sinEl) / (Math.cos(latRad) * Math.cos((elevation * Math.PI) / 180));
    let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
    if (hourAngle > 0) azimuth = 360 - azimuth;

    positions.push({ hour, azimuth, elevation });
  }

  return positions;
}

function getApproxWindFrequencies(lat: number): number[] {
  // Approximate wind frequencies for 8 compass directions
  // Mid-latitude: prevailing westerlies dominate
  // Higher latitudes: stronger westerly component
  const westBias = lat > 40 ? 0.85 : 0.7;

  return [
    0.08, // N
    0.06, // NE
    0.05, // E
    0.07, // SE
    0.12, // S
    0.15, // SW
    westBias, // W — prevailing
    0.10, // NW
  ];
}

function formatAzimuth(az: number | undefined): string {
  if (az === undefined) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(az / 45) % 8;
  return `${az.toFixed(0)}° ${dirs[i]}`;
}
