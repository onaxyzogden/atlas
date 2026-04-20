/**
 * Sprint BO — Fuzzy FAO Suitability section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BF Cat 1a fuzzy membership (Zadeh 1965 / ALUES) — defuzzified
 * class + aggregate membership bars across S1/S2/S3/N1/N2.
 * Non-toggleable.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { FuzzyFAOResult } from '../../../lib/fuzzyMCDM.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface FuzzyFaoSectionProps {
  fuzzyFao: FuzzyFAOResult | null;
}

export const FuzzyFaoSection = memo(function FuzzyFaoSection({
  fuzzyFao,
}: FuzzyFaoSectionProps) {
  if (!fuzzyFao || fuzzyFao.confidence <= 0) return null;

  return (
    <SectionProfiler id="site-intel-fuzzy-fao">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#8793;</span>
          <span className={s.liveDataTitle}>Fuzzy FAO Suitability</span>
        </div>
        <div className={p.innerPad}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Defuzzified Class</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: fuzzyFao.defuzzifiedClass === 'S1' || fuzzyFao.defuzzifiedClass === 'S2' ? confidence.high
                : fuzzyFao.defuzzifiedClass === 'S3' ? confidence.medium
                : confidence.low,
            }}>
              {fuzzyFao.defuzzifiedClass} &middot; confidence {(fuzzyFao.confidence * 100).toFixed(0)}%
            </span>
            <span className={s.flagSource}>Zadeh 1965 / ALUES</span>
          </div>
          <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
            <div style={{ fontSize: 11, color: semantic.sidebarIcon, marginBottom: 4 }}>
              Aggregate membership across factors (gradual, not crisp)
            </div>
            {(['S1', 'S2', 'S3', 'N1', 'N2'] as const).map((cls) => {
              const v = fuzzyFao.aggregate[cls];
              const col = cls === 'S1' || cls === 'S2' ? confidence.high : cls === 'S3' ? confidence.medium : confidence.low;
              return (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: semantic.sidebarIcon, marginBottom: 2 }}>
                  <span style={{ width: 24 }}>{cls}</span>
                  <div style={{ flex: 1, height: 6, background: `${col}22`, borderRadius: 3 }}>
                    <div style={{ width: `${Math.round(v * 100)}%`, height: '100%', background: col, borderRadius: 3 }} />
                  </div>
                  <span style={{ width: 36, textAlign: 'right' }}>{(v * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionProfiler>
  );
});
