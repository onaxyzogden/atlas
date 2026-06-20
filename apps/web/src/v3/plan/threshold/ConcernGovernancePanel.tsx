/**
 * ConcernGovernancePanel -- the Plan-only governance review queue for Threshold 3
 * (The Act Mandate). It lives on the Act Mandate ceremony surface (reachable
 * post-mandate) and is where the team governance declared in Objective 0.2
 * reviews concerns the stewards raised against held objectives during Act.
 *
 * APPROVE orchestration (append-only / never-overwrite covenant): lift the lock
 * on the objective just long enough to record an amendment ALONGSIDE the original,
 * then re-lock it -- so the net lock state is unchanged and the only durable effect
 * is one appended record in planConcernsStore:
 *     liftLock(projectId, objectiveRef)
 *  -> resolveConcern(projectId, id, 'approved', reviewer, { amendmentText })
 *  -> relock(projectId, objectiveRef)
 * The catalogue objective is NEVER mutated; the approved amendment renders beside
 * the original via ConcernAmendments on the objective detail.
 *
 * DECLINE closes the concern with no amendment: resolveConcern(..., 'declined', ...).
 * markUnderReview transitions raised -> under-review in between.
 *
 * AMANAH (two boundaries on the recorded change): the amendment free-text is
 * scanned by `detectCsaLikeText`. (1) UI advisory -- a covenant note surfaces and
 * approve is disabled while the text trips the guard. (2) Persist boundary --
 * planConcernsStore.resolveConcern HARD-rejects the same text as a no-op. Nothing
 * advance-sale / subscription / CSA can be recorded as an amendment.
 *
 * Self-gates to null when the project has no concerns -- so the ceremony surface
 * stays clean until a concern actually exists. Plan-only by construction (the Act
 * shell renders a different tree); never mounted in Observe (read-only dashboard).
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Circle, ShieldCheck } from 'lucide-react';
import {
  EMPTY_CONCERNS,
  usePlanConcernsStore,
  type PlanConcern,
} from '../../../store/planConcernsStore.js';
import { useActMandateStore } from '../../../store/actMandateStore.js';
import { useVisionStore } from '../../../store/visionStore.js';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import { detectCsaLikeText, CSA_ADVISORY_COPY } from './coherenceCheckModel.js';
import { ACT_MANDATE_COPY } from './actMandateModel.js';
import styles from './ActMandate.module.css';

const G = ACT_MANDATE_COPY.governance;

/** Deterministic YYYY-MM-DD from epoch ms (no locale drift in tests). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** A short status badge label for one concern. */
function badgeFor(status: PlanConcern['status']): string {
  switch (status) {
    case 'approved':
      return G.approvedBadge;
    case 'declined':
      return G.declinedBadge;
    case 'under-review':
      return G.underReviewBadge;
    default:
      return G.raisedBadge;
  }
}

export interface ConcernGovernancePanelProps {
  projectId: string;
  /** Resolve an objective id to its human title for display (falls back to id). */
  objectiveTitleFor?: (objectiveId: string) => string;
}

