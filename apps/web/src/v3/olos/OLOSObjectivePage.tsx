/**
 * OLOSObjectivePage — route surface for /v3/project/$projectId/olos/$stage/$domain.
 *
 * Resolves the universal Objective for (stage, domain), pulls its checklist
 * from the shared catalogue, and hands them to ObjectiveWorkspace — the
 * focused workspace (map view + side panel) defined in Phase 1.3.
 */

import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  Stage,
  UniversalDomain,
  UNIVERSAL_DOMAIN_LABELS,
  STAGE_LABELS,
  getObjective,
  getChecklistItemsForObjective,
} from '@ogden/shared';
import ObjectiveWorkspace from './ObjectiveWorkspace.js';
import css from './OLOSObjectivePage.module.css';

export default function OLOSObjectivePage() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    stage?: string;
    domain?: string;
  };

  const stageResult = Stage.safeParse(params.stage);
  const domainResult = UniversalDomain.safeParse(params.domain);

  const objective = useMemo(() => {
    if (!stageResult.success || !domainResult.success) return undefined;
    return getObjective(stageResult.data, domainResult.data);
  }, [params.stage, params.domain, stageResult.success, domainResult.success]);

  const checklist = useMemo(() => {
    if (!objective) return [];
    return getChecklistItemsForObjective(objective.id);
  }, [objective]);

  if (!stageResult.success || !domainResult.success) {
    return (
      <div className={css.page}>
        <p className={css.error}>
          Unknown stage or domain in the URL.{' '}
          <Link
            to="/v3/project/$projectId/olos"
            params={{ projectId: params.projectId ?? '' }}
          >
            Back to OLOS workspace
          </Link>
        </p>
      </div>
    );
  }

  if (!objective) {
    return (
      <div className={css.page}>
        <p className={css.error}>
          No objective is currently authored for{' '}
          {STAGE_LABELS[stageResult.data]} × {UNIVERSAL_DOMAIN_LABELS[domainResult.data]}.
        </p>
      </div>
    );
  }

  return (
    <ObjectiveWorkspace
      projectId={params.projectId ?? ''}
      objective={objective}
      checklist={checklist}
    />
  );
}
