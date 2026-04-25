/**
 * SpatialRelationshipsCard — §5 walkability / water / zone-relationship
 * rollup. Sibling to SitingWarningsCard (§5 wind/view/privacy/noise),
 * but for the *spatial-relationship* concerns the spec calls out:
 *
 *   - Walkability         — paths and access between features
 *   - Relationship-to-water — water-source proximity, spillway clearance,
 *                            flow accumulation for water features
 *   - Relationship-to-zones — flood-zone placement, livestock-zone
 *                             buffers (cross-zone separation rules)
 *
 * Maps each §5 dimension to existing RuleViolation predicates:
 *
 *   - Walkability  ← `category in {'circulation', 'access'}`
 *                    (`guest-circulation-conflict`, `access-to-dwelling`,
 *                    `no-access-paths`, `no-emergency-access`)
 *   - Water        ← `category === 'water'`
 *                    (`flow-accumulation`, `livestock-water-source`,
 *                    `water-structure-clearance`, `dwelling-needs-water`)
 *   - Zone         ← `category === 'flood'` plus `livestock-spiritual-buffer`
 *                    (the only existing cross-zone rules)
 *
 * Pure presentation — reuses useSitingEvaluation's weighted violations
 * with no new rule logic. Same severity-driven tile colors and per-row
 * suggestion text as SitingWarningsCard for visual consistency.
 *
 * Spec: §5 `walkability-water-zone-relationship-checks` (featureManifest).
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

type DimensionId = 'walkability' | 'water' | 'zone';

interface DimensionConfig {
  id: DimensionId;
  label: string;
  icon: string;
  blurb: string;
  matches: (v: WeightedViolation) => boolean;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    id: 'walkability',
    label: 'Walkability',
    icon: '\u{1F6B6}', // person walking
    blurb: 'Paths, access, and circulation conflicts',
    matches: (v) => v.category === 'circulation' || v.category === 'access',
  },
  {
    id: 'water',
    label: 'Water',
    icon: '\u{1F4A7}', // droplet
    blurb: 'Water source, spillway, and flow placement',
    matches: (v) => v.category === 'water',
  },
  {
    id: 'zone',
    label: 'Zones',
    icon: '\u{1F5FA}\uFE0F', // map
    blurb: 'Flood-zone placement and cross-zone buffers',
    matches: (v) =>
      v.category === 'flood' || v.ruleId === 'livestock-spiritual-buffer',
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

export default function SpatialRelationshipsCard({ project }: Props) {
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
        <h2 className={css.cardTitle}>Walkability / Water / Zone Relationships</h2>
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

      {/* Per-violation list — capped per dimension */}
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
            ? 'No features placed yet \u2014 spatial-relationship checks evaluate placed structures, paddocks, zones, paths, and utilities together.'
            : 'All walkability, water-relationship, and zone-relationship checks pass for the current placement.'}
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §5 walkability / relationship-to-water / relationship-to-zones
        checks. Walkability rules read paths and access geometry; water rules
        read feature distances and Tier 3 watershed-derived flow accumulation;
        zone rules read placement against the wetlands &amp; flood layer plus
        cross-zone livestock buffers.
      </div>
    </div>
  );
}
