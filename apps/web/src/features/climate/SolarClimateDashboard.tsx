/**
 * SolarClimateDashboard — full dashboard page for solar, wind & climate analysis.
 * Consolidates sun path, wind rose, climate summary, growing season calendar,
 * microclimate zones, and solar opportunity zones.
 *
 * Reuses astronomical calculations and SVG components from SolarClimatePanel.
 * This is a dashboard page (not a map overlay).
 */

import { useState, useMemo } from 'react';
import { useSiteData, getLayerSummary, getLayer } from '../../store/siteDataStore.js';
import type { WindRoseData } from '../../lib/layerFetcher.js';
import css from './SolarClimateDashboard.module.css';
import { earth, status as statusToken, group, semantic } from '../../lib/tokens.js';

interface SolarClimateDashboardProps {
  project: { id: string; acreage?: number | null };
  onSwitchToMap: () => void;
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';

interface SunPosition {
  hour: number;
  azimuth: number;
  elevation: number;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  annual_temp_mean_c?: number;
  growing_season_days?: number;
  first_frost_date?: string;
  last_frost_date?: string;
  hardiness_zone?: string;
  prevailing_wind?: string;
  annual_sunshine_hours?: number;
  growing_degree_days_base10c?: number;
  _wind_rose?: WindRoseData;
}

interface MicroclimateSummary {
  sunTraps?: Array<{ location?: string; area_m2?: number }>;
  moistureZones?: Array<{ type: string; area_m2?: number }>;
  windShelter?: Array<{ direction?: string; effectiveness?: number }>;
  frostRisk?: Array<{ zone?: string; risk_level?: string }>;
  outdoorComfort?: { rating?: string; score?: number };
}

interface ElevationSummary {
  mean_slope_deg?: number;
  aspect_dominant?: string;
  min_elevation_m?: number;
  max_elevation_m?: number;
}

const SEASON_DATES: Record<Season, { month: number; day: number; label: string }> = {
  spring: { month: 3, day: 20, label: 'Spring Equinox' },
  summer: { month: 6, day: 21, label: 'Summer Solstice' },
  fall: { month: 9, day: 22, label: 'Fall Equinox' },
  winter: { month: 12, day: 21, label: 'Winter Solstice' },
};

const WIND_DIRECTIONS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const WIND_DIRECTIONS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SolarClimateDashboard({ project, onSwitchToMap }: SolarClimateDashboardProps) {
  const siteData = useSiteData(project.id);
  const [activeSeason, setActiveSeason] = useState<Season>('summer');

  const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
  const microclimate = siteData ? getLayerSummary<MicroclimateSummary>(siteData, 'microclimate') : null;
  const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
  const microclimateStatus = siteData ? getLayer(siteData, 'microclimate')?.fetchStatus : undefined;

  const windRoseData = climate?._wind_rose ?? null;
  const lat = 43.5; // Default latitude — would be derived from project center

  const sunPath = useMemo(() => computeSunPath(lat, activeSeason), [lat, activeSeason]);
  const daylightHours = useMemo(() => sunPath.filter((p) => p.elevation > 0).length, [sunPath]);
  const solarNoon = useMemo(() => sunPath.reduce((max, p) => (p.elevation > max.elevation ? p : max), sunPath[0]!), [sunPath]);

  // Growing season frost dates
  const frostWindow = useMemo(() => {
    if (!climate?.first_frost_date || !climate?.last_frost_date) return null;
    const parseMonth = (d: string) => {
      const parts = d.split(/[\s-/]/);
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      for (const part of parts) {
        const idx = monthNames.indexOf(part.toLowerCase().slice(0, 3));
        if (idx >= 0) return idx;
      }
      const num = parseInt(parts[0] ?? '', 10);
      return isFinite(num) && num >= 1 && num <= 12 ? num - 1 : null;
    };
    const lastFrostMonth = parseMonth(climate.last_frost_date);
    const firstFrostMonth = parseMonth(climate.first_frost_date);
    if (lastFrostMonth === null || firstFrostMonth === null) return null;
    return { lastFrost: lastFrostMonth, firstFrost: firstFrostMonth };
  }, [climate]);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Solar & Climate</h1>
      <p className={css.desc}>
        Sun path analysis, wind patterns, growing season, and microclimate assessment
        derived from NOAA/ECCC normals and astronomical calculations.
      </p>

      {/* Climate Summary */}
      {climate && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>CLIMATE SUMMARY</h3>
          <div className={css.metricGrid}>
            <ClimateMetric label="Annual Precipitation" value={climate.annual_precip_mm != null ? `${climate.annual_precip_mm} mm` : null} />
            <ClimateMetric label="Mean Temperature" value={climate.annual_temp_mean_c != null ? `${climate.annual_temp_mean_c.toFixed(1)}\u00B0C` : null} />
            <ClimateMetric label="Growing Season" value={climate.growing_season_days != null ? `${climate.growing_season_days} days` : null} />
            <ClimateMetric label="Hardiness Zone" value={climate.hardiness_zone ?? null} />
            <ClimateMetric label="GDD (base 10\u00B0C)" value={climate.growing_degree_days_base10c != null ? `${climate.growing_degree_days_base10c}` : null} />
            <ClimateMetric label="Annual Sunshine" value={climate.annual_sunshine_hours != null ? `${climate.annual_sunshine_hours} hrs` : null} />
          </div>
        </div>
      )}

