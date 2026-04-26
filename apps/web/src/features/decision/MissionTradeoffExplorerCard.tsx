/**
 * §22 MissionTradeoffExplorerCard — interactive what-if exploration of
 * mission-weighted overall score.
 *
 * The sibling `MissionImpactRollupCard` shows the four unweighted per-axis
 * scores (financial / ecological / spiritual / community) plus the current
 * weighted overall. This card lets the steward dial the four weights with
 * sliders and watch:
 *   - the recomputed overall score
 *   - per-axis weighted contribution to that overall
 *   - the delta vs. the project's current persisted weights
 *
 * Strictly session-scoped exploration — no store mutation, no entity
 * reordering, no persistence. A Reset button restores the persisted
 * weights as the starting point. This is the "tradeoff explorer" surface
 * called out in the §22 mission-weighted scoring rationale ("surfaces
 * the tradeoff between financial return and mission impact" — the engine
 * docstring) but never previously exposed as a UI affordance.
 *
 * Pure presentation. Reuses `model.missionScore` (per-axis unweighted
 * values) and the same weighted-mean formula as
 * `engine/missionScoring.ts:computeMissionScore`. No shared math, no
 * new exports.
 *
 * Manifest mapping: no 1:1 key. Advances §22 multi-facet rollup —
 * `mission-weighted-donor-grant-income` is already done; this is the
 * sensitivity-exploration layer that the rollup card hinted at but
 * didn't ship. Manifest unchanged.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { useFinancialStore } from '../../store/financialStore.js';
import css from './MissionTradeoffExplorerCard.module.css';

interface Props {
  project: LocalProject;
}

type AxisKey = 'financial' | 'ecological' | 'spiritual' | 'community';

interface AxisDescriptor {
  key: AxisKey;
  label: string;
  glyph: string;
}

const AXES: AxisDescriptor[] = [
  { key: 'financial',  label: 'Financial',  glyph: '\u00A4' },
  { key: 'ecological', label: 'Ecological', glyph: '\u2698' },
  { key: 'spiritual',  label: 'Spiritual',  glyph: '\u2641' },
  { key: 'community',  label: 'Community',  glyph: '\u2625' },
];

/** Recompute weighted overall — mirrors `computeMissionScore` exactly. */
function weightedOverall(
  perAxis: Record<AxisKey, number>,
  weights: Record<AxisKey, number>,
): number {
  const total = weights.financial + weights.ecological + weights.spiritual + weights.community;
  if (total <= 0) return 0;
  const num =
    perAxis.financial * weights.financial +
    perAxis.ecological * weights.ecological +
    perAxis.spiritual * weights.spiritual +
    perAxis.community * weights.community;
  return Math.round(num / total);
}

/** Per-axis weighted contribution = (score × weight) / Σweights, rounded. */
function weightedContribution(
  perAxis: Record<AxisKey, number>,
  weights: Record<AxisKey, number>,
  axis: AxisKey,
): number {
  const total = weights.financial + weights.ecological + weights.spiritual + weights.community;
  if (total <= 0) return 0;
  return Math.round((perAxis[axis] * weights[axis]) / total);
}

function toneFor(value: number): 'good' | 'fair' | 'poor' {
  return value >= 65 ? 'good' : value >= 40 ? 'fair' : 'poor';
}

