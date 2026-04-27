/**
 * EnergyDashboard — P1-accessible entry point for the Energy / Off-Grid domain.
 *
 * Makes §13 (Utilities, Energy & Support Systems) discoverable from the left
 * sidebar without requiring the user to drill into Map View → Design Tools →
 * Utilities tab. Reuses the same utilityStore data + computeOffGridReadiness
 * logic that UtilityPanel uses, so both views stay in sync.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useUtilityStore, UTILITY_TYPE_CONFIG, type UtilityType } from '../../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import {
  computeOffGridReadiness,
  checkDependencyViolations,
} from '../../utilities/utilityAnalysis.js';
import { confidence, error as errorToken, semantic, status as statusToken } from '../../../lib/tokens.js';
import SupportInfrastructureCard from '../../structures/SupportInfrastructureCard.js';
import EnergyDemandRollup from '../../utilities/EnergyDemandRollup.js';
import SolarPlacement from '../../utilities/SolarPlacement.js';
import WaterSystemPlanning from '../../utilities/WaterSystemPlanning.js';
import css from './EnergyDashboard.module.css';

interface EnergyDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
  focus?: 'energy' | 'infrastructure';
}

const ENERGY_TYPES: UtilityType[] = ['solar_panel', 'battery_room', 'generator'];

export default function EnergyDashboard({ project, onSwitchToMap, focus = 'energy' }: EnergyDashboardProps) {
  const isEnergy = focus === 'energy';
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const energyUtilities = useMemo(
    () => utilities.filter((u) => ENERGY_TYPES.includes(u.type)),
    [utilities],
  );
  const infraUtilities = useMemo(
    () => utilities.filter((u) => !ENERGY_TYPES.includes(u.type)),
    [utilities],
  );
  const listed = isEnergy ? energyUtilities : infraUtilities;

  const siteData = useSiteData(project.id);
  const sunTrapPct = useMemo(() => {
    if (!siteData) return null;
    const micro = getLayerSummary<{ sunTraps?: { areaPct?: number } }>(siteData, 'microclimate');
    return micro?.sunTraps?.areaPct ?? null;
  }, [siteData]);
  const detentionPct = useMemo(() => {
    if (!siteData) return null;
    const watershed = getLayerSummary<{ detention_pct?: number }>(siteData, 'watershed_derived');
    return watershed?.detention_pct ?? null;
  }, [siteData]);
  const swaleCount = useMemo(() => {
    if (!siteData) return null;
    const soilRegen = getLayerSummary<{ interventions?: { count?: number } }>(siteData, 'soil_regeneration');
    return soilRegen?.interventions?.count ?? null;
  }, [siteData]);

  const readiness = useMemo(
    () => computeOffGridReadiness(utilities, sunTrapPct, detentionPct),
    [utilities, sunTrapPct, detentionPct],
  );

  const violations = useMemo(() => checkDependencyViolations(utilities), [utilities]);

  const scoreColor =
    readiness.score >= 60 ? confidence.high :
    readiness.score >= 40 ? semantic.sidebarActive :
    errorToken.DEFAULT;

  return (
    <div className={css.page}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>SECTION 13 · UTILITIES, ENERGY & SUPPORT SYSTEMS</span>
          <h1 className={css.title}>{isEnergy ? 'Energy & Off-Grid' : 'Utilities & Infrastructure'}</h1>
          <p className={css.desc}>
            {isEnergy
              ? 'Composite readiness across solar potential, water catchment, and placed energy systems. Place solar arrays, battery rooms, and generators from the Map view to raise this score.'
              : 'Water, sanitation, lighting, and support-system utilities placed across the property. Place from the Map view.'}
          </p>
        </div>
        <button className={css.placeBtn} onClick={onSwitchToMap}>
          {isEnergy ? 'Place Energy Systems' : 'Place Utilities'}
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>

      {/* ── Score hero ──────────────────────────────────────────────── */}
      {isEnergy && (
      <div className={css.scoreHero}>
        <div className={css.scoreCircle} style={{ borderColor: scoreColor, color: scoreColor }}>
          {readiness.score}
        </div>
        <div className={css.scoreBody}>
          <span className={css.scoreRating} style={{ color: scoreColor }}>
            {readiness.rating}
          </span>
          <span className={css.scoreCaption}>Off-Grid Readiness · composite score out of 100</span>
        </div>
      </div>
      )}

      {/* ── Breakdown bars ──────────────────────────────────────────── */}
      {isEnergy && (
      <div className={css.breakdown}>
        {readiness.breakdown.map((b) => {
          const pct = Math.round((b.value / b.max) * 100);
          return (
            <div key={b.label} className={css.breakdownRow}>
              <div className={css.breakdownHead}>
                <span className={css.breakdownLabel}>{b.label}</span>
                <span className={css.breakdownScore}>{b.value}/{b.max}</span>
              </div>
              <div className={css.breakdownTrack}>
                <div className={css.breakdownFill} style={{ width: `${pct}%`, background: scoreColor }} />
              </div>
              <span className={css.breakdownDetail}>{b.detail}</span>
            </div>
          );
        })}
      </div>
      )}

      {/* ── Energy & Water read-outs (parity with map rail's Utilities tab) ── */}
      <div className={css.readouts}>
        <EnergyDemandRollup utilities={utilities} />
        {isEnergy && <SolarPlacement utilities={utilities} sunTrapAreaPct={sunTrapPct} />}
        <div id="water-systems" style={{ scrollMarginTop: 16 }}>
          <WaterSystemPlanning utilities={utilities} detentionAreaPct={detentionPct} swaleCount={swaleCount} />
        </div>
      </div>

      {/* ── Placed utilities ────────────────────────────────────────── */}
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>
            {isEnergy ? `Placed Energy Systems (${listed.length})` : `Placed Utilities (${listed.length})`}
          </h2>
          <span className={css.cardHint}>
            {isEnergy
              ? 'Solar, battery, and generator locations from the map.'
              : 'Water, sanitation, lighting, and support systems from the map.'}
          </span>
        </div>
        {listed.length === 0 ? (
          <div className={css.empty}>
            <p>{isEnergy ? 'No energy systems placed yet.' : 'No utilities placed yet.'}</p>
            <button className={css.emptyBtn} onClick={onSwitchToMap}>
              {isEnergy
                ? 'Open the map to place solar or battery systems'
                : 'Open the map to place utilities'}
            </button>
          </div>
        ) : (
          <ul className={css.utilList}>
            {listed.map((u) => {
              const cfg = UTILITY_TYPE_CONFIG[u.type];
              return (
                <li key={u.id} className={css.utilItem}>
                  <span className={css.utilIcon}>{cfg.icon}</span>
                  <div className={css.utilBody}>
                    <span className={css.utilName}>{u.name}</span>
                    <span className={css.utilMeta}>{cfg.label} · {u.phase}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── §9 Support infrastructure rollup (infrastructure focus only) ── */}
      {!isEnergy && <SupportInfrastructureCard projectId={project.id} />}

      {/* ── Dependency violations ───────────────────────────────────── */}
      {violations.length > 0 && (
        <div className={css.card}>
          <div className={css.cardHead}>
            <h2 className={css.cardTitle}>Dependency Warnings ({violations.length})</h2>
            <span className={css.cardHint}>Systems missing required upstream utilities.</span>
          </div>
          <ul className={css.utilList}>
            {violations.map((v, i) => (
              <li key={i} className={css.warnItem}>
                <span className={css.warnDot} style={{ background: statusToken.moderate }} />
                <div className={css.utilBody}>
                  <span className={css.utilName}>{v.utility.name}</span>
                  <span className={css.utilMeta}>{v.reason}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Data provenance footnote ────────────────────────────────── */}
      {isEnergy && (
      <div className={css.footnote}>
        Solar opportunity draws from microclimate sun-trap analysis
        {sunTrapPct == null ? ' (pending — no climate layer yet)' : ` (${sunTrapPct.toFixed(0)}% coverage)`}.
        Water catchment uses watershed detention
        {detentionPct == null ? ' (pending)' : ` (${detentionPct.toFixed(0)}%)`}.
      </div>
      )}
    </div>
  );
}
