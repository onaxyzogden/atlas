/**
 * DecisionTriad — three-column Risks / Opportunities / Limitations row
 * (2026-04-27 brief §3 / Phase 4).
 *
 * Each card adopts the schema:
 *   Impact level · Why it matters · Recommended action · Confidence · Source.
 *
 * Splits the existing AssessmentFlag stream into three buckets without
 * duplicating the underlying scoring engine:
 *   Risks        = severity 'critical'  (urgent, blocking)
 *   Limitations  = severity 'warning' + 'info' (non-blocking constraints)
 *   Opportunities = deriveOpportunities()
 *
 * "Recommended action" is derived heuristically from severity + flag type
 * because the projected AssessmentFlag does not carry the rule's action
 * payload. Confidence is rolled up from the assessment-score confidence so
 * the user can see how trustworthy each bucket is at-a-glance.
 */

import { useMemo, useState } from 'react';
import type { AssessmentFlag } from '@ogden/shared';
import {
  computeAssessmentScores,
  deriveOpportunities,
  deriveRisks,
} from '../../lib/computeScores.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';
import css from './DecisionTriad.module.css';

const EMPTY_LAYERS: MockLayerResult[] = [];
const COLLAPSED_LIMIT = 3;

type Severity = AssessmentFlag['severity'];

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

const ACTION_BY_TYPE: Record<'risk-critical' | 'risk-warning' | 'risk-info' | 'opportunity', string> = {
  'risk-critical': 'Resolve before proceeding',
  'risk-warning': 'Validate with site visit',
  'risk-info':    'Monitor during design',
  opportunity:    'Incorporate into design plan',
};

function recommendedAction(flag: AssessmentFlag, bucket: 'risk' | 'opportunity'): string {
  if (bucket === 'opportunity') return ACTION_BY_TYPE.opportunity;
  if (flag.severity === 'critical') return ACTION_BY_TYPE['risk-critical'];
  if (flag.severity === 'warning')  return ACTION_BY_TYPE['risk-warning'];
  return ACTION_BY_TYPE['risk-info'];
}

interface FlagCardProps {
  flag: AssessmentFlag;
  bucket: 'risk' | 'opportunity';
  rolledConfidence: 'High' | 'Medium' | 'Low';
}

function FlagCard({ flag, bucket, rolledConfidence }: FlagCardProps) {
  const sevClass = bucket === 'opportunity'
    ? css.severity_opportunity
    : css[`severity_${flag.severity}`];

  return (
    <li className={css.item}>
      <div className={css.itemHeader}>
        <span className={`${css.severity} ${sevClass}`}>
          {bucket === 'opportunity' ? 'Opportunity' : SEVERITY_LABEL[flag.severity]}
        </span>
      </div>
      <p className={css.message}>{flag.message}</p>
      <div className={css.metaRow}>
        <span>
          <span className={css.metaLabel}>Action</span>
          <span className={css.metaValue}>{recommendedAction(flag, bucket)}</span>
        </span>
        <span>
          <span className={css.metaLabel}>Confidence</span>
          <span className={css.metaValue}>{rolledConfidence}</span>
        </span>
        {flag.layerSource && (
          <span>
            <span className={css.metaLabel}>Source</span>
            <span className={css.metaValue}>{flag.layerSource}</span>
          </span>
        )}
      </div>
    </li>
  );
}

interface BucketColumnProps {
  title: string;
  items: AssessmentFlag[];
  bucket: 'risk' | 'opportunity';
  rolledConfidence: 'High' | 'Medium' | 'Low';
  emptyText: string;
}

function BucketColumn({ title, items, bucket, rolledConfidence, emptyText }: BucketColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, COLLAPSED_LIMIT);
  const hasMore = items.length > COLLAPSED_LIMIT;

  return (
    <section className={css.col} aria-label={title}>
      <header className={css.colHeader}>
        <span className={css.colTitle}>{title}</span>
        <span className={css.colCount}>{items.length}</span>
      </header>
      {items.length === 0 ? (
        <span className={css.empty}>{emptyText}</span>
      ) : (
        <ul className={css.list}>
          {visible.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              bucket={bucket}
              rolledConfidence={rolledConfidence}
            />
          ))}
        </ul>
      )}
      {hasMore && (
        <button
          type="button"
          className={css.expand}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

interface DecisionTriadProps {
  project: LocalProject;
}

export default function DecisionTriad({ project }: DecisionTriadProps) {
  const siteData = useSiteData(project.id);
  const layers = siteData?.layers ?? EMPTY_LAYERS;

  const risks = useMemo(
    () => deriveRisks(layers, project.country),
    [layers, project.country],
  );
  const opportunities = useMemo(
    () => deriveOpportunities(layers, project.country),
    [layers, project.country],
  );

  const critical = useMemo(() => risks.filter((r) => r.severity === 'critical'), [risks]);
  const limitations = useMemo(
    () => risks.filter((r) => r.severity === 'warning' || r.severity === 'info'),
    [risks],
  );

  const rolledConfidence = useMemo<'High' | 'Medium' | 'Low'>(() => {
    const scores = computeAssessmentScores(layers, project.acreage ?? null, project.country);
    if (scores.length === 0) return 'Low';
    const levels = scores.map((s) => s.confidence);
    if (levels.includes('low')) return 'Low';
    if (levels.includes('medium')) return 'Medium';
    return 'High';
  }, [layers, project.acreage, project.country]);

  return (
    <div className={css.row}>
      <BucketColumn
        title="Risks"
        items={critical}
        bucket="risk"
        rolledConfidence={rolledConfidence}
        emptyText="No critical risks detected."
      />
      <BucketColumn
        title="Opportunities"
        items={opportunities}
        bucket="opportunity"
        rolledConfidence={rolledConfidence}
        emptyText="No opportunities surfaced from current data."
      />
      <BucketColumn
        title="Limitations"
        items={limitations}
        bucket="risk"
        rolledConfidence={rolledConfidence}
        emptyText="No constraints flagged."
      />
    </div>
  );
}
