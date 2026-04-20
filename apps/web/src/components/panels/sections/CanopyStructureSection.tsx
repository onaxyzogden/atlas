/**
 * Sprint BO — Canopy Structure section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BF Cat 7 canopy-height estimate (biome-modelled).
 * Non-toggleable.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { CanopyHeightResult } from '../../../lib/canopyHeight.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface CanopyStructureSectionProps {
  canopyHeight: CanopyHeightResult | null;
}

export const CanopyStructureSection = memo(function CanopyStructureSection({
  canopyHeight,
}: CanopyStructureSectionProps) {
  if (!canopyHeight || canopyHeight.estimated_height_m == null) return null;

  return (
    <SectionProfiler id="site-intel-canopy">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9650;</span>
          <span className={s.liveDataTitle}>Canopy Structure</span>
        </div>
        <div className={p.innerPad}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Estimated Height</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: canopyHeight.biome === 'Non-forest' ? confidence.low : confidence.medium,
            }}>
              {canopyHeight.biome === 'Non-forest'
                ? 'Non-forest (N/A)'
                : `~${canopyHeight.estimated_height_m} m (modelled)`}
            </span>
            <span className={s.flagSource}>{canopyHeight.biome}</span>
          </div>
          <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
            <div style={{ fontSize: 10, color: semantic.sidebarIcon, fontStyle: 'italic', lineHeight: 1.5 }}>
              {canopyHeight.note}
            </div>
          </div>
        </div>
      </div>
    </SectionProfiler>
  );
});
