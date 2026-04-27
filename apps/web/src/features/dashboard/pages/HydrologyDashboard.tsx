/**
 * HydrologyDashboard — Hydrology Planning Suite with tabbed sub-navigation.
 * Tabs: Overview (diagnostic) · Flow Analysis (infrastructure ledger) · Water Metrics
 */

import { useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { useStructureStore, type Structure } from '../../../store/structureStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../../store/utilityStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import { computeHydrologyMetrics, fmtGal, parseHydrologicGroup, HYDRO_DEFAULTS, type HydroMetrics } from '../../../lib/hydrologyMetrics.js';
import css from './HydrologyDashboard.module.css';
import { status as statusToken, group } from '../../../lib/tokens.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';

interface HydrologyDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type SubTab = 'overview' | 'flow' | 'metrics' | 'budget' | 'catchment';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview',  label: 'Overview'       },
  { id: 'flow',      label: 'Flow Analysis'  },
  { id: 'metrics',   label: 'Water Metrics'  },
  { id: 'budget',    label: 'Water Budget'   },
  { id: 'catchment', label: 'Roof Catchment' },
];

// ─── Layer summary types ──────────────────────────────────────────────────────
interface ClimateSummary   { annual_precip_mm?: number; annual_temp_mean_c?: number; solar_radiation_kwh_m2_day?: number; wind_speed_ms?: number; relative_humidity_pct?: number; }
interface WatershedSummary { catchment_area_ha?: number | string; }
interface WetlandsFlood    { flood_zone?: string; wetland_pct?: number | string; }
interface ElevationSummary { mean_slope_deg?: number; min_elevation_m?: number; max_elevation_m?: number; }
interface SoilsSummary     { hydrologic_group?: string; drainage_class?: string; }

// ─── Health badge colour ──────────────────────────────────────────────────────
function healthColor(score: number) {
  if (score >= 75) return statusToken.good;
  if (score >= 50) return statusToken.moderate;
  return statusToken.poor;
}

export default function HydrologyDashboard({ project, onSwitchToMap }: HydrologyDashboardProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const siteData = useSiteData(project.id);

  const metrics = useMemo(() => {
    const climate   = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate')         : null;
    const watershed = siteData ? getLayerSummary<WatershedSummary>(siteData, 'watershed')     : null;
    const wetFlood  = siteData ? getLayerSummary<WetlandsFlood>(siteData, 'wetlands_flood')   : null;
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation')     : null;
    const soils     = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils')             : null;
    let latitudeDeg: number | undefined;
    if (project.parcelBoundaryGeojson) {
      try { latitudeDeg = turf.centroid(project.parcelBoundaryGeojson).geometry.coordinates[1]; }
      catch { /* invalid boundary */ }
    }
    const elevationM = elevation?.min_elevation_m != null && elevation.max_elevation_m != null
      ? (elevation.min_elevation_m + elevation.max_elevation_m) / 2
      : undefined;
    return computeHydrologyMetrics({
      precipMm:        climate?.annual_precip_mm      ?? HYDRO_DEFAULTS.precipMm,
      catchmentHa:     (() => { const v = parseFloat(String(watershed?.catchment_area_ha ?? '')); return isFinite(v) ? v : null; })(),
      propertyAcres:   project.acreage                ?? HYDRO_DEFAULTS.propertyAcres,
      slopeDeg:        elevation?.mean_slope_deg      ?? HYDRO_DEFAULTS.slopeDeg,
      hydrologicGroup: parseHydrologicGroup(soils?.hydrologic_group),
      drainageClass:   soils?.drainage_class          ?? HYDRO_DEFAULTS.drainageClass,
      floodZone:       wetFlood?.flood_zone           ?? HYDRO_DEFAULTS.floodZone,
      wetlandPct:      Number(wetFlood?.wetland_pct   ?? HYDRO_DEFAULTS.wetlandPct),
      annualTempC:     climate?.annual_temp_mean_c    ?? HYDRO_DEFAULTS.annualTempC,
      solarRadKwhM2Day: climate?.solar_radiation_kwh_m2_day,
      windMs:           climate?.wind_speed_ms,
      rhPct:            climate?.relative_humidity_pct,
      latitudeDeg,
      elevationM,
    });
  }, [siteData, project.acreage, project.parcelBoundaryGeojson]);

  const climateSummary = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
  const precipMm    = climateSummary?.annual_precip_mm ?? HYDRO_DEFAULTS.precipMm;
  const catchmentHa = (() => { const v = parseFloat(String(siteData ? (getLayerSummary<WatershedSummary>(siteData, 'watershed')?.catchment_area_ha ?? '') : '')); return isFinite(v) ? v : null; })();
  const latitudeDeg = useMemo(() => {
    if (!project.parcelBoundaryGeojson) return null;
    try { return turf.centroid(project.parcelBoundaryGeojson).geometry.coordinates[1] ?? null; }
    catch { return null; }
  }, [project.parcelBoundaryGeojson]);

  return (
    <div className={css.page}>
      {/* ── Suite header ──────────────────────────────────────────────────── */}
      <div className={css.suiteHeader}>
        <div className={css.suiteTitle}>Hydrology Planning Suite</div>
        <nav aria-label="Hydrology sub-dashboards" className={css.suiteNav}>
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? css.suiteTabActive : css.suiteTab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className={css.suiteActions}>
          <DelayedTooltip label="Share">
            <button className={css.suiteIconBtn} aria-label="Share">
              <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="3" r="1.5"/><circle cx="4" cy="7.5" r="1.5"/><circle cx="11" cy="12" r="1.5"/>
                <line x1="9.6" y1="3.9" x2="5.4" y2="6.6"/><line x1="5.4" y1="8.4" x2="9.6" y2="11.1"/>
              </svg>
            </button>
          </DelayedTooltip>
          <DelayedTooltip label="Download">
            <button className={css.suiteIconBtn} aria-label="Download">
              <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 11.5h10M7.5 2.5v7M4.5 7l3 3 3-3"/>
              </svg>
            </button>
          </DelayedTooltip>
          <DelayedTooltip label="Settings">
            <button className={css.suiteIconBtn} aria-label="Settings">
              <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="7.5" r="2"/>
                <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M2.9 2.9l1.4 1.4M10.7 10.7l1.4 1.4M2.9 12.1l1.4-1.4M10.7 4.3l1.4-1.4"/>
              </svg>
            </button>
          </DelayedTooltip>
        </div>
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && <OverviewTab metrics={metrics} precipMm={precipMm} onSwitchToMap={onSwitchToMap} />}

      {/* ── Flow Analysis tab ─────────────────────────────────────────────── */}
      {activeTab === 'flow' && <FlowAnalysisTab />}

      {/* ── Water Metrics tab ─────────────────────────────────────────────── */}
      {activeTab === 'metrics' && <WaterMetricsTab metrics={metrics} precipMm={precipMm} catchmentHa={catchmentHa} />}

      {/* ── Water Budget tab ──────────────────────────────────────────────── */}
      {activeTab === 'budget' && (
        <WaterBudgetTab
          metrics={metrics}
          climate={climateSummary}
          latitudeDeg={latitudeDeg}
        />
      )}

      {/* ── Roof Catchment tab ────────────────────────────────────────────── */}
      {activeTab === 'catchment' && (
        <RoofCatchmentTab projectId={project.id} precipMm={precipMm} />
      )}
    </div>
  );
}

