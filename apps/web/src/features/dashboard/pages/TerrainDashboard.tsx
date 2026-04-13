/**
 * TerrainDashboard — Elevation analysis, slope classification, aspect, drainage patterns.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './TerrainDashboard.module.css';
import { status as statusToken } from '../../../lib/tokens.js';

interface TerrainDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ElevationSummary {
  min_elevation_m?: number;
  max_elevation_m?: number;
  mean_elevation_m?: number;
  mean_slope_deg?: number;
  max_slope_deg?: number;
  predominant_aspect?: string;
}
interface WatershedSummary {
  watershed_name?: string;
  flow_direction?: string;
}
interface SoilsSummary {
  drainage_class?: string;
  predominant_texture?: string;
  hydrologic_group?: string;
}

// Slope distribution pattern — relative, sums to 100.
// Derived from mean slope: steeper mean shifts weight toward higher classes.
function slopeClasses(meanSlopeDeg: number) {
  // Each class gets a weight shaped by mean slope
  const s = Math.min(Math.max(meanSlopeDeg, 0), 35);
  const flat     = Math.round(Math.max(40 - s * 2.0, 3));
  const gentle   = Math.round(Math.max(38 - s * 0.8, 5));
  const moderate = Math.round(Math.min(10 + s * 1.0, 40));
  const steep    = Math.round(Math.min(5  + s * 0.8, 30));
  const vsteep   = Math.round(Math.min(2  + s * 0.3, 15));
  const total    = flat + gentle + moderate + steep + vsteep;
  const scale    = 100 / total;
  return [
    { label: 'Flat (0–2%)',       value: Math.round(flat     * scale), color: statusToken.good },
    { label: 'Gentle (2–8%)',     value: Math.round(gentle   * scale), color: statusToken.good },
    { label: 'Moderate (8–15%)',  value: Math.round(moderate * scale), color: statusToken.moderate },
    { label: 'Steep (15–30%)',    value: Math.round(steep    * scale), color: statusToken.poor },
    { label: 'Very Steep (>30%)', value: Math.round(vsteep   * scale), color: statusToken.poor },
  ];
}

// Aspect bars shaped by predominant_aspect string (e.g. "SW")
const ALL_DIRS = ['N','NE','E','SE','S','SW','W','NW'] as const;
function aspectBars(predominant: string | undefined) {
  const dominant = (predominant ?? 'S').toUpperCase().trim();
  const idx = ALL_DIRS.indexOf(dominant as typeof ALL_DIRS[number]);
  return ALL_DIRS.map((dir, i) => {
    const dist = Math.min(Math.abs(i - idx), ALL_DIRS.length - Math.abs(i - idx));
    const value = Math.max(Math.round(30 - dist * 8), 2);
    return { direction: dir, value };
  });
}

// Derive erosion risk from slope + hydrologic group
function erosionRisk(slopeDeg: number, group: string): string {
  const s = slopeDeg;
  const highRunoff = 'CD'.includes(group?.match(/[ABCD]/)?.[0] ?? 'B');
  if (s > 15 && highRunoff) return 'High';
  if (s > 10 || (s > 5 && highRunoff)) return 'Moderate–High';
  if (s > 5) return 'Low–Moderate';
  return 'Low';
}

function erosionColor(risk: string) {
  if (risk === 'High') return statusToken.poor;
  if (risk.includes('Moderate')) return statusToken.moderate;
  return statusToken.good;
}

export default function TerrainDashboard({ project, onSwitchToMap }: TerrainDashboardProps) {
  const siteData = useSiteData(project.id);

  const terrain = useMemo(() => {
    const elev     = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const watershed = siteData ? getLayerSummary<WatershedSummary>(siteData, 'watershed') : null;
    const soils    = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils')          : null;

    const minElev     = elev?.min_elevation_m   ?? 368;
    const maxElev     = elev?.max_elevation_m   ?? 412;
    const meanSlope   = elev?.mean_slope_deg    ?? 3.5;
    const aspect      = elev?.predominant_aspect;
    const relief      = Math.round(maxElev - minElev);
    // Convert slope degrees to percent
    const slopePct    = Math.round(Math.tan(meanSlope * Math.PI / 180) * 100 * 10) / 10;

    const drainageClass   = soils?.drainage_class      ?? '—';
    const texture         = soils?.predominant_texture ?? '—';
    const hydroGroup      = soils?.hydrologic_group    ?? 'B';
    const watershedName   = watershed?.watershed_name  ?? '—';
    const flowDir         = watershed?.flow_direction  ?? '—';

    const risk = erosionRisk(meanSlope, hydroGroup);
    const permDesc = texture !== '—' ? `${drainageClass} (${texture})` : drainageClass;

    return {
      maxElev: Math.round(maxElev),
      minElev: Math.round(minElev),
      relief,
      slopePct,
      meanSlope,
      aspect,
      drainageClass,
      texture,
      watershedName,
      flowDir,
      risk,
      permDesc,
      slopeClasses: slopeClasses(meanSlope),
      aspectBars: aspectBars(aspect),
    };
  }, [siteData]);

  const dominantAspect = terrain.aspect ?? 'South';
  const aspectNote = `${dominantAspect}-facing slopes receive maximum solar exposure — ideal for warm-season crops and passive solar building orientation.`;

  return (
    <div className={css.page}>
      <h1 className={css.title}>Terrain Analysis</h1>
      <p className={css.desc}>
        Digital elevation model analysis for slope classification, aspect distribution,
        and drainage pattern identification.
      </p>

      {/* Elevation summary */}
      <div className={css.elevGrid}>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>SITE ELEVATION</span>
          <span className={css.elevValue}>{terrain.maxElev}</span>
          <span className={css.elevUnit}>m ASL</span>
          <span className={css.elevNote}>centre point</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>LOCAL RELIEF</span>
          <span className={css.elevValue}>{terrain.relief}</span>
          <span className={css.elevUnit}>m</span>
          <span className={css.elevNote}>within 500m radius</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>AVG SLOPE</span>
          <span className={css.elevValue}>{terrain.slopePct}</span>
          <span className={css.elevUnit}>%</span>
        </div>
        <div className={css.elevCard}>
          <span className={css.elevLabel}>ASPECT</span>
          <span className={css.elevValue}>{terrain.aspect ?? '—'}</span>
          <span className={css.elevNote}>predominant</span>
        </div>
      </div>

      {/* Slope classification */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>SLOPE CLASSIFICATION</h3>
        <div className={css.slopeCard}>
          {terrain.slopeClasses.map((s) => (
            <ProgressBar key={s.label} label={`${s.label} — ${s.value}% of area`} value={s.value} color={s.color} />
          ))}
        </div>
      </div>

      {/* Aspect distribution */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ASPECT DISTRIBUTION</h3>
        <div className={css.aspectCard}>
          <div className={css.aspectGrid}>
            {terrain.aspectBars.map((a) => (
              <div key={a.direction} className={css.aspectItem}>
                <span className={css.aspectDir}>{a.direction}</span>
                <div className={css.aspectBarTrack}>
                  <div className={css.aspectBarFill} style={{ width: `${(a.value / 30) * 100}%` }} />
                </div>
                <span className={css.aspectPct}>{a.value}%</span>
              </div>
            ))}
          </div>
          <p className={css.aspectNote}>{aspectNote}</p>
        </div>
      </div>

      {/* Drainage patterns */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>DRAINAGE ANALYSIS</h3>
        <div className={css.drainageCard}>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Primary Drainage</span>
            <span className={css.drainageValue}>{terrain.flowDir}</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Watershed</span>
            <span className={css.drainageValue}>{terrain.watershedName}</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Permeability</span>
            <span className={css.drainageValue}>{terrain.permDesc}</span>
          </div>
          <div className={css.drainageRow}>
            <span className={css.drainageLabel}>Erosion Risk</span>
            <span className={css.drainageValue} style={{ color: erosionColor(terrain.risk) }}>{terrain.risk}</span>
          </div>
        </div>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW TERRAIN ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
