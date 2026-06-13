/**
 * WorkReviewSection — the pinned "Proposed" section of the Act work panel.
 *
 * Reads BOTH `livestockWorkPlanStore.proposals` and
 * `communityWorkPlanStore.proposals` (NOT WorkItem flags — proposals never
 * touch the spine until confirmed). Per-item Confirm / edit (date + carer
 * via `editProposal`) / Dismiss; "Confirm all" routes through
 * WorkBulkConfirmOverlay so any Amanah-flagged scopeNotes are reviewed
 * VERBATIM before the bulk write. Dismissed rows stay reachable behind a
 * collapsed toggle (restoreProposal).
 *
 * scopeNotes render verbatim on the proposal row itself as well — the
 * operator sees the caution at the point of the individual confirm, not
 * only in the bulk overlay.
 *
 * Needs-review subsection (Phase 4): confirmed proposals flagged by a
 * regeneration (`needsReview` 'changed' | 'orphaned') surface here for the
 * operator to resolve — accept-update / keep-mine / cancel-work. The flag
 * is advisory; nothing on the spine moves until the operator picks
 * (`resolveReview` owns the writes, confirmed-never-mutated covenant).
 *
 * Dual-store layout (Phase 5): when BOTH domains have content, domain
 * headings ("Livestock plan" / "Community plan") appear above each list.
 * When only one domain has content, the markup is identical to the original
 * single-domain layout (no headings, same structure) — existing tests pin
 * this invariant.
 */

import { useMemo, useState } from 'react';
import {
  useLivestockWorkPlanStore,
  type LivestockWorkProposal,
} from '../../../../store/livestockWorkPlanStore.js';
import {
  useCommunityWorkPlanStore,
  type CommunityWorkProposal,
} from '../../../../store/communityWorkPlanStore.js';
import styles from './ActWorkPanel.module.css';
import WorkBulkConfirmOverlay, {
  type BulkConfirmProposal,
} from './WorkBulkConfirmOverlay.js';

