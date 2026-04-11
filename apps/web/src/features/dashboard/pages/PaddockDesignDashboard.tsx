/**
 * PaddockDesignDashboard — Paddock layout overview with grid, summary stats,
 * rotation schedule, and safety/species conflict alerts.
 *
 * All data sourced from live stores (livestockStore, structureStore, pathStore,
 * siteDataStore) and computed via shared livestockAnalysis helpers.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  computeRecoveryStatus,
  computeRotationSchedule,
  computePaddockPerimeter,
  computeWaterPointDistance,
  computeGuestSafetyConflicts,
  computeSpeciesConflicts,
  type RecoveryStatus,
  type RotationEntry,
  type WaterAccess,
  type SafetyConflict,
  type SpeciesConflict,
} from '../../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../../livestock/speciesData.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './PaddockDesignDashboard.module.css';

/* ------------------------------------------------------------------ */
/*  Props & local types                                                */
/* ------------------------------------------------------------------ */

interface PaddockDesignDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary { growing_season_days?: number; }
interface SoilsSummary {
  drainage_class?: string;
  predominant_texture?: string;
  organic_matter_pct?: number | string;
}
interface ElevationSummary { mean_slope_deg?: number; }
interface LandCoverSummary { tree_canopy_pct?: number; }

/* ------------------------------------------------------------------ */
/*  Status color mapping                                               */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<RecoveryStatus['status'], string> = {
  active: '#c4a265',
  resting: '#7a8a9a',
  ready: '#8a9a74',
  overdue: '#9a6a5a',
};