// ─── Overview (Diagnostic) ────────────────────────────────────────────────────

function OverviewTab({ metrics, precipMm, onSwitchToMap }: {
  metrics: HydroMetrics;
  precipMm: number;
  onSwitchToMap: () => void;
}) {
  const resilienceDesc =
    metrics.resilienceScore >= 75
      ? 'A robust ecological buffer exists. Stewardship focus recommended for low-lying areas during high-evaporation cycles.'
      : metrics.resilienceScore >= 50
      ? 'Moderate water resilience detected. Prioritize swale construction and wetland buffer expansion to improve retention.'
      : 'Critical hydrological vulnerability identified. Immediate intervention recommended — consult soil and flood zone data.';

  return (
    <>
      {/* Hero */}
      <div className={css.hero}>
        <span className={css.heroTag}>DIAGNOSTIC OVERVIEW</span>
        <h1 className={css.title}>
          Water Resilience Score: <span className={css.score}>{metrics.resilienceScore}/100</span>
        </h1>
        <p className={css.desc}>{resilienceDesc}</p>
        <div className={css.heroActions}>
          <button className={css.heroBtn}>View Sector 3</button>
          <button className={css.heroBtn}>Annual Hydrology Report</button>
        </div>
      </div>

      {/* Top metrics row */}
      <div className={css.metricsRow}>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>TOTAL STORAGE CAPACITY</span>
          <span className={css.metricValue}>{fmtGal(metrics.totalStorageGal)}</span>
          <span className={css.metricUnit}>GALLONS</span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>ANNUAL CATCHMENT POTENTIAL</span>
          <span className={css.metricValue}>{fmtGal(metrics.catchmentPotentialGal)}</span>
          <span className={css.metricUnit}>GALLONS/YEAR</span>
          <span className={css.metricNote}>BASED ON {Math.round(precipMm)}&#8239;MM MEAN ANNUAL PRECIPITATION</span>
        </div>
      </div>

      {/* Aquifer + drought row */}
      <div className={css.bufferRow}>
        {/* Aquifer card */}
        <div className={css.aquiferCard}>
          <h2 className={css.aquiferTitle}>Aquifer Hydration</h2>
          <p className={css.aquiferDesc}>
            Current soil moisture levels are performing at 112% of the decadal average.
            Primary storage ponds are at 92% capacity.
          </p>
        </div>

        {/* Drought buffer */}
        <div className={css.droughtCard}>
          <span className={css.droughtLabel}>DROUGHT BUFFER</span>
          <div className={css.droughtValueRow}>
            <span className={css.droughtValue}>{metrics.droughtBufferDays}</span>
            <div className={css.droughtIcons}>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5"/><circle cx="7" cy="7" r="1" fill="rgba(180,165,140,0.4)"/>
              </svg>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5"/><polyline points="7 3.5 7 7 9 8.5"/>
              </svg>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="rgba(180,165,140,0.4)" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 10 5 4 8 7 12 2"/>
              </svg>
            </div>
          </div>
          <span className={css.droughtTrend}>DAYS ESTIMATED AT PEAK ET DEMAND</span>
        </div>
      </div>

      {/* Flow analysis */}
      <div className={css.flowCard}>
        <span className={css.flowLabel}>FLOW ANALYSIS</span>
        <div className={css.flowStats}>
          <div className={css.flowStat}>
            <span className={css.flowStatLabel}>Inlet Rate</span>
            <span className={css.flowStatValue}>{metrics.inletGalMin} gal/min</span>
          </div>
          <div className={css.flowStat}>
            <span className={css.flowStatLabel}>Outlet Rate</span>
            <span className={css.flowStatValue}>{metrics.outletGalMin} gal/min</span>
          </div>
          <div className={css.flowStat}>
            <span className={css.flowStatLabel}>Net Gain</span>
            <span className={css.flowStatValue} style={{ color: metrics.netGainGalMin >= 0 ? statusToken.good : statusToken.poor }}>
              {metrics.netGainGalMin >= 0 ? '+' : ''}{metrics.netGainGalMin} gal/min
            </span>
          </div>
        </div>
      </div>

      {/* Biomass vs Water Consumption */}
      <div className={css.comparisonCard}>
        <h2 className={css.comparisonTitle}>Biomass vs. Water Consumption</h2>
        <div className={css.comparisonLegend}>
          <span className={css.legendItem}><span className={css.legendDot} style={{ background: statusToken.good }} /> BIOMASS INDEX</span>
          <span className={css.legendItem}><span className={css.legendDot} style={{ background: statusToken.poor }} /> CONSUMPTION</span>
        </div>
        <div className={css.comparisonChart}>
          {(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG'] as const).map((m, i) => {
            const biomass    = [30, 35, 45, 55, 72, 85, 80, 75][i]!;
            const consumption = [20, 22, 28, 35, 48, 62, 58, 50][i]!;
            return (
              <div key={m} className={css.barGroup}>
                <div className={css.barPair}>
                  <div className={css.bar} style={{ height: `${biomass}%`, background: statusToken.good }} />
                  <div className={css.bar} style={{ height: `${consumption}%`, background: statusToken.poor }} />
                </div>
                <span className={css.barLabel}>{m}</span>
              </div>
            );
          })}
          <div className={css.chartPeak}>Peak</div>
        </div>
      </div>

      {/* Stewardship Guidance */}
      <div className={css.guidanceCard}>
        <h2 className={css.guidanceTitle}>Stewardship Guidance</h2>
        <div className={css.guidanceItem}>
          <span className={css.guidanceIcon}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={statusToken.moderate} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5.5"/><line x1="7" y1="4" x2="7" y2="7.5"/><circle cx="7" cy="10" r="0.5" fill={statusToken.moderate}/>
            </svg>
          </span>
          <div>
            <p className={css.guidanceText}><strong>Increasing riparian buffer in Sector 3 to reduce evaporation.</strong></p>
            <p className={css.guidanceDetail}>Implement native sedge and willow plantings along the 480-foot swale line.</p>
          </div>
        </div>
        <div className={css.guidanceItem}>
          <span className={css.guidanceIcon}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={group.hydrology} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5.5"/><polyline points="4.5 7 6.5 9.5 10 5"/>
            </svg>
          </span>
          <div>
            <p className={css.guidanceText}><strong>Calibrate flow sensors in Basin 2.</strong></p>
            <p className={css.guidanceDetail}>Data variance detected in main outlet readings. Update stewardship log.</p>
          </div>
        </div>
      </div>

      {/* Cross-link to EnergyDashboard's Water Systems read-out (Phase 2b). */}
      <WaterSystemsCrossLink />

      <button className={css.reportBtn} onClick={onSwitchToMap}>
        GENERATE REPORT
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10"/>
        </svg>
      </button>
    </>
  );
}

