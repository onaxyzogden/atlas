/**
 * DomainDetailHeader — top strip on a Domain Detail surface (OLOS
 * Observe Dashboard Spec §4). Shows the domain label, freshness pill,
 * observation count, and a "Back to dashboard" link returning to the
 * Unified Land State.
 */

import { Link } from '@tanstack/react-router';
import { ArrowLeft, GitCompare } from 'lucide-react';
import type {
  ObserveFreshness,
  ObserveStatusOutput,
} from '@ogden/shared';
import { UNIVERSAL_DOMAIN_PURPOSE } from '@ogden/shared';
import type { UniversalDomain } from '@ogden/shared';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useMyProjectRoles } from '../../../../hooks/useMyProjectRoles.js';
import { portfolioAccess } from '../../../portfolio/portfolioModel.js';
import css from './DomainDetailHeader.module.css';

interface Props {
  projectId: string;
  domainId: UniversalDomain;
  domainLabel: string;
  freshness: ObserveFreshness;
  latestStatus: ObserveStatusOutput | null;
  observationCount: number;
  divergenceCount: number;
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

export default function DomainDetailHeader({
  projectId,
  domainId,
  domainLabel,
  freshness,
  latestStatus,
  observationCount,
  divergenceCount,
}: Props) {
  // §8: the cross-project compare entry mirrors the compare page's own gate —
  // shown only when the steward is owner-tier on at least one project (local
  // projects resolve to owner-tier, so a normal steward always sees it).
  const projects = useProjectStore((s) => s.projects);
  const roleMap = useMyProjectRoles();
  const canCompare = projects.some(
    (p) => p.status !== 'archived' && portfolioAccess(p, roleMap).isOwnerTier,
  );

  return (
    <header className={css.header}>
      <div className={css.headRow}>
        <Link
          to="/v3/project/$projectId/observe/dashboard"
          params={{ projectId }}
          className={css.back}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to dashboard</span>
        </Link>
        <span className={css.freshness} data-freshness={freshness}>
          {FRESHNESS_LABEL[freshness]}
        </span>
      </div>
      <div className={css.titleRow}>
        <h1 className={css.title}>{domainLabel}</h1>
        {latestStatus && (
          <span className={css.status} data-status={latestStatus}>
            {STATUS_LABEL[latestStatus]}
          </span>
        )}
      </div>
      <p className={css.purpose}>{UNIVERSAL_DOMAIN_PURPOSE[domainId]}</p>
      <div className={css.counts}>
        <span className={css.count}>
          {observationCount} observation{observationCount === 1 ? '' : 's'}
        </span>
        {divergenceCount > 0 && (
          <span className={css.divergence}>
            {divergenceCount} flagged for review
          </span>
        )}
        {canCompare ? (
          <Link
            to="/v3/portfolio/observe-compare"
            search={{ from: projectId, domain: domainId }}
            className={css.compareLink}
          >
            <GitCompare size={13} aria-hidden="true" />
            <span>Compare with other projects</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
