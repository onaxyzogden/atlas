/**
 * HerdRotationDashboard — Herd rotation management with live store data,
 * adaptive alerts, recovery tracking, and rotation efficiency.
 *
 * All hardcoded demo data replaced with:
 *   - useLivestockStore  (paddocks filtered by projectId)
 *   - useStructureStore  (water structures filtered by projectId)
 *   - livestockAnalysis   (recovery, rotation, inventory computations)
 *   - siteDataStore       (climate, watershed, elevation)
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  computeRecoveryStatus,
  computeRotationSchedule,
  computeRotationEfficiency,
  computeInventorySummary,
  computeOvergrazingRisk,
  computeRecommendedStocking,
  computeForageQuality,
  type RecoveryStatus,
} from '../../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES, computeAnimalUnits } from '../../livestock/speciesData.js';
import ProgressBar from '../components/ProgressBar.js';
import RotationScheduleCard from '../../livestock/RotationScheduleCard.js';
import PaddockCellDesignCard from '../../livestock/PaddockCellDesignCard.js';
import AnimalCorridorGrazingRouteCard from '../../livestock/AnimalCorridorGrazingRouteCard.js';
import BrowsePressureRiskCard from '../../livestock/BrowsePressureRiskCard.js';
import FencingLayoutCard from '../../livestock/FencingLayoutCard.js';
import MultiSpeciesPlannerCard from '../../livestock/MultiSpeciesPlannerCard.js';
import css from './HerdRotationDashboard.module.css';
import { status as statusToken, group } from '../../../lib/tokens.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HerdRotationDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface WatershedSummary { nearest_stream_m?: number | string; }
interface ClimateSummary { annual_temp_mean_c?: number; annual_precip_mm?: number; growing_season_days?: number; }
interface ElevationSummary { mean_slope_deg?: number; }

interface Alert {
  type: 'warning' | 'info';
  title: string;
  desc: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const WATER_STRUCTURE_TYPES = ['water_pump_house', 'water_tank', 'well'] as const;

const STATUS_COLORS: Record<RecoveryStatus['status'], string> = {
  active: statusToken.moderate,
  resting: group.hydrology,
  ready: statusToken.good,
  overdue: statusToken.poor,
};

function speciesIcons(species: string[]): string {
  return species.map((sp) => LIVESTOCK_SPECIES[sp as keyof typeof LIVESTOCK_SPECIES]?.icon ?? sp).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Warning / Info SVG icons (inline)                                  */
/* ------------------------------------------------------------------ */

function WarningSvg() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={statusToken.moderate} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L15 14H1L8 1Z" />
      <line x1="8" y1="6" x2="8" y2="9" />
      <circle cx="8" cy="11.5" r="0.5" fill={statusToken.moderate} />
    </svg>
  );
}

