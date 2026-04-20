/**
 * Sprint BN — Site Summary + AI Narrative cluster extracted from SiteIntelligencePanel.
 *
 * Renders the Site Summary paragraph (AI narrative with confidence badge when
 * available, else deterministic fallback), the "What This Land Wants" card
 * (site synthesis or deterministic land-wants), the Design Recommendations
 * multi-card AI block, and the AI loading indicator.
 *
 * Wrapped in React.memo + SectionProfiler.
 */

import { memo } from 'react';
import type { AIEnrichmentState } from '../../../store/siteDataStore.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { semantic } from '../../../lib/tokens.js';
import { Spinner } from '../../ui/Spinner.js';
import { AILabel } from './_shared.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface SiteSummaryNarrativeSectionProps {
  enrichment: AIEnrichmentState | undefined;
  siteSummary: string;
  landWants: string;
}

export const SiteSummaryNarrativeSection = memo(function SiteSummaryNarrativeSection({
  enrichment,
  siteSummary,
  landWants,
}: SiteSummaryNarrativeSectionProps) {
  return (
    <SectionProfiler id="site-intel-site-summary">
      {/* ── Site Summary ───────────────────────────────────────────── */}
      <h3 className={p.sectionLabel}>Site Summary</h3>
      {enrichment?.aiNarrative ? (
        <div className={s.aiNarrative}>
          <AILabel confidence={enrichment.aiNarrative.confidence} />
          <p className={s.summaryText}>{enrichment.aiNarrative.content}</p>
          {enrichment.aiNarrative.caveat && (
            <p className={s.aiCaveat}>{enrichment.aiNarrative.caveat}</p>
          )}
        </div>
      ) : (
        <p className={s.summaryText}>{siteSummary}</p>
      )}

      {/* ── What This Land Wants ───────────────────────────────────── */}
      <div className={s.landWantsCard}>
        <h3 className={p.sectionLabel}>What This Land Wants</h3>
        {enrichment?.aiNarrative && enrichment.siteSynthesis ? (
          <div className={s.aiNarrative}>
            <AILabel confidence={enrichment.aiNarrative.confidence} />
            <p className={s.landWantsText}>{enrichment.siteSynthesis}</p>
          </div>
        ) : (
          <p className={s.landWantsText}>{landWants}</p>
        )}
      </div>

      {/* ── Design Recommendations (AI) ────────────────────────────── */}
      {enrichment?.designRecommendation && (
        <div className={s.designRecSection}>
          <h3 className={p.sectionLabel}>Design Recommendations</h3>
          <AILabel confidence={enrichment.designRecommendation.confidence} />
          <div className={s.designRecContent}>
            {enrichment.designRecommendation.content.split(/\n(?=\d+\.)/).map((block, i) => (
              <div key={i} className={s.designRecCard}>
                <p>{block.trim()}</p>
              </div>
            ))}
          </div>
          {enrichment.designRecommendation.caveat && (
            <p className={s.aiCaveat}>{enrichment.designRecommendation.caveat}</p>
          )}
        </div>
      )}

      {/* ── AI Loading Indicator ───────────────────────────────────── */}
      {enrichment?.status === 'loading' && (
        <div className={s.aiLoadingHint}>
          <Spinner size="sm" color={semantic.sidebarActive} />
          <span>Generating AI insights...</span>
        </div>
      )}
    </SectionProfiler>
  );
});