export default function ConcernGovernancePanel({
  projectId,
  objectiveTitleFor,
}: ConcernGovernancePanelProps) {
  // Hooks are called UNCONDITIONALLY (Rules-of-Hooks) before the self-gate.
  const concerns = usePlanConcernsStore(
    (s) => s.byProject[projectId] ?? EMPTY_CONCERNS,
  );
  const markUnderReview = usePlanConcernsStore((s) => s.markUnderReview);
  const resolveConcern = usePlanConcernsStore((s) => s.resolveConcern);
  const liftLock = useActMandateStore((s) => s.liftLock);
  const relock = useActMandateStore((s) => s.relock);
  // Objective 0.2 governance framework + decision roster -- read, never re-asked.
  const governance = useVisionStore(
    (s) => s.getVisionData(projectId)?.stewardTeam?.governance,
  );
  const roster = useStewardRoster(projectId);

  const [reviewer, setReviewer] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  /** Steward display names from the 0.2 roster (empty offline). */
  const rosterNames = useMemo(
    () =>
      roster
        .map((e) => e.member.displayName ?? e.member.email)
        .filter((n): n is string => typeof n === 'string' && n.length > 0),
    [roster],
  );
  // Auto-select the first steward as the reviewer; governance can change it.
  const effectiveReviewer = reviewer || rosterNames[0] || '';

  /** Open (non-terminal) concerns awaiting governance review. */
  const openConcerns = useMemo(
    () =>
      concerns.filter(
        (c) => c.status === 'raised' || c.status === 'under-review',
      ),
    [concerns],
  );
  /** Resolved (terminal) concerns -- the governance record. */
  const resolvedConcerns = useMemo(
    () =>
      concerns.filter(
        (c) => c.status === 'approved' || c.status === 'declined',
      ),
    [concerns],
  );

  // Self-gate AFTER all hooks: no concerns -> nothing to govern.
  if (concerns.length === 0) return null;

  const titleFor = (id: string) =>
    objectiveTitleFor ? objectiveTitleFor(id) : id;

  const handleBeginReview = (c: PlanConcern) => {
    markUnderReview(projectId, c.id);
  };

  const handleApprove = (c: PlanConcern) => {
    const text = (drafts[c.id] ?? '').trim();
    // UI guard mirrors the store's hard reject -- never approve unclean/empty text
    // and never approve without a reviewer.
    if (text.length === 0 || detectCsaLikeText(text) || effectiveReviewer === '') {
      return;
    }
    // Lift -> record alongside the original -> re-lock. Net lock state unchanged;
    // the only durable effect is the appended amendment.
    liftLock(projectId, c.objectiveRef);
    resolveConcern(projectId, c.id, 'approved', effectiveReviewer, {
      amendmentText: text,
    });
    relock(projectId, c.objectiveRef);
    setDrafts((d) => {
      const { [c.id]: _omit, ...rest } = d;
      return rest;
    });
  };

  const handleDecline = (c: PlanConcern) => {
    if (effectiveReviewer === '') return;
    resolveConcern(projectId, c.id, 'declined', effectiveReviewer);
  };

  return (
    <section
      className={styles.governance}
      data-testid="concern-governance-panel"
      aria-label={G.heading}
    >
      <div className={styles.governanceHead}>
        <ShieldCheck size={15} aria-hidden="true" />
        <p className={styles.governanceTitle}>{G.heading}</p>
      </div>
      <p className={styles.governanceBlurb}>{G.blurb}</p>

      {/* Objective 0.2 governance framework -- the review context, never re-asked. */}
      <div className={styles.governanceContext} data-testid="concern-governance-context">
        <span className={styles.governanceContextLabel}>{G.contextLabel}</span>
        <span className={styles.governanceContextText}>
          {governance && governance.trim().length > 0
            ? governance
            : G.contextFallback}
        </span>
      </div>

      {rosterNames.length > 0 && (
        <label className={styles.governanceField}>
          <span className={styles.governanceLabel}>{G.reviewerLabel}</span>
          <select
            className={styles.governanceSelect}
            data-testid="concern-governance-reviewer"
            value={effectiveReviewer}
            onChange={(e) => setReviewer(e.target.value)}
          >
            <option value="">{G.reviewerPlaceholder}</option>
            {rosterNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Open queue ------------------------------------------------------- */}
      <p className={styles.governanceSubhead}>{G.openHeading}</p>
      {openConcerns.length === 0 ? (
        <p className={styles.governanceEmpty}>{G.emptyOpen}</p>
      ) : (
        <ul className={styles.governanceList}>
          {openConcerns.map((c) => {
            const draft = drafts[c.id] ?? '';
            const csaTripped = detectCsaLikeText(draft);
            const canApprove =
              draft.trim().length > 0 &&
              !csaTripped &&
              effectiveReviewer !== '';
            return (
              <li
                key={c.id}
                className={styles.governanceItem}
                data-testid={`concern-review-${c.id}`}
              >
                <div className={styles.governanceItemHead}>
                  <span className={styles.governanceStatus}>
                    {c.status === 'under-review' ? (
                      <Clock size={12} aria-hidden="true" />
                    ) : (
                      <Circle size={12} aria-hidden="true" />
                    )}
                    {badgeFor(c.status)}
                  </span>
                  <span className={styles.governanceObjective}>
                    {titleFor(c.objectiveRef)}
                  </span>
                </div>
                <p className={styles.governanceMeta}>
                  {G.raisedByPrefix} {c.raisedBy || '--'} {formatDay(c.timestamp)}
                </p>

                <div className={styles.governanceFieldText}>
                  <span className={styles.governanceFieldLabel}>
                    {G.observationLabel}
                  </span>
                  <span>{c.observation}</span>
                </div>
                {c.proposedChange.length > 0 && (
                  <div className={styles.governanceFieldText}>
                    <span className={styles.governanceFieldLabel}>
                      {G.proposedLabel}
                    </span>
                    <span>{c.proposedChange}</span>
                  </div>
                )}

                {c.status === 'raised' ? (
                  <div className={styles.governanceActions}>
                    <button
                      type="button"
                      className={styles.governanceGhostBtn}
                      data-testid={`concern-review-begin-${c.id}`}
                      onClick={() => handleBeginReview(c)}
                    >
                      {G.beginReview}
                    </button>
                  </div>
                ) : (
                  <>
                    <label className={styles.governanceField}>
                      <span className={styles.governanceLabel}>
                        {G.amendmentLabel}
                      </span>
                      <textarea
                        className={styles.governanceTextarea}
                        data-testid={`concern-review-amendment-${c.id}`}
                        value={draft}
                        placeholder={G.amendmentPlaceholder}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                      />
                    </label>

                    {csaTripped && (
                      <div
                        className={styles.governanceAdvisory}
                        data-testid={`concern-review-advisory-${c.id}`}
                        role="note"
                      >
                        <p className={styles.governanceAdvisoryTitle}>
                          {CSA_ADVISORY_COPY.title}
                        </p>
                        <p className={styles.governanceAdvisoryBody}>
                          {CSA_ADVISORY_COPY.body}
                        </p>
                      </div>
                    )}

                    <div className={styles.governanceActions}>
                      <button
                        type="button"
                        className={styles.governanceApproveBtn}
                        data-testid={`concern-review-approve-${c.id}`}
                        disabled={!canApprove}
                        onClick={() => handleApprove(c)}
                      >
                        <CheckCircle2 size={13} aria-hidden="true" /> {G.approve}
                      </button>
                      <button
                        type="button"
                        className={styles.governanceDeclineBtn}
                        data-testid={`concern-review-decline-${c.id}`}
                        disabled={effectiveReviewer === ''}
                        onClick={() => handleDecline(c)}
                      >
                        <XCircle size={13} aria-hidden="true" /> {G.decline}
                      </button>
                      {draft.trim().length === 0 && (
                        <span className={styles.governanceHint}>
                          {G.approveHint}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Resolved record -------------------------------------------------- */}
      {resolvedConcerns.length > 0 && (
        <>
          <p className={styles.governanceSubhead}>{G.resolvedHeading}</p>
          <ul className={styles.governanceList}>
            {resolvedConcerns.map((c) => (
              <li
                key={c.id}
                className={styles.governanceResolved}
                data-testid={`concern-resolved-${c.id}`}
              >
                <div className={styles.governanceItemHead}>
                  <span className={styles.governanceStatus}>
                    {c.status === 'approved' ? (
                      <CheckCircle2 size={12} aria-hidden="true" />
                    ) : (
                      <XCircle size={12} aria-hidden="true" />
                    )}
                    {badgeFor(c.status)}
                  </span>
                  <span className={styles.governanceObjective}>
                    {titleFor(c.objectiveRef)}
                  </span>
                </div>
                <p className={styles.governanceMeta}>
                  {c.reviewedBy ? `${c.reviewedBy} ` : ''}
                  {typeof c.reviewedAt === 'number'
                    ? formatDay(c.reviewedAt)
                    : ''}
                </p>
                {c.status === 'approved' &&
                  typeof c.amendmentText === 'string' &&
                  c.amendmentText.length > 0 && (
                    <div className={styles.governanceFieldText}>
                      <span className={styles.governanceFieldLabel}>
                        {G.recordedPrefix}
                      </span>
                      <span>{c.amendmentText}</span>
                    </div>
                  )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