function InfoSvg() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={group.hydrology} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5" r="0.5" fill={group.hydrology} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HerdRotationDashboard({ project, onSwitchToMap }: HerdRotationDashboardProps) {
  /* ---------- Store subscriptions ---------- */
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useStructureStore((s) => s.structures);
  const siteData = useSiteData(project.id);

  /* ---------- Filtered data ---------- */
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );

  const waterStructures = useMemo(
    () => allStructures.filter(
      (s) => s.projectId === project.id && (WATER_STRUCTURE_TYPES as readonly string[]).includes(s.type),
    ),
    [allStructures, project.id],
  );

  /* ---------- Environment from siteData ---------- */
  const env = useMemo(() => {
    const watershed = siteData ? getLayerSummary<WatershedSummary>(siteData, 'watershed') : null;
    const climate   = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const elev      = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;

    const streamRaw = parseFloat(String(watershed?.nearest_stream_m ?? ''));
    const streamM   = isFinite(streamRaw) ? Math.round(streamRaw) : null;
    const tempC     = climate?.annual_temp_mean_c ?? null;
    const precipMm  = climate?.annual_precip_mm ?? null;
    const growDays  = climate?.growing_season_days ?? null;
    const slopeDeg  = elev?.mean_slope_deg ?? null;

    const weatherLabel = tempC !== null ? `${Math.round(tempC)}\u00b0C avg` : 'Loading...';
    const streamLabel  = streamM !== null ? `${streamM}m to stream` : 'Stream data loading';
    const slopeLabel   = slopeDeg !== null ? `${slopeDeg.toFixed(1)}\u00b0 avg slope` : 'Slope data loading';

    return { weatherLabel, streamLabel, slopeLabel, tempC, precipMm, growDays, slopeDeg };
  }, [siteData]);

  /* ---------- Analysis computations ---------- */
  const recoveries = useMemo(
    () => paddocks.map(computeRecoveryStatus),
    [paddocks],
  );

  const rotationSchedule = useMemo(
    () => computeRotationSchedule(paddocks),
    [paddocks],
  );

  const rotationEfficiency = useMemo(
    () => computeRotationEfficiency(paddocks),
    [paddocks],
  );

  const inventory = useMemo(
    () => computeInventorySummary(paddocks),
    [paddocks],
  );

  // Expand each species line into one entry per Schedule A subcategory (when
  // recorded) so AU uses the precise factor; species without a subcategory
  // choice contribute via the legacy single-factor path.
  const totalAU = useMemo(() => {
    const expanded = inventory.flatMap((e) => {
      if (!e.bySubcategory || e.bySubcategory.length === 0) {
        return [{ species: e.species, totalHead: e.totalHead }];
      }
      const taggedHead = e.bySubcategory.reduce((s, b) => s + b.totalHead, 0);
      const untagged = Math.max(0, e.totalHead - taggedHead);
      const rows: Array<{ species: typeof e.species; totalHead: number; subcategoryId?: string }> =
        e.bySubcategory.map((b) => ({ species: e.species, totalHead: b.totalHead, subcategoryId: b.subcategoryId }));
      if (untagged > 0) rows.push({ species: e.species, totalHead: untagged });
      return rows;
    });
    return computeAnimalUnits(expanded);
  }, [inventory]);

  /* ---------- Hero: dominant group & species ---------- */
  const heroInfo = useMemo(() => {
    if (paddocks.length === 0) return { tag: 'HERD ROTATION', title: 'Herd Rotation' };

    // Find most common grazing cell group
    const groupCounts = new Map<string, number>();
    for (const p of paddocks) {
      const g = p.grazingCellGroup ?? 'Ungrouped';
      groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
    }
    let dominantGroup = 'Ungrouped';
    let maxCount = 0;
    for (const [g, count] of groupCounts) {
      if (count > maxCount) { dominantGroup = g; maxCount = count; }
    }

    // Find most common species
    const speciesCounts = new Map<string, number>();
    for (const p of paddocks) {
      for (const sp of p.species) {
        speciesCounts.set(sp, (speciesCounts.get(sp) ?? 0) + 1);
      }
    }
    let dominantSpecies = '';
    let maxSpCount = 0;
    for (const [sp, count] of speciesCounts) {
      if (count > maxSpCount) { dominantSpecies = sp; maxSpCount = count; }
    }

    const speciesLabel = dominantSpecies
      ? LIVESTOCK_SPECIES[dominantSpecies as keyof typeof LIVESTOCK_SPECIES]?.label ?? dominantSpecies
      : '';

    const tag = `OPERATIONAL UNIT: ${dominantGroup.toUpperCase()}`;
    const title = speciesLabel
      ? `${speciesLabel} Rotation \u2014 ${dominantGroup}`
      : `Herd Rotation \u2014 ${dominantGroup}`;

    return { tag, title };
  }, [paddocks]);

  /* ---------- Active paddock (most recently updated or smallest daysRested) ---------- */
  const activePaddock = useMemo(() => {
    if (recoveries.length === 0) return null;
    const sorted = [...recoveries].sort((a, b) => a.daysRested - b.daysRested);
    const best = sorted[0]!;
    const pad = paddocks.find((p) => p.id === best.paddockId);
    return pad ? { paddock: pad, recovery: best } : null;
  }, [recoveries, paddocks]);

  /* ---------- Overgrazing risks ---------- */
  const overgrazingAlerts = useMemo(() => {
    const alerts: string[] = [];
    for (const p of paddocks) {
      if (p.species.length === 0) continue;
      const forage = computeForageQuality(2, 20, env.slopeDeg ?? 3, env.growDays ?? 150);
      const recommended = computeRecommendedStocking(p.species[0]!, forage);
      const risk = computeOvergrazingRisk(p, recommended);
      if (risk.risk === 'high') alerts.push(p.name);
    }
    return alerts;
  }, [paddocks, env.slopeDeg, env.growDays]);

  /* ---------- Adaptive alerts ---------- */
  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];

    if (env.tempC !== null && env.tempC > 25) {
      list.push({
        type: 'warning',
        title: 'Heat Stress Risk',
        desc: 'High average temperatures may affect livestock welfare. Ensure shade and water access.',
      });
    }

    if (env.precipMm !== null && env.precipMm < 500) {
      list.push({
        type: 'warning',
        title: 'Low Precipitation',
        desc: 'Consider supplemental feeding and monitor water reserves closely.',
      });
    }

    if (env.slopeDeg !== null && env.slopeDeg > 15) {
      list.push({
        type: 'info',
        title: 'Steep Terrain',
        desc: 'Some paddocks may be challenging for rotation. Consider species suited to slopes.',
      });
    }

    if (overgrazingAlerts.length > 0) {
      list.push({
        type: 'warning',
        title: 'Overgrazing Risk',
        desc: `High stocking pressure on: ${overgrazingAlerts.join(', ')}. Consider rotating sooner.`,
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'info',
        title: 'All Clear',
        desc: 'No active alerts \u2014 conditions look favorable for current rotation.',
      });
    }

    return list;
  }, [env.tempC, env.precipMm, env.slopeDeg, overgrazingAlerts]);

  /* ================================================================ */
  /*  Empty state                                                      */
  /* ================================================================ */

  if (paddocks.length === 0) {
    return (
      <div className={css.page}>
        <div className={css.hero}>
          <span className={css.heroTag}>HERD ROTATION</span>
          <h1 className={css.title}>No paddocks drawn yet</h1>
        </div>

        <div className={css.healthCard}>
          <h2 className={css.healthTitle}>Get Started</h2>
          <div className={css.healthIndicator}>
            <span className={css.healthDot} />
            <span className={css.healthText}>
              Draw paddocks and assign species to start managing herd rotations.
            </span>
          </div>
        </div>

        <button className={css.ctaButton} onClick={onSwitchToMap}>
          OPEN MAP VIEW
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8H13M10 5L13 8L10 11" />
          </svg>
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  Main render                                                      */
  /* ================================================================ */

  return (
    <div className={css.page}>
      {/* Hero */}
      <div className={css.hero}>
        <span className={css.heroTag}>{heroInfo.tag}</span>
        <h1 className={css.title}>
          {heroInfo.title}
          <span style={{ marginLeft: 12, fontSize: '0.65em', opacity: 0.65 }}>
            {rotationEfficiency}% efficiency
          </span>
        </h1>
      </div>

      {/* Alert cards */}
      <div className={css.alertRow}>
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`${css.alertCard} ${alert.type === 'warning' ? css.alertWarning : css.alertInfo}`}
          >
            <span className={css.alertIcon}>
              {alert.type === 'warning' ? <WarningSvg /> : <InfoSvg />}
            </span>
            <div>
              <span className={css.alertTitle}>{alert.title}</span>
              <span className={css.alertDesc}>{alert.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active paddock card */}
      {activePaddock && (
        <div className={css.paddockCard}>
          <div className={css.paddockHeader}>
            <div>
              <span className={css.paddockLabel}>ACTIVE PADDOCK</span>
              <h2 className={css.paddockName}>
                {activePaddock.paddock.name}
                {activePaddock.paddock.grazingCellGroup && (
                  <span className={css.paddockSub}>
                    ({activePaddock.paddock.grazingCellGroup})
                  </span>
                )}
              </h2>
            </div>
            <div className={css.paddockAcres}>
              <span className={css.acresValue}>
                {(activePaddock.paddock.areaM2 / 10_000).toFixed(1)}
              </span>
              <span className={css.acresUnit}>HA</span>
            </div>
          </div>

          <div className={css.biomassBar}>
            <div className={css.biomassBarHeader}>
              <span>Recovery Compliance</span>
              <span className={css.biomassBarPct}>{activePaddock.recovery.compliance}%</span>
            </div>
            <ProgressBar
              label=""
              value={activePaddock.recovery.compliance}
              color={STATUS_COLORS[activePaddock.recovery.status]}
            />
            <span className={css.biomassBarNote}>
              {activePaddock.recovery.daysRested} of {activePaddock.recovery.requiredDays} recovery days
            </span>
          </div>

          <div className={css.statGrid}>
            <div className={css.statBox}>
              <span className={css.statLabel}>TIME ON SITE</span>
              <span className={css.statValue}>
                {activePaddock.recovery.daysRested} {activePaddock.recovery.daysRested === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            <div className={css.statBox}>
              <span className={css.statLabel}>SPECIES</span>
              <span className={css.statValue}>
                {activePaddock.paddock.species.length > 0
                  ? speciesIcons(activePaddock.paddock.species)
                  : 'None assigned'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trough status + quick stats */}
      <div className={css.infoRow}>
        <div className={css.troughCard}>
          <div className={css.troughHeader}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="rgba(180,165,140,0.5)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1C5 4 3 6 3 9C3 11.8 5.2 14 8 14C10.8 14 13 11.8 13 9C13 6 11 4 8 1Z" />
            </svg>
            <span className={css.troughLabel}>WATER INFRASTRUCTURE</span>
          </div>
          <span className={css.troughValue}>
            {waterStructures.length > 0
              ? `${waterStructures.length} point${waterStructures.length !== 1 ? 's' : ''}: ${waterStructures.map((s) => s.name).join(', ')}`
              : 'No water structures placed'}
          </span>
        </div>

        <div className={css.quickStats}>
          <div className={css.quickStat}>
            <DelayedTooltip label="1 AU = livestock excreting 73 kg N per year (Manitoba Schedule A)">
              <span
                className={css.quickStatLabel}
                tabIndex={0}
              >
                Animal Units
              </span>
            </DelayedTooltip>
            <span className={css.quickStatValue}>{totalAU.toFixed(1)} AU</span>
          </div>
          <div className={css.quickStat}>
            <span className={css.quickStatLabel}>Water Points</span>
            <span className={css.quickStatValue}>{waterStructures.length}</span>
          </div>
          <div className={css.quickStat}>
            <span className={css.quickStatLabel}>Avg Temp</span>
            <span className={css.quickStatValue}>{env.weatherLabel}</span>
          </div>
        </div>
      </div>

      {/* Recovery Tracking */}
      <div className={css.healthCard}>
        <h2 className={css.healthTitle}>Recovery Tracking</h2>
        {recoveries.map((r) => (
          <ProgressBar
            key={r.paddockId}
            label={`${r.paddockName} (${r.status})`}
            value={r.compliance}
            color={STATUS_COLORS[r.status]}
          />
        ))}
      </div>

      {/* §16 Cell design audit */}
      <PaddockCellDesignCard projectId={project.id} />

      {/* §16 Rotation schedule */}
      <RotationScheduleCard projectId={project.id} />

      {/* §16 Fencing layout & gate estimate */}
      <FencingLayoutCard projectId={project.id} />

      {/* §11 Animal corridor / grazing route audit */}
      <AnimalCorridorGrazingRouteCard projectId={project.id} />

      {/* §11 Browse pressure & overgrazing risk — per-paddock combined audit */}
      <BrowsePressureRiskCard projectId={project.id} />

      {/* §11 Multi-species planner — niche distribution + pattern recommendations */}
      <MultiSpeciesPlannerCard projectId={project.id} />

      {/* Site environment bar */}
      <div className={css.coordsBar}>
        <span>STREAM: <strong>{env.streamLabel}</strong></span>
        <span>SLOPE: <strong>{env.slopeLabel}</strong></span>
        <span>TEMP: <strong>{env.weatherLabel}</strong></span>
        <span className={css.coordsStatus}>
          SYSTEM STATUS: <span className={css.syncDot} /> Synchronized
        </span>
      </div>
    </div>
  );
}