      {/* Sun Path */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SUN PATH</h3>
        <div className={css.sunPathCard}>
          <div className={css.seasonRow}>
            {(Object.keys(SEASON_DATES) as Season[]).map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`${css.seasonBtn} ${activeSeason === season ? css.seasonBtnActive : ''}`}
              >
                {season}
              </button>
            ))}
          </div>
          <div className={css.seasonLabel}>{SEASON_DATES[activeSeason].label}</div>
          <SunArcDiagram sunPath={sunPath} width={340} height={110} />
          <div className={css.sunMetrics}>
            <SunMetric label="Daylight" value={`${daylightHours}h`} />
            <SunMetric label="Noon Alt." value={`${solarNoon.elevation.toFixed(0)}\u00B0`} />
            <SunMetric label="Sunrise Az." value={formatAzimuth(sunPath.find((p) => p.elevation > 0)?.azimuth)} />
            <SunMetric label="Sunset Az." value={formatAzimuth([...sunPath].reverse().find((p) => p.elevation > 0)?.azimuth)} />
          </div>
        </div>
      </div>

      {/* Wind Rose */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>WIND ROSE</h3>
        <div className={css.windCard}>
          <WindRose lat={lat} windData={windRoseData} />
          {windRoseData ? (
            <div className={css.windNote}>
              Station: {windRoseData.station_name} ({windRoseData.station_distance_km} km)
              {windRoseData.calm_pct > 0 ? ` \u00B7 Calm: ${windRoseData.calm_pct.toFixed(1)}%` : ''}
              {windRoseData.prevailing ? ` \u00B7 Prevailing: ${windRoseData.prevailing}` : ''}
            </div>
          ) : (
            <div className={css.windNote}>
              Estimated from latitude model. Actual conditions vary by season and terrain.
            </div>
          )}
        </div>
      </div>

      {/* Growing Season Calendar */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>GROWING SEASON CALENDAR</h3>
        <div className={css.calendarCard}>
          {frostWindow ? (
            <GrowingSeasonCalendar lastFrost={frostWindow.lastFrost} firstFrost={frostWindow.firstFrost} />
          ) : (
            <div className={css.pendingNote}>
              Growing season calendar requires frost date data from climate layer.
            </div>
          )}
        </div>
      </div>

      {/* Microclimate Zones */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>MICROCLIMATE ZONES</h3>
        {microclimate ? (
          <div className={css.microGrid}>
            {microclimate.sunTraps && microclimate.sunTraps.length > 0 && (
              <MicroCard title="Sun Traps" count={microclimate.sunTraps.length} icon="\u2600" color={statusToken.moderate} />
            )}
            {microclimate.moistureZones && microclimate.moistureZones.length > 0 && (
              <MicroCard title="Moisture Zones" count={microclimate.moistureZones.length} icon="\uD83D\uDCA7" color={group.hydrology} />
            )}
            {microclimate.windShelter && microclimate.windShelter.length > 0 && (
              <MicroCard title="Wind Shelter" count={microclimate.windShelter.length} icon="\uD83C\uDF2C" color={statusToken.good} />
            )}
            {microclimate.frostRisk && microclimate.frostRisk.length > 0 && (
              <MicroCard title="Frost Risk Zones" count={microclimate.frostRisk.length} icon="\u2744" color={group.general} />
            )}
            {microclimate.outdoorComfort && (
              <div className={css.comfortCard}>
                <span className={css.comfortLabel}>Outdoor Comfort</span>
                <span className={css.comfortRating}>{microclimate.outdoorComfort.rating ?? 'N/A'}</span>
                {microclimate.outdoorComfort.score != null && (
                  <span className={css.comfortScore}>{microclimate.outdoorComfort.score}/100</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={css.pendingCard}>
            {microclimateStatus === 'pending' ? 'Microclimate analysis computing...' : 'Microclimate analysis requires elevation and climate data.'}
          </div>
        )}
      </div>

      {/* Solar Opportunity Zones */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SOLAR OPPORTUNITY</h3>
        <div className={css.solarOppCard}>
          <p className={css.solarOppText}>
            {elevation?.aspect_dominant
              ? `Dominant aspect: ${elevation.aspect_dominant}. `
              : ''}
            {lat > 0
              ? 'South-facing slopes receive maximum solar exposure for passive solar design, greenhouse placement, and solar panel installation.'
              : 'North-facing slopes receive maximum solar exposure in the southern hemisphere.'}
            {elevation?.mean_slope_deg != null
              ? ` Average slope: ${elevation.mean_slope_deg.toFixed(1)}\u00B0.`
              : ''}
          </p>
          <p className={css.solarOppNote}>
            Source: Astronomical calculations + terrain analysis
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ClimateMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={css.climateMetric}>
      <span className={css.climateMetricLabel}>{label}</span>
      <span className={css.climateMetricValue}>{value ?? '\u2014'}</span>
    </div>
  );
}

function SunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.sunMetric}>
      <span className={css.sunMetricLabel}>{label}</span>
      <span className={css.sunMetricValue}>{value}</span>
    </div>
  );
}

function MicroCard({ title, count, icon, color }: { title: string; count: number; icon: string; color: string }) {
  return (
    <div className={css.microCard}>
      <span className={css.microIcon} style={{ color }}>{icon}</span>
      <span className={css.microTitle}>{title}</span>
      <span className={css.microCount}>{count} detected</span>
    </div>
  );
}

function SunArcDiagram({ sunPath, width, height }: { sunPath: SunPosition[]; width: number; height: number }) {
  const padding = 14;
  const visiblePath = sunPath.filter((p) => p.elevation > -5);
  if (visiblePath.length === 0) return null;

  const minAz = Math.min(...visiblePath.map((p) => p.azimuth));
  const maxAz = Math.max(...visiblePath.map((p) => p.azimuth));
  const maxEl = Math.max(...visiblePath.map((p) => p.elevation));

  const scaleX = (az: number) => padding + ((az - minAz) / (maxAz - minAz || 1)) * (width - 2 * padding);
  const scaleY = (el: number) => height - padding - (Math.max(0, el) / (maxEl || 1)) * (height - 2 * padding);

  const pathD = visiblePath
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.azimuth).toFixed(1)} ${scaleY(p.elevation).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={earth[800]} strokeWidth={1} />
      <path d={pathD} fill="none" stroke={group.livestock} strokeWidth={2} />
      {visiblePath
        .filter((p) => p.elevation > 0 && p.hour % 3 === 0)
        .map((p) => (
          <g key={p.hour}>
            <circle cx={scaleX(p.azimuth)} cy={scaleY(p.elevation)} r={3} fill={group.livestock} />
            <text x={scaleX(p.azimuth)} y={scaleY(p.elevation) - 7} fill={semantic.textSubtle} fontSize={9} textAnchor="middle">{p.hour}h</text>
          </g>
        ))}
      <text x={padding} y={height - 2} fill={earth[700]} fontSize={9}>E</text>
      <text x={width - padding - 5} y={height - 2} fill={earth[700]} fontSize={9}>W</text>
    </svg>
  );
}

function WindRose({ lat, windData }: { lat: number; windData: WindRoseData | null }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 58;

  const is16 = windData != null && windData.frequencies_16.length === 16;
  const directions = is16 ? WIND_DIRECTIONS_16 : WIND_DIRECTIONS_8;
  const frequencies = is16 ? windData!.frequencies_16 : getApproxWindFrequencies(lat);
  const numDirs = directions.length;
  const stepDeg = 360 / numDirs;
  const maxFreq = Math.max(...frequencies, 0.01);

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {[0.33, 0.66, 1].map((r) => (
        <circle key={r} cx={cx} cy={cy} r={maxR * r} fill="none" stroke={earth[800]} strokeWidth={0.5} />
      ))}
      {directions.map((dir, i) => {
        const angle = (i * stepDeg - 90) * (Math.PI / 180);
        const freq = frequencies[i] ?? 0;
        const r = maxR * (freq / maxFreq);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const labelR = maxR + (is16 ? 12 : 10);
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cy + Math.sin(angle) * labelR;
        const showLabel = !is16 || i % 2 === 0;
        return (
          <g key={dir}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={group.livestock} strokeWidth={is16 ? 2.5 : 3.5} strokeLinecap="round" opacity={0.7} />
            {showLabel && <text x={lx} y={ly + 3} fill={semantic.textSubtle} fontSize={is16 ? 7 : 8} textAnchor="middle">{dir}</text>}
          </g>
        );
      })}
      {windData && (
        <text x={cx} y={size - 1} fill={group.livestock} fontSize={8} textAnchor="middle">Prevailing: {windData.prevailing}</text>
      )}
    </svg>
  );
}