const ACTION_LABELS: Record<RotationEntry['suggestedAction'], string> = {
  move_in: 'Move In',
  continue: 'Continue',
  rest: 'Rest',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PaddockDesignDashboard({ project, onSwitchToMap }: PaddockDesignDashboardProps) {
  /* --- store subscriptions --- */
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useStructureStore((s) => s.structures);
  const allPaths = usePathStore((s) => s.paths);
  const siteData = useSiteData(project.id);

  /* --- project-scoped filtering --- */
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );

  const waterStructures = useMemo(
    () => allStructures.filter(
      (s) => s.projectId === project.id &&
        ['water_pump_house', 'water_tank', 'well'].includes(s.type),
    ),
    [allStructures, project.id],
  );

  const guestPaths = useMemo(
    () => allPaths.filter(
      (p) => p.projectId === project.id &&
        ['pedestrian_path', 'trail', 'quiet_route', 'arrival_sequence'].includes(p.type),
    ),
    [allPaths, project.id],
  );

  /* --- site context --- */
  const siteContext = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const drain = soils?.drainage_class ?? null;
    const texture = soils?.predominant_texture ?? null;
    const soilNote = drain && texture
      ? `${texture}, ${drain.toLowerCase()}`
      : drain ?? texture ?? null;

    return { soilNote };
  }, [siteData]);

  /* --- recovery statuses --- */
  const recoveries = useMemo<RecoveryStatus[]>(
    () => paddocks.map(computeRecoveryStatus),
    [paddocks],
  );

  /* --- summary stats --- */
  const totalHectares = useMemo(
    () => paddocks.reduce((sum, p) => sum + p.areaM2, 0) / 10_000,
    [paddocks],
  );

  const avgRestDays = useMemo(() => {
    if (recoveries.length === 0) return 0;
    const total = recoveries.reduce((sum, r) => sum + r.daysRested, 0);
    return Math.round(total / recoveries.length);
  }, [recoveries]);

  const activePaddock = useMemo(() => {
    const active = recoveries.find((r) => r.status === 'active');
    return active?.paddockName ?? 'None';
  }, [recoveries]);

  /* --- per-paddock computed data --- */
  const paddockDetails = useMemo(() => {
    return paddocks.map((p) => {
      const recovery = recoveries.find((r) => r.paddockId === p.id)!;
      const perimeter = computePaddockPerimeter(p.geometry);
      const water = computeWaterPointDistance(p, waterStructures);
      const speciesIcons = p.species.length > 0
        ? p.species.map((sp) => LIVESTOCK_SPECIES[sp]?.icon ?? '?').join(' ')
        : null;
      return { paddock: p, recovery, perimeter, water, speciesIcons };
    });
  }, [paddocks, recoveries, waterStructures]);

  /* --- rotation schedule --- */
  const schedule = useMemo<RotationEntry[]>(
    () => computeRotationSchedule(paddocks),
    [paddocks],
  );

  /* --- alerts --- */
  const safetyConflicts = useMemo<SafetyConflict[]>(
    () => computeGuestSafetyConflicts(paddocks, guestPaths),
    [paddocks, guestPaths],
  );

  const speciesConflicts = useMemo<SpeciesConflict[]>(
    () => computeSpeciesConflicts(paddocks),
    [paddocks],
  );

  const hasAlerts = safetyConflicts.length > 0 || speciesConflicts.length > 0;

  /* ================================================================ */
  /*  Empty state                                                      */
  /* ================================================================ */

  if (paddocks.length === 0) {
    return (
      <div className={css.page}>
        <h1 className={css.title}>Paddock Design &amp; Layout</h1>
        <p className={css.desc}>
          No paddocks drawn yet
        </p>
        <p className={css.desc}>
          Draw paddocks in the map view to design your grazing layout.
        </p>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          OPEN MAP VIEW
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  Populated state                                                  */
  /* ================================================================ */

  return (
    <div className={css.page}>
      <h1 className={css.title}>Paddock Design &amp; Layout</h1>
      <p className={css.desc}>
        Manage paddock boundaries, track rest periods, and plan rotational grazing
        sequences across the property.
      </p>

      {/* ---- Summary stats ---- */}
      <div className={css.summaryRow}>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>TOTAL PADDOCKS</span>
          <span className={css.summaryValue}>{paddocks.length}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>TOTAL HECTARES</span>
          <span className={css.summaryValue}>{totalHectares.toFixed(1)}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>AVG REST DAYS</span>
          <span className={css.summaryValue}>{avgRestDays}</span>
        </div>
        <div className={css.summaryCard}>
          <span className={css.summaryLabel}>ACTIVE PADDOCK</span>
          <span className={css.summaryValue}>{activePaddock}</span>
        </div>
      </div>

      {siteContext.soilNote && (
        <p className={css.soilNote}>
          <span className={css.soilNoteLabel}>SITE SOILS:</span> {siteContext.soilNote}
        </p>
      )}

      {/* ---- Paddock grid ---- */}
      <div className={css.paddockGrid}>
        {paddockDetails.map(({ paddock, recovery, perimeter, water, speciesIcons }) => {
          const statusColor = STATUS_COLORS[recovery.status];
          const hectares = (paddock.areaM2 / 10_000).toFixed(1);

          return (
            <div key={paddock.id} className={css.paddockCard}>
              <div className={css.paddockCardHeader}>
                <div>
                  <h3 className={css.paddockName}>{paddock.name}</h3>
                  <span className={css.paddockSub}>
                    {speciesIcons ?? 'No species'}
                  </span>
                </div>
                <span
                  className={css.paddockStatus}
                  style={{
                    color: statusColor,
                    borderColor: statusColor + '44',
                    backgroundColor: statusColor + '15',
                  }}
                >
                  {recovery.status.charAt(0).toUpperCase() + recovery.status.slice(1)}
                </span>
              </div>

              <div className={css.paddockMeta}>
                <div>
                  <span className={css.metaLabel}>Area</span>
                  <span className={css.metaValue}>{hectares} ha</span>
                </div>
                <div>
                  <span className={css.metaLabel}>Rest Days</span>
                  <span className={css.metaValue}>{recovery.daysRested}</span>
                </div>
              </div>

              <div className={css.paddockMeta}>
                <div>
                  <span className={css.metaLabel}>Fencing</span>
                  <span className={css.metaValue}>
                    {paddock.fencing.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className={css.metaLabel}>Perimeter</span>
                  <span className={css.metaValue}>{perimeter} m</span>
                </div>
              </div>

              {/* Water access indicator */}
              {water.nearestDistanceM >= 0 && (
                <span
                  className={css.forageType}
                  style={{
                    color: water.meetsRequirement ? '#8a9a74' : '#9a6a5a',
                  }}
                >
                  {water.meetsRequirement ? '\u2713' : '\u26A0'}{' '}
                  Water: {water.nearestDistanceM}m
                  {water.nearestStructureName ? ` (${water.nearestStructureName})` : ''}
                </span>
              )}

              <div className={css.biomassRow}>
                <span className={css.biomassLabel}>Recovery</span>
                <ProgressBar label="" value={recovery.compliance} color={statusColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Rotation schedule ---- */}
      {schedule.length > 0 && (
        <div className={css.scheduleSection}>
          <h3 className={css.scheduleTitle}>Rotation Schedule</h3>
          <div className={css.scheduleTable}>
            <div className={css.scheduleHeaderRow}>
              <span>Paddock</span>
              <span>Action</span>
              <span>Group</span>
              <span>Recovery</span>
            </div>
            {schedule.map((entry) => (
              <div key={entry.paddockId} className={css.scheduleRow}>
                <span className={css.scheduleCell}>{entry.paddockName}</span>
                <span className={css.scheduleCell}>
                  {ACTION_LABELS[entry.suggestedAction]}
                </span>
                <span className={css.scheduleCell}>{entry.group}</span>
                <span className={css.scheduleCellMuted}>
                  {entry.recovery.daysRested} / {entry.recovery.requiredDays} days rested
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Alerts (safety + species conflicts) ---- */}
      {hasAlerts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {safetyConflicts.map((c) => (
            <div
              key={`safety-${c.paddockId}-${c.pathId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '3px solid #c4a265',
                background: 'rgba(196,162,101,0.06)',
                fontSize: 13,
                color: '#bbb',
              }}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#c4a265" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 1L15 14H1L8 1Z" />
                <line x1="8" y1="6" x2="8" y2="9" />
                <circle cx="8" cy="11.5" r="0.5" fill="#c4a265" />
              </svg>
              <span>
                Guest path &quot;{c.pathName}&quot; within {c.distanceM}m of paddock &quot;{c.paddockName}&quot;
              </span>
            </div>
          ))}

          {speciesConflicts.map((c, i) => (
            <div
              key={`species-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: '3px solid #9a6a5a',
                background: 'rgba(154,106,90,0.06)',
                fontSize: 13,
                color: '#bbb',
              }}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#9a6a5a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6.5" />
                <line x1="8" y1="5" x2="8" y2="8.5" />
                <circle cx="8" cy="11" r="0.5" fill="#9a6a5a" />
              </svg>
              <span>
                Incompatible species near paddocks &quot;{c.paddockA}&quot; and &quot;{c.paddockB}&quot;
                {' '}({c.distanceM}m apart)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---- Map button ---- */}
      <button className={css.mapBtn} onClick={onSwitchToMap}>
        VIEW ON MAP
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
