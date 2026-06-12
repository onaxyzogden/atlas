/**
 * WorkReviewSection — the pinned "Proposed" section of the Act work panel.
 *
 * Reads `livestockWorkPlanStore.proposals` (NOT a WorkItem flag — proposals
 * never touch the spine until confirmed). Per-item Confirm / edit (date +
 * carer via `editProposal`) / Dismiss; "Confirm all" routes through
 * WorkBulkConfirmOverlay so any Amanah-flagged scopeNotes are reviewed
 * VERBATIM before the bulk write. Dismissed rows stay reachable behind a
 * collapsed toggle (restoreProposal).
 *
 * scopeNotes render verbatim on the proposal row itself as well — the
 * operator sees the caution at the point of the individual confirm, not
 * only in the bulk overlay.
 */

import { useMemo, useState } from 'react';
import {
  useLivestockWorkPlanStore,
  type LivestockWorkProposal,
} from '../../../../store/livestockWorkPlanStore.js';
import styles from './ActWorkPanel.module.css';
import WorkBulkConfirmOverlay from './WorkBulkConfirmOverlay.js';

interface Props {
  projectId: string;
}

function ProposalRow({ proposal }: { proposal: LivestockWorkProposal }) {
  const [editing, setEditing] = useState(false);
  const inst = proposal.instance;
  const dueDate = proposal.editedFields?.dueDate ?? inst.dueDate;
  const carer = proposal.editedFields?.carer ?? inst.suggestedCarer ?? '';
  const [draftDate, setDraftDate] = useState(dueDate);
  const [draftCarer, setDraftCarer] = useState(carer);

  const plan = () => useLivestockWorkPlanStore.getState();

  const handleSaveEdit = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) return;
    plan().editProposal(proposal.projectId, inst.key, {
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
          {inst.sourceKind}
        </span>
        <span>due {dueDate}</span>
        {inst.species && <span>{inst.species}</span>}
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
          onClick={() => plan().confirmProposal(proposal.projectId, inst.key)}
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
          onClick={() => plan().dismissProposal(proposal.projectId, inst.key)}
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

export default function WorkReviewSection({ projectId }: Props) {
  const proposals = useLivestockWorkPlanStore((s) => s.proposals);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  const { proposed, dismissed } = useMemo(() => {
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
    };
  }, [proposals, projectId]);

  if (proposed.length === 0 && dismissed.length === 0) return null;

  const flagged = proposed.filter((p) => Boolean(p.instance.scopeNotes));

  return (
    <div className={styles.section} data-testid="work-review-section">
      <div className={styles.sectionTitle} data-tone="gold">
        Proposed — review &amp; confirm ({proposed.length})
      </div>
      {proposed.map((p) => (
        <ProposalRow key={p.id} proposal={p} />
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
                  useLivestockWorkPlanStore
                    .getState()
                    .restoreProposal(projectId, p.instance.key)
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
            useLivestockWorkPlanStore.getState().confirmAll(projectId);
            setOverlayOpen(false);
          }}
          onCancel={() => setOverlayOpen(false)}
        />
      )}
    </div>
  );
}
