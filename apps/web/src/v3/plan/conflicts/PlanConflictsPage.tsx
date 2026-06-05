/**
 * PlanConflictsPage — the Plan-side triage surface for NEW recorded observations
 * that may contradict an existing, non-rejected decision. Closes the last
 * dangling Observe↔Plan edge (Phase 5a): Phase 1 surfaces an observation's plan
 * *impact*; this surfaces a plan *conflict* — a signal that reality may have
 * moved since a decision was taken.
 *
 * Phase 5a scope: a resolution only RECORDS INTENT — it does not mutate the plan,
 * supersede a decision, or create work. This is a shelled child route (renders
 * inside the project shell with the sidebar, like `/plan/review`). Strictly
 * operational — no riba/gharar/CSRA/salam/financing semantics.
 */

import { Link, useParams } from '@tanstack/react-router';
import { OBSERVE_MODULE_LABEL } from '../../observe/types.js';
import { usePlanConflicts, type PlanConflictView } from './usePlanConflicts.js';
import { usePlanConflictReviewStore } from '../../../store/planConflictReviewStore.js';
import {
  PLAN_CONFLICT_RESOLUTIONS,
  PLAN_CONFLICT_RESOLUTION_LABEL,
} from './planConflict.js';
import css from './PlanConflictsPage.module.css';

function formatRecordedAt(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ConflictCardProps {
  projectId: string;
  view: PlanConflictView;
}

function ConflictCard({ projectId, view }: ConflictCardProps) {
  const { conflict, review } = view;
  const setResolution = usePlanConflictReviewStore((s) => s.setResolution);
  const setNote = usePlanConflictReviewStore((s) => s.setNote);
  const reopen = usePlanConflictReviewStore((s) => s.reopen);

  const recordedAt = formatRecordedAt(conflict.observationRecordedAt);
  const isReviewed = review.status === 'reviewed';
  const decisionHeadline =
    conflict.decisionHeadline.trim() || 'an untitled decision';

  return (
    <li
      className={css.card}
      data-severity={conflict.severity}
      data-status={review.status}
    >
      <div className={css.cardHead}>
        <span className={css.moduleTag}>
          <span className={css.moduleDot} aria-hidden="true" />
          {OBSERVE_MODULE_LABEL[conflict.module]}
        </span>
        <span className={css.severityBadge} data-severity={conflict.severity}>
          {conflict.severity === 'likely' ? 'Likely' : 'Possible'}
        </span>
      </div>

      <h3 className={css.cardTitle}>{conflict.observationTitle}</h3>
      <p className={css.cardReason}>{conflict.reason}</p>

      <p className={css.conflictWith}>
        <span className={css.conflictWithLabel}>Conflicts with</span>
        <Link
          to="/v3/project/$projectId/plan/workspace/$decisionId"
          params={{ projectId, decisionId: conflict.decisionId }}
          className={css.decisionLink}
        >
          {decisionHeadline}
        </Link>
      </p>

      <div className={css.cardMeta}>
        <Link
          to="/v3/project/$projectId/observe/$module"
          params={{ projectId, module: conflict.module }}
          className={css.sourceLink}
        >
          View in Observe
        </Link>
        {recordedAt ? (
          <span className={css.recordedAt}>Recorded {recordedAt}</span>
        ) : null}
      </div>

      {isReviewed ? (
        <div className={css.reviewedBlock}>
          <p className={css.resolutionRecorded}>
            <span className={css.resolutionLabel}>Resolution</span>
            {review.resolution
              ? PLAN_CONFLICT_RESOLUTION_LABEL[review.resolution]
              : '—'}
          </p>
          {review.note.trim() ? (
            <p className={css.noteRecorded}>{review.note}</p>
          ) : null}
          <div className={css.reviewedActions}>
            <button
              type="button"
              className={css.reopenBtn}
              onClick={() => reopen(projectId, conflict.id)}
            >
              Reopen
            </button>
          </div>
        </div>
      ) : (
        <div className={css.decideBlock}>
          <span className={css.decideEyebrow}>Record a resolution</span>
          <div className={css.decisionButtons}>
            {PLAN_CONFLICT_RESOLUTIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={css.decisionBtn}
                onClick={() => setResolution(projectId, conflict.id, r)}
              >
                {PLAN_CONFLICT_RESOLUTION_LABEL[r]}
              </button>
            ))}
          </div>
          <textarea
            className={css.noteInput}
            placeholder="Note (what changed, follow-up)…"
            value={review.note}
            onChange={(e) => setNote(projectId, conflict.id, e.target.value)}
            rows={2}
          />
        </div>
      )}
    </li>
  );
}

export default function PlanConflictsPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const conflicts = usePlanConflicts(projectId);

  const open = conflicts.filter((c) => c.review.status === 'open');
  const reviewed = conflicts.filter((c) => c.review.status === 'reviewed');

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Plan</span>
        <h1 className={css.title}>Plan Conflicts</h1>
        <p className={css.lede}>
          New observations that may contradict an existing decision.
        </p>
      </header>

      {conflicts.length === 0 ? (
        <p className={css.empty}>
          No conflicts detected — new observations that clash with a decision
          will appear here.
        </p>
      ) : (
        <>
          {open.length > 0 ? (
            <section className={css.section}>
              <h2 className={css.sectionTitle}>
                Open <span className={css.count}>{open.length}</span>
              </h2>
              <ul className={css.cardList}>
                {open.map((view) => (
                  <ConflictCard
                    key={view.conflict.id}
                    projectId={projectId}
                    view={view}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {reviewed.length > 0 ? (
            <section className={css.section}>
              <h2 className={css.sectionTitle}>
                Reviewed <span className={css.count}>{reviewed.length}</span>
              </h2>
              <ul className={css.cardList}>
                {reviewed.map((view) => (
                  <ConflictCard
                    key={view.conflict.id}
                    projectId={projectId}
                    view={view}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
