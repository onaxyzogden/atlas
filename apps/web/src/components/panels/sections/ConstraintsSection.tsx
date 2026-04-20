/**
 * Sprint BO — Key Constraints section extracted from SiteIntelligencePanel.
 *
 * Renders the prioritized top-constraints list (critical-first, then weak-
 * component-matched). Per-flag severity badge + icon branching kept inside.
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

export interface ConstraintsSectionProps {
  topConstraints: AssessmentFlag[];
  enrichment: AIEnrichmentState | undefined;
  showAll: boolean;
  onToggleShowAll: () => void;
}

export const ConstraintsSection = memo(function ConstraintsSection({
  topConstraints,
  enrichment,
  showAll,
  onToggleShowAll,
}: ConstraintsSectionProps) {
  return (
    <SectionProfiler id="site-intel-constraints">
      <h3 className={p.sectionLabel}>Key Constraints</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {(showAll ? topConstraints : topConstraints.slice(0, 3)).map((flag) => {
          const enriched = enrichment?.enrichedFlags?.find((ef) => ef.id === flag.id);
          return (
            <div key={flag.id} className={s.oppRiskRow}>
              <span
                className={s.riskIcon}
                style={{ color: severityColor(flag.severity, confidence.low) }}
              >
                {flag.severity === 'critical' ? '\u26D4' : '\u26A0'}
              </span>
              <div className={s.flagContent}>
                <span>{flag.message}</span>
                <div className={s.flagMeta}>
                  {flag.severity !== 'info' && (
                    <span className={`${s.severityBadge} ${s[`severity_${flag.severity}`]}`}>
                      {flag.severity}
                    </span>
                  )}
                  {flag.layerSource && (
                    <span className={s.flagSource}>{flag.layerSource}</span>
                  )}
                </div>
                {enriched?.aiNarrative && (
                  <p className={s.enrichedFlagNote}>{enriched.aiNarrative}</p>
                )}
              </div>
            </div>
          );
        })}
        {topConstraints.length > 3 && (
          <button className={s.showAllToggle} onClick={onToggleShowAll}>
            {showAll ? 'Show fewer' : `Show all ${topConstraints.length}`}
          </button>
        )}
        {topConstraints.length === 0 && (
          <span className={s.flagSource}>No constraints identified from current data</span>
        )}
      </div>
    </SectionProfiler>
  );
});