interface Props {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Generic proposal shape accepted by the rendering rows. Both
// LivestockWorkProposal and CommunityWorkProposal satisfy this because they
// are WorkPlanProposal<I> instantiations; we only read the fields common to
// all instances (title, sourceKind, sourceProtocolId, dueDate, suggestedCarer,
// detail, scopeNotes). Domain-specific instance columns (species, paddockId)
// are absent on community proposals and rendered conditionally.
// ---------------------------------------------------------------------------
type AnyProposal = LivestockWorkProposal | CommunityWorkProposal;

// Store-action bundle threaded into child rows so each domain's rows call
// the right store.
interface DomainActions {
  confirmProposal: (projectId: string, key: string) => void;
  editProposal: (
    projectId: string,
    key: string,
    edits: { dueDate?: string; carer?: string },
  ) => void;
  dismissProposal: (projectId: string, key: string) => void;
  restoreProposal: (projectId: string, key: string) => void;
  resolveReview: (
    projectId: string,
    key: string,
    resolution: 'accept-update' | 'keep-mine' | 'cancel-work',
  ) => void;
  confirmAll: (projectId: string) => void;
}

// ---------------------------------------------------------------------------
// ProposalRow
// ---------------------------------------------------------------------------
function ProposalRow({
  proposal,
  actions,
}: {
  proposal: AnyProposal;
  actions: DomainActions;
}) {
  const [editing, setEditing] = useState(false);
  const inst = proposal.instance;
  const dueDate = proposal.editedFields?.dueDate ?? inst.dueDate;
  const carer = proposal.editedFields?.carer ?? inst.suggestedCarer ?? '';
  const [draftDate, setDraftDate] = useState(dueDate);
  const [draftCarer, setDraftCarer] = useState(carer);

  const handleSaveEdit = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) return;
    actions.editProposal(proposal.projectId, inst.key, {
      dueDate: draftDate,
      ...(draftCarer.trim() !== '' ? { carer: draftCarer.trim() } : {}),
    });
    setEditing(false);
  };

  return (
    <div className={styles.reviewRow} data-testid="work-proposal-row">
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{inst.title}</span>
        <span className={styles.pill}>proposed</span>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.chip} title={inst.sourceProtocolId ?? undefined}>
          {'sourceKind' in inst ? inst.sourceKind : inst.kind}
        </span>
        <span>due {dueDate}</span>
        {'species' in inst && inst.species && <span>{inst.species}</span>}
        {(proposal.editedFields?.carer ?? inst.suggestedCarer) && (
          <span>{proposal.editedFields?.carer ?? inst.suggestedCarer}</span>
        )}
      </div>
      {inst.detail && <div className={styles.rowMeta}>{inst.detail}</div>}
      {inst.scopeNotes && (
        <div className={styles.scopeNotes} data-testid="work-proposal-scope-notes">
          {inst.scopeNotes}
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          data-variant="primary"
          onClick={() => actions.confirmProposal(proposal.projectId, inst.key)}
        >
          Confirm
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => setEditing((e) => !e)}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => actions.dismissProposal(proposal.projectId, inst.key)}
        >
          Dismiss
        </button>
      </div>
      {editing && (
        <div className={styles.inlineForm}>
          <div className={styles.inlineField}>
            <label htmlFor={`prop-date-${proposal.id}`}>Date</label>
            <input
              id={`prop-date-${proposal.id}`}
              className={styles.input}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className={styles.inlineField}>
            <label htmlFor={`prop-carer-${proposal.id}`}>Carer</label>
            <input
              id={`prop-carer-${proposal.id}`}
              className={styles.input}
              value={draftCarer}
              onChange={(e) => setDraftCarer(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              data-variant="primary"
              onClick={handleSaveEdit}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewFlagRow
// ---------------------------------------------------------------------------
function ReviewFlagRow({
  proposal,
  actions,
}: {
  proposal: AnyProposal;
  actions: DomainActions;
}) {
  const review = proposal.needsReview;
  if (!review) return null;
  const inst = proposal.instance;
  const resolve = (resolution: 'accept-update' | 'keep-mine' | 'cancel-work') =>
    actions.resolveReview(proposal.projectId, inst.key, resolution);

  return (
    <div className={styles.reviewRow} data-testid="work-needs-review-row">
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{inst.title}</span>
        <span className={styles.pill} data-tone="danger">
          {review.reason === 'changed' ? 'plan changed' : 'orphaned'}
        </span>
      </div>
      <div className={styles.rowMeta}>
        {review.reason === 'changed' && review.next ? (
          <span>
            Regenerated: {review.next.title} · due {review.next.dueDate}
            {review.next.suggestedCarer
              ? ` · ${review.next.suggestedCarer}`
              : ''}
          </span>
        ) : (
          <span>
            The Plan decision behind this confirmed work no longer generates
            it.
          </span>
        )}
      </div>
      {review.next?.scopeNotes && (
        <div className={styles.scopeNotes} data-testid="work-review-scope-notes">
          {review.next.scopeNotes}
        </div>
      )}
      <div className={styles.actions}>
        {review.reason === 'changed' && review.next && (
          <button
            type="button"
            className={styles.actionBtn}
            data-variant="primary"
            onClick={() => resolve('accept-update')}
          >
            Accept update
          </button>
        )}
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => resolve('keep-mine')}
        >
          Keep mine
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => resolve('cancel-work')}
        >
          Cancel work
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkReviewList — inner component for one domain's proposal list.
// heading is rendered ONLY when the caller provides one (i.e. both domains
// have content — the dual-domain case). Single-domain rendering passes no
// heading and produces markup identical to the original implementation.
// ---------------------------------------------------------------------------
interface WorkReviewListProps {
  projectId: string;
  proposals: readonly AnyProposal[];
  actions: DomainActions;
  /** Domain heading displayed only in the dual-domain layout. */
  heading?: string;
}

function WorkReviewList({
  projectId,
  proposals,
  actions,
  heading,
}: WorkReviewListProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  const { proposed, dismissed, flaggedForReview } = useMemo(() => {
    const mine = proposals.filter((p) => p.projectId === projectId);
    return {
      proposed: mine
        .filter((p) => p.status === 'proposed')
        .sort((a, b) =>
          (a.editedFields?.dueDate ?? a.instance.dueDate) <
          (b.editedFields?.dueDate ?? b.instance.dueDate)
            ? -1
            : 1,
        ),
      dismissed: mine.filter((p) => p.status === 'dismissed'),
      flaggedForReview: mine.filter((p) => Boolean(p.needsReview)),
    };
  }, [proposals, projectId]);

  if (
    proposed.length === 0 &&
    dismissed.length === 0 &&
    flaggedForReview.length === 0
  ) {
    return null;
  }

  // AnyProposal satisfies BulkConfirmProposal structurally (id + instance.title
  // + instance.scopeNotes?); the cast is safe and avoids a complex predicate.
  const flagged = proposed.filter((p) =>
    Boolean(p.instance.scopeNotes),
  ) as BulkConfirmProposal[];

  return (
    <>
      {heading && (
        <div
          className={styles.sectionTitle}
          data-testid="work-review-domain-heading"
        >
          {heading}
        </div>
      )}
      {flaggedForReview.length > 0 && (
        <>
          <div className={styles.sectionTitle} data-tone="danger">
            Needs review — Plan changed ({flaggedForReview.length})
          </div>
          {flaggedForReview.map((p) => (
            <ReviewFlagRow key={p.id} proposal={p} actions={actions} />
          ))}
        </>
      )}
      {(proposed.length > 0 || dismissed.length > 0) && (
        <div className={styles.sectionTitle} data-tone="gold">
          Proposed — review &amp; confirm ({proposed.length})
        </div>
      )}
      {proposed.map((p) => (
        <ProposalRow key={p.id} proposal={p} actions={actions} />
      ))}
      {proposed.length > 1 && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            data-variant="primary"
            data-testid="work-confirm-all"
            onClick={() => setOverlayOpen(true)}
          >
            Confirm all {proposed.length}
          </button>
        </div>
      )}
      {dismissed.length > 0 && (
        <button
          type="button"
          className={styles.dismissedToggle}
          onClick={() => setShowDismissed((v) => !v)}
        >
          {showDismissed ? 'Hide' : 'Show'} {dismissed.length} dismissed
        </button>
      )}
      {showDismissed &&
        dismissed.map((p) => (
          <div className={styles.reviewRow} key={p.id}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{p.instance.title}</span>
              <span className={styles.pill}>dismissed</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() =>
                  actions.restoreProposal(projectId, p.instance.key)
                }
              >
                Restore
              </button>
            </div>
          </div>
        ))}
      {overlayOpen && (
        <WorkBulkConfirmOverlay
          eligible={proposed}
          flagged={flagged}
          onConfirm={() => {
            actions.confirmAll(projectId);
            setOverlayOpen(false);
          }}
          onCancel={() => setOverlayOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// WorkReviewSection — outer shell subscribing to both domain stores.
// ---------------------------------------------------------------------------
export default function WorkReviewSection({ projectId }: Props) {
  const livestockProposals = useLivestockWorkPlanStore((s) => s.proposals);
  const communityProposals = useCommunityWorkPlanStore((s) => s.proposals);

  // Per-domain relevant-proposal counts used to decide whether to show headings.
  const livestockHasContent = useMemo(() => {
    const mine = livestockProposals.filter((p) => p.projectId === projectId);
    return (
      mine.some((p) => p.status === 'proposed' || p.status === 'dismissed') ||
      mine.some((p) => Boolean(p.needsReview))
    );
  }, [livestockProposals, projectId]);

  const communityHasContent = useMemo(() => {
    const mine = communityProposals.filter((p) => p.projectId === projectId);
    return (
      mine.some((p) => p.status === 'proposed' || p.status === 'dismissed') ||
      mine.some((p) => Boolean(p.needsReview))
    );
  }, [communityProposals, projectId]);

  if (!livestockHasContent && !communityHasContent) {
    return null;
  }

  const bothDomains = livestockHasContent && communityHasContent;

  // Store-action bundles — each domain calls its own store.
  const livestockActions: DomainActions = {
    confirmProposal: (pid, key) =>
      useLivestockWorkPlanStore.getState().confirmProposal(pid, key),
    editProposal: (pid, key, edits) =>
      useLivestockWorkPlanStore.getState().editProposal(pid, key, edits),
    dismissProposal: (pid, key) =>
      useLivestockWorkPlanStore.getState().dismissProposal(pid, key),
    restoreProposal: (pid, key) =>
      useLivestockWorkPlanStore.getState().restoreProposal(pid, key),
    resolveReview: (pid, key, resolution) =>
      useLivestockWorkPlanStore.getState().resolveReview(pid, key, resolution),
    confirmAll: (pid) =>
      useLivestockWorkPlanStore.getState().confirmAll(pid),
  };

  const communityActions: DomainActions = {
    confirmProposal: (pid, key) =>
      useCommunityWorkPlanStore.getState().confirmProposal(pid, key),
    editProposal: (pid, key, edits) =>
      useCommunityWorkPlanStore.getState().editProposal(pid, key, edits),
    dismissProposal: (pid, key) =>
      useCommunityWorkPlanStore.getState().dismissProposal(pid, key),
    restoreProposal: (pid, key) =>
      useCommunityWorkPlanStore.getState().restoreProposal(pid, key),
    resolveReview: (pid, key, resolution) =>
      useCommunityWorkPlanStore.getState().resolveReview(pid, key, resolution),
    confirmAll: (pid) =>
      useCommunityWorkPlanStore.getState().confirmAll(pid),
  };

  return (
    <div className={styles.section} data-testid="work-review-section">
      <WorkReviewList
        projectId={projectId}
        proposals={livestockProposals}
        actions={livestockActions}
        heading={bothDomains ? 'Livestock plan' : undefined}
      />
      <WorkReviewList
        projectId={projectId}
        proposals={communityProposals}
        actions={communityActions}
        heading={bothDomains ? 'Community plan' : undefined}
      />
    </div>
  );
}
