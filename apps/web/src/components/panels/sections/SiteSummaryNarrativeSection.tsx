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

import { memo, useEffect, useMemo } from 'react';
import type { AIEnrichmentState } from '../../../store/siteDataStore.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { semantic } from '../../../lib/tokens.js';
import { Spinner } from '../../ui/Spinner.js';
import EvidenceSection from '../../evidence/EvidenceSection.js';
import { selectEvidenceFor } from '@ogden/shared/evidence';
import { emitEvidenceAudit } from '../../../lib/evidence/auditEmit.js';
import { AILabel } from './_shared.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface SiteSummaryNarrativeSectionProps {
  enrichment: AIEnrichmentState | undefined;
  siteSummary: string;
  landWants: string;
  /** Optional context for Evidence selector. */
  acreage?: number | null;
  layerCount?: number;
  liveCount?: number;
  /** Phase E.4 mobile guard. */
  compactMode?: boolean;
  /** Phase F.7 audit emit target. */
  projectId: string;
}

export const SiteSummaryNarrativeSection = memo(function SiteSummaryNarrativeSection({
  enrichment,
  siteSummary,
  landWants,
  acreage = null,
  layerCount = 0,
  liveCount,
  compactMode = false,
  projectId,
}: SiteSummaryNarrativeSectionProps) {
  const evidenceInputs = useMemo(
    () => ({
      acreage,
      layerCount,
      liveCount,
      modelVersion: undefined,
      hasAiNarrative: Boolean(enrichment?.aiNarrative),
      caveat: enrichment?.aiNarrative?.caveat,
    }),
    [acreage, layerCount, liveCount, enrichment?.aiNarrative],
  );
  const evidenceItem = useMemo(
    () => selectEvidenceFor({ panelKey: 'site-narrative', inputs: evidenceInputs }),
    [evidenceInputs],
  );
  useEffect(() => {
    if (!evidenceItem) return;
    emitEvidenceAudit({
      projectId,
      panelKey: 'SiteSummaryNarrativeSection',
      selectorName: 'selectEvidenceFor(site-narrative)',
      inputs: evidenceInputs,
      output: evidenceItem,
    });
  }, [evidenceInputs, evidenceItem, projectId]);
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

      {/* ── Tier-2 Evidence (Phase E.4) ────────────────────────────── */}
      <EvidenceSection item={evidenceItem} compactMode={compactMode} />
    </SectionProfiler>
  );
});
