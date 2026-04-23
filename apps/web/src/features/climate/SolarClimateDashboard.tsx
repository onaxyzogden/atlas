/**
 * SolarClimateDashboard — full dashboard page for solar, wind & climate analysis.
 * Consolidates sun path, wind rose, climate summary, growing season calendar,
 * microclimate zones, and solar opportunity zones.
 *
 * Reuses astronomical calculations and SVG components from SolarClimatePanel.
 * This is a dashboard page (not a map overlay).
 */

import { useState, useMemo } from 'react';
import {
  computeSunPathForSeason,
  summarizeSunPath,
  solarExposureScore,
  SEASON_DATES,
  buildComfortSummary,
  buildWindbreakLines,
  type Season,
  type SunPosition,
  type ComfortBand,
  type MonthlyNormal,
  type WindbreakCandidates,
} from '@ogden/shared';
import { useSiteData, getLayerSummary, getLayer } from '../../store/siteDataStore.js';
import type { WindRoseData } from '../../lib/layerFetcher.js';
import { api, type SolarExposureResponse } from '../../lib/apiClient.js';
import css from './SolarClimateDashboard.module.css';
import { earth, status as statusToken, group, semantic } from '../../lib/tokens.js';

interface SolarClimateDashboardProps {
  project: {
    id: string;
    acreage?: number | null;
    parcelBoundaryGeojson?: GeoJSON.FeatureCollection | null;
  };
  onSwitchToMap: () => void;
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
  // Sprint C additions
  koppen_classification?: string | null;
  koppen_label?: string | null;
  freeze_thaw_cycles_per_year?: number | null;
  snow_months?: number | null;
  solar_radiation_kwh_m2_day?: number | null;
  solar_radiation_monthly?: number[] | null;
  wind_speed_ms?: number | null;
  monthly_normals?: MonthlyNormal[] | null;
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

const WIND_DIRECTIONS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const WIND_DIRECTIONS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SolarClimateDashboard({ project, onSwitchToMap }: SolarClimateDashboardProps) {
  const siteData = useSiteData(project.id);
  const [activeSeason, setActiveSeason] = useState<Season>('summer');
  const [terrainExposure, setTerrainExposure] = useState<SolarExposureResponse | null>(null);
  const [terrainExposureStatus, setTerrainExposureStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [terrainExposureError, setTerrainExposureError] = useState<string | null>(null);

  const handleComputeTerrainExposure = async () => {
    setTerrainExposureStatus('loading');
    setTerrainExposureError(null);
    try {
      const res = await api.climateAnalysis.computeSolarExposure(project.id);
      setTerrainExposure(res.data);
      setTerrainExposureStatus('idle');
    } catch (err) {
      setTerrainExposureError(err instanceof Error ? err.message : String(err));
      setTerrainExposureStatus('error');
    }
  };

  const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
  const microclimate = siteData ? getLayerSummary<MicroclimateSummary>(siteData, 'microclimate') : null;
  const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
  const microclimateStatus = siteData ? getLayer(siteData, 'microclimate')?.fetchStatus : undefined;

  const windRoseData = climate?._wind_rose ?? null;
  const center = useMemo(
    () => computeCenterFromBoundary(project.parcelBoundaryGeojson ?? null),
    [project.parcelBoundaryGeojson],
  );
  const lat = center?.[1] ?? 43.5;

  const sunPath = useMemo(() => computeSunPathForSeason(lat, activeSeason), [lat, activeSeason]);
  const sunSummary = useMemo(() => summarizeSunPath(sunPath), [sunPath]);
  const daylightHours = sunSummary.daylightHours;
  const solarNoon = sunSummary.solarNoon;

  // Seasonal solar exposure scores — drives the new "Solar Exposure" card.
  const exposureBySeason = useMemo(() => ({
    spring: solarExposureScore(computeSunPathForSeason(lat, 'spring')),
    summer: solarExposureScore(computeSunPathForSeason(lat, 'summer')),
    fall: solarExposureScore(computeSunPathForSeason(lat, 'fall')),
    winter: solarExposureScore(computeSunPathForSeason(lat, 'winter')),
  }), [lat]);

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

  const comfort = useMemo(() => buildComfortSummary(climate?.monthly_normals ?? null), [climate]);

  const adaptations = useMemo(
    () => buildAdaptations({ climate, microclimate, elevation, comfort, exposureBySeason }),
    [climate, microclimate, elevation, comfort, exposureBySeason],
  );

  const windbreaks = useMemo(() => {
    const bbox = computeBboxFromBoundary(project.parcelBoundaryGeojson ?? null);
    if (!bbox) return null;
    return buildWindbreakLines(bbox, climate?.prevailing_wind ?? null, 3);
  }, [project.parcelBoundaryGeojson, climate?.prevailing_wind]);

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
            {climate.koppen_classification && (
              <ClimateMetric label="K\u00F6ppen Classification" value={`${climate.koppen_classification} \u2014 ${climate.koppen_label ?? ''}`} />
            )}
            {climate.solar_radiation_kwh_m2_day != null && (
              <ClimateMetric label="Solar Radiation" value={`${climate.solar_radiation_kwh_m2_day} kWh/m\u00B2/day`} />
            )}
            {climate.freeze_thaw_cycles_per_year != null && climate.freeze_thaw_cycles_per_year > 0 && (
              <ClimateMetric label="Freeze-Thaw Cycles" value={`~${climate.freeze_thaw_cycles_per_year}/yr`} />
            )}
            {climate.snow_months != null && climate.snow_months > 0 && (
              <ClimateMetric label="Snow Months" value={`${climate.snow_months}`} />
            )}
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

      {/* Seasonal Comfort Calendar — derived from monthly temp normals */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SEASONAL COMFORT CALENDAR</h3>
        <div className={css.calendarCard}>
          {comfort ? (
            <ComfortCalendar comfort={comfort} />
          ) : (
            <div className={css.pendingNote}>
              Comfort calendar requires monthly temperature normals (NOAA / ECCC / NASA POWER).
            </div>
          )}
        </div>
      </div>

      {/* Climate adaptation recommendations — rule-based on available signals */}
      {adaptations.length > 0 && (
        <div className={css.section}>
          <h3 className={css.sectionLabel}>ADAPTATION RECOMMENDATIONS</h3>
          <AdaptationCards items={adaptations} />
        </div>
      )}

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

      {/* Solar Exposure Summary — seasonal exposure scores from sun path */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SOLAR EXPOSURE</h3>
        <div className={css.solarOppCard}>
          <div className={css.metricGrid}>
            {(Object.keys(exposureBySeason) as Season[]).map((season) => (
              <ClimateMetric
                key={season}
                label={SEASON_DATES[season].label.replace(' Equinox', '').replace(' Solstice', '')}
                value={`${Math.round(exposureBySeason[season] * 100)}%`}
              />
            ))}
            {climate?.solar_radiation_kwh_m2_day != null && (
              <ClimateMetric
                label="Avg Irradiance"
                value={`${climate.solar_radiation_kwh_m2_day} kWh/m\u00B2/day`}
              />
            )}
          </div>
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
            Exposure score derived from sun path at {lat.toFixed(2)}&deg;N &mdash; weights altitude and
            south-bias per hour. Source: astronomical calculations + NASA POWER irradiance.
          </p>
        </div>
      </div>

      {/* Terrain-aware solar exposure — runs DEM-driven computation on demand */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>TERRAIN EXPOSURE MAP</h3>
        <div className={css.solarOppCard}>
          {!terrainExposure && terrainExposureStatus !== 'loading' && (() => {
            const hasBoundary = project.parcelBoundaryGeojson != null;
            return (
              <>
                <p className={css.solarOppText}>
                  Compute a grid-cell exposure map from the project DEM: slope &times; aspect &times;
                  annual sun path. Identifies placement zones for panels, greenhouses, and sun-loving
                  crops. Horizon shading from surrounding terrain is not modelled.
                </p>
                <button
                  type="button"
                  onClick={handleComputeTerrainExposure}
                  disabled={!hasBoundary}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: hasBoundary ? group.livestock : 'rgba(255,255,255,0.08)',
                    color: hasBoundary ? '#1a1611' : 'rgba(255,255,255,0.4)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: hasBoundary ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Analyze Terrain Exposure
                </button>
                {!hasBoundary && (
                  <p className={css.solarOppNote} style={{ marginTop: 8 }}>
                    Draw a parcel boundary on the map first &mdash; DEM sampling requires a bounded area.
                  </p>
                )}
                {terrainExposureError && (
                  <p className={css.solarOppNote} style={{ color: statusToken.poor, marginTop: 8 }}>
                    {terrainExposureError}
                  </p>
                )}
              </>
            );
          })()}
          {terrainExposureStatus === 'loading' && (
            <p className={css.solarOppText}>Reading DEM and computing exposure grid&hellip;</p>
          )}
          {terrainExposure && (
            <>
              <div className={css.metricGrid}>
                <ClimateMetric
                  label="Mean Exposure"
                  value={`${Math.round(terrainExposure.summary.mean_exposure * 100)}%`}
                />
                <ClimateMetric
                  label="Excellent (>75%)"
                  value={`${terrainExposure.summary.excellent_pct.toFixed(1)}%`}
                />
                <ClimateMetric
                  label="High (55-75%)"
                  value={`${terrainExposure.summary.high_pct.toFixed(1)}%`}
                />
                <ClimateMetric
                  label="Medium (35-55%)"
                  value={`${terrainExposure.summary.medium_pct.toFixed(1)}%`}
                />
                <ClimateMetric
                  label="Low (<35%)"
                  value={`${terrainExposure.summary.low_pct.toFixed(1)}%`}
                />
                <ClimateMetric
                  label="Cell Resolution"
                  value={`~${Math.round(terrainExposure.summary.resolution_m)} m`}
                />
              </div>
              <ExposureMiniMap
                geojson={terrainExposure.geojson}
                boundary={project.parcelBoundaryGeojson ?? null}
                windbreaks={windbreaks}
              />
              {windbreaks && windbreaks.lines.length > 0 && (
                <p className={css.solarOppNote} style={{ marginTop: 6 }}>
                  <span style={{ display: 'inline-block', width: 18, height: 3, background: 'rgba(138,200,172,0.95)', borderRadius: 1.5, marginRight: 6, verticalAlign: 'middle' }} />
                  {windbreaks.lines.length} windbreak candidate{windbreaks.lines.length === 1 ? '' : 's'} on {windbreaks.windwardEdge}, facing {Math.round(windbreaks.faceAzimuth)}&deg;. Lines perpendicular to prevailing wind ({climate?.prevailing_wind ?? '—'}).
                </p>
              )}
              <p className={css.solarOppNote}>
                Source: {terrainExposure.summary.source_api} &middot; {terrainExposure.summary.sample_grid_size} cells sampled.
                Green = best placement zones (excellent/high). Dim = poor exposure (steep N-facing or deep shadow-prone aspects).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExposureMiniMap({
  geojson,
  boundary,
  windbreaks,
}: {
  geojson: GeoJSON.FeatureCollection;
  boundary: GeoJSON.FeatureCollection | null;
  windbreaks?: WindbreakCandidates | null;
}) {
  const width = 340;
  const height = 240;

  // Compute bbox from geojson features.
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geojson.features) {
    if (f.geometry?.type !== 'Polygon') continue;
    for (const ring of (f.geometry as GeoJSON.Polygon).coordinates) {
      for (const coord of ring) {
        const lng = coord[0];
        const lat = coord[1];
        if (lng === undefined || lat === undefined) continue;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  if (!isFinite(minLng)) return null;

  const pad = 10;
  const sx = (lng: number) =>
    pad + ((lng - minLng) / (maxLng - minLng || 1)) * (width - 2 * pad);
  const sy = (lat: number) =>
    pad + ((maxLat - lat) / (maxLat - minLat || 1)) * (height - 2 * pad);

  const bandFill: Record<string, string> = {
    low: 'rgba(100, 100, 110, 0.35)',
    medium: 'rgba(220, 190, 100, 0.5)',
    high: 'rgba(230, 160, 80, 0.75)',
    excellent: 'rgba(240, 210, 90, 0.95)',
  };

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', margin: '12px auto 0', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}
    >
      {geojson.features.map((f, i) => {
        if (f.geometry?.type !== 'Polygon') return null;
        const ring = (f.geometry as GeoJSON.Polygon).coordinates[0];
        if (!ring) return null;
        const pts = ring
          .map((c) => `${sx(c[0] ?? 0).toFixed(1)},${sy(c[1] ?? 0).toFixed(1)}`)
          .join(' ');
        const band = String(f.properties?.band ?? f.properties?.class ?? 'low');
        return (
          <polygon
            key={i}
            points={pts}
            fill={bandFill[band] ?? bandFill.low}
            stroke="none"
          />
        );
      })}
      {boundary?.features?.map((f, i) => {
        if (f.geometry?.type !== 'Polygon') return null;
        const ring = (f.geometry as GeoJSON.Polygon).coordinates[0];
        if (!ring) return null;
        const pts = ring
          .map((c) => `${sx(c[0] ?? 0).toFixed(1)},${sy(c[1] ?? 0).toFixed(1)}`)
          .join(' ');
        return <polygon key={`b${i}`} points={pts} fill="none" stroke={group.livestock} strokeWidth={2} />;
      })}
      {windbreaks?.lines.map((wb, i) => {
        const [a, b] = wb.coords;
        if (!a || !b) return null;
        return (
          <line
            key={`w${i}`}
            x1={sx(a[0])}
            y1={sy(a[1])}
            x2={sx(b[0])}
            y2={sy(b[1])}
            stroke="rgba(138,200,172,0.95)"
            strokeWidth={3}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
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

const COMFORT_BAND_COLOR: Record<ComfortBand, string> = {
  freezing: 'rgba(122,154,200,0.35)',
  cold: 'rgba(138,174,210,0.28)',
  cool: 'rgba(138,184,154,0.28)',
  comfortable: 'rgba(168,192,120,0.45)',
  hot: 'rgba(222,138,96,0.38)',
};

const COMFORT_BAND_STROKE: Record<ComfortBand, string> = {
  freezing: 'rgba(122,154,200,0.55)',
  cold: 'rgba(138,174,210,0.45)',
  cool: 'rgba(138,184,154,0.45)',
  comfortable: 'rgba(168,192,120,0.6)',
  hot: 'rgba(222,138,96,0.55)',
};

const COMFORT_BAND_LABEL: Record<ComfortBand, string> = {
  freezing: 'Freezing',
  cold: 'Cold',
  cool: 'Cool',
  comfortable: 'Comfortable',
  hot: 'Hot',
};

function ComfortCalendar({
  comfort,
}: {
  comfort: ReturnType<typeof buildComfortSummary>;
}) {
  if (!comfort) return null;
  const barWidth = 36;
  const barHeight = 24;
  const gap = 3;
  const totalWidth = 12 * barWidth + 11 * gap;
  const bandsPresent = Array.from(new Set(comfort.months.map((m) => m.band)));

  return (
    <>
      <svg width={totalWidth} height={78} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }} viewBox={`0 0 ${totalWidth} 78`}>
        {Array.from({ length: 12 }, (_, i) => {
          const monthNum = i + 1;
          const cm = comfort.months.find((m) => m.month === monthNum);
          const fill = cm ? COMFORT_BAND_COLOR[cm.band] : 'rgba(122,138,154,0.1)';
          const stroke = cm ? COMFORT_BAND_STROKE[cm.band] : 'rgba(122,138,154,0.2)';
          const x = i * (barWidth + gap);
          return (
            <g key={monthNum}>
              <rect x={x} y={8} width={barWidth} height={barHeight} rx={4} fill={fill} stroke={stroke} strokeWidth={1} />
              {cm?.wet && (
                <rect x={x + 4} y={36} width={barWidth - 8} height={3} rx={1.5} fill="rgba(138,174,210,0.55)" />
              )}
              <text x={x + barWidth / 2} y={56} textAnchor="middle" fill="rgba(180,165,140,0.5)" fontSize={9}>{MONTHS[i]}</text>
              {cm?.meanMaxC != null && (
                <text x={x + barWidth / 2} y={70} textAnchor="middle" fill="rgba(180,165,140,0.4)" fontSize={8}>
                  {Math.round(cm.meanMaxC)}&deg;
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10, fontSize: 10, color: 'rgba(180,165,140,0.7)' }}>
        {bandsPresent.map((band) => (
          <span key={band} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 12, height: 10, borderRadius: 2, background: COMFORT_BAND_COLOR[band], border: `1px solid ${COMFORT_BAND_STROKE[band]}` }} />
            {COMFORT_BAND_LABEL[band]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 12, height: 3, borderRadius: 1.5, background: 'rgba(138,174,210,0.55)' }} />
          Wet (&ge;120 mm)
        </span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(180,165,140,0.65)' }}>
        {comfort.comfortableMonths} comfortable month{comfort.comfortableMonths === 1 ? '' : 's'}
        {comfort.outdoorSeasonStart != null && comfort.outdoorSeasonEnd != null && (
          <> &middot; outdoor season {MONTHS[comfort.outdoorSeasonStart - 1]}&ndash;{MONTHS[comfort.outdoorSeasonEnd - 1]}</>
        )}
      </div>
    </>
  );
}

interface AdaptationItem {
  id: string;
  title: string;
  severity: 'info' | 'advisory' | 'priority';
  icon: string;
  body: string;
  evidence: string;
}

interface AdaptationInputs {
  climate: ClimateSummary | null;
  microclimate: MicroclimateSummary | null;
  elevation: ElevationSummary | null;
  comfort: ReturnType<typeof buildComfortSummary>;
  exposureBySeason: Record<Season, number>;
}

function buildAdaptations({ climate, microclimate, elevation, comfort, exposureBySeason }: AdaptationInputs): AdaptationItem[] {
  const items: AdaptationItem[] = [];

  const frostCount = microclimate?.frostRisk?.length ?? 0;
  if (frostCount > 0) {
    items.push({
      id: 'frost-pocket',
      severity: 'priority',
      icon: '\u2744',
      title: 'Frost-sensitive plantings at risk',
      body: `${frostCount} frost-pocket zone${frostCount === 1 ? '' : 's'} detected. Avoid siting early-flowering orchard crops (apricot, peach, almond) in these zones. Favor cold-hardy cultivars or reserve these pockets for dormant-season uses.`,
      evidence: 'Microclimate processor (cold-air drainage + terrain sinks)',
    });
  }

  const freezeThaw = climate?.freeze_thaw_cycles_per_year ?? 0;
  if (freezeThaw >= 40) {
    items.push({
      id: 'freeze-thaw',
      severity: 'advisory',
      icon: '\u2744',
      title: 'High freeze-thaw stress on infrastructure',
      body: `~${freezeThaw} freeze-thaw cycles per year. Specify frost-resistant pipe materials, bury water lines below local frost depth, and avoid unreinforced masonry on exposed north/east elevations.`,
      evidence: 'Climate normals — freeze-thaw cycle count',
    });
  }

  const precip = climate?.annual_precip_mm ?? null;
  if (precip != null && precip < 500) {
    items.push({
      id: 'aridity',
      severity: 'priority',
      icon: '\u2600',
      title: 'Arid-site irrigation design required',
      body: `Annual precipitation ${precip} mm is below temperate rain-fed thresholds. Prioritize water harvesting (swales, cisterns), drought-tolerant species, and mulched plantings. Size irrigation for the driest 90-day window.`,
      evidence: 'Climate normals — annual precipitation',
    });
  } else if (precip != null && precip > 1400) {
    items.push({
      id: 'humid',
      severity: 'advisory',
      icon: '\u2602',
      title: 'High-rainfall site — favour drainage-first design',
      body: `Annual precipitation ${precip} mm is at the upper end of temperate ranges. Expect elevated disease pressure on stone fruit and brassicas; prefer airflow-prioritising bed orientation and fungal-resistant cultivars.`,
      evidence: 'Climate normals — annual precipitation',
    });
  }

  const winterExposure = exposureBySeason.winter;
  if (winterExposure > 0 && winterExposure < 0.35) {
    items.push({
      id: 'low-winter-sun',
      severity: 'advisory',
      icon: '\u263C',
      title: 'Low winter solar exposure',
      body: `Winter exposure score ${Math.round(winterExposure * 100)}%. Passive-solar buildings should maximize south glazing and minimize north fenestration. Locate cold-season greenhouses on unshaded south slopes, not valley bottoms.`,
      evidence: 'Sun-path × site latitude (winter solstice)',
    });
  }

  const summerExposure = exposureBySeason.summer;
  const slope = elevation?.mean_slope_deg ?? 0;
  const aspect = (elevation?.aspect_dominant ?? '').toUpperCase();
  const westSouthwest = aspect === 'SW' || aspect === 'W' || aspect === 'WSW' || aspect === 'SSW';
  if (summerExposure > 0.7 && slope >= 8 && westSouthwest) {
    items.push({
      id: 'heat-stress-slope',
      severity: 'advisory',
      icon: '\u2668',
      title: 'West/southwest slope heat stress',
      body: `Dominant aspect ${aspect} with ${slope.toFixed(1)}\u00B0 slope receives peak afternoon sun. Expect high evapotranspiration and leaf scorch on sensitive crops. Shade strips or windbreak-with-shade multi-purpose plantings recommended.`,
      evidence: 'DEM aspect + summer exposure score',
    });
  }

  const shelterDeficit = (microclimate?.windShelter?.length ?? 0) === 0;
  const hasWindData = climate?._wind_rose != null || climate?.wind_speed_ms != null;
  if (shelterDeficit && hasWindData) {
    const dir = climate?.prevailing_wind ?? 'prevailing';
    items.push({
      id: 'windbreak-opportunity',
      severity: 'info',
      icon: '\u27F7',
      title: 'Windbreak opportunity',
      body: `No wind-sheltered zones detected on site. Plant a multi-row windbreak perpendicular to ${dir} wind to reduce evaporative losses on pasture and orchards by 10\u201330%.`,
      evidence: 'Microclimate shelter pass + climate prevailing wind',
    });
  }

  if (comfort && comfort.comfortableMonths <= 3) {
    items.push({
      id: 'short-comfort-season',
      severity: 'info',
      icon: '\u2600',
      title: 'Short outdoor-use season',
      body: `Only ${comfort.comfortableMonths} comfortable month${comfort.comfortableMonths === 1 ? '' : 's'} per year. Plan outdoor gathering, market, or CSA-pickup infrastructure to be covered or rapidly convertible. Indoor/shoulder-season programming is disproportionately valuable here.`,
      evidence: 'Monthly normals — thermal comfort band classification',
    });
  } else if (comfort && comfort.comfortableMonths >= 8) {
    items.push({
      id: 'long-comfort-season',
      severity: 'info',
      icon: '\u2600',
      title: 'Long outdoor-use season — program accordingly',
      body: `${comfort.comfortableMonths} comfortable months open up year-round outdoor programming (markets, workshops, retreat use). Prioritize shade infrastructure and seasonal water access points.`,
      evidence: 'Monthly normals — thermal comfort band classification',
    });
  }

  return items;
}

const SEVERITY_ACCENT: Record<AdaptationItem['severity'], string> = {
  info: 'rgba(138,184,154,0.55)',
  advisory: 'rgba(222,190,96,0.6)',
  priority: 'rgba(222,138,96,0.65)',
};

function AdaptationCards({ items }: { items: AdaptationItem[] }) {
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            padding: '12px 14px 12px 16px',
            borderLeft: `3px solid ${SEVERITY_ACCENT[item.severity]}`,
            background: 'rgba(26,22,17,0.4)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <h4 style={{ margin: 0, fontSize: 12, letterSpacing: '0.03em', color: earth[100], fontWeight: 600 }}>
              {item.title}
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'rgba(180,165,140,0.85)' }}>
            {item.body}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(180,165,140,0.45)' }}>
            {item.evidence}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function computeCenterFromBoundary(
  geojson: GeoJSON.FeatureCollection | null,
): [number, number] | null {
  if (!geojson?.features?.length) return null;
  let sumLng = 0, sumLat = 0, count = 0;
  for (const f of geojson.features) {
    if (f.geometry?.type === 'Polygon') {
      for (const coord of (f.geometry as GeoJSON.Polygon).coordinates[0] ?? []) {
        sumLng += coord[0]!;
        sumLat += coord[1]!;
        count++;
      }
    }
  }
  return count > 0 ? [sumLng / count, sumLat / count] : null;
}

function computeBboxFromBoundary(
  geojson: GeoJSON.FeatureCollection | null,
): [number, number, number, number] | null {
  if (!geojson?.features?.length) return null;
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;
  const visit = (ring: GeoJSON.Position[]) => {
    for (const coord of ring) {
      const lng = coord[0];
      const lat = coord[1];
      if (lng === undefined || lat === undefined) continue;
      if (lng < minLon) minLon = lng;
      if (lng > maxLon) maxLon = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  for (const f of geojson.features) {
    if (f.geometry?.type === 'Polygon') {
      for (const ring of (f.geometry as GeoJSON.Polygon).coordinates) visit(ring);
    } else if (f.geometry?.type === 'MultiPolygon') {
      for (const poly of (f.geometry as GeoJSON.MultiPolygon).coordinates) {
        for (const ring of poly) visit(ring);
      }
    }
  }
  if (minLon === Infinity) return null;
  return [minLon, minLat, maxLon, maxLat];
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