function GrowingSeasonCalendar({ lastFrost, firstFrost }: { lastFrost: number; firstFrost: number }) {
  const barWidth = 36;
  const barHeight = 24;
  const gap = 3;
  const totalWidth = 12 * barWidth + 11 * gap;

  return (
    <svg width={totalWidth} height={60} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }} viewBox={`0 0 ${totalWidth} 60`}>
      {MONTHS.map((month, i) => {
        const isGrowing = i >= lastFrost && i <= firstFrost;
        const isFrost = !isGrowing;
        const fill = isGrowing ? 'rgba(138,154,116,0.25)' : 'rgba(122,138,154,0.15)';
        const stroke = isGrowing ? 'rgba(138,154,116,0.4)' : 'rgba(122,138,154,0.25)';
        const x = i * (barWidth + gap);
        return (
          <g key={month}>
            <rect x={x} y={8} width={barWidth} height={barHeight} rx={4} fill={fill} stroke={stroke} strokeWidth={1} />
            {isGrowing && <rect x={x + 2} y={10} width={barWidth - 4} height={barHeight - 4} rx={3} fill="rgba(138,154,116,0.15)" />}
            <text x={x + barWidth / 2} y={50} textAnchor="middle" fill="rgba(180,165,140,0.5)" fontSize={9}>{month}</text>
            {i === lastFrost && <text x={x + barWidth / 2} y={5} textAnchor="middle" fill={statusToken.good} fontSize={7}>Last Frost</text>}
            {i === firstFrost && <text x={x + barWidth / 2} y={5} textAnchor="middle" fill={group.hydrology} fontSize={7}>First Frost</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Astronomical calculations ─────────────────────────────────────────────

function computeSunPath(lat: number, season: Season): SunPosition[] {
  const { month, day } = SEASON_DATES[season];
  const doy = Math.floor((month - 1) * 30.44 + day);
  const B = ((doy - 1) * 360) / 365;
  const Br = (B * Math.PI) / 180;
  const declination = 0.006918 - 0.399912 * Math.cos(Br) + 0.070257 * Math.sin(Br) - 0.006758 * Math.cos(2 * Br) + 0.000907 * Math.sin(2 * Br);
  const decDeg = (declination * 180) / Math.PI;
  const latRad = (lat * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const positions: SunPosition[] = [];

  for (let hour = 4; hour <= 21; hour++) {
    const hourAngle = (hour - 12) * 15;
    const haRad = (hourAngle * Math.PI) / 180;
    const sinEl = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI;
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinEl) / (Math.cos(latRad) * Math.cos((elevation * Math.PI) / 180));
    let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
    if (hourAngle > 0) azimuth = 360 - azimuth;
    positions.push({ hour, azimuth, elevation });
  }
  return positions;
}

function getApproxWindFrequencies(lat: number): number[] {
  const westBias = lat > 40 ? 0.85 : 0.7;
  return [0.08, 0.06, 0.05, 0.07, 0.12, 0.15, westBias, 0.10];
}

function formatAzimuth(az: number | undefined): string {
  if (az === undefined) return '\u2014';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(az / 45) % 8;
  return `${az.toFixed(0)}\u00B0 ${dirs[i]}`;
}
