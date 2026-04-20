/**
 * Sprint BO — Main Opportunities section extracted from SiteIntelligencePanel.
 *
 * Renders the prioritized top-opportunities list (parent owns the sort memo;
 * this section only handles display + show-all toggle). Enriches with AI
 * narrative per flag when available.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { AssessmentFlag } from '@ogden/shared';
import type { AIEnrichmentState } from '../../../store/siteDataStore.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { confidence } from '../../../lib/tokens.js';
import { severityColor } from './_helpers.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface OpportunitiesSectionProps {
  topOpportunities: AssessmentFlag[];
  enrichment: AIEnrichmentState | undefined;
  showAll: boolean;
  onToggleShowAll: () => void;
}

export const OpportunitiesSection = memo(function OpportunitiesSection({
  topOpportunities,
  enrichment,
  showAll,
  onToggleShowAll,
}: OpportunitiesSectionProps) {
  return (
    <SectionProfiler id="site-intel-opportunities">
      <h3 className={p.sectionLabel}>Main Opportunities</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {(showAll ? topOpportunities : topOpportunities.slice(0, 3)).map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.oppIcon}
                style={{ color: severityColor(flag.severity, confidence.high) }}
              >
                {'\u2197'}
              </span>
              <div className={s.flagContent}>
                <span>{flag.message}</span>
                {flag.layerSource && (
                  <span className={s.flagSource}>{flag.layerSource}</span>
                )}
                {enriched?.aiNarrative && (
                  <p className={s.enrichedFlagNote}>{enriched.aiNarrative}</p>
                )}
              </div>
            </div>
          );
        })}
        {topOpportunities.length > 3 && (
          <button className={s.showAllToggle} onClick={onToggleShowAll}>
            {showAll ? 'Show fewer' : `Show all ${topOpportunities.length}`}
          </button>
        )}
        {topOpportunities.length === 0 && (
          <span className={s.flagSource}>No opportunities identified from current data</span>
        )}
      </div>
    </SectionProfiler>
  );
});
