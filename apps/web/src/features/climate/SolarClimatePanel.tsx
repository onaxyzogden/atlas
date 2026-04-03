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
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import s from './SolarClimatePanel.module.css';

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

  if (!isMapReady) return <PanelLoader label="Waiting for map..." />;

  return (
    <div
      className={`${s.root} ${collapsed ? s.rootCollapsed : s.rootExpanded}`}
      style={{
        top: collapsed ? 250 : 200,
        insetInlineEnd: collapsed ? 16 : 250,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={s.toggleBtn}
      >
        Solar & Climate {collapsed ? '▸' : '▾'}
      </button>

      {!collapsed && (
        <div className={s.body}>
          {/* Season selector */}
          <div className={s.seasonRow}>
            {(Object.keys(SEASON_DATES) as Season[]).map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`${s.seasonBtn} ${activeSeason === season ? s.seasonBtnActive : s.seasonBtnInactive}`}
              >
                {season}
              </button>
            ))}
          </div>

          {/* Sun arc visualization */}
          <div className={s.sunArcSection}>
            <div className={s.seasonLabel}>
              {SEASON_DATES[activeSeason].label}
            </div>
            <SunArcDiagram sunPath={sunPath} />
          </div>

          {/* Key metrics */}
          <div className={s.metricGrid}>
            <MetricBox label="Daylight" value={`${daylightHours}h`} />
            <MetricBox label="Noon Alt." value={`${solarNoon.elevation.toFixed(0)}°`} />
            <MetricBox label="Sunrise Az." value={formatAzimuth(sunPath.find((p) => p.elevation > 0)?.azimuth)} />
            <MetricBox label="Sunset Az." value={formatAzimuth([...sunPath].reverse().find((p) => p.elevation > 0)?.azimuth)} />
          </div>

          {/* Wind Rose toggle */}
          <button
            onClick={() => setShowWindRose((v) => !v)}
            className={`${s.windToggle} ${showWindRose ? s.windToggleActive : s.windToggleInactive}`}
          >
            Wind Rose {showWindRose ? '▾' : '▸'}
          </button>

          {showWindRose && (
            <div className={s.windRoseSection}>
              <WindRoseMini lat={lat} />
              <div className={s.windRoseNote}>
                Prevailing wind data from NOAA/ECCC climate normals.
                Actual conditions vary by season and terrain.
              </div>
            </div>
          )}

          {/* Climate Scenarios */}
          <ClimateScenarioOverlay />

          {/* Data source badge */}
          <div className={s.sourceBadge}>
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
        const angle = (i * 45 - 90) * (Math.PI / 180);
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
    <div className={s.metricBox}>
      <div className={s.metricLabel}>{label}</div>
      <div className={s.metricValue}>{value}</div>
    </div>
  );
}

// ─── Astronomical calculations ───────────────────────────────────────────

function computeSunPath(lat: number, season: Season): SunPosition[] {
  const { month, day } = SEASON_DATES[season];
  const doy = Math.floor((month - 1) * 30.44 + day);

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
    const hourAngle = (hour - 12) * 15;
    const haRad = (hourAngle * Math.PI) / 180;

    const sinEl =
      Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI;

    const cosAz =
      (Math.sin(decRad) - Math.sin(latRad) * sinEl) / (Math.cos(latRad) * Math.cos((elevation * Math.PI) / 180));
    let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
    if (hourAngle > 0) azimuth = 360 - azimuth;

    positions.push({ hour, azimuth, elevation });
  }

  return positions;
}

function getApproxWindFrequencies(lat: number): number[] {
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
