/**
 * LivestockDashboard — Inventory & Health Ledger with live store data.
 *
 * Replaces hardcoded demo data with computations from livestockAnalysis,
 * paddock store, zone store, and structure store.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  computeInventorySummary,
  computeForageQuality,
  computeRecoveryStatus,
  computePredatorRisk,
  computeShelterAccess,
  computeWaterPointDistance,
} from '../../livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../../livestock/speciesData.js';
import SimpleBarChart from '../components/SimpleBarChart.js';
import LivestockLandFitCard from '../../livestock/LivestockLandFitCard.js';
import css from './LivestockDashboard.module.css';
import { status as statusToken, group } from '../../../lib/tokens.js';

interface LivestockDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface ClimateSummary { annual_temp_mean_c?: number; growing_season_days?: number; hardiness_zone?: string; }
interface SoilsSummary { organic_matter_pct?: number | string; }
interface ElevationSummary { mean_slope_deg?: number; }
interface LandCoverSummary { tree_canopy_pct?: number; }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(updatedAt: string): string {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

const FORAGE_COLORS: Record<string, string> = {
  high: statusToken.good,
  good: 'rgba(138,154,116,0.7)',
  moderate: statusToken.moderate,
  poor: statusToken.poor,
};

const FORAGE_LABELS: Record<string, string> = {
  high: 'High Quality',
  good: 'Good',
  moderate: 'Moderate',
  poor: 'Poor',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LivestockDashboard({ project, onSwitchToMap }: LivestockDashboardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const siteData = useSiteData(project.id);

  /* Filter to this project */
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  /* Site data layers */
  const siteParams = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const cover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;

    const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
    const om = isFinite(omRaw) ? omRaw : 3.5;
    const growSeason = climate?.growing_season_days ?? 165;
    const zone = climate?.hardiness_zone ?? null;
    const slopeDeg = elev?.mean_slope_deg ?? 5;
    const canopyPct = cover?.tree_canopy_pct ?? 15;

    return { om, growSeason, zone, slopeDeg, canopyPct };
  }, [siteData]);

  /* Overall forage quality from site data */
  const overallForage = useMemo(
    () => computeForageQuality(siteParams.om, siteParams.canopyPct, siteParams.slopeDeg, siteParams.growSeason),
    [siteParams],
  );

  const seasonNote = useMemo(() => {
    return siteParams.zone
      ? `${siteParams.growSeason}-day growing season \u00b7 Hardiness zone ${siteParams.zone}`
      : `${siteParams.growSeason}-day growing season`;
  }, [siteParams]);

  /* Inventory summary (herd cards) */
  const inventory = useMemo(
    () => computeInventorySummary(paddocks),
    [paddocks],
  );

  /* Per-paddock forage quality for chart */
  const forageByPaddock = useMemo(() => {
    return paddocks.map((p) => {
      const forage = computeForageQuality(siteParams.om, siteParams.canopyPct, siteParams.slopeDeg, siteParams.growSeason);
      return {
        label: truncate(p.name, 8),
        value: forage.biomassEstimate,
        color: FORAGE_COLORS[forage.quality] ?? statusToken.moderate,
      };
    });
  }, [paddocks, siteParams]);

  /* Recent activity from paddock updatedAt */
  const recentActivity = useMemo(() => {
    return [...paddocks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((p) => {
        const speciesIcon = p.species.length > 0
          ? (LIVESTOCK_SPECIES[p.species[0]!]?.icon ?? '\u{1F4CD}')
          : '\u{1F4CD}';
        const speciesLabel = p.species.length > 0
          ? (LIVESTOCK_SPECIES[p.species[0]!]?.label ?? 'Paddock')
          : 'Paddock';
        return {
          icon: p.species.length > 0 ? p.species[0]! : 'paddock',
          title: `${p.name} updated`,
          detail: `${relativeTime(p.updatedAt)} \u00b7 ${speciesLabel}`,
          color: statusToken.good,
          speciesIcon,
        };
      });
  }, [paddocks]);

  /* Animal welfare summary */
  const welfare = useMemo(() => {
    if (paddocks.length === 0) return null;

    const waterStructures = structures.filter(
      (s) => s.type === 'water_pump_house' || s.type === 'well' || s.type === 'water_tank',
    );

    let shelterCount = 0;
    let waterCount = 0;
    let highRisk = 0;
    let moderateRisk = 0;

    for (const p of paddocks) {
      const shelter = computeShelterAccess(p, structures);
      if (shelter.hasShelter) shelterCount++;

      const water = computeWaterPointDistance(p, waterStructures);
      if (water.meetsRequirement) waterCount++;

      const predator = computePredatorRisk(p, zones, siteParams.canopyPct);
      if (predator.risk === 'high') highRisk++;
      else if (predator.risk === 'moderate') moderateRisk++;
    }

    return {
      total: paddocks.length,
      shelterCount,
      waterCount,
      highRisk,
      moderateRisk,
    };
  }, [paddocks, structures, zones, siteParams.canopyPct]);

  /* -------------------------------------------------------------- */
  /*  Empty state                                                     */
  /* -------------------------------------------------------------- */

  if (paddocks.length === 0) {
    return (
      <div className={css.page}>
        <h1 className={css.title}>
          Livestock Inventory <span className={css.titleAmp}>&amp;</span> Health Ledger
        </h1>
        <p className={css.desc}>
          Centralized records for regenerative management. Track animal density, health
          interventions, and performance across the OGDEN landscape.
        </p>

        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: 18, color: 'rgba(180,165,140,0.7)', marginBottom: 8, fontWeight: 600 }}>
            No livestock data yet
          </p>
          <p style={{ fontSize: 14, color: 'rgba(180,165,140,0.45)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Draw paddocks and assign species in the map view to build your inventory
          </p>
          <button
            onClick={onSwitchToMap}
            style={{
              background: 'transparent',
              border: `1px solid ${group.livestock}66`,
              color: group.livestock,
              padding: '10px 24px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            OPEN MAP VIEW &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Main render                                                     */
  /* -------------------------------------------------------------- */

  return (
    <div className={css.page}>
      {/* Hero */}
      <h1 className={css.title}>
        Livestock Inventory <span className={css.titleAmp}>&amp;</span> Health Ledger
      </h1>
      <p className={css.desc}>
        Centralized records for regenerative management. Track animal density, health
        interventions, and performance across the OGDEN landscape.
      </p>

      {/* Active Herds & Flocks */}
      <div className={css.sectionHeader}>
        <h2 className={css.sectionTitle}>Active Herds &amp; Flocks</h2>
        <div className={css.sectionControls}>
          <span className={css.filterLabel}>FILTER: ALL SPECIES</span>
          <span className={css.sortLabel}>SORT: HEALTH STATUS</span>
        </div>
      </div>

      <div className={css.herdRow}>
        {inventory.map((entry) => {
          const statusLabel = entry.avgCompliance >= 80 ? 'OPTIMAL'
            : entry.avgCompliance >= 50 ? 'MONITOR'
            : 'ALERT';
          const statusColor = entry.avgCompliance >= 80 ? statusToken.good
            : entry.avgCompliance >= 50 ? statusToken.moderate
            : statusToken.poor;

          return (
            <div key={entry.species} className={css.herdCard}>
              <div className={css.herdCardHeader}>
                <span className={css.herdCardLabel}>ACTIVE STOCK</span>
                <span
                  className={css.herdStatusBadge}
                  style={{
                    backgroundColor: statusColor + '22',
                    color: statusColor,
                    borderColor: statusColor + '44',
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              <h3 className={css.herdName}>{entry.info.icon} {entry.info.label}</h3>
              <span className={css.herdBreed}>
                {entry.paddockCount} PADDOCK{entry.paddockCount !== 1 ? 'S' : ''} &middot; {entry.info.fencingNote.split(' ')[0]!.toUpperCase()}
              </span>

              <div className={css.herdStats}>
                <div>
                  <span className={css.herdStatLabel}>TOTAL HEAD</span>
                  <span className={css.herdStatValue}>{entry.totalHead}</span>
                </div>
                <div>
                  <span className={css.herdStatLabel}>PADDOCKS</span>
                  <span className={css.herdStatValue}>{entry.paddockCount}</span>
                </div>
              </div>

              <div className={css.herdFooter}>
                <span>Recovery Compliance</span>
                <strong>{entry.avgCompliance}%</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Ledger */}
      <div className={css.ledgerSection}>
        <div className={css.ledgerHeader}>
          <div>
            <span className={css.ledgerTag}>DETAILED LEDGER</span>
            <h2 className={css.ledgerTitle}>Forage Quality &amp; Activity</h2>
          </div>
          <button className={css.logActivityBtn}>LOG NEW ACTIVITY</button>
        </div>

        <div className={css.ledgerGrid}>
          {/* Forage Quality by Paddock */}
          <div className={css.ledgerCard}>
            <h3 className={css.ledgerCardTitle}>Forage Quality by Paddock</h3>
            <SimpleBarChart
              data={forageByPaddock}
              height={180}
            />
            <p className={css.trendNote}>
              Overall forage quality: <strong>{FORAGE_LABELS[overallForage.quality] ?? 'Moderate'}</strong>.
              Biomass estimate: {overallForage.biomassEstimate}/100.
            </p>
            <p className={css.trendNote} style={{ marginTop: 4 }}>{seasonNote}</p>
          </div>

          {/* Recent Activity */}
          <div className={css.ledgerCard}>
            <h3 className={css.ledgerCardTitle}>Recent Activity</h3>
            <div className={css.logsList}>
              {recentActivity.length === 0 && (
                <p style={{ color: 'rgba(180,165,140,0.45)', fontSize: 13 }}>
                  No recent paddock activity
                </p>
              )}
              {recentActivity.map((log, i) => (
                <div key={i} className={css.logItem}>
                  <div className={css.logIcon} style={{ borderColor: log.color + '55' }}>
                    <LogIcon type={log.icon} color={log.color} />
                  </div>
                  <div className={css.logContent}>
                    <span className={css.logTitle}>{log.title}</span>
                    <span className={css.logDetail}>{log.detail}</span>
                  </div>
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="5 2 10 7 5 12" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* §11 Livestock-land fit matrix (per-zone × per-species) */}
      <LivestockLandFitCard projectId={project.id} />

      {/* Animal Welfare Summary */}
      {welfare && (
        <div className={css.ledgerSection}>
          <div className={css.ledgerHeader}>
            <div>
              <span className={css.ledgerTag}>WELFARE</span>
              <h2 className={css.ledgerTitle}>Animal Welfare Summary</h2>
            </div>
          </div>

          <div className={css.ledgerCard} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(180,165,140,0.7)', fontSize: 13 }}>Shelter access (&le; 300m)</span>
                <strong style={{ color: welfare.shelterCount === welfare.total ? statusToken.good : statusToken.moderate, fontSize: 14 }}>
                  {welfare.shelterCount} of {welfare.total} paddocks
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(180,165,140,0.7)', fontSize: 13 }}>Water access</span>
                <strong style={{ color: welfare.waterCount === welfare.total ? statusToken.good : statusToken.moderate, fontSize: 14 }}>
                  {welfare.waterCount} of {welfare.total} paddocks
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(180,165,140,0.7)', fontSize: 13 }}>Predator risk</span>
                <strong style={{ color: welfare.highRisk > 0 ? statusToken.poor : welfare.moderateRisk > 0 ? statusToken.moderate : statusToken.good, fontSize: 14 }}>
                  {welfare.highRisk + welfare.moderateRisk > 0
                    ? `${welfare.highRisk} high, ${welfare.moderateRisk} moderate`
                    : 'All low risk'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LogIcon helper                                                     */
/* ------------------------------------------------------------------ */

function LogIcon({ type, color }: { type: string; color: string }) {
  const p = {
    width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none',
    stroke: color, strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (type) {
    case 'vaccine':
      return <svg {...p}><path d="M7 1V13" /><path d="M4 4H10" /><circle cx="7" cy="7" r="2" /></svg>;
    case 'supplement':
      return <svg {...p}><path d="M7 1C7 1 3 6 3 9C3 11.2 4.8 13 7 13C9.2 13 11 11.2 11 9C11 6 7 1 7 1Z" /></svg>;
    case 'rotation':
      return <svg {...p}><circle cx="7" cy="7" r="5" /><path d="M7 2C9.8 2 12 4.2 12 7" /><polyline points="10 5 12 7 14 5" /></svg>;
    case 'paddock':
      return <svg {...p}><rect x="2" y="2" width="10" height="10" rx="2" /><path d="M2 7H12" /></svg>;
    default:
      return <svg {...p}><circle cx="7" cy="7" r="3" /></svg>;
  }
}
