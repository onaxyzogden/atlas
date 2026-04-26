/**
 * WhyExpander — §17 "why this suggestion was made" inline expander.
 *
 * Renders a click-to-expand "Why?" toggle inside any rule-violation row.
 * Surfaces the reasoning behind a violation: rule id, category, base
 * severity vs. weight-adjusted effective severity (with the weight value
 * that drove the change), data source, full rule description, and a
 * site-visit pill when the rule needs ground-truthing.
 *
 * Pure presentation — wraps an existing `WeightedViolation` from
 * useSitingEvaluation. No store mutation, no new shared exports.
 *
 * Used by SitingWarningsCard, SpatialRelationshipsCard, and
 * SetbackSlopeSolarCard so the same rationale UI is consistent across
 * every §-rollup that surfaces violations.
 *
 * Spec: §17 `why-this-suggestion-was-made` (featureManifest, §0d AI
 * guardrails — every recommendation must show its reasoning).
 */

import type { WeightedViolation, EffectiveSeverity } from '../../hooks/useSitingEvaluation.js';
import css from './WhyExpander.module.css';

interface Props {
  v: WeightedViolation;
}

const SEVERITY_LABEL: Record<EffectiveSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
  advisory: 'Advisory',
};

/**
 * Project the underlying `severity` (RuleSeverity: error/warning/info)
 * into the user-facing EffectiveSeverity vocabulary so we can compare
 * base-vs-effective on the same axis.
 *
 * Mirrors the BASE_SEVERITY_MAP in useSitingEvaluation.ts — kept inline
 * here to avoid an export expansion across the hook surface.
 */
function baseEffective(severity: string): EffectiveSeverity {
  if (severity === 'error') return 'blocking';
  if (severity === 'warning') return 'warning';
  return 'advisory';
}

function weightAdjustmentNote(
  base: EffectiveSeverity,
  effective: EffectiveSeverity,
  weight: number,
): string | null {
  if (base === effective) return null;
  if (weight >= 70) {
    return `escalated by high priority (weight ${weight})`;
  }
  if (weight <= 30) {
    return `de-escalated by low priority (weight ${weight})`;
  }
  return null;
}

export default function WhyExpander({ v }: Props) {
  const base = baseEffective(v.severity);
  const adjustNote = weightAdjustmentNote(base, v.effectiveSeverity, v.weightValue);

  return (
    <details className={css.expander}>
      <summary className={css.summary}>Why this suggestion?</summary>
      <div className={css.body}>
        <div className={css.row}>
          <span className={css.label}>Rule</span>
          <span className={css.value}>
            <code>{v.ruleId}</code>
          </span>
        </div>
        <div className={css.row}>
          <span className={css.label}>Category</span>
          <span className={css.value}>
            {v.category} {'\u00B7'} <em>{v.ruleWeightCategory}</em>
          </span>
        </div>
        <div className={css.row}>
          <span className={css.label}>Severity</span>
          <span className={css.value}>
            <strong>{SEVERITY_LABEL[v.effectiveSeverity]}</strong>
            {adjustNote && (
              <>
                <span className={css.sevArrow}>
                  {' '}{'\u2190'}{' '}
                </span>
                {SEVERITY_LABEL[base]}
                <span className={css.sevChange}>{adjustNote}</span>
              </>
            )}
            {!adjustNote && (
              <span className={css.sevChange}>weight {v.weightValue}</span>
            )}
          </span>
        </div>
        <div className={css.row}>
          <span className={css.label}>Source</span>
          <span className={css.value}>{v.dataSource}</span>
        </div>
        <div className={css.row}>
          <span className={css.label}>Why it matters</span>
          <span className={css.value}>{v.description}</span>
        </div>
        {v.needsSiteVisit && (
          <span className={css.siteVisitPill}>Needs site visit</span>
        )}
      </div>
    </details>
  );
}
