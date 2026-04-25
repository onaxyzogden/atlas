/**
 * SitingWarningsCard — §5 wind / view / privacy / noise rollup.
 *
 * Filters the existing weighted-violation evaluation down to the four
 * environmental and social siting concerns called out by the §5 spec
 * line "wind / view / privacy / noise analysis":
 *
 *   - Wind     — `wind-shelter` (Microclimate Tier 3 wind exposure)
 *   - View     — viewshed checks not yet implemented (honest gap)
 *   - Privacy  — `guest-privacy-buffer`, `guest-safe-livestock`
 *   - Noise    — `sacred-noise-road`, `sacred-noise-livestock`,
 *                `sacred-noise-infrastructure` (acoustic separation
 *                buffers from named noise sources)
 *
 * Pure presentation: useSitingEvaluation already runs the RulesEngine
 * with weight-adjusted severity. This card narrows the result set to
 * the four §5 dimensions and presents them as a steward-facing rollup
 * ("how exposed is this design?"). No new rule logic.
 *
 * Spec: §5 `wind-view-privacy-noise-analysis` (featureManifest).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSitingEvaluation,
  type WeightedViolation,
  type EffectiveSeverity,
} from '../../hooks/useSitingEvaluation.js';
import WhyExpander from './WhyExpander.js';
import css from './SitingWarningsCard.module.css';

interface Props {
  project: LocalProject;
}

type DimensionId = 'wind' | 'view' | 'privacy' | 'noise';

interface DimensionConfig {
  id: DimensionId;
  label: string;
  icon: string;
  blurb: string;
  matches: (v: WeightedViolation) => boolean;
  notImplemented?: true;
}

/**
 * Mapping from §5 dimensions to existing RuleViolation predicates.
 * View has no rule yet — the card surfaces this honestly rather than
 * pretending it is "all clear".
 */
const DIMENSIONS: DimensionConfig[] = [
  {
    id: 'wind',
    label: 'Wind',
    icon: '\u{1F32C}\uFE0F', // wind face
    blurb: 'Exposed dwellings and structural wind load',
    matches: (v) => v.category === 'wind',
  },
  {
    id: 'view',
    label: 'View',
    icon: '\u{1F441}\uFE0F', // eye
    blurb: 'Viewshed and visual exposure',
    matches: () => false,
    notImplemented: true,
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: '\u{1F6CB}\uFE0F', // couch
    blurb: 'Guest separation and livestock buffer',
    matches: (v) =>
      v.category === 'privacy' ||
      (v.category === 'buffer' && v.ruleId === 'guest-safe-livestock'),
  },
  {
    id: 'noise',
    label: 'Noise',
    icon: '\u{1F507}', // muted speaker
    blurb: 'Acoustic buffers from roads, livestock, infra',
    matches: (v) => v.ruleId.startsWith('sacred-noise-'),
  },
];

const SEVERITY_RANK: Record<EffectiveSeverity, number> = {
  blocking: 3,
  warning: 2,
  advisory: 1,
};

const SEVERITY_LABEL: Record<EffectiveSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
  advisory: 'Advisory',
};

/** Per-dimension violation list cap — keep the rollup compact. */
const PER_DIM_LIST_CAP = 3;

interface DimensionRollup {
  dim: DimensionConfig;
  violations: WeightedViolation[];
  topSeverity: EffectiveSeverity | null;
}

