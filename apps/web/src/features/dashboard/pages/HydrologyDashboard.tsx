/**
 * HydrologyDashboard — Hydrology Planning Suite with tabbed sub-navigation.
 * Tabs: Overview (diagnostic) · Flow Analysis (infrastructure ledger) · Water Metrics
 */

import { useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { computeHydrologyMetrics, fmtGal, parseHydrologicGroup, HYDRO_DEFAULTS, type HydroMetrics } from '../../../lib/hydrologyMetrics.js';
import css from './HydrologyDashboard.module.css';
import { status as statusToken, group } from '../../../lib/tokens.js';

interface HydrologyDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type SubTab = 'overview' | 'flow' | 'metrics';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview'      },
  { id: 'flow',     label: 'Flow Analysis' },
  { id: 'metrics',  label: 'Water Metrics' },
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

  const precipMm    = siteData ? (getLayerSummary<ClimateSummary>(siteData, 'climate')?.annual_precip_mm ?? HYDRO_DEFAULTS.precipMm) : HYDRO_DEFAULTS.precipMm;
  const catchmentHa = (() => { const v = parseFloat(String(siteData ? (getLayerSummary<WatershedSummary>(siteData, 'watershed')?.catchment_area_ha ?? '') : '')); return isFinite(v) ? v : null; })();

  return (
    <div className={css.page}>
      {/* ── Suite header ──────────────────────────────────────────────────── */}
      <div className={css.suiteHeader}>
        <div className={css.suiteTitle}>Hydrology Planning Suite</div>
        <nav className={css.suiteNav}>
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
          <button className={css.suiteIconBtn} title="Share" aria-label="Share">
            <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="3" r="1.5"/><circle cx="4" cy="7.5" r="1.5"/><circle cx="11" cy="12" r="1.5"/>
              <line x1="9.6" y1="3.9" x2="5.4" y2="6.6"/><line x1="5.4" y1="8.4" x2="9.6" y2="11.1"/>
            </svg>
          </button>
          <button className={css.suiteIconBtn} title="Download" aria-label="Download">
            <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 11.5h10M7.5 2.5v7M4.5 7l3 3 3-3"/>
            </svg>
          </button>
          <button className={css.suiteIconBtn} title="Settings" aria-label="Settings">
            <svg width={15} height={15} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="7.5" r="2"/>
              <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M2.9 2.9l1.4 1.4M10.7 10.7l1.4 1.4M2.9 12.1l1.4-1.4M10.7 4.3l1.4-1.4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && <OverviewTab metrics={metrics} precipMm={precipMm} onSwitchToMap={onSwitchToMap} />}

      {/* ── Flow Analysis tab ─────────────────────────────────────────────── */}
      {activeTab === 'flow' && <FlowAnalysisTab />}

      {/* ── Water Metrics tab ─────────────────────────────────────────────── */}
      {activeTab === 'metrics' && <WaterMetricsTab metrics={metrics} precipMm={precipMm} catchmentHa={catchmentHa} />}
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
          <span className={css.metricNote}>BASED ON {Math.round(precipMm)}\u202fMM MEAN ANNUAL PRECIPITATION</span>
        </div>
      </div>

      {/* Aquifer + drought row */}
      <div className={css.bufferRow}>
        {/* Aquifer card */}
        <div className={css.aquiferCard}>
          <h3 className={css.aquiferTitle}>Aquifer Hydration</h3>
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
        <h3 className={css.comparisonTitle}>Biomass vs. Water Consumption</h3>
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
        <h3 className={css.guidanceTitle}>Stewardship Guidance</h3>
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

      <button className={css.reportBtn} onClick={onSwitchToMap}>
        GENERATE REPORT
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10"/>
        </svg>
      </button>
    </>
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
              <h4 className={css.assetName}>{asset.name}</h4>
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
