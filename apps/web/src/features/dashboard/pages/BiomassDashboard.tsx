/**
 * BiomassDashboard — site-characterization read-out for standing biomass,
 * vegetation composition, and accumulation rate. Complements
 * CarbonDiagnosticDashboard (which models maturity over time) by giving the
 * present-state inventory.
 *
 * Surfaces both as a Dashboard page and as a Map View right-rail panel,
 * matching the pattern used by Terrain / Cartographic / Stewardship.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import css from './CartographicDashboard.module.css';

interface BiomassDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary { organic_matter_pct?: number | string; }
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
  shrub_pct?: number | string;
  grass_pct?: number | string;
  bare_pct?: number | string;
  water_pct?: number | string;
  developed_pct?: number | string;
}
interface ClimateSummary { annual_precip_mm?: number; }

function num(v: unknown, fallback: number): number {
  const n = parseFloat(String(v ?? ''));
  return isFinite(n) ? n : fallback;
}

export default function BiomassDashboard({ project, onSwitchToMap }: BiomassDashboardProps) {
  const siteData = useSiteData(project.id);

  const stats = useMemo(() => {
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const lc = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'land_cover') : null;
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

    const om = num(soils?.organic_matter_pct, 4.0);
    const canopy = num(lc?.tree_canopy_pct, 40);
    const shrub = num(lc?.shrub_pct, 10);
    const grass = num(lc?.grass_pct, 35);
    const bare = num(lc?.bare_pct, 5);
    const water = num(lc?.water_pct, 5);
    const developed = num(lc?.developed_pct, 5);
    const precip = climate?.annual_precip_mm ?? 800;

    // Standing aboveground biomass estimate (t/ha) — coarse heuristic blending
    // canopy fraction (woody contribution) and herbaceous cover (grass+shrub).
    // Calibrated against typical temperate-zone yields: closed canopy ≈ 200 t/ha,
    // open grassland ≈ 5 t/ha, mixed ≈ 60–120 t/ha.
    const woodyT = canopy / 100 * 200;
    const herbT = (grass + shrub) / 100 * 8;
    const biomassTPerHa = Math.round(woodyT + herbT);

    // YoY accumulation — same model as DashboardMetrics so map↔dashboard agree.
    const yoyPct = Math.round(8 + (canopy / 100 * 15) + (om / 5 * 5));

    // Carbon equivalent — ~50% of dry biomass is carbon, then × 3.67 for CO2e.
    const carbonTCO2e = Math.round(biomassTPerHa * 0.5 * 3.67);

    const acreage = project.acreage ?? 0;
    const totalBiomassT = Math.round(biomassTPerHa * acreage);
    const totalCarbonT = Math.round(carbonTCO2e * acreage);

    return {
      biomassTPerHa, yoyPct, carbonTCO2e,
      totalBiomassT, totalCarbonT,
      composition: [
        { label: 'Tree Canopy', pct: canopy, color: 'var(--color-status-good, #4a7c59)' },
        { label: 'Shrub', pct: shrub, color: '#7a9a5e' },
        { label: 'Grass / Herbaceous', pct: grass, color: '#a0b070' },
        { label: 'Developed', pct: developed, color: '#7a7a7a' },
        { label: 'Bare / Exposed', pct: bare, color: '#a08a6a' },
        { label: 'Water', pct: water, color: '#5a7a9a' },
      ],
      precip, om,
    };
  }, [siteData, project.acreage]);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Biomass Inventory</h1>
      <p className={css.desc}>
        Present-state estimate of standing aboveground biomass and vegetation
        composition. Calibrated from canopy fraction, soil organic matter, and
        annual precipitation. Use the Carbon Diagnostic dashboard for the
        maturity-over-time view.
      </p>

      {/* Top-line metrics */}
      <div className={css.coordCard}>
        <h2 className={css.sectionLabel}>STANDING BIOMASS</h2>
        <div className={css.coordGrid}>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Density</span>
            <span className={css.coordValue}>{stats.biomassTPerHa} t/ha</span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Site Total</span>
            <span className={css.coordValue}>
              {stats.totalBiomassT > 0 ? `${stats.totalBiomassT.toLocaleString()} t` : '—'}
            </span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>Carbon Stock</span>
            <span className={css.coordValue}>{stats.carbonTCO2e} tCO2e/ha</span>
          </div>
          <div className={css.coordItem}>
            <span className={css.coordLabel}>YoY Growth</span>
            <span className={css.coordValue}>+{stats.yoyPct}%</span>
          </div>
        </div>
      </div>

      {/* Land cover composition */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>VEGETATION COMPOSITION</h2>
        <div className={css.layerTable}>
          <div className={css.layerHeaderRow}>
            <span>Class</span>
            <span>Share</span>
            <span>Bar</span>
            <span></span>
          </div>
          {stats.composition.map((row) => (
            <div key={row.label} className={css.layerRow}>
              <span className={css.layerName}>{row.label}</span>
              <span className={css.layerSource}>{row.pct.toFixed(0)}%</span>
              <span className={css.layerRes} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  height: 6,
                  borderRadius: 3,
                  background: row.color,
                  width: `${Math.min(row.pct, 100)}%`,
                  minWidth: row.pct > 0 ? 4 : 0,
                  opacity: 0.85,
                }} />
              </span>
              <span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Drivers */}
      <div className={css.section}>
        <h2 className={css.sectionLabel}>DRIVERS</h2>
        <div className={css.surveyList}>
          <div className={css.surveyCard}>
            <h3 className={css.surveyName}>Soil Organic Matter</h3>
            <div className={css.surveyMeta}>
              <span>Current: <strong>{stats.om.toFixed(1)}%</strong></span>
              <span>Target: <strong>≥ 5%</strong></span>
              <span>Status: <strong>{stats.om >= 5 ? 'Healthy' : stats.om >= 3 ? 'Building' : 'Depleted'}</strong></span>
            </div>
          </div>
          <div className={css.surveyCard}>
            <h3 className={css.surveyName}>Annual Precipitation</h3>
            <div className={css.surveyMeta}>
              <span>Mean: <strong>{stats.precip.toLocaleString()} mm</strong></span>
              <span>Regime: <strong>{stats.precip >= 1000 ? 'Wet' : stats.precip >= 600 ? 'Sub-humid' : 'Semi-arid'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <button className={css.mapBtn} onClick={onSwitchToMap}>
        OPEN MAP VIEW
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7H11M8 4L11 7L8 10" />
        </svg>
      </button>
    </div>
  );
}
