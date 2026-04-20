/**
 * Sprint BL — Groundwater section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint M groundwater depth card: depth-to-water, depth class
 * heuristic, nearest monitoring station, measurement date, confidence badge.
 * Source: USGS NWIS (US) / Ontario PGMN (CA).
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import { ConfBadge } from './_shared.js';
import { capConf } from './_helpers.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface GroundwaterMetrics {
  depthM: number | null;
  depthFt: number | null;
  stationKm: number | null;
  stationName: string | null;
  measureDate: string | null;
  depthClass: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GroundwaterSectionProps {
  groundwaterMetrics: GroundwaterMetrics | null;
  groundwaterOpen: boolean;
  onToggleGroundwater: () => void;
}

export const GroundwaterSection = memo(function GroundwaterSection({
  groundwaterMetrics,
  groundwaterOpen,
  onToggleGroundwater,
}: GroundwaterSectionProps) {
  if (!groundwaterMetrics) return null;

  return (
    <SectionProfiler id="site-intel-groundwater">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleGroundwater}
          className={`${s.liveDataHeader} ${groundwaterOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9672;</span>
          <span className={s.liveDataTitle}>Groundwater</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!groundwaterOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {groundwaterOpen && (
          <div className={p.innerPad}>
            {groundwaterMetrics.depthM !== null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Depth to Water</span>
                <span className={s.liveDataValue} style={{
                  flex: 1, textAlign: 'right',
                  color: groundwaterMetrics.depthM <= 3 ? confidence.medium
                    : groundwaterMetrics.depthM <= 10 ? confidence.high
                    : groundwaterMetrics.depthM <= 30 ? confidence.medium
                    : confidence.low,
                }}>
                  {groundwaterMetrics.depthM} m
                </span>
                <span className={s.flagSource}>
                  {groundwaterMetrics.depthFt !== null ? `${groundwaterMetrics.depthFt} ft` : ''}
                </span>
              </div>
            )}
            <div className={s.liveDataRow}>
              <span className={s.liveDataLabel}>Depth Class</span>
              <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                {groundwaterMetrics.depthClass}
              </span>
              <span className={s.flagSource}>
                {groundwaterMetrics.depthM !== null && groundwaterMetrics.depthM <= 3
                  ? 'shallow — waterlogging risk'
                  : groundwaterMetrics.depthM !== null && groundwaterMetrics.depthM <= 10
                  ? 'optimal for wells'
                  : 'deep — well drilling cost'}
              </span>
            </div>
            {groundwaterMetrics.stationName && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Station</span>
                <span className={`${s.liveDataValue} ${p.rightAlign} ${p.fs11}`}>
                  {groundwaterMetrics.stationName}
                </span>
                {groundwaterMetrics.stationKm !== null && (
                  <span className={s.flagSource}>{groundwaterMetrics.stationKm} km away</span>
                )}
              </div>
            )}
            {groundwaterMetrics.measureDate && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Measured</span>
                <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right', opacity: 0.7 }}>
                  {groundwaterMetrics.measureDate}
                </span>
                <ConfBadge level={capConf(groundwaterMetrics.confidence)} />
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