// ─── Cross-link to EnergyDashboard ▸ Water Systems ────────────────────────────
// The WaterSystemPlanning read-out lives canonically inside the Energy & Water
// dashboard page. Hydrology users land here looking for water infra, so we
// route them rather than duplicate the component tree.
function WaterSystemsCrossLink() {
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);
  const goToWaterSystems = () => {
    setActiveDashboardSection('energy-offgrid');
    // Wait for the EnergyDashboard to mount before scrolling its anchor.
    setTimeout(() => {
      document.getElementById('water-systems')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };
  return (
    <button
      type="button"
      onClick={goToWaterSystems}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        marginTop: 16,
        padding: '14px 16px',
        borderRadius: 10,
        border: '1px solid rgba(120, 170, 200, 0.25)',
        background: 'rgba(80, 130, 170, 0.08)',
        color: 'rgba(232,220,200,0.9)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(120, 170, 200, 0.85)', marginBottom: 4 }}>
          Water Systems
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'rgba(180,165,140,0.7)' }}>
          Open the Energy &amp; Off-Grid dashboard to see placed cisterns, swales, and detention coverage.
        </span>
      </span>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'rgba(120, 170, 200, 0.85)' }}>
        <path d="M3 8H13M9 4L13 8L9 12"/>
      </svg>
    </button>
  );
}

// ─── Flow Analysis / Water Infrastructure Ledger ──────────────────────────────

const PUMP_BARS = [38, 52, 44, 61, 78, 92, 85, 72, 64, 58, 70, 82];

const ASSETS = [
  { name: 'Pond A (Spillway)',      icon: '≋', health: 26, status: 'OPERATIONAL', lastCheck: '2D AGO',  note: 'Primary catchment for northern ridge runoff. Self-regulating overflow enabled.' },
  { name: 'Storage Tank 01 (Pump)', icon: '⬡', health: 82, status: 'OPERATIONAL', lastCheck: '12H AGO', note: 'Pressurised potable storage. Auxiliary solar pump integration active.' },
  { name: 'Swale Network B',        icon: '∿', health: 74, status: 'ACTIVE',       lastCheck: '5D AGO',  note: 'Contour swale series along east paddock margin. Monitoring sediment load.' },
];

const MAINTENANCE = [
  { due: 'DUE IN 2 DAYS',   label: 'Pump B filter replacement',  note: 'Required due to sediment surge in Sector 3.', urgent: true  },
  { due: 'OCT 14, 2023',    label: 'Swale desilting',             note: 'Manual clearance of organic matter from Sector 4 secondary line.', urgent: false },
  { due: 'OCT 28, 2023',    label: 'pH Calibration',              note: 'Routine sensory array adjustment for Tank 01–04.', urgent: false },
];

