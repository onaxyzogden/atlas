/**
 * DomainStatusCard — one of 16 cards on the Unified Land State surface
 * (OLOS Observe Dashboard Spec §4). Shows the domain label, freshness
 * pill, observation count, last-observed timestamp, and a divergence
 * indicator when active captures carry investigation-worthy status.
 *
 * Slice 4.2 stub for click → domain-detail navigation: the route
 * (`/observe/dashboard/domain/$domainId`) arrives in Slice 4.3 along with
 * `DomainDetailLayout`. Until then the card is keyboard-focusable and
 * exposes a click handler that no-ops with a developer-visible console
 * note so the surface is non-dead while we wire downstream surfaces.
 */

import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import type { ObserveFreshness, ObserveStatusOutput } from '@ogden/shared';
import type { DomainSnapshot } from './useDomainSnapshot.js';
import css from './DomainStatusCard.module.css';

interface Props {
  snapshot: DomainSnapshot;
  projectId: string;
  /**
   * Optional side-effect run just before navigation (e.g. clearing an active
   * header Stage Search query so the dashboard returns to its normal grid once
   * the steward reveals a domain from the filtered search results).
   */
  onNavigate?: () => void;
}

const FRESHNESS_LABEL: Record<ObserveFreshness, string> = {
  current: 'Current',
  ageing: 'Ageing',
  stale: 'Stale',
  missing: 'Missing',
};

const STATUS_LABEL: Record<ObserveStatusOutput, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Needs investigation',
  major_constraint: 'Major constraint',
  potential_disqualifier: 'Potential disqualifier',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'No observations yet';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'No observations yet';
  const ageMs = Date.now() - ms;
  const ageDays = Math.floor(ageMs / 86_400_000);
  if (ageDays < 1) return 'Today';
  if (ageDays === 1) return '1 day ago';
  if (ageDays < 30) return `${ageDays} days ago`;
  const months = Math.floor(ageDays / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(ageDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export default function DomainStatusCard({
  snapshot,
  projectId,
  onNavigate,
}: Props) {
  const navigate = useNavigate();
  const {
    domainId,
    label,
    purpose,
    freshness,
    latestStatus,
    observationCount,
    divergenceCount,
    lastObservedAt,
  } = snapshot;

  const handleOpen = () => {
    onNavigate?.();
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
      params: { projectId, domainId },
    });
  };

  return (
    <button
      type="button"
      className={css.card}
      data-freshness={freshness}
      onClick={handleOpen}
      role="listitem"
      aria-label={`${label}: ${FRESHNESS_LABEL[freshness]}, ${observationCount} observation${observationCount === 1 ? '' : 's'}`}
    >
      <div className={css.head}>
        <div className={css.title}>{label}</div>
        <span className={css.freshness} data-freshness={freshness}>
          {FRESHNESS_LABEL[freshness]}
        </span>
      </div>
      <div className={css.purpose}>{purpose}</div>
      <div className={css.meta}>
        <div className={css.metaLeft}>
          <span className={css.count}>
            {observationCount} observation{observationCount === 1 ? '' : 's'}
          </span>
          {divergenceCount > 0 && (
            <span className={css.divergence} title="Captures flagged for review">
              <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
              {divergenceCount}
            </span>
          )}
        </div>
        <span className={css.relative}>{relativeTime(lastObservedAt)}</span>
      </div>
      {latestStatus && (
        <div className={css.status} data-status={latestStatus}>
          {STATUS_LABEL[latestStatus]}
        </div>
      )}
    </button>
  );
}
