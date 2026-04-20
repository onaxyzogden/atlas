/**
 * Sprint BK — Hydrology Intelligence section extracted from SiteIntelligencePanel.
 *
 * Renders aridity, water balance, PET, RWH potential, storage sizing,
 * irrigation deficit, length of growing period, and Sprint J/K wind + solar
 * bands within a collapsible panel.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { fmtGal, type HydroMetrics, type WindEnergyResult } from '../../../lib/hydrologyMetrics.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { getHydroColor } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface SolarPVResult {
  peakSunHours: number;
  annualYieldKwhPerKwp: number;
  pvClass: string;
}

export interface HydrologyIntelligenceSectionProps {
  hydroMetrics: HydroMetrics | null;
  windEnergy: WindEnergyResult | null;
  solarPV: SolarPVResult | null;
  hydroOpen: boolean;
  onToggleHydro: () => void;
}

export const HydrologyIntelligenceSection = memo(function HydrologyIntelligenceSection({
  hydroMetrics,
  windEnergy,
  solarPV,
  hydroOpen,
  onToggleHydro,
}: HydrologyIntelligenceSectionProps) {
  if (!hydroMetrics) return null;

  return (
    <SectionProfiler id="site-intel-hydrology">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleHydro}
          className={`${s.liveDataHeader} ${hydroOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9679;</span>
          <span className={s.liveDataTitle}>Hydrology Intelligence</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!hydroOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {hydroOpen && (
          <div className={p.innerPad}>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Aridity</span>
              <div className={p.rightAlign}>
                <span className={s.scoreBadge}
                  style={{ background: `${getHydroColor(hydroMetrics.aridityClass)}18`,
                           color: getHydroColor(hydroMetrics.aridityClass) }}>
                  {hydroMetrics.aridityClass}
                </span>
              </div>
              <span className={s.flagSource}>P/PET {hydroMetrics.aridityIndex.toFixed(2)}</span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Water Balance</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                {hydroMetrics.waterBalanceMm >= 0 ? '+' : ''}{hydroMetrics.waterBalanceMm} mm/yr
              </span>
              <span className={s.flagSource}>
                {hydroMetrics.waterBalanceMm >= 0 ? 'surplus' : 'deficit'}
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>PET</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                {hydroMetrics.petMm} mm/yr
              </span>
              <span className={s.flagSource}>Blaney-Criddle</span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Harvest Potential</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                ~{fmtGal(hydroMetrics.rwhPotentialGal)} gal/yr
              </span>
              <span className={s.flagSource}>catchment RWH</span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Storage Sizing</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                ~{fmtGal(hydroMetrics.rwhStorageGal)} gal
              </span>
              <span className={s.flagSource}>2-week buffer</span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Irrigation</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                {hydroMetrics.irrigationDeficitMm === 0
                  ? 'No gap projected'
                  : `${hydroMetrics.irrigationDeficitMm} mm deficit`}
              </span>
              <span className={s.flagSource}>
                {hydroMetrics.irrigationDeficitMm === 0 ? 'surplus' : 'vs PET'}
              </span>
            </div>
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Growing Period</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                {hydroMetrics.lgpDays} days
              </span>
              <span className={s.flagSource}>{hydroMetrics.lgpClass}</span>
            </div>
            {windEnergy ? (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Wind Power</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: windEnergy.windPowerClass === 'Excellent' || windEnergy.windPowerClass === 'Good'
                    ? confidence.high
                    : windEnergy.windPowerClass === 'Moderate' ? confidence.medium
                    : confidence.low,
                }}>
                  {windEnergy.powerDensityWm2} W/m²
                </span>
                <span className={s.flagSource}>
                  {windEnergy.windPowerClass} ({windEnergy.optimalDirection})
                </span>
              </div>
            ) : (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Wind Power</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right', opacity: 0.5 }}>
                  No wind data
                </span>
              </div>
            )}
            {solarPV ? (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Solar PV</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: solarPV.pvClass === 'Excellent' || solarPV.pvClass === 'Good'
                    ? confidence.high
                    : solarPV.pvClass === 'Moderate' ? confidence.medium
                    : confidence.low,
                }}>
                  {solarPV.peakSunHours} PSH/day
                </span>
                <span className={s.flagSource}>
                  {solarPV.pvClass} (~{solarPV.annualYieldKwhPerKwp} kWh/kWp/yr)
                </span>
              </div>
            ) : (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Solar PV</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right', opacity: 0.5 }}>
                  No solar data
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
