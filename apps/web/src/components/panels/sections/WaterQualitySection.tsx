/**
 * Sprint BL — Water Quality section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint M water quality card: pH, dissolved oxygen, nitrate,
 * turbidity, nearest monitoring station with confidence badge.
 * Source: USGS Water Quality Portal / ECCC.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { ConfBadge } from './_shared.js';
import { capConf, getSoilPhColor } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface WaterQualityMetrics {
  ph: number | null;
  doMgL: number | null;
  nitrateMgL: number | null;
  turbidityNtu: number | null;
  stationKm: number | null;
  stationName: string | null;
  lastMeasured: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface WaterQualitySectionProps {
  waterQualityMetrics: WaterQualityMetrics | null;
  wqOpen: boolean;
  onToggleWq: () => void;
}

export const WaterQualitySection = memo(function WaterQualitySection({
  waterQualityMetrics,
  wqOpen,
  onToggleWq,
}: WaterQualitySectionProps) {
  if (!waterQualityMetrics) return null;

  return (
    <SectionProfiler id="site-intel-water-quality">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleWq}
          className={`${s.liveDataHeader} ${wqOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9670;</span>
          <span className={s.liveDataTitle}>Water Quality</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!wqOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {wqOpen && (
          <div className={p.innerPad}>
            {waterQualityMetrics.ph !== null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>pH</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge}
                    style={{ background: `${getSoilPhColor(waterQualityMetrics.ph)}18`,
                             color: getSoilPhColor(waterQualityMetrics.ph) }}>
                    {waterQualityMetrics.ph.toFixed(1)}
                  </span>
                </div>
                <span className={s.flagSource}>
                  {waterQualityMetrics.ph >= 6.5 && waterQualityMetrics.ph <= 8.5 ? 'Ideal for irrigation'
                    : waterQualityMetrics.ph < 6.5 ? 'Acidic' : 'Alkaline'}
                </span>
              </div>
            )}
            {waterQualityMetrics.doMgL !== null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Dissolved O&#8322;</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: waterQualityMetrics.doMgL >= 7 ? confidence.high
                    : waterQualityMetrics.doMgL >= 5 ? confidence.medium
                    : confidence.low,
                }}>
                  {waterQualityMetrics.doMgL.toFixed(1)} mg/L
                </span>
                <span className={s.flagSource}>
                  {waterQualityMetrics.doMgL >= 7 ? 'Good' : waterQualityMetrics.doMgL >= 5 ? 'Fair' : 'Poor — hypoxic risk'}
                </span>
              </div>
            )}
            {waterQualityMetrics.nitrateMgL !== null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Nitrate</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: waterQualityMetrics.nitrateMgL <= 3 ? confidence.high
                    : waterQualityMetrics.nitrateMgL <= 10 ? confidence.medium
                    : confidence.low,
                }}>
                  {waterQualityMetrics.nitrateMgL.toFixed(2)} mg/L
                </span>
                <span className={s.flagSource}>
                  {waterQualityMetrics.nitrateMgL <= 3 ? 'Low' : waterQualityMetrics.nitrateMgL <= 10 ? 'Moderate' : 'High — MCL risk'}
                </span>
              </div>
            )}
            {waterQualityMetrics.turbidityNtu !== null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Turbidity</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: waterQualityMetrics.turbidityNtu <= 1 ? confidence.high
                    : waterQualityMetrics.turbidityNtu <= 4 ? confidence.medium
                    : confidence.low,
                }}>
                  {waterQualityMetrics.turbidityNtu.toFixed(1)} NTU
                </span>
                <span className={s.flagSource}>
                  {waterQualityMetrics.turbidityNtu <= 1 ? 'Clear' : waterQualityMetrics.turbidityNtu <= 4 ? 'Slightly turbid' : 'Turbid'}
                </span>
              </div>
            )}
            {waterQualityMetrics.stationName && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Station</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {waterQualityMetrics.stationName}
                </span>
                <span className={s.flagSource}>
                  {waterQualityMetrics.stationKm !== null ? `${waterQualityMetrics.stationKm} km` : ''}
                </span>
                <ConfBadge level={capConf(waterQualityMetrics.confidence)} />
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
