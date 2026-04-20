/**
 * Sprint BM — Ecosystem Services section extracted from SiteIntelligencePanel.
 *
 * Renders Sprint BE Cat 7 ecosystem valuation (de Groot 2012) + wetland
 * function classification. Non-toggleable header (always expanded when
 * data is present).
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { EcosystemValuation, WetlandFunction } from '../../../lib/ecosystemValuation.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence, semantic } from '../../../lib/tokens.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export interface EcosystemIntelligence {
  valuation: EcosystemValuation;
  wetlandFunction: WetlandFunction;
}

export interface EcosystemServicesSectionProps {
  ecosystemIntelligence: EcosystemIntelligence | null;
}

export const EcosystemServicesSection = memo(function EcosystemServicesSection({
  ecosystemIntelligence,
}: EcosystemServicesSectionProps) {
  if (!ecosystemIntelligence) return null;

  return (
    <SectionProfiler id="site-intel-ecosystem">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <div className={`${s.liveDataHeader} ${p.cursorDefault}`}>
          <span className={p.tokenActive}>&#10048;</span>
          <span className={s.liveDataTitle}>Ecosystem Services</span>
        </div>
        <div className={p.innerPad}>
          <div className={s.liveDataRow}>
            <span className={s.liveDataLabel}>Total ESV</span>
            <span className={s.liveDataValue} style={{
              flex: 1, textAlign: 'right',
              color: ecosystemIntelligence.valuation.totalUsdHaYr > 4000 ? confidence.high
                : ecosystemIntelligence.valuation.totalUsdHaYr > 1500 ? confidence.medium
                : confidence.low,
            }}>
              ${ecosystemIntelligence.valuation.totalUsdHaYr.toLocaleString()}/ha/yr
              {ecosystemIntelligence.valuation.totalUsdYr != null ? ` (~$${ecosystemIntelligence.valuation.totalUsdYr.toLocaleString()}/yr site)` : ''}
            </span>
            <span className={s.flagSource}>de Groot 2012</span>
          </div>
          <div className={`${s.liveDataRow} ${p.colStretchPad}`}>
            <div style={{ fontSize: 12, color: semantic.sidebarIcon, lineHeight: 1.5, marginBottom: 6 }}>
              {ecosystemIntelligence.valuation.narrative}
            </div>
            <div className={p.tokenIconGrid2}>
              <div>Carbon: ${ecosystemIntelligence.valuation.servicesUsdHaYr.carbonStorage}</div>
              <div>Pollination: ${ecosystemIntelligence.valuation.servicesUsdHaYr.pollination}</div>
              <div>Water reg.: ${ecosystemIntelligence.valuation.servicesUsdHaYr.waterRegulation}</div>
              <div>Water qual.: ${ecosystemIntelligence.valuation.servicesUsdHaYr.waterQuality}</div>
              <div>Habitat: ${ecosystemIntelligence.valuation.servicesUsdHaYr.habitatProvision}</div>
              <div>Erosion: ${ecosystemIntelligence.valuation.servicesUsdHaYr.erosionControl}</div>
              <div>Recreation: ${ecosystemIntelligence.valuation.servicesUsdHaYr.recreation}</div>
            </div>
          </div>
          {ecosystemIntelligence.wetlandFunction.class !== 'None' && (
            <div className={`${s.liveDataRow} ${p.colStretchPad} ${p.borderBottomNone}`}>
              <div className={p.flexBetween}>
                <span className={s.liveDataLabel}>Wetland Function</span>
                <span className={s.scoreBadge} style={{
                  background: `${ecosystemIntelligence.wetlandFunction.functionScore >= 70 ? confidence.high : ecosystemIntelligence.wetlandFunction.functionScore >= 40 ? confidence.medium : confidence.low}18`,
                  color: ecosystemIntelligence.wetlandFunction.functionScore >= 70 ? confidence.high : ecosystemIntelligence.wetlandFunction.functionScore >= 40 ? confidence.medium : confidence.low,
                }}>
                  {ecosystemIntelligence.wetlandFunction.class} &middot; {ecosystemIntelligence.wetlandFunction.functionScore}/100
                </span>
              </div>
              <div className={p.tokenIconFs12Leading}>
                {ecosystemIntelligence.wetlandFunction.narrative}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
