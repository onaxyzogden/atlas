/**
 * OLOSObjectivePage — temporary placeholder for Phase 1.2.
 *
 * Phase 1.3 replaces this with the full ObjectiveWorkspace (focused
 * question, required-inputs panel, checklist, evidence/proof capture,
 * status output, handoff emitter).
 *
 * Resolves the universal Objective for (stage, domain) and renders a
 * read-only summary so the route is exercisable end-to-end.
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

  const checklist = getChecklistItemsForObjective(objective.id);

  return (
    <div className={css.page}>
      <header className={css.header}>
        <p className={css.crumb}>
          <Link
            to="/v3/project/$projectId/olos/$stage"
            params={{
              projectId: params.projectId ?? '',
              stage: stageResult.data,
            }}
          >
            {STAGE_LABELS[stageResult.data]}
          </Link>
          {' › '}
          <span>{UNIVERSAL_DOMAIN_LABELS[domainResult.data]}</span>
        </p>
        <h1 className={css.title}>{objective.title}</h1>
        <p className={css.focused}>{objective.focusedQuestion}</p>
      </header>
      <main className={css.main}>
        <section className={css.card}>
          <h2 className={css.sectionTitle}>Default overlay bundle</h2>
          <ul className={css.list}>
            {objective.defaultOverlayBundle.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>
        <section className={css.card}>
          <h2 className={css.sectionTitle}>Checklist ({checklist.length})</h2>
          <ol className={css.checklist}>
            {checklist.map((item) => (
              <li key={item.id}>
                <span className={css.kind}>{item.requiredInputType}</span>
                {item.instruction}
              </li>
            ))}
          </ol>
        </section>
        <section className={css.card}>
          <h2 className={css.sectionTitle}>Required upstream inputs</h2>
          {objective.requiredInputs.length === 0 ? (
            <p className={css.muted}>None — this is an entry-point objective.</p>
          ) : (
            <ul className={css.list}>
              {objective.requiredInputs.map((req, idx) => (
                <li key={`${req.kind}-${idx}`}>
                  <strong>{req.kind}</strong>
                  {req.objectiveId ? ` · ${req.objectiveId}` : ''}
                  {req.description ? ` — ${req.description}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className={css.note}>
          Phase 1.3 replaces this placeholder with the live ObjectiveWorkspace
          (map view + side panel + evidence capture + status output).
        </p>
      </main>
    </div>
  );
}
