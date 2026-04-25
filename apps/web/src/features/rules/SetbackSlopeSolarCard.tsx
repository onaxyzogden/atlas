/**
 * SetbackSlopeSolarCard — §9 setback / slope / solar orientation rollup.
 *
 * Third sibling in the rule-rollup family (after SitingWarningsCard and
 * SpatialRelationshipsCard). Filters useSitingEvaluation's weighted
 * violations to the three structural-placement concerns the §9 spec
 * line "Setback warning, slope warning, solar orientation guide" calls
 * out:
 *
 *   - Setback ← `category === 'setback'`
 *               (`well-septic-distance`, `dwelling-needs-septic`)
 *   - Slope   ← `category === 'slope'`
 *               (`slope-structure`, `slope-road`)
 *   - Solar   ← `category === 'solar'`
 *               (`solar-orientation`)
 *
 * Pure presentation. Reuses SitingWarningsCard.module.css verbatim so
 * the three §-rollup cards stay visually identical.
 *
 * Spec: §9 `setback-slope-solar-orientation-warnings` (featureManifest).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSitingEvaluation,
  type WeightedViolation,
  type EffectiveSeverity,
} from '../../hooks/useSitingEvaluation.js';
import css from './SitingWarningsCard.module.css';

interface Props {
  project: LocalProject;
}

type DimensionId = 'setback' | 'slope' | 'solar';

interface DimensionConfig {
  id: DimensionId;
  label: string;
  icon: string;
  blurb: string;
  matches: (v: WeightedViolation) => boolean;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    id: 'setback',
    label: 'Setback',
    icon: '\u{1F4CF}', // straight ruler
    blurb: 'Well/septic separation and feature spacing',
    matches: (v) => v.category === 'setback',
  },
  {
    id: 'slope',
    label: 'Slope',
    icon: '\u26F0\uFE0F', // mountain
    blurb: 'Structures and roads on steep terrain',
    matches: (v) => v.category === 'slope',
  },
  {
    id: 'solar',
    label: 'Solar',
    icon: '\u2600\uFE0F', // sun
    blurb: 'Passive-solar orientation for dwellings',
    matches: (v) => v.category === 'solar',
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

const PER_DIM_LIST_CAP = 3;

interface DimensionRollup {
  dim: DimensionConfig;
  violations: WeightedViolation[];
  topSeverity: EffectiveSeverity | null;
}

export default function SetbackSlopeSolarCard({ project }: Props) {
  const evaluation = useSitingEvaluation(project);

  const byDimension = useMemo<DimensionRollup[]>(() => {
    return DIMENSIONS.map((dim) => {
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
        <h2 className={css.cardTitle}>Setback / Slope / Solar Orientation</h2>
        <span className={css.cardHint}>
          {evaluation.featureCount} feature
          {evaluation.featureCount !== 1 ? 's' : ''} &middot; {totalCount} alert
          {totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={css.tileGrid}>
        {byDimension.map(({ dim, violations, topSeverity }) => (
          <div
            key={dim.id}
            className={`${css.tile} ${tileSeverityClass(topSeverity)}`}
          >
            <div className={css.tileHead}>
              <span className={css.tileIcon}>{dim.icon}</span>
              <span className={css.tileLabel}>{dim.label}</span>
            </div>
            <span className={css.tileCount}>{violations.length}</span>
            <span className={css.tileBlurb}>{dim.blurb}</span>
            {topSeverity && (
              <span
                className={`${css.severityPill} ${pillSeverityClass(topSeverity)}`}
              >
                {SEVERITY_LABEL[topSeverity]}
              </span>
            )}
          </div>
        ))}
      </div>

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
                </div>
              </li>
            )),
          )}
        </ul>
      )}

      {totalCount === 0 && (
        <div className={css.empty}>
          {evaluation.featureCount === 0
            ? 'No features placed yet \u2014 setback, slope, and solar checks evaluate placed structures, paths, and utilities.'
            : 'All setback, slope, and solar-orientation checks pass for the current placement.'}
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §9 setback warning, slope warning, solar orientation guide.
        Setback rules read feature geometry; slope rules read the
        <em> Elevation </em>layer; solar orientation reads aspect from the
        same layer to flag dwellings on N/NW-facing slopes that miss
        passive-solar gain.
      </div>
    </div>
  );
}