function FlowAnalysisTab() {
  return (
    <div className={css.flowTabLayout}>
      {/* Left column */}
      <div className={css.flowTabMain}>
        {/* Title */}
        <div className={css.ledgerHeader}>
          <div>
            <h2 className={css.ledgerTitle}>Water Infrastructure Ledger</h2>
            <p className={css.ledgerDesc}>
              Central archival record of all physical water assets, stewardship logs,
              and systemic health metrics across Sector 6 and adjacent basins.
            </p>
          </div>
          <button className={css.logBtn}>
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/>
            </svg>
            LOG NEW ACTIVITY
          </button>
        </div>

        {/* Pump Performance chart */}
        <div className={css.pumpCard}>
          <div className={css.pumpCardHeader}>
            <div>
              <span className={css.pumpCardLabel}>Pump Performance</span>
              <span className={css.pumpCardSub}>REAL-TIME FLOW RATE AGGREGATE (M³/H)</span>
            </div>
            <span className={css.liveBadge}>● LIVE FEED</span>
          </div>

          <div className={css.pumpChartArea}>
            <div className={css.pumpBars}>
              {PUMP_BARS.map((h, i) => (
                <div key={i} className={css.pumpBarWrap}>
                  <div
                    className={css.pumpBar}
                    style={{ height: `${h}%`, background: i === 5 ? statusToken.good : 'rgba(138,154,116,0.35)' }}
                  />
                </div>
              ))}
            </div>
            <span className={css.pumpChartPeak}>Peak</span>
          </div>

          <div className={css.pumpStats}>
            <div className={css.pumpStat}>
              <span className={css.pumpStatValue}>242.8</span>
              <span className={css.pumpStatUnit}>AVG FLOW</span>
            </div>
            <div className={css.pumpStat}>
              <span className={css.pumpStatValue}>Operational</span>
              <span className={css.pumpStatUnit}>CURRENT STATUS</span>
            </div>
            <div className={css.pumpStat}>
              <span className={css.pumpStatValue}>0.04%</span>
              <span className={css.pumpStatUnit}>TURBIDITY</span>
            </div>
          </div>
        </div>

        {/* Asset health cards */}
        <div className={css.assetGrid}>
          {ASSETS.map((asset) => (
            <div key={asset.name} className={css.assetCard}>
              <div className={css.assetCardHeader}>
                <div className={css.assetIconWrap}>{asset.icon}</div>
                <span className={css.healthBadge} style={{ color: healthColor(asset.health), borderColor: healthColor(asset.health) + '44' }}>
                  HEALTH {asset.health}
                </span>
              </div>
              <h3 className={css.assetName}>{asset.name}</h3>
              <p className={css.assetNote}>{asset.note}</p>
              <div className={css.assetMeta}>
                <span className={css.assetMetaItem}>
                  <span className={css.assetMetaLabel}>STATUS</span>
                  <span className={css.assetMetaValue}>{asset.status}</span>
                </span>
                <span className={css.assetMetaItem}>
                  <span className={css.assetMetaLabel}>LAST CHECK</span>
                  <span className={css.assetMetaValue}>{asset.lastCheck}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Field Observations */}
        <div className={css.fieldObsCard}>
          <h3 className={css.fieldObsTitle}>Field Observations</h3>
          <div className={css.fieldObsList}>
            <div className={css.fieldObsItem}>
              <span className={css.fieldObsDot} style={{ background: statusToken.good }} />
              <div>
                <p className={css.fieldObsText}>Algae growth noted at Pond A spillway edge. Not yet at intervention threshold.</p>
                <span className={css.fieldObsDate}>Oct 4, 2023 · Sector 4</span>
              </div>
            </div>
            <div className={css.fieldObsItem}>
              <span className={css.fieldObsDot} style={{ background: statusToken.moderate }} />
              <div>
                <p className={css.fieldObsText}>Sediment accumulation in Basin 2 secondary channel. Manual clearance scheduled.</p>
                <span className={css.fieldObsDate}>Sep 29, 2023 · Sector 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right column — maintenance + quote */}
      <div className={css.flowTabSide}>
        <div className={css.maintenanceCard}>
          <h3 className={css.maintenanceTitle}>Upcoming Maintenance</h3>
          <div className={css.maintenanceList}>
            {MAINTENANCE.map((item) => (
              <div key={item.label} className={css.maintenanceItem}>
                <span className={css.maintenanceDot} style={{ background: item.urgent ? statusToken.poor : 'rgba(180,165,140,0.2)' }} />
                <div>
                  <span className={css.maintenanceDue} style={{ color: item.urgent ? statusToken.poor : 'rgba(180,165,140,0.35)' }}>{item.due}</span>
                  <p className={css.maintenanceLabel}>{item.label}</p>
                  <p className={css.maintenanceNote}>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
          <button className={css.maintenanceLogBtn}>VIEW MAINTENANCE LOG</button>
        </div>

        <div className={css.quoteCard}>
          <p className={css.quoteText}>
            The water that flows here is a borrowed gift.
          </p>
          <p className={css.quoteDetail}>
            Precision in management is our primary tool for ecological humility.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Water Metrics ────────────────────────────────────────────────────────────

function WaterMetricsTab({ metrics, precipMm, catchmentHa }: {
  metrics: HydroMetrics;
  precipMm: number;
  catchmentHa: number | null;
}) {
  const items = [
    { label: 'Annual Rainfall',       value: String(Math.round(precipMm)),                        unit: 'MM'    },
    { label: 'Watershed Area',        value: catchmentHa != null ? catchmentHa.toFixed(1) : '—',  unit: 'HA'    },
    { label: 'Water Retention Score', value: String(metrics.retentionScore),                       unit: '/100'  },
    { label: 'Flood Risk Index',      value: metrics.floodRiskLevel,                               unit: ''      },
    { label: 'Evapotranspiration',    value: String(metrics.annualEtMm),                           unit: 'MM/YR' },
    { label: 'Groundwater Recharge',  value: String(metrics.groundwaterRechargeMm),                unit: 'MM/YR' },
  ];

  return (
    <div className={css.metricsTabPlaceholder}>
      <div className={css.metricsTabGrid}>
        {items.map((m) => (
          <div key={m.label} className={css.metricCard}>
            <span className={css.metricLabel}>{m.label}</span>
            <div className={css.metricValueRow}>
              <span className={css.metricValue}>{m.value}</span>
              {m.unit && <span className={css.metricUnit}>{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Water Budget (Seasonal) ──────────────────────────────────────────────────

interface MonthlyNormal {
  month: number;
  precip_mm: number | null;
  mean_max_c: number | null;
  mean_min_c: number | null;
}

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;

// Northern-hemisphere irrigation shape (May–Sep peak). Sums to 12 by construction
// so normalization against annual demand stays stable. Southern hemisphere is the
// same array rotated by 6 months.
const NH_IRRIGATION_WEIGHTS = [0.3, 0.3, 0.6, 1.2, 2.2, 3.0, 3.0, 2.6, 1.8, 0.8, 0.3, 0.3];

interface MonthlyBudgetRow {
  month: string;
  inflowGal: number;
  demandGal: number;
  balanceGal: number;
}

interface MonthlyBudget {
  rows: MonthlyBudgetRow[];
  minBalanceGal: number;
  minBalanceMonth: string;
  maxDeficitGal: number;        // positive number = storage needed beyond baseline
  distributionSource: 'normals' | 'uniform';
}

function buildMonthlyBudget(params: {
  annualCatchmentGal: number;
  annualDemandGal: number;
  startingStorageGal: number;
  monthlyNormals: MonthlyNormal[] | null;
  latitudeDeg: number | null;
}): MonthlyBudget {
  const { annualCatchmentGal, annualDemandGal, startingStorageGal, monthlyNormals, latitudeDeg } = params;

  // --- Inflow distribution ---
  let inflowShares: number[];
  let distributionSource: 'normals' | 'uniform' = 'uniform';
  if (monthlyNormals && monthlyNormals.length === 12) {
    const raw = monthlyNormals.map((m) => (typeof m.precip_mm === 'number' && isFinite(m.precip_mm) ? Math.max(0, m.precip_mm) : 0));
    const total = raw.reduce((a, b) => a + b, 0);
    if (total > 0) {
      inflowShares = raw.map((v) => v / total);
      distributionSource = 'normals';
    } else {
      inflowShares = new Array(12).fill(1 / 12);
    }
  } else {
    inflowShares = new Array(12).fill(1 / 12);
  }

  // --- Demand distribution: household baseline (flat) + seasonal irrigation ---
  // Baseline: assume 4 persons × 400 L/person/day (WHO_BASIC_DAILY_LITERS) × 30.4 days.
  // One liter ≈ 0.264172 gal; kept as a literal to avoid cross-package import surface.
  const baselineMonthlyLiters = 400 * 4 * 30.4;
  const baselineMonthlyGal = baselineMonthlyLiters * 0.264172;
  const baselineAnnualGal = baselineMonthlyGal * 12;
  const irrigationAnnualGal = Math.max(0, annualDemandGal - baselineAnnualGal);

  const southern = typeof latitudeDeg === 'number' && latitudeDeg < 0;
  const irrigationWeights = southern
    ? [...NH_IRRIGATION_WEIGHTS.slice(6), ...NH_IRRIGATION_WEIGHTS.slice(0, 6)]
    : NH_IRRIGATION_WEIGHTS;
  const weightSum = irrigationWeights.reduce((a, b) => a + b, 0);

  // --- Build rows with running balance ---
  let balance = startingStorageGal;
  let minBalance = balance;
  let minBalanceMonth: string = MONTH_LABELS[0]!;
  const rows: MonthlyBudgetRow[] = [];
  for (let i = 0; i < 12; i++) {
    const inflow = annualCatchmentGal * (inflowShares[i] ?? 1 / 12);
    const demand = baselineMonthlyGal + irrigationAnnualGal * ((irrigationWeights[i] ?? 1) / weightSum);
    balance = balance + inflow - demand;
    if (balance < minBalance) {
      minBalance = balance;
      minBalanceMonth = MONTH_LABELS[i]!;
    }
    rows.push({
      month: MONTH_LABELS[i]!,
      inflowGal: inflow,
      demandGal: demand,
      balanceGal: balance,
    });
  }

  return {
    rows,
    minBalanceGal: minBalance,
    minBalanceMonth,
    maxDeficitGal: Math.max(0, startingStorageGal - minBalance),
    distributionSource,
  };
}

/**
 * §16 scenario presets — water-flood-drought-scenario-sim.
 * Each preset is just a (precipMult, demandMult) pair applied to the
 * existing annual catchment and annual demand inputs of
 * `buildMonthlyBudget`. The seasonal arc, running balance, and storage
 * sizing all reflow automatically. Pure presentation; no new physics.
 */
const SCENARIO_PRESETS: Array<{
  id: 'baseline' | 'drought' | 'wet' | 'flood';
  label: string;
  precipMult: number;
  demandMult: number;
  description: string;
}> = [
  { id: 'baseline', label: 'Baseline',  precipMult: 1.00, demandMult: 1.00, description: 'Climate normals, household demand as modeled.' },
  { id: 'drought',  label: 'Drought',   precipMult: 0.55, demandMult: 1.15, description: 'Severe-drought year (~45% precip deficit) with elevated irrigation demand.' },
  { id: 'wet',      label: 'Wet year',  precipMult: 1.40, demandMult: 0.90, description: 'Above-normal precipitation, irrigation backed off as soils stay moist.' },
  { id: 'flood',    label: 'Flood',     precipMult: 1.85, demandMult: 1.00, description: 'Extreme-precipitation year — surfaces storage overflow without modeling event-level flow.' },
];

function WaterBudgetTab({ metrics, climate, latitudeDeg }: {
  metrics: HydroMetrics;
  climate: ClimateSummary | null;
  latitudeDeg: number | null;
}) {
  // Narrow the hidden _monthly_normals field (typed `unknown` in the shared package).
  const monthlyNormals: MonthlyNormal[] | null = (() => {
    const raw = (climate as { _monthly_normals?: unknown } | null)?._monthly_normals;
    if (!Array.isArray(raw) || raw.length !== 12) return null;
    return raw as MonthlyNormal[];
  })();

  // §16 scenario state. Multipliers drive both presets and freeform sliders.
  const [precipMult, setPrecipMult] = useState(1);
  const [demandMult, setDemandMult] = useState(1);

  // Annual demand convention matches computeHydrologyMetrics placeholder
  // (irrigation ≈ 22% of annual rainfall potential). Baseline household adds on top.
  const baselineAnnualGal = 400 * 4 * 30.4 * 0.264172 * 12;
  const irrigationAnnualGal = metrics.catchmentPotentialGal * 0.22;
  const annualDemandGal = baselineAnnualGal + irrigationAnnualGal;

  // Scenario-adjusted inputs.
  const scenarioCatchmentGal = metrics.catchmentPotentialGal * precipMult;
  const scenarioDemandGal = annualDemandGal * demandMult;

  const budget = useMemo(
    () => buildMonthlyBudget({
      annualCatchmentGal: scenarioCatchmentGal,
      annualDemandGal: scenarioDemandGal,
      startingStorageGal: metrics.totalStorageGal,
      monthlyNormals,
      latitudeDeg,
    }),
    [scenarioCatchmentGal, scenarioDemandGal, metrics.totalStorageGal, monthlyNormals, latitudeDeg],
  );

  // Baseline budget for delta comparison (always at 100%/100%).
  const baselineBudget = useMemo(
    () => buildMonthlyBudget({
      annualCatchmentGal: metrics.catchmentPotentialGal,
      annualDemandGal,
      startingStorageGal: metrics.totalStorageGal,
      monthlyNormals,
      latitudeDeg,
    }),
    [metrics.catchmentPotentialGal, metrics.totalStorageGal, annualDemandGal, monthlyNormals, latitudeDeg],
  );

  // Identify the active preset (if any) by exact mult match.
  const activePreset = SCENARIO_PRESETS.find(
    (p) => Math.abs(p.precipMult - precipMult) < 0.005 && Math.abs(p.demandMult - demandMult) < 0.005,
  );
  const isScenarioActive = !(precipMult === 1 && demandMult === 1);

  // Chart scale: use max of either metric so both series share a consistent y-axis.
  const peakGal = Math.max(
    ...budget.rows.map((r) => Math.max(r.inflowGal, r.demandGal)),
    1,
  );

  const recommendedStorageGal = budget.maxDeficitGal > 0
    ? Math.round(budget.maxDeficitGal * 1.25)
    : Math.round(metrics.totalStorageGal);
  const storageGapGal = Math.max(0, recommendedStorageGal - metrics.totalStorageGal);

  // Running-balance sparkline coordinates in a 0..600 × 0..80 viewBox.
  const balances = budget.rows.map((r) => r.balanceGal);
  const balMin = Math.min(...balances, 0);
  const balMax = Math.max(...balances, metrics.totalStorageGal, 1);
  const balRange = balMax - balMin || 1;
  const polyPoints = budget.rows.map((r, i) => {
    const x = 20 + (i * 560) / 11;
    const y = 70 - ((r.balanceGal - balMin) / balRange) * 60;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <>
      {/* §16 Scenario controls — multipliers reflow the entire tab. */}
      <div className={css.scenarioCard}>
        <div className={css.scenarioHead}>
          <div>
            <span className={css.flowLabel}>SCENARIO</span>
            <p className={css.scenarioSub}>
              {activePreset
                ? <><strong>{activePreset.label}</strong> {'\u2014'} {activePreset.description}</>
                : isScenarioActive
                  ? <>Custom: precip {Math.round(precipMult * 100)}%, demand {Math.round(demandMult * 100)}% vs. climate normals.</>
                  : <>Climate normals as fetched. Switch to a stress scenario to see the seasonal arc and storage gap reflow.</>
              }
            </p>
          </div>
          {isScenarioActive && (
            <button
              type="button"
              onClick={() => { setPrecipMult(1); setDemandMult(1); }}
              className={css.scenarioReset}
            >
              Reset
            </button>
          )}
        </div>
        <div className={css.scenarioPresets}>
          {SCENARIO_PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => { setPrecipMult(preset.precipMult); setDemandMult(preset.demandMult); }}
                className={`${css.scenarioPreset} ${isActive ? css.scenarioPresetActive : ''}`}
                title={preset.description}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className={css.scenarioSliders}>
          <label className={css.scenarioSliderRow}>
            <span className={css.scenarioSliderLabel}>
              Precipitation <span className={css.scenarioSliderValue}>{Math.round(precipMult * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.3}
              max={2.0}
              step={0.05}
              value={precipMult}
              onChange={(e) => setPrecipMult(parseFloat(e.target.value))}
              className={css.scenarioSlider}
            />
          </label>
          <label className={css.scenarioSliderRow}>
            <span className={css.scenarioSliderLabel}>
              Demand <span className={css.scenarioSliderValue}>{Math.round(demandMult * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.05}
              value={demandMult}
              onChange={(e) => setDemandMult(parseFloat(e.target.value))}
              className={css.scenarioSlider}
            />
          </label>
        </div>
      </div>

      {/* Fallback banner when monthly normals unavailable */}
      {budget.distributionSource === 'uniform' && (
        <div className={css.budgetFallback}>
          Monthly rainfall normals aren't available for this site — inflow is
          distributed evenly across the 12 months. The seasonal shape is
          indicative; add climate-normals data for a site-specific arc.
        </div>
      )}

      {/* Seasonal chart */}
      <div className={css.comparisonCard}>
        <h2 className={css.comparisonTitle}>Monthly Inflow vs. Demand</h2>
        <div className={css.comparisonLegend}>
          <span className={css.legendItem}>
            <span className={css.legendDot} style={{ background: group.hydrology }} />
            INFLOW (CATCHMENT)
          </span>
          <span className={css.legendItem}>
            <span className={css.legendDot} style={{ background: statusToken.moderate }} />
            DEMAND
          </span>
        </div>
        <div className={css.comparisonChart}>
          {budget.rows.map((r) => {
            const inflowPct = Math.max(0, (r.inflowGal / peakGal) * 100);
            const demandPct = Math.max(0, (r.demandGal / peakGal) * 100);
            return (
              <div key={r.month} className={css.barGroup}>
                <div className={css.barPair}>
                  <div className={css.bar} style={{ height: `${inflowPct}%`, background: group.hydrology }} />
                  <div className={css.bar} style={{ height: `${demandPct}%`, background: statusToken.moderate }} />
                </div>
                <span className={css.barLabel}>{r.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Running balance + sizing */}
      <div className={css.budgetBalanceCard}>
        <div className={css.budgetBalanceHeader}>
          <div>
            <span className={css.flowLabel}>RUNNING STORAGE BALANCE</span>
            <p className={css.budgetBalanceSub}>
              Cumulative inflow minus demand, starting from current storage.
              {budget.minBalanceGal < 0
                ? ` Balance goes negative in ${budget.minBalanceMonth} — storage is undersized for this demand arc.`
                : ` Minimum reached in ${budget.minBalanceMonth} at ${fmtGal(budget.minBalanceGal)} gal.`}
            </p>
          </div>
        </div>
        <svg viewBox="0 0 600 80" className={css.budgetBalanceSvg} preserveAspectRatio="none">
          {/* Zero line */}
          {balMin < 0 && (
            <line
              x1={20}
              x2={580}
              y1={70 - ((0 - balMin) / balRange) * 60}
              y2={70 - ((0 - balMin) / balRange) * 60}
              stroke={statusToken.poor}
              strokeWidth={0.5}
              strokeDasharray="3 3"
              opacity={0.6}
            />
          )}
          <polyline
            points={polyPoints}
            fill="none"
            stroke={budget.minBalanceGal < 0 ? statusToken.poor : group.hydrology}
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {budget.rows.map((r, i) => {
            const x = 20 + (i * 560) / 11;
            return <text key={r.month} x={x} y={78} textAnchor="middle" fontSize={6} fill="rgba(180,165,140,0.4)">{r.month[0]}</text>;
          })}
        </svg>
      </div>

      {/* Storage sizing recommendation */}
      <div className={css.metricsRow}>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>CURRENT STORAGE</span>
          <span className={css.metricValue}>{fmtGal(metrics.totalStorageGal)}</span>
          <span className={css.metricUnit}>GALLONS</span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>RECOMMENDED MINIMUM</span>
          <span className={css.metricValue}>{fmtGal(recommendedStorageGal)}</span>
          <span className={css.metricUnit}>GALLONS</span>
          <span className={css.metricNote}>MAX DEFICIT &times; 1.25 SAFETY FACTOR</span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>STORAGE GAP</span>
          <span className={css.metricValue} style={{ color: storageGapGal > 0 ? statusToken.poor : statusToken.good }}>
            {storageGapGal > 0 ? `+${fmtGal(storageGapGal)}` : 'COVERED'}
          </span>
          {storageGapGal > 0 && <span className={css.metricUnit}>GALLONS SHORT</span>}
          {isScenarioActive && (() => {
            const baselineRecommended = baselineBudget.maxDeficitGal > 0
              ? Math.round(baselineBudget.maxDeficitGal * 1.25)
              : Math.round(metrics.totalStorageGal);
            const baselineGap = Math.max(0, baselineRecommended - metrics.totalStorageGal);
            const delta = storageGapGal - baselineGap;
            if (Math.abs(delta) < 100) return null;
            return (
              <span className={css.metricNote}>
                {delta > 0
                  ? `+${fmtGal(delta)} vs baseline`
                  : `${fmtGal(Math.abs(delta))} better than baseline`}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Assumptions footnote */}
      <div className={css.budgetAssumptions}>
        <h3 className={css.budgetAssumptionsTitle}>Model Assumptions</h3>
        <ul className={css.budgetAssumptionsList}>
          <li>
            <strong>Inflow:</strong> annual catchment potential ({fmtGal(metrics.catchmentPotentialGal)} gal) distributed by{' '}
            {budget.distributionSource === 'normals' ? 'site-specific monthly rainfall normals' : 'equal monthly share (fallback)'}.
          </li>
          <li>
            <strong>Domestic baseline:</strong> 4 persons &times; 400 L/day (WHO guideline) &asymp; {fmtGal(baselineAnnualGal)} gal/year, flat across months.
          </li>
          <li>
            <strong>Irrigation:</strong> {fmtGal(irrigationAnnualGal)} gal/year (22% of catchment potential), seasonally weighted with a May&ndash;Sep peak{latitudeDeg != null && latitudeDeg < 0 ? ' (flipped for southern hemisphere)' : ''}.
          </li>
          <li>
            <strong>Starting storage:</strong> {fmtGal(metrics.totalStorageGal)} gal (derived from site retention factor).
          </li>
          {isScenarioActive && (
            <li>
              <strong>Scenario adjustment:</strong> precip &times; {precipMult.toFixed(2)}, demand &times; {demandMult.toFixed(2)}.
              Scenario inflow {fmtGal(scenarioCatchmentGal)} gal / scenario demand {fmtGal(scenarioDemandGal)} gal.
              Steady-state annual-volume model &mdash; not an event-level flood simulation.
            </li>
          )}
          <li>
            These figures are planning heuristics &mdash; refine with site-specific household size, irrigated acreage, and measured storage when known.
          </li>
        </ul>
      </div>
    </>
  );
}

// ─── Roof Catchment & Rainwater Sizing ────────────────────────────────────────

// Structure types whose footprint meaningfully captures rainwater for harvesting.
// Excludes open pavilions, tents, and fire circles; excludes solar arrays, wells,
// and water tanks (their footprints are structural but not roofed surfaces).
const ROOFED_STRUCTURE_TYPES: ReadonlySet<Structure['type']> = new Set([
  'cabin', 'yurt', 'greenhouse', 'barn', 'workshop', 'prayer_space',
  'bathhouse', 'classroom', 'storage', 'animal_shelter', 'earthship',
]);

// Standard rainwater-harvesting runoff coefficient for solid roofs (metal/shingle/
// tile). Industry guidance: 0.75–0.95 depending on surface; 0.85 is conservative-
// typical. Distinct from NRCS soil runoff coefficients used elsewhere.
const ROOF_RUNOFF_COEFF = 0.85;

// 1 mm of rain over 1 m² = 1 liter. 1 liter = 0.264172 US gallons.
const LITERS_PER_GALLON = 3.78541;

// Utility types that count as water storage toward the cistern coverage check.
const WATER_STORAGE_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set(['rain_catchment', 'water_tank']);

function RoofCatchmentTab({ projectId, precipMm }: { projectId: string; precipMm: number }) {
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const updateUtility = useUtilityStore((s) => s.updateUtility);

  const roofed = useMemo(
    () => allStructures
      .filter((s) => s.projectId === projectId && ROOFED_STRUCTURE_TYPES.has(s.type))
      .map((s) => {
        const areaM2 = (s.widthM ?? 0) * (s.depthM ?? 0);
        const annualLiters = areaM2 * precipMm * ROOF_RUNOFF_COEFF;
        const annualGal = annualLiters / LITERS_PER_GALLON;
        return { structure: s, areaM2, annualGal };
      })
      .sort((a, b) => b.annualGal - a.annualGal),
    [allStructures, projectId, precipMm],
  );

  const waterStorageUtilities = useMemo(
    () => allUtilities
      .filter((u) => u.projectId === projectId && WATER_STORAGE_UTILITY_TYPES.has(u.type))
      .sort((a, b) => (b.capacityGal ?? 0) - (a.capacityGal ?? 0)),
    [allUtilities, projectId],
  );

  const placedCapacityGal = waterStorageUtilities.reduce((sum, u) => sum + (u.capacityGal ?? 0), 0);
  const unsizedCount = waterStorageUtilities.filter((u) => u.capacityGal == null).length;

  const totalAreaM2 = roofed.reduce((sum, r) => sum + r.areaM2, 0);
  const totalAnnualGal = roofed.reduce((sum, r) => sum + r.annualGal, 0);

  // Cistern sizing recommendations
  const bufferDays = 30;
  const householdPersons = 4;
  const householdDailyLiters = 400 * householdPersons;   // WHO 400 L/person/day
  const bufferLiters = householdDailyLiters * bufferDays;
  const bufferGal = bufferLiters / LITERS_PER_GALLON;
  const tenPctYearlyGal = totalAnnualGal * 0.10;
  // Use the larger of the two as the recommended cistern size.
  const recommendedGal = Math.round(Math.max(bufferGal, tenPctYearlyGal));
  const storageGapGal = Math.max(0, recommendedGal - placedCapacityGal);

  if (roofed.length === 0) {
    return (
      <div className={css.budgetFallback}>
        No roofed structures have been placed on this site yet. Add cabins, barns,
        workshops, greenhouses, or similar structures from the map view to estimate
        roof catchment yield and cistern sizing.
      </div>
    );
  }

  return (
    <>
      {/* Summary metrics */}
      <div className={css.metricsRow}>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>TOTAL ROOF AREA</span>
          <span className={css.metricValue}>{totalAreaM2.toFixed(0)}</span>
          <span className={css.metricUnit}>M&sup2;</span>
          <span className={css.metricNote}>{roofed.length} ROOFED STRUCTURE{roofed.length === 1 ? '' : 'S'}</span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>ANNUAL HARVEST POTENTIAL</span>
          <span className={css.metricValue}>{fmtGal(totalAnnualGal)}</span>
          <span className={css.metricUnit}>GALLONS/YEAR</span>
          <span className={css.metricNote}>
            {Math.round(precipMm)}&#8239;MM RAINFALL &times; {ROOF_RUNOFF_COEFF.toFixed(2)} RUNOFF COEFF.
          </span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>RECOMMENDED CISTERN</span>
          <span className={css.metricValue}>{fmtGal(recommendedGal)}</span>
          <span className={css.metricUnit}>GALLONS</span>
          <span className={css.metricNote}>
            {bufferGal > tenPctYearlyGal
              ? `${bufferDays}-DAY HOUSEHOLD BUFFER (\u2248 ${householdPersons} PERSONS)`
              : '10% OF ANNUAL HARVEST (FIRST-FLUSH \u002B SHORT BUFFER)'}
          </span>
        </div>
      </div>

      {/* Coverage check: recommended vs. placed capacity */}
      <div className={css.metricsRow}>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>PLACED CISTERN CAPACITY</span>
          <span className={css.metricValue}>
            {waterStorageUtilities.length === 0 ? '\u2014' : fmtGal(placedCapacityGal)}
          </span>
          {waterStorageUtilities.length > 0 && <span className={css.metricUnit}>GALLONS</span>}
          <span className={css.metricNote}>
            {waterStorageUtilities.length === 0
              ? 'NO RAIN CATCHMENT OR WATER TANK PLACED'
              : `${waterStorageUtilities.length} UTILIT${waterStorageUtilities.length === 1 ? 'Y' : 'IES'}${unsizedCount > 0 ? ` \u00b7 ${unsizedCount} UNSIZED` : ''}`}
          </span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>COVERAGE GAP</span>
          <span
            className={css.metricValue}
            style={{ color: storageGapGal > 0 ? statusToken.poor : statusToken.good }}
          >
            {storageGapGal > 0 ? `+${fmtGal(storageGapGal)}` : 'COVERED'}
          </span>
          {storageGapGal > 0 && <span className={css.metricUnit}>GALLONS SHORT</span>}
          <span className={css.metricNote}>
            {storageGapGal > 0
              ? 'ADD OR RESIZE STORAGE UTILITIES BELOW'
              : 'PLACED CAPACITY MEETS OR EXCEEDS TARGET'}
          </span>
        </div>
        <div className={css.metricCard}>
          <span className={css.metricLabel}>COVERAGE RATIO</span>
          <span className={css.metricValue}>
            {recommendedGal > 0 ? `${Math.round((placedCapacityGal / recommendedGal) * 100)}%` : '\u2014'}
          </span>
          <span className={css.metricNote}>PLACED &divide; RECOMMENDED</span>
        </div>
      </div>

      {/* Per-structure table */}
      <div className={css.budgetBalanceCard}>
        <div className={css.budgetBalanceHeader}>
          <div>
            <span className={css.flowLabel}>PER-STRUCTURE YIELD</span>
            <p className={css.budgetBalanceSub}>
              Annual catchment estimate for each roofed structure, sorted by yield.
              Yield = roof area &times; annual rainfall &times; {ROOF_RUNOFF_COEFF.toFixed(2)} runoff coefficient.
            </p>
          </div>
        </div>
        <table className={css.roofTable}>
          <thead>
            <tr>
              <th className={css.roofTh}>STRUCTURE</th>
              <th className={css.roofTh}>TYPE</th>
              <th className={css.roofThRight}>ROOF AREA (M&sup2;)</th>
              <th className={css.roofThRight}>ANNUAL YIELD (GAL)</th>
              <th className={css.roofThRight}>SHARE</th>
            </tr>
          </thead>
          <tbody>
            {roofed.map(({ structure, areaM2, annualGal }) => (
              <tr key={structure.id} className={css.roofRow}>
                <td className={css.roofTd}>{structure.name}</td>
                <td className={css.roofTdDim}>{structure.type.replace(/_/g, ' ')}</td>
                <td className={css.roofTdRight}>{areaM2.toFixed(0)}</td>
                <td className={css.roofTdRight}>{fmtGal(annualGal)}</td>
                <td className={css.roofTdRight}>
                  {totalAnnualGal > 0 ? `${Math.round((annualGal / totalAnnualGal) * 100)}%` : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Storage utility capacity editor */}
      <div className={css.budgetBalanceCard}>
        <div className={css.budgetBalanceHeader}>
          <div>
            <span className={css.flowLabel}>STORAGE UTILITIES</span>
            <p className={css.budgetBalanceSub}>
              Rain catchment and water tank utilities placed for this site.
              Enter a capacity in gallons to count each toward the coverage gap above.
              Leave blank if unsized.
            </p>
          </div>
        </div>
        {waterStorageUtilities.length === 0 ? (
          <p className={css.roofEmptyNote}>
            No water storage utilities placed yet. Add a Rain Catchment or Water Tank
            from the map view to start tracking cistern capacity.
          </p>
        ) : (
          <table className={css.roofTable}>
            <thead>
              <tr>
                <th className={css.roofTh}>UTILITY</th>
                <th className={css.roofTh}>TYPE</th>
                <th className={css.roofTh}>PHASE</th>
                <th className={css.roofThRight}>CAPACITY (GAL)</th>
              </tr>
            </thead>
            <tbody>
              {waterStorageUtilities.map((u) => (
                <StorageCapacityRow key={u.id} utility={u} onSave={(gal) => updateUtility(u.id, { capacityGal: gal })} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assumptions footnote */}
      <div className={css.budgetAssumptions}>
        <h3 className={css.budgetAssumptionsTitle}>Model Assumptions</h3>
        <ul className={css.budgetAssumptionsList}>
          <li>
            <strong>Roof area:</strong> width &times; depth from each structure's footprint template.
            Roofed types: cabin, yurt, greenhouse, barn, workshop, prayer space, bathhouse,
            classroom, storage, animal shelter, earthship. Open structures (pavilions,
            tents, fire circles) and non-roof utilities (solar arrays, wells, tanks) are excluded.
          </li>
          <li>
            <strong>Runoff coefficient:</strong> {ROOF_RUNOFF_COEFF.toFixed(2)} &mdash; standard
            for solid roofs (metal, tile, shingle). Accounts for first-flush losses,
            wind drift, and evaporation on a hot roof.
          </li>
          <li>
            <strong>Annual rainfall:</strong> {Math.round(precipMm)} mm (from site climate layer).
            1 mm rain &times; 1 m&sup2; = 1 liter.
          </li>
          <li>
            <strong>Cistern sizing:</strong> the larger of (a) {bufferDays}-day household
            buffer at {householdPersons} persons &times; 400 L/day (WHO guideline) = {fmtGal(bufferGal)} gal,
            or (b) 10% of annual harvest = {fmtGal(tenPctYearlyGal)} gal. Real sizing should
            also account for seasonal rainfall gaps &mdash; see the Water Budget tab.
          </li>
          <li>
            Sizing is a planning heuristic. Local code, first-flush diverters, mosquito
            controls, and tank material choice materially affect final capacity.
          </li>
        </ul>
      </div>
    </>
  );
}

function StorageCapacityRow({ utility, onSave }: {
  utility: Utility;
  onSave: (capacityGal: number | undefined) => void;
}) {
  // Local draft so typing doesn't thrash the store on every keystroke.
  const [draft, setDraft] = useState<string>(
    utility.capacityGal != null ? String(utility.capacityGal) : '',
  );

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (utility.capacityGal !== undefined) onSave(undefined);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      // Reset the field on invalid input; leave stored value unchanged.
      setDraft(utility.capacityGal != null ? String(utility.capacityGal) : '');
      return;
    }
    const rounded = Math.round(parsed);
    if (rounded !== utility.capacityGal) onSave(rounded);
  };

  return (
    <tr className={css.roofRow}>
      <td className={css.roofTd}>{utility.name}</td>
      <td className={css.roofTdDim}>{utility.type.replace(/_/g, ' ')}</td>
      <td className={css.roofTdDim}>{utility.phase || '\u2014'}</td>
      <td className={css.roofTdRight}>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder="—"
          className={css.capacityInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(utility.capacityGal != null ? String(utility.capacityGal) : '');
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          aria-label={`${utility.name} capacity in gallons`}
        />
      </td>
    </tr>
  );
}
