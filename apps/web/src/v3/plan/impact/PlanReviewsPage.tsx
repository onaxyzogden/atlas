/**
 * PlanReviewsPage — the Plan-side triage surface for recorded observations that
 * may affect the plan. Closes the Observe→Plan loop: every recorded need flagged
 * `planImpact: possible | likely` shows here as a card where a steward records a
 * plain operational decision + a note.
 *
 * Phase 1 scope: a decision only RECORDS INTENT — it does not yet mutate the
 * plan, create Act work, or pause anything (Phases 2/3). This is a shelled child
 * route (renders inside the project shell with the sidebar, like `/plan`), the
 * nucleus of the future Plan Operation Command Centre.
 */

import { Link, useParams } from '@tanstack/react-router';
import { OBSERVE_MODULE_LABEL } from '../../observe/types.js';
import {
  usePlanImpactFlags,
  type PlanImpactFlagView,
} from './usePlanImpactFlags.js';
import { usePlanImpactReviewStore } from '../../../store/planImpactReviewStore.js';
import {
  PLAN_REVIEW_DECISIONS,
  PLAN_REVIEW_DECISION_LABEL,
} from './planImpactFlag.js';
import css from './PlanReviewsPage.module.css';

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

interface FlagCardProps {
  projectId: string;
  view: PlanImpactFlagView;
}

function FlagCard({ projectId, view }: FlagCardProps) {
  const { flag, review } = view;
  const setDecision = usePlanImpactReviewStore((s) => s.setDecision);
  const setNote = usePlanImpactReviewStore((s) => s.setNote);
  const reopen = usePlanImpactReviewStore((s) => s.reopen);

  const recordedAt = formatRecordedAt(flag.recordedAt);
  const isReviewed = review.status === 'reviewed';

  return (
    <li
      className={css.card}
      data-impact={flag.planImpact}
      data-status={review.status}
    >
      <div className={css.cardHead}>
        <span className={css.moduleTag}>
          <span className={css.moduleDot} aria-hidden="true" />
          {OBSERVE_MODULE_LABEL[flag.module]}
        </span>
        <span className={css.impactBadge} data-impact={flag.planImpact}>
          {flag.planImpact === 'likely' ? 'Likely' : 'Possible'}
        </span>
      </div>

      <h3 className={css.cardTitle}>{flag.title}</h3>
      <p className={css.cardReason}>{flag.reason}</p>

      <div className={css.cardMeta}>
        <Link
          to="/v3/project/$projectId/observe/$module"
          params={{ projectId, module: flag.module }}
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
          <p className={css.decisionRecorded}>
            <span className={css.decisionLabel}>Decision</span>
            {review.decision
              ? PLAN_REVIEW_DECISION_LABEL[review.decision]
              : '—'}
          </p>
          {review.note.trim() ? (
            <p className={css.noteRecorded}>{review.note}</p>
          ) : null}
          <button
            type="button"
            className={css.reopenBtn}
            onClick={() => reopen(projectId, flag.id)}
          >
            Reopen
          </button>
        </div>
      ) : (
        <div className={css.decideBlock}>
          <span className={css.decideEyebrow}>Record a decision</span>
          <div className={css.decisionButtons}>
            {PLAN_REVIEW_DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={css.decisionBtn}
                onClick={() => setDecision(projectId, flag.id, d)}
              >
                {PLAN_REVIEW_DECISION_LABEL[d]}
              </button>
            ))}
          </div>
          <textarea
            className={css.noteInput}
            placeholder="Note (rationale, context, follow-up)…"
            value={review.note}
            onChange={(e) => setNote(projectId, flag.id, e.target.value)}
            rows={2}
          />
        </div>
      )}
    </li>
  );
}

export default function PlanReviewsPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const flags = usePlanImpactFlags(projectId);

  const open = flags.filter((f) => f.review.status === 'open');
  const reviewed = flags.filter((f) => f.review.status === 'reviewed');

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Plan</span>
        <h1 className={css.title}>Plan Reviews</h1>
        <p className={css.lede}>Observations that may affect the plan.</p>
      </header>

      {flags.length === 0 ? (
        <p className={css.empty}>
          No plan reviews yet — flagged observations appear here once recorded.
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
                  <FlagCard
                    key={view.flag.id}
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
                  <FlagCard
                    key={view.flag.id}
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
