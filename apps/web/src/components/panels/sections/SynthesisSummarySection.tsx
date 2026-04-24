/**
 * §4 Risk/Opportunity/Limitation synthesis — a compact three-pillar TL;DR
 * positioned between the scores/flags bento and the detailed intelligence
 * stack. Gives the user a single-glance answer to "what is this site
 * telling me?" before they scroll into 30+ sections of detail.
 *
 * Derivation notes:
 *  - Risks: existing `topConstraints` memo (critical first, then weak-score
 *    components). Tone escalates to `critical` when blocking flags > 0.
 *  - Opportunities: existing `topOpportunities` memo.
 *  - Limitations: synthesized presentationally (no shared-package rule
 *    engine for this flag type — schema permits it, but no rules emit it).
 *    Contributors: missing tier-1 layers, regulatory-category risks, and
 *    very small acreage (< 5 ac) which constrains what's feasible.
 *
 * Wrapped in React.memo + SectionProfiler, sibling to ScoresAndFlagsSection.
 */

import { memo } from 'react';
import type { AssessmentFlag } from '@ogden/shared';
import { ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import s from '../SiteIntelligencePanel.module.css';

export interface SynthesisSummarySectionProps {
  topConstraints: AssessmentFlag[];
  topOpportunities: AssessmentFlag[];
  blockingFlagsCount: number;
  incompleteLayerCount: number;
  acreage: number | null;
}

/** Derive the three limitation contributors, in priority order. */
function computeLimitations(
  constraints: AssessmentFlag[],
  incompleteLayerCount: number,
  acreage: number | null,
): { count: number; headline: string; detail: string } {
  const parts: { label: string; detail: string }[] = [];

  const regulatoryRisks = constraints.filter((c) => c.category === 'regulatory');
  const firstReg = regulatoryRisks[0];
  if (firstReg) {
    parts.push({
      label: `${regulatoryRisks.length} regulatory constraint${regulatoryRisks.length === 1 ? '' : 's'}`,
      detail: firstReg.message,
    });
  }
  if (incompleteLayerCount > 0) {
    parts.push({
      label: `${incompleteLayerCount} data layer${incompleteLayerCount === 1 ? '' : 's'} missing`,
      detail: 'Assessment confidence is capped until upstream layers resolve.',
    });
  }
  if (acreage !== null && acreage < 5) {
    parts.push({
      label: 'Small parcel (<5 ac)',
      detail: 'Limits commercial-scale cropping and staged buildout options.',
    });
  }

  const first = parts[0];
  if (!first) {
    return { count: 0, headline: 'No structural limitations detected', detail: 'Scope is open — proceed with design.' };
  }
  return {
    count: parts.length,
    headline: first.label,
    detail: first.detail,
  };
}

export const SynthesisSummarySection = memo(function SynthesisSummarySection({
  topConstraints,
  topOpportunities,
  blockingFlagsCount,
  incompleteLayerCount,
  acreage,
}: SynthesisSummarySectionProps) {
  const riskTone = blockingFlagsCount > 0 ? 'critical' : topConstraints.length > 0 ? 'warning' : 'ok';
  const oppTone = topOpportunities.length > 0 ? 'positive' : 'neutral';

  const riskHeadline =
    topConstraints[0]?.message ?? 'No active constraints';
  const oppHeadline =
    topOpportunities[0]?.message ?? 'Opportunities pending data';

  const limitations = computeLimitations(topConstraints, incompleteLayerCount, acreage);

  return (
    <SectionProfiler id="site-intel-synthesis">
      <div className={s.synthesisGrid}>
        <div className={`${s.synthesisPillar} ${s[`synthesisPillar_${riskTone}`]}`}>
          <div className={s.synthesisPillarHead}>
            <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={s.synthesisPillarLabel}>Risks</span>
            <span className={s.synthesisPillarCount}>{topConstraints.length}</span>
          </div>
          <p className={s.synthesisPillarHeadline}>{riskHeadline}</p>
          {blockingFlagsCount > 0 && (
            <span className={s.synthesisPillarFoot}>
              {blockingFlagsCount} blocking
            </span>
          )}
        </div>

        <div className={`${s.synthesisPillar} ${s[`synthesisPillar_${oppTone}`]}`}>
          <div className={s.synthesisPillarHead}>
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={s.synthesisPillarLabel}>Opportunities</span>
            <span className={s.synthesisPillarCount}>{topOpportunities.length}</span>
          </div>
          <p className={s.synthesisPillarHeadline}>{oppHeadline}</p>
        </div>

        <div
          className={`${s.synthesisPillar} ${
            limitations.count === 0 ? s.synthesisPillar_ok : s.synthesisPillar_neutral
          }`}
        >
          <div className={s.synthesisPillarHead}>
            <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={s.synthesisPillarLabel}>Limitations</span>
            <span className={s.synthesisPillarCount}>{limitations.count}</span>
          </div>
          <p className={s.synthesisPillarHeadline}>{limitations.headline}</p>
          {limitations.detail && (
            <span className={s.synthesisPillarFoot}>{limitations.detail}</span>
          )}
        </div>
      </div>
    </SectionProfiler>
  );
});
