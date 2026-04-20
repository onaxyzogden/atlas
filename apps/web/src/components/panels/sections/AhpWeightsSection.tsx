/**
 * Sprint BO — Weighted Priority / AHP section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BF Cat 1b Saaty 1980 AHP weights across 8 priorities plus
 * the consistency-ratio row. Non-toggleable, always renders.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { AhpResult } from '../../../lib/fuzzyMCDM.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface AhpWeightsSectionProps {
  ahpResult: AhpResult;
}

const AHP_LABELS = ['Water', 'Agri', 'Regen', 'Build', 'Habitat', 'Steward', 'Community', 'Complexity'];

export const AhpWeightsSection = memo(function AhpWeightsSection({
  ahpResult,
}: AhpWeightsSectionProps) {
  return (
    <SectionProfiler id="site-intel-ahp">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#8710;</span>
          <span className={s.liveDataTitle}>Weighted Priority (AHP)</span>
        </div>
        <div className={p.innerPad}>
          {AHP_LABELS.map((lbl, i) => {
            const w = ahpResult.weights[i] ?? 0;
            return (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: semantic.sidebarIcon, padding: '2px 12px' }}>
                <span style={{ width: 72 }}>{lbl}</span>
                <div style={{ flex: 1, height: 6, background: `${confidence.high}22`, borderRadius: 3 }}>
                  <div style={{ width: `${Math.round(w * 100 / 0.25)}%`, height: '100%', background: confidence.high, borderRadius: 3, maxWidth: '100%' }} />
                </div>
                <span style={{ width: 40, textAlign: 'right' }}>{(w * 100).toFixed(1)}%</span>
              </div>
            );
          })}
          <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
            <span className={s.liveDataLabel}>Consistency Ratio (CR)</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: ahpResult.consistent ? confidence.high : confidence.medium,
            }}>
              {(ahpResult.consistencyRatio * 100).toFixed(2)}% {ahpResult.consistent ? '(consistent)' : '(review)'}
            </span>
            <span className={s.flagSource}>Saaty 1980</span>
          </div>
        </div>
      </div>
    </SectionProfiler>
  );
});
