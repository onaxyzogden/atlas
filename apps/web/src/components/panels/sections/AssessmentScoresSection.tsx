/**
 * Sprint BN — Assessment Scores breakdown section extracted from SiteIntelligencePanel.
 *
 * Renders the 7-axis assessment-score list with per-score expandable
 * breakdown (sub-component bars, source layers, per-component confidence,
 * computed timestamp).
 *
 * Wrapped in React.memo + SectionProfiler. Expansion state owned by parent
 * (`expandedScore` / `onToggleExpandedScore`) for stable prop identity.
 */

import { memo } from 'react';
import type { AssessmentScore } from '../../../lib/computeScores.js';
import { SectionProfiler } from '../../../lib/perfProfiler.js';
import { ConfBadge, ScoreCircle } from './_shared.js';
import { capConf, formatComponentName, getScoreColor } from './_helpers.js';
import p from '../../../styles/panel.module.css';
import s from '../SiteIntelligencePanel.module.css';

export interface AssessmentScoresSectionProps {
  assessmentScores: AssessmentScore[];
  expandedScore: string | null;
  onToggleExpandedScore: (label: string) => void;
}

export const AssessmentScoresSection = memo(function AssessmentScoresSection({
  assessmentScores,
  expandedScore,
  onToggleExpandedScore,
}: AssessmentScoresSectionProps) {
  return (
    <SectionProfiler id="site-intel-assessment-scores">
      <h3 className={p.sectionLabel}>Assessment Scores</h3>
      <div className={`${p.section} ${p.sectionGapLg} ${p.mb20}`}>
        {assessmentScores.map((item) => (
          <div key={item.label}>
            <div
              className={`${s.scoreRow} ${s.scoreRowClickable}`}
              onClick={() => onToggleExpandedScore(item.label)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleExpandedScore(item.label); }}
            >
              <ScoreCircle score={item.score} size={36} />
              <div style={{ flex: 1 }}>
                <div className={s.scoreLabel}>{item.label}</div>
                <div className={s.scoreBar}>
                  <div className={s.scoreBarFill} style={{ width: `${item.score}%`, background: getScoreColor(item.score) }} />
                </div>
                {/* Data source tags */}
                {item.dataSources.length > 0 && (
                  <div className={s.scoreSourceTags}>
                    {item.dataSources.map((src) => (
                      <span key={src} className={s.sourceTag}>{src.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
              <ConfBadge level={capConf(item.confidence)} />
              <span
                className={s.scoreBadge}
                style={{ background: `${getScoreColor(item.score)}18`, color: getScoreColor(item.score) }}
              >
                {item.rating}
              </span>
            </div>
            {expandedScore === item.label && (
              <div className={s.scoreBreakdown}>
                {item.score_breakdown.map((comp) => {
                  const pct = comp.maxPossible > 0 ? Math.max(0, Math.min(100, (comp.value / comp.maxPossible) * 100)) : 0;
                  return (
                    <div key={comp.name} className={s.breakdownRow}>
                      <span className={s.breakdownName}>{formatComponentName(comp.name)}</span>
                      <div className={s.breakdownBarTrack}>
                        <div
                          className={s.breakdownBarFill}
                          style={{ width: `${pct}%`, background: getScoreColor(pct) }}
                        />
                      </div>
                      <span className={s.breakdownValue}>
                        {comp.value}/{comp.maxPossible}
                      </span>
                      <span className={s.breakdownSource}>{comp.sourceLayer.replace(/_/g, ' ')}</span>
                      <ConfBadge level={capConf(comp.confidence)} />
                    </div>
                  );
                })}
                {/* Computed timestamp */}
                {item.score_breakdown.length > 0 && (
                  <div className={s.breakdownTimestamp}>
                    Computed {new Date(item.computedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionProfiler>
  );
});
