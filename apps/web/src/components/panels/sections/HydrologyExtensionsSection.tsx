/**
 * Sprint BN — Hydrology Extensions section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BD Cat 4 aquifer / water stress / seasonal flooding rows
 * (USGS Principal Aquifer, WRI Aqueduct 4.0, USGS NWIS seasonality).
 * Non-toggleable header (always expanded when any metric is present).
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface AquiferMetrics {
  name: string | null;
  rockType: string | null;
  productivity: string | null;
  confidence: string;
}

export interface WaterStressMetrics {
  score: number | null;
  label: string | null;
  stressClass: string | null;
  droughtRisk: string | null;
  floodRisk: string | null;
  confidence: string;
}

export interface SeasonalFloodingMetrics {
  gaugeName: string | null;
  gaugeKm: number | null;
  peakMonth: string | null;
  lowMonth: string | null;
  variability: number | null;
  seasonalityClass: string | null;
  confidence: string;
}

export interface HydrologyExtensionsSectionProps {
  aquiferMetrics: AquiferMetrics | null;
  waterStressMetrics: WaterStressMetrics | null;
  seasonalFloodingMetrics: SeasonalFloodingMetrics | null;
}

export const HydrologyExtensionsSection = memo(function HydrologyExtensionsSection({
  aquiferMetrics,
  waterStressMetrics,
  seasonalFloodingMetrics,
}: HydrologyExtensionsSectionProps) {
  if (!aquiferMetrics && !waterStressMetrics && !seasonalFloodingMetrics) return null;

  return (
    <SectionProfiler id="site-intel-hydrology-extensions">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9830;</span>
          <span className={s.liveDataTitle}>Hydrology Extensions</span>
        </div>
        <div className={p.innerPad}>
          {aquiferMetrics && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Principal Aquifer</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: aquiferMetrics.productivity === 'High' ? confidence.high
                  : aquiferMetrics.productivity === 'Moderate' ? confidence.medium
                  : confidence.low,
              }}>
                {aquiferMetrics.productivity ?? '—'}
              </span>
              <span className={s.flagSource}>{aquiferMetrics.name ?? 'USGS'}</span>
            </div>
          )}
          {waterStressMetrics && (
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Water Stress</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: waterStressMetrics.stressClass === 'Low' || waterStressMetrics.stressClass === 'Low-Medium' ? confidence.high
                  : waterStressMetrics.stressClass === 'Medium-High' ? confidence.medium
                  : confidence.low,
              }}>
                {waterStressMetrics.stressClass ?? '—'}
              </span>
              <span className={s.flagSource}>WRI Aqueduct 4.0</span>
            </div>
          )}
          {seasonalFloodingMetrics && (
            <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
              <span className={s.liveDataLabel}>Stream Seasonality</span>
              <span className={s.liveDataValue} style={{
                flex: 1, textAlign: 'right',
                color: seasonalFloodingMetrics.seasonalityClass === 'Low' ? confidence.high
                  : seasonalFloodingMetrics.seasonalityClass === 'Moderate' ? confidence.medium
                  : confidence.low,
              }}>
                {seasonalFloodingMetrics.seasonalityClass ?? '—'}
                {seasonalFloodingMetrics.peakMonth ? ` (peak ${seasonalFloodingMetrics.peakMonth})` : ''}
              </span>
              <span className={s.flagSource}>
                USGS NWIS {seasonalFloodingMetrics.gaugeKm != null ? `@ ${seasonalFloodingMetrics.gaugeKm} km` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
