/**
 * Sprint BO — Land-Use History section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BF Cat 8 NLCD 2001-2021 multi-epoch land-use rollup:
 * epochs sampled, top transitions, disturbance flags with buildability
 * penalty chip. Non-toggleable.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface LandUseHistoryMetrics {
  epochs: number;
  source: string;
  transitions: string[];
  disturbanceFlags: string[];
}

export interface LandUseHistorySectionProps {
  landUseHistoryMetrics: LandUseHistoryMetrics | null;
}

export const LandUseHistorySection = memo(function LandUseHistorySection({
  landUseHistoryMetrics,
}: LandUseHistorySectionProps) {
  if (!landUseHistoryMetrics || landUseHistoryMetrics.epochs < 2) return null;

  return (
    <SectionProfiler id="site-intel-land-use-history">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9204;</span>
          <span className={s.liveDataTitle}>Land-Use History (NLCD 2001&ndash;2021)</span>
        </div>
        <div className={p.innerPad}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Epochs Sampled</span>
            <span className={s.liveDataValue} style={{ flex: 1, textAlign: 'right', color: confidence.high }}>
              {landUseHistoryMetrics.epochs} / 6
            </span>
            <span className={s.flagSource}>{landUseHistoryMetrics.source}</span>
          </div>
          {landUseHistoryMetrics.transitions.length > 0 && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <span className={s.liveDataLabel} style={{ marginBottom: 4 }}>Transitions</span>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: semantic.sidebarIcon, lineHeight: 1.5 }}>
                {landUseHistoryMetrics.transitions.slice(0, 3).map((t, i) => (<li key={i}>{t}</li>))}
                {landUseHistoryMetrics.transitions.length > 3 && (
                  <li style={{ fontStyle: 'italic' }}>+{landUseHistoryMetrics.transitions.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
          {landUseHistoryMetrics.disturbanceFlags.length > 0 && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Disturbance Flags</span>
                <span className={s.scoreBadge} style={{
                  background: `${confidence.low}18`, color: confidence.low,
                }}>
                  Buildability &minus;2
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {landUseHistoryMetrics.disturbanceFlags.map((f, i) => (
                  <span key={i} className={s.scoreBadge} style={{
                    background: `${confidence.medium}18`, color: confidence.medium, fontSize: 10,
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