export default function MissionTradeoffExplorerCard({ project }: Props) {
  const model = useFinancialModel(project.id);
  const storedWeights = useFinancialStore((s) => s.missionWeights);

  // Local exploration state — start mirroring stored weights.
  const [explored, setExplored] = useState<Record<AxisKey, number>>({
    financial: storedWeights.financial,
    ecological: storedWeights.ecological,
    spiritual: storedWeights.spiritual,
    community: storedWeights.community,
  });

  // If the persisted weights change underneath us (e.g. via the financial
  // panel), nudge our local explored copy to match — but only if the user
  // hasn't already started exploring (i.e. local state still equals the
  // previous stored value). We track this implicitly by only resetting
  // when the user clicks the explicit Reset button. Effect below kicks in
  // on first mount or when project changes.
  useEffect(() => {
    setExplored({
      financial: storedWeights.financial,
      ecological: storedWeights.ecological,
      spiritual: storedWeights.spiritual,
      community: storedWeights.community,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  if (!model) {
    return null; // Sibling rollup card handles the empty state messaging.
  }

  const ms = model.missionScore;
  const perAxis: Record<AxisKey, number> = {
    financial: ms.financial,
    ecological: ms.ecological,
    spiritual: ms.spiritual,
    community: ms.community,
  };

  const storedOverall = weightedOverall(perAxis, storedWeights);
  const exploredOverall = weightedOverall(perAxis, explored);
  const delta = exploredOverall - storedOverall;

  const exploredTone = toneFor(exploredOverall);

  const isModified =
    explored.financial !== storedWeights.financial ||
    explored.ecological !== storedWeights.ecological ||
    explored.spiritual !== storedWeights.spiritual ||
    explored.community !== storedWeights.community;

  const handleReset = () => {
    setExplored({
      financial: storedWeights.financial,
      ecological: storedWeights.ecological,
      spiritual: storedWeights.spiritual,
      community: storedWeights.community,
    });
  };

  // Pre-compute a couple of "preset" exploration weights to give the
  // steward one-click jump-offs.
  const handlePreset = (preset: 'balanced' | 'conservation' | 'enterprise' | 'sanctuary') => {
    if (preset === 'balanced') {
      setExplored({ financial: 0.25, ecological: 0.25, spiritual: 0.25, community: 0.25 });
    } else if (preset === 'conservation') {
      setExplored({ financial: 0.15, ecological: 0.55, spiritual: 0.15, community: 0.15 });
    } else if (preset === 'enterprise') {
      setExplored({ financial: 0.6, ecological: 0.15, spiritual: 0.1, community: 0.15 });
    } else {
      setExplored({ financial: 0.15, ecological: 0.2, spiritual: 0.45, community: 0.2 });
    }
  };

  const totalWeight = explored.financial + explored.ecological + explored.spiritual + explored.community;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h4 className={css.title}>Mission tradeoff explorer</h4>
          <p className={css.hint}>
            Bump the four mission weights to see how the overall mission
            score shifts. Per-axis values are fixed by your placed zones,
            structures, and break-even projection &mdash; only the weighting
            changes. Session-scoped: Reset restores your saved weights.
          </p>
        </div>
        <span className={css.badge}>Session what-if</span>
      </div>

      {/* Headline overall comparison */}
      <div className={`${css.overallRow} ${css[`tone_${exploredTone}`] ?? ''}`}>
        <div className={css.overallVal}>
          {exploredOverall}
          <span className={css.overallOf}>/100</span>
        </div>
        <div className={css.overallMeta}>
          <span className={css.overallWord}>Explored overall</span>
          <span className={css.overallSub}>
            Saved weights yield <strong>{storedOverall}</strong>.{' '}
            {delta === 0 ? (
              <>No change at current explored weights.</>
            ) : (
              <>
                <span className={delta > 0 ? css.deltaUp : css.deltaDown}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>{' '}
                vs. saved.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Preset row */}
      <div className={css.presetRow}>
        <span className={css.presetLabel}>Try:</span>
        <button type="button" className={css.presetBtn} onClick={() => handlePreset('balanced')}>
          Balanced (25/25/25/25)
        </button>
        <button type="button" className={css.presetBtn} onClick={() => handlePreset('conservation')}>
          Conservation-led
        </button>
        <button type="button" className={css.presetBtn} onClick={() => handlePreset('enterprise')}>
          Enterprise-led
        </button>
        <button type="button" className={css.presetBtn} onClick={() => handlePreset('sanctuary')}>
          Sanctuary-led
        </button>
      </div>

      {/* Per-axis sliders + contribution table */}
      <div className={css.axes}>
        {AXES.map((axis) => {
          const value = perAxis[axis.key];
          const tone = toneFor(value);
          const weight = explored[axis.key];
          const stored = storedWeights[axis.key];
          const contrib = weightedContribution(perAxis, explored, axis.key);
          const sharePct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;

          return (
            <div key={axis.key} className={css.axisRow}>
              <div className={css.axisHead}>
                <span className={css.axisGlyph} aria-hidden>{axis.glyph}</span>
                <span className={css.axisLabel}>{axis.label}</span>
                <span className={`${css.axisScore} ${css[`tone_${tone}`] ?? ''}`}>
                  {value}<span className={css.axisScoreUnit}>/100</span>
                </span>
              </div>

              <div className={css.sliderBlock}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weight}
                  onChange={(e) => {
                    const next = parseFloat(e.target.value);
                    setExplored((prev) => ({ ...prev, [axis.key]: next }));
                  }}
                  className={css.slider}
                  aria-label={`${axis.label} weight`}
                />
                <div className={css.sliderMeta}>
                  <span className={css.weightShare}>{sharePct}% share</span>
                  {weight !== stored && (
                    <span className={css.weightDelta}>
                      saved: {Math.round(stored * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className={css.contribBlock}>
                <span className={css.contribValue}>{contrib}</span>
                <span className={css.contribLabel}>contribution</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action row */}
      <div className={css.actionRow}>
        <button
          type="button"
          className={css.resetBtn}
          onClick={handleReset}
          disabled={!isModified}
        >
          Reset to saved weights
        </button>
        <p className={css.actionHint}>
          To persist a new mix, edit weights in the financial-model panel.
        </p>
      </div>

      <p className={css.footnote}>
        Weighted overall = &Sigma;(axis_score &times; weight) / &Sigma;(weight),
        rounded &mdash; identical formula to the persisted scoring engine.
        Per-axis contributions sum to the explored overall (within rounding).
        Sliders move in 5% steps and renormalize to a 0&ndash;100% share so
        you can compare two weight mixes that aren't normalized to 1.0.
      </p>
    </div>
  );
}
