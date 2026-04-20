/**
 * Sprint BN — Energy Intelligence section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BD Cat 9 geothermal (GSHP) + solar-battery storage rollup.
 * Non-toggleable header.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { GeothermalResult, EnergyStorageResult } from '../../../lib/energyIntelligence.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface EnergyIntelligenceData {
  geothermal: GeothermalResult | null;
  storage: EnergyStorageResult | null;
}

export interface EnergyIntelligenceSectionProps {
  energyIntelligence: EnergyIntelligenceData | null;
}

export const EnergyIntelligenceSection = memo(function EnergyIntelligenceSection({
  energyIntelligence,
}: EnergyIntelligenceSectionProps) {
  if (!energyIntelligence || (!energyIntelligence.geothermal && !energyIntelligence.storage)) return null;

  return (
    <SectionProfiler id="site-intel-energy">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#9889;</span>
          <span className={s.liveDataTitle}>Energy Intelligence</span>
        </div>
        <div className={p.innerPad}>
          {energyIntelligence.geothermal && (
            <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Geothermal (GSHP)</span>
                <span className={s.scoreBadge} style={{
                  background: `${energyIntelligence.geothermal.rating === 'Excellent' || energyIntelligence.geothermal.rating === 'Good' ? confidence.high
                    : energyIntelligence.geothermal.rating === 'Fair' ? confidence.medium : confidence.low}18`,
                  color: energyIntelligence.geothermal.rating === 'Excellent' || energyIntelligence.geothermal.rating === 'Good' ? confidence.high
                    : energyIntelligence.geothermal.rating === 'Fair' ? confidence.medium : confidence.low,
                }}>
                  {energyIntelligence.geothermal.rating}
                </span>
              </div>
              <div className={p.tokenIconFs12Leading}>
                {energyIntelligence.geothermal.recommendation}
              </div>
              <div className={`${p.tokenIcon} ${p.fs11} ${p.mt4}`}>
                Ground {energyIntelligence.geothermal.groundTempC}&deg;C &middot; soil K {energyIntelligence.geothermal.soilConductivityWmK} W/m&middot;K &middot; COP ~{energyIntelligence.geothermal.heatPumpCopEst}
              </div>
            </div>
          )}
          {energyIntelligence.storage && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Solar + Battery Storage</span>
                <span className={s.scoreBadge} style={{
                  background: `${energyIntelligence.storage.rating === 'Excellent' || energyIntelligence.storage.rating === 'Good' ? confidence.high
                    : energyIntelligence.storage.rating === 'Adequate' ? confidence.medium : confidence.low}18`,
                  color: energyIntelligence.storage.rating === 'Excellent' || energyIntelligence.storage.rating === 'Good' ? confidence.high
                    : energyIntelligence.storage.rating === 'Adequate' ? confidence.medium : confidence.low,
                }}>
                  {energyIntelligence.storage.rating}
                </span>
              </div>
              <div className={p.tokenIconFs12Leading}>
                {energyIntelligence.storage.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
