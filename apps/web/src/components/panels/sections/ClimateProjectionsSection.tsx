/**
 * Sprint BM — Climate Projections section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BE Cat 5 mid-century IPCC AR6 projections (SSP2-4.5 and
 * SSP5-8.5 ensemble-median deltas) with warming class, precip trend, and
 * advisory narrative. Non-toggleable header.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { ClimateProjection } from '../../../lib/climateProjections.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface ClimateProjectionsSectionProps {
  climateProjections: ClimateProjection | null;
}

export const ClimateProjectionsSection = memo(function ClimateProjectionsSection({
  climateProjections,
}: ClimateProjectionsSectionProps) {
  if (!climateProjections) return null;

  return (
    <SectionProfiler id="site-intel-climate-projections">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9728;</span>
          <span className={s.liveDataTitle}>Climate Projections (2041–2060)</span>
        </div>
        <div className={p.innerPad}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>IPCC Region</span>
            <span className={`${s.liveDataValue} ${p.rightAlign}`}>
              {climateProjections.region}
            </span>
            <span className={s.flagSource}>IPCC AR6</span>
          </div>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Warming by 2050</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: climateProjections.warmingClass === 'Low' ? confidence.high
                : climateProjections.warmingClass === 'Moderate' ? confidence.medium
                : confidence.low,
            }}>
              +{climateProjections.ssp245.deltaTempC.toFixed(1)}&deg;C (SSP2-4.5) / +{climateProjections.ssp585.deltaTempC.toFixed(1)}&deg;C (SSP5-8.5)
            </span>
            <span className={s.scoreBadge} style={{
              background: `${climateProjections.warmingClass === 'Low' ? confidence.high : climateProjections.warmingClass === 'Moderate' ? confidence.medium : confidence.low}18`,
              color: climateProjections.warmingClass === 'Low' ? confidence.high : climateProjections.warmingClass === 'Moderate' ? confidence.medium : confidence.low,
            }}>
              {climateProjections.warmingClass}
            </span>
          </div>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Precipitation Change</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: climateProjections.precipTrend === 'Stable' || climateProjections.precipTrend === 'Wetter' ? confidence.high
                : climateProjections.precipTrend === 'Drier' ? confidence.medium : confidence.low,
            }}>
              {climateProjections.ssp245.deltaPrecipPct > 0 ? '+' : ''}{climateProjections.ssp245.deltaPrecipPct}% / {climateProjections.ssp585.deltaPrecipPct > 0 ? '+' : ''}{climateProjections.ssp585.deltaPrecipPct}%
            </span>
            <span className={s.scoreBadge} style={{
              background: `${climateProjections.precipTrend === 'Stable' || climateProjections.precipTrend === 'Wetter' ? confidence.high : climateProjections.precipTrend === 'Drier' ? confidence.medium : confidence.low}18`,
              color: climateProjections.precipTrend === 'Stable' || climateProjections.precipTrend === 'Wetter' ? confidence.high : climateProjections.precipTrend === 'Drier' ? confidence.medium : confidence.low,
            }}>
              {climateProjections.precipTrend}
            </span>
          </div>
          {climateProjections.ssp585.projectedTempC != null && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <div className={p.tokenIconFs12Leading}>
                {climateProjections.advisory}
              </div>
              <div className={`${p.tokenIcon} ${p.fs11} ${p.mt4}`}>
                Historical: {climateProjections.historicalTempC?.toFixed(1) ?? '—'}&deg;C / {climateProjections.historicalPrecipMm ?? '—'} mm &middot;
                &nbsp;Projected (SSP5-8.5): {climateProjections.ssp585.projectedTempC.toFixed(1)}&deg;C / {climateProjections.ssp585.projectedPrecipMm ?? '—'} mm
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
