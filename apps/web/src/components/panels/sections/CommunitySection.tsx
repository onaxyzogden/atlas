/**
 * Sprint BP — Community section extracted from SiteIntelligencePanel.
 *
 * Sprint V — US Census ACS demographics card: rural classification, pop.
 * density, median income, median age. Toggleable.
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

export interface DemographicsMetrics {
  popDensityKm2: number | null;
  medianIncomeUsd: number | null;
  medianAge: number | null;
  ruralClass: string | null;
  countyName: string | null;
  population: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface CommunitySectionProps {
  demographicsMetrics: DemographicsMetrics | null;
  communityOpen: boolean;
  onToggleCommunity: () => void;
}

export const CommunitySection = memo(function CommunitySection({
  demographicsMetrics,
  communityOpen,
  onToggleCommunity,
}: CommunitySectionProps) {
  if (!demographicsMetrics) return null;

  return (
    <SectionProfiler id="site-intel-community">
      <div className={`${s.liveDataWrap} ${p.mb20}`}>
        <button
          onClick={onToggleCommunity}
          className={`${s.liveDataHeader} ${communityOpen ? s.liveDataHeaderOpen : ''}`}
        >
          <span className={p.tokenActive}>&#9679;</span>
          <span className={s.liveDataTitle}>Community</span>
          <div className={p.flex1} />
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"
            stroke={semantic.sidebarIcon} strokeWidth={1.5} strokeLinecap="round"
            className={`${s.chevron} ${!communityOpen ? s.chevronClosed : ''}`}>
            <path d="M3 7l3-3 3 3" />
          </svg>
        </button>
        {communityOpen && (
          <div className={p.innerPad}>
            {demographicsMetrics.ruralClass && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Rural Class</span>
                <div className={p.rightAlign}>
                  <span className={s.scoreBadge} style={{
                    background: `${confidence.medium}18`, color: confidence.medium,
                  }}>
                    {demographicsMetrics.ruralClass}
                  </span>
                </div>
                <span className={s.flagSource}>{demographicsMetrics.countyName ?? 'ACS'}</span>
              </div>
            )}
            {demographicsMetrics.popDensityKm2 != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Pop. Density</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {demographicsMetrics.popDensityKm2 < 1
                    ? '<1'
                    : Math.round(demographicsMetrics.popDensityKm2).toLocaleString()} /km&#178;
                </span>
                <span className={s.flagSource}>
                  {demographicsMetrics.popDensityKm2 <= 10 ? 'Rural' : demographicsMetrics.popDensityKm2 <= 100 ? 'Suburban fringe' : 'Urban adjacent'}
                </span>
              </div>
            )}
            {demographicsMetrics.medianIncomeUsd != null && (
              <div className={s.liveDataRow}>
                <span className={s.liveDataLabel}>Median Income</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  ${demographicsMetrics.medianIncomeUsd.toLocaleString()}
                </span>
                <span className={s.flagSource}>household / yr</span>
              </div>
            )}
            {demographicsMetrics.medianAge != null && (
              <div className={s.liveDataRow} style={{ borderBottom: 'none' }}>
                <span className={s.liveDataLabel}>Median Age</span>
                <span className={`${s.liveDataValue} ${p.rightAlign}`}>
                  {demographicsMetrics.medianAge} yrs
                </span>
                <ConfBadge level={capConf(demographicsMetrics.confidence)} />
              </div>
            )}
          </div>
        )}
      </div>
    </SectionProfiler>
  );
});
