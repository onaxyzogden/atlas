/**
 * PlanRevisionBanner — Observe Dashboard surface header (Dashboard Spec
 * §4.2). Surfaces ranked Plan-revision events to the steward at the top
 * of both the Unified Land State surface and each Domain Detail surface.
 *
 * Behaviour:
 *   • Reads the per-project, post-dismissal event window via
 *     `useRevisionEvents`.
 *   • Renders nothing when `priority === null` (silent default — the
 *     banner is opt-in by data, not a permanent chrome element).
 *   • Priority badge: Critical = red, High = amber, Informational = blue
 *     (per Dashboard Spec §4.2 colour ramp).
 *   • Deep-link CTA "Review impacted objectives" navigates to the first
 *     impacted Plan tier objective when one exists, otherwise to the
 *     first impacted Domain Detail surface (data-point events name
 *     domains, not objectives).
 *   • Dismiss button stamps `planRevisionDismissalStore` and the banner
 *     stays hidden until a NEW event arrives that is strictly newer than
 *     the dismissal timestamp.
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  findPlanTierObjective,
  UNIVERSAL_DOMAIN_LABELS,
  type UniversalDomain,
} from '@ogden/shared';
import { useRevisionEvents } from './useRevisionEvents.js';
import { usePlanRevisionDismissalStore } from '../../../../store/planRevisionDismissalStore.js';
import css from './PlanRevisionBanner.module.css';

interface Props {
  projectId: string;
}

const PRIORITY_LABEL = {
  critical: 'Critical',
  high: 'High',
  informational: 'Informational',
} as const;

const HEADLINE = {
  critical: 'Plan revision required',
  high: 'Plan revision recommended',
  informational: 'New observations since your last review',
} as const;

function formatDomainList(domains: readonly UniversalDomain[]): string {
  if (domains.length === 0) return '';
  const labels = domains.map((d) => UNIVERSAL_DOMAIN_LABELS[d]);
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const head = labels.slice(0, -1).join(', ');
  const tail = labels[labels.length - 1]!;
  return `${head}, and ${tail}`;
}

function formatSupportingCopy(
  eventCount: number,
  domains: readonly UniversalDomain[],
): string {
  const eventNoun = eventCount === 1 ? 'event' : 'events';
  if (domains.length === 0) {
    return `${eventCount} ${eventNoun} since your last review.`;
  }
  return `${eventCount} ${eventNoun} across ${formatDomainList(domains)} since your last review.`;
}

export default function PlanRevisionBanner({ projectId }: Props) {
  const summary = useRevisionEvents(projectId);
  const dismiss = usePlanRevisionDismissalStore((s) => s.dismiss);
  const navigate = useNavigate();

  const target = useMemo(() => {
    const objectiveId = summary.impactedObjectiveIds[0];
    if (objectiveId) {
      const obj = findPlanTierObjective(objectiveId);
      if (obj) {
        return {
          kind: 'objective' as const,
          objectiveId: obj.id,
          tierId: obj.tierId,
        };
      }
    }
    const domainId = summary.impactedDomains[0];
    if (domainId) {
      return { kind: 'domain' as const, domainId };
    }
    return null;
  }, [summary.impactedObjectiveIds, summary.impactedDomains]);

  if (summary.priority === null) return null;

  const handleReview = () => {
    if (!target) return;
    if (target.kind === 'objective') {
      navigate({
        to: '/v3/project/$projectId/plan/tier/$tierId/objective/$objectiveId',
        params: {
          projectId,
          tierId: target.tierId,
          objectiveId: target.objectiveId,
        },
      });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId, domainId: target.domainId },
    });
  };

  const handleDismiss = () => {
    dismiss(projectId);
  };

  const priority = summary.priority;

  return (
    <section
      className={css.banner}
      data-priority={priority}
      role="status"
      aria-live="polite"
    >
      <span className={css.badge} data-priority={priority}>
        {PRIORITY_LABEL[priority]}
      </span>
      <div className={css.body}>
        <p className={css.headline}>{HEADLINE[priority]}</p>
        <p className={css.supporting}>
          {formatSupportingCopy(summary.eventCount, summary.impactedDomains)}
        </p>
      </div>
      <div className={css.actions}>
        {target !== null && (
          <button
            type="button"
            className={css.reviewBtn}
            onClick={handleReview}
            data-priority={priority}
          >
            Review impacted objectives
          </button>
        )}
        <button
          type="button"
          className={css.dismissBtn}
          onClick={handleDismiss}
          aria-label="Dismiss revision banner"
          title="Dismiss until next observation"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
