/**
 * AsBuiltReconciliationCard -- Plan-stage reconciliation surface for as-built
 * deviations recorded from Act. Mounted in ObjectiveDetailPanel below
 * CyclicalReviewBanner.
 *
 * Reads active divergent ObserveDataPoints where:
 *   - sourceFeatureRef is set (as-built deviation, not a manual observation)
 *   - domainId overlaps this objective's domain footprint
 *   - statusOutput is divergent (needs_investigation | major_constraint |
 *     potential_disqualifier)
 *   - not superseded
 *
 * For each point, parses measurementValue via asAsBuiltDiff. Attribute diffs
 * offer "Apply to design" (partial-patches the geometry store) + "Keep plan"
 * (no store mutation). Geometry diffs render read-only in v1 -- no Plan
 * re-draw affordance yet. Both actions soft-supersede the point via
 * acknowledgeDataPoint, which drops it from the active selectors so the
 * divergence pill and CyclicalReviewBanner clear on the next
 * usePlanRevisionFlagSync pass.
 *
 * NEVER hardcodes an objective id -- reads by domain overlap so it works
 * across ALL project types: static-skeleton projects resolve s6-yield-flows
 * (which owns plants-food); regen-farm projects resolve s6-monitoring,
 * rf-s6-biodiversity-monitoring, rf-s6-enterprise-integration (each also
 * owning plants-food). The card lights whichever is active without change.
 */

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { ObserveDataPoint, PlanStratumObjective } from '@ogden/shared';
import { asAsBuiltDiff } from '@ogden/shared';
import { resolveAllDomainsForObjective } from '../../observe/dashboard/revision/resolveDomainForObjective.js';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../store/observeDataPointStore.js';
import { applyAsBuiltDiff, canApplyDiff } from './applyAsBuiltDiff.js';
import css from './AsBuiltReconciliationCard.module.css';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

const FEATURE_LABEL: Record<string, string> = {
  cropArea: 'Crop Area',
  paddock: 'Paddock',
  structure: 'Structure',
  zone: 'Zone',
};

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

export default function AsBuiltReconciliationCard({
  projectId,
  objective,
}: Props) {
  // Stable domain set for this objective; recomputes only when the objective
  // reference changes (keyed by objective.id at the parent).
  const objectiveDomains = useMemo(
    () => new Set(resolveAllDomainsForObjective(objective)),
    [objective],
  );

  // Subscribe to all data points for this project; filter here so we
  // re-render only when the relevant subset changes.
  const allPoints = useObserveDataPointStore((s) =>
    selectObserveDataPointsForProject(s, projectId),
  );

  const deviationPoints = useMemo(
    () =>
      allPoints.filter(
        (p) =>
          !p.isSuperseded &&
          p.sourceFeatureRef !== null &&
          DIVERGENT_STATUSES.has(p.statusOutput) &&
          objectiveDomains.has(p.domainId),
      ),
    [allPoints, objectiveDomains],
  );

  if (deviationPoints.length === 0) return null;

  return (
    <aside
      className={css.card}
      aria-label="As-built deviations"
      data-testid="plan-asbuilt-reconciliation-card"
    >
      <div className={css.header}>
        <AlertTriangle size={14} aria-hidden className={css.headerIcon} />
        <span className={css.headerLabel}>AS-BUILT DIVERGENCE</span>
        <span className={css.headerCount}>{deviationPoints.length}</span>
      </div>
      <ul className={css.list} role="list">
        {deviationPoints.map((point) => (
          <DeviationItem key={point.id} projectId={projectId} point={point} />
        ))}
      </ul>
    </aside>
  );
}

// ---- DeviationItem -------------------------------------------------------

interface ItemProps {
  projectId: string;
  point: ObserveDataPoint;
}

function DeviationItem({ projectId, point }: ItemProps) {
  // All hooks must be called unconditionally (rules of hooks).
  const diff = asAsBuiltDiff(point.measurementValue);
  const acknowledge = useObserveDataPointStore((s) => s.acknowledgeDataPoint);

  const { sourceFeatureRef } = point;
  if (!sourceFeatureRef) return null;

  // Per-kind Apply eligibility + mutation live in applyAsBuiltDiff.ts so the
  // structure's nested-metadata mapping stays out of the card and is unit
  // tested. cropArea / paddock / zone patch flat props; structure maps
  // label/notes/subtype/phase into the V2 metadata blocks.
  const canApply = canApplyDiff(diff, sourceFeatureRef.kind);

  const handleApply = () => {
    if (diff && canApply) {
      applyAsBuiltDiff(sourceFeatureRef.kind, sourceFeatureRef.id, diff);
    }
    acknowledge(projectId, point.id);
  };

  const handleKeep = () => {
    acknowledge(projectId, point.id);
  };

  const featureLabel = FEATURE_LABEL[sourceFeatureRef.kind] ?? sourceFeatureRef.kind;
  const timeLabel = formatCapturedAt(point.capturedAt);

  return (
    <li className={css.item} data-testid="plan-asbuilt-deviation-item">
      <div className={css.meta}>
        <span className={css.kindBadge}>{featureLabel}</span>
        <span className={css.time}>{timeLabel}</span>
      </div>

      {diff?.kind === 'attribute' && (
        <div className={css.diffBlock}>
          <span className={css.diffField}>{diff.label ?? diff.field}</span>
          <div className={css.diffChange}>
            <span className={css.asPlanned}>{String(diff.asPlanned)}</span>
            <span className={css.arrow} aria-hidden>
              {'→'}
            </span>
            <span className={css.asBuilt}>{String(diff.asBuilt)}</span>
          </div>
        </div>
      )}

      {diff?.kind === 'geometry' && (
        <div className={css.diffBlock}>
          <span className={css.diffField}>Shape differs</span>
          {diff.asPlanned.areaM2 != null && diff.asBuilt.areaM2 != null && (
            <div className={css.diffChange}>
              <span className={css.asPlanned}>{diff.asPlanned.areaM2} m2</span>
              <span className={css.arrow} aria-hidden>
                {'→'}
              </span>
              <span className={css.asBuilt}>{diff.asBuilt.areaM2} m2</span>
              <span className={css.areaDelta}>
                ({formatAreaDelta(diff.asPlanned.areaM2, diff.asBuilt.areaM2)})
              </span>
            </div>
          )}
          {diff.asBuilt.note != null && (
            <span className={css.geometryNote}>{diff.asBuilt.note}</span>
          )}
          <span className={css.readOnly}>Recorded -- no Apply in v1</span>
        </div>
      )}

      {diff === null && (
        <div className={css.diffBlock}>
          <span className={css.diffField}>Divergence recorded</span>
        </div>
      )}

      <div className={css.actions}>
        {canApply && (
          <button
            type="button"
            className={css.applyBtn}
            onClick={handleApply}
            data-testid="plan-asbuilt-apply"
          >
            <CheckCircle2 size={13} aria-hidden />
            <span>Apply to design</span>
          </button>
        )}
        <button
          type="button"
          className={css.keepBtn}
          onClick={handleKeep}
          data-testid="plan-asbuilt-keep"
        >
          <X size={13} aria-hidden />
          <span>Keep plan</span>
        </button>
      </div>
    </li>
  );
}

/** Signed whole-m2 delta for the geometry area line ("-150 m2" / "+40 m2"). */
function formatAreaDelta(plannedM2: number, builtM2: number): string {
  const delta = Math.round(builtM2 - plannedM2);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} m2`;
}

function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