export default function SitingWarningsCard({ project }: Props) {
  const evaluation = useSitingEvaluation(project);

  const byDimension = useMemo<DimensionRollup[]>(() => {
    return DIMENSIONS.map((dim) => {
      if (dim.notImplemented) {
        return { dim, violations: [], topSeverity: null };
      }
      const matches = evaluation.violations.filter(dim.matches);
      const topSeverity = matches.reduce<EffectiveSeverity | null>((acc, v) => {
        if (!acc) return v.effectiveSeverity;
        return SEVERITY_RANK[v.effectiveSeverity] > SEVERITY_RANK[acc]
          ? v.effectiveSeverity
          : acc;
      }, null);
      return { dim, violations: matches, topSeverity };
    });
  }, [evaluation.violations]);

  const totalCount = byDimension.reduce(
    (acc, d) => acc + d.violations.length,
    0,
  );

  const tileSeverityClass = (sev: EffectiveSeverity | null): string => {
    if (sev === 'blocking') return css.tile_blocking ?? '';
    if (sev === 'warning') return css.tile_warning ?? '';
    if (sev === 'advisory') return css.tile_advisory ?? '';
    return '';
  };

  const pillSeverityClass = (sev: EffectiveSeverity): string => {
    if (sev === 'blocking') return css.pill_blocking ?? '';
    if (sev === 'warning') return css.pill_warning ?? '';
    return css.pill_advisory ?? '';
  };

  const dotSeverityClass = (sev: EffectiveSeverity): string => {
    if (sev === 'blocking') return css.dot_blocking ?? '';
    if (sev === 'warning') return css.dot_warning ?? '';
    return css.dot_advisory ?? '';
  };

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Wind / View / Privacy / Noise</h2>
        <span className={css.cardHint}>
          {evaluation.featureCount} feature
          {evaluation.featureCount !== 1 ? 's' : ''} &middot; {totalCount} alert
          {totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tile strip — one cell per §5 dimension */}
      <div className={css.tileGrid}>
        {byDimension.map(({ dim, violations, topSeverity }) => (
          <div
            key={dim.id}
            className={`${css.tile} ${tileSeverityClass(topSeverity)} ${
              dim.notImplemented ? css.tilePending : ''
            }`}
          >
            <div className={css.tileHead}>
              <span className={css.tileIcon}>{dim.icon}</span>
              <span className={css.tileLabel}>{dim.label}</span>
            </div>
            <span className={css.tileCount}>
              {dim.notImplemented ? '\u2014' : violations.length}
            </span>
            <span className={css.tileBlurb}>{dim.blurb}</span>
            {topSeverity && (
              <span
                className={`${css.severityPill} ${pillSeverityClass(topSeverity)}`}
              >
                {SEVERITY_LABEL[topSeverity]}
              </span>
            )}
            {dim.notImplemented && (
              <span className={css.pendingPill}>Not yet evaluated</span>
            )}
          </div>
        ))}
      </div>

      {/* Per-violation list — capped per dimension to keep the rollup compact */}
      {totalCount > 0 && (
        <ul className={css.violationList}>
          {byDimension.flatMap(({ dim, violations }) =>
            violations.slice(0, PER_DIM_LIST_CAP).map((v) => (
              <li
                key={`${v.ruleId}-${v.affectedElementId}`}
                className={css.violationRow}
              >
                <span
                  className={`${css.dot} ${dotSeverityClass(v.effectiveSeverity)}`}
                />
                <div className={css.violationBody}>
                  <span className={css.violationDim}>{dim.label}</span>
                  <span className={css.violationTitle}>
                    {v.title}
                    <span className={css.violationOn}>
                      {' '}
                      on {v.affectedElementName}
                    </span>
                  </span>
                  <span className={css.violationSuggest}>
                    {'\u2192'} {v.suggestion}
                  </span>
                  <WhyExpander v={v} />
                </div>
              </li>
            )),
          )}
        </ul>
      )}

      {totalCount === 0 && (
        <div className={css.empty}>
          {evaluation.featureCount === 0
            ? 'No features placed yet \u2014 wind, privacy, and noise checks evaluate placed structures, paddocks, and zones.'
            : 'All wind, privacy, and noise checks pass for the current placement.'}
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §5 wind / view / privacy / noise analysis. Wind exposure
        comes from the <em>Microclimate (Tier 3)</em> layer; privacy and
        noise are derived from feature geometry. Viewshed analysis is a
        planned follow-on (no rule active yet).
      </div>
    </div>
  );
}
