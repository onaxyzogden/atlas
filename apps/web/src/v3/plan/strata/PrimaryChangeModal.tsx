// PrimaryChangeModal - change the PRIMARY type of an already-typed project
// mid-project. Opened from the primary-type label in PlanStratumShell (the
// `plan-primary-change-trigger`). Sibling to PrimarySetModal, which only ever
// SETS a first primary; this one REPLACES an existing primary, which
// re-derives the whole S1-S7 objective catalogue and is therefore destructive.
//
// A live preview (usePrimaryChangePreview) shows the consequences BEFORE
// anything is written: objectives added, objectives set aside (and how many
// carry started work that will be discarded), dropped incompatible secondary
// layers, newly-active design tensions, and any Amanah scopeNotes cautions
// being taken on or left behind (e.g. the Market Garden CSA / bay' ma laysa
// 'indak flag - never dropped silently).
//
// Confirm is gated twice: any newly-active tension must be acknowledged
// (advisory, mirrors the wizard) AND the steward must tick an explicit
// "I understand" acknowledgement, because progress on set-aside objectives is
// discarded. An opt-in (default-on) backup clones the project under the OLD
// type with its progress before the switch.
//
// This modal owns NO store writes (mirrors SecondaryAddModal). On Confirm it
// hands the chosen primary + clone choice up to the parent, which orchestrates
// the clone + changePrimaryType mutation. The preview is recomputed live from
// the candidate, so no snapshot capture is needed here.

import { useEffect, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import { findProjectType, type ProjectTypeId } from '@ogden/shared';
import WizardProjectTypeGrid from '../../project-wizard/WizardProjectTypeGrid.js';
import WizardTensionPanel from '../../project-wizard/WizardTensionPanel.js';
import { usePrimaryChangePreview } from './usePrimaryChangePreview.js';
import css from './SecondaryAddModal.module.css';
import own from './PrimaryChangeModal.module.css';

interface Props {
  projectId: string;
  /** The project's CURRENT primary type id (the grid starts here). */
  primaryTypeId: ProjectTypeId;
  /**
   * Fired with the chosen new primary + whether to keep an old-type backup
   * clone. The parent orchestrates the clone (if opted in) then the
   * changePrimaryType mutation.
   */
  onConfirm: (nextPrimaryId: ProjectTypeId, opts: { clone: boolean }) => void;
  onDismiss: () => void;
}

export default function PrimaryChangeModal({
  projectId,
  primaryTypeId,
  onConfirm,
  onDismiss,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  // The grid starts on the current primary; switching to a different type is
  // what makes the preview eligible.
  const [candidate, setCandidate] = useState<ProjectTypeId>(primaryTypeId);
  const [cloneBackup, setCloneBackup] = useState(true);
  const [understood, setUnderstood] = useState(false);
  const [tensionsAcked, setTensionsAcked] = useState(false);

  const preview = usePrimaryChangePreview(projectId, candidate);

  // A fresh candidate resets both gates.
  useEffect(() => {
    setUnderstood(false);
    setTensionsAcked(false);
  }, [candidate]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const fromLabel = findProjectType(primaryTypeId)?.label ?? primaryTypeId;
  const candidateLabel = findProjectType(candidate)?.label ?? candidate;

  const needsTensionAck = preview.eligible && preview.newTensions.length > 0;
  const canConfirm =
    preview.eligible && understood && (!needsTensionAck || tensionsAcked);

  const setAsideCount = preview.objectivesSetAside.length;
  const droppedLabels = preview.droppedSecondaryIds.map(
    (id) => findProjectType(id)?.label ?? id,
  );

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(candidate, { clone: cloneBackup });
  };

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-primary-change-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="primary-change-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-primary-change-card"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close change project type"
          data-testid="plan-primary-change-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Layers size={20} />
        </div>

        <h2 className={css.title} id="primary-change-title">
          Change project type
        </h2>
        <p className={css.copy}>
          This project is currently a <strong>{fromLabel}</strong>. Changing the
          primary type re-derives your objectives from scratch - progress on
          objectives the new type does not share is discarded. Keep a backup
          below if you want to preserve the current plan.
        </p>

        <div className={css.pickerWrap}>
          <WizardProjectTypeGrid selectedId={candidate} onSelect={setCandidate} />
        </div>

        {preview.eligible && (
          <div
            className={css.consequences}
            data-testid="plan-primary-change-consequences"
          >
            <p className={css.consequencesEyebrow}>Switching to {candidateLabel} will</p>
            <ul className={css.consequenceList}>
              {preview.objectivesAddedCount > 0 && (
                <li className={css.consequence}>
                  Add{' '}
                  <strong className={css.strong}>
                    {preview.objectivesAddedCount}
                  </strong>{' '}
                  new objective{preview.objectivesAddedCount === 1 ? '' : 's'}
                </li>
              )}
              {setAsideCount > 0 && (
                <li className={css.consequence} data-tone="reopen">
                  Set aside{' '}
                  <strong className={css.strong}>{setAsideCount}</strong>{' '}
                  objective{setAsideCount === 1 ? '' : 's'}
                  {preview.startedSetAsideCount > 0 && (
                    <>
                      {' '}
                      (discarding started work on{' '}
                      <strong className={css.strong}>
                        {preview.startedSetAsideCount}
                      </strong>
                      )
                    </>
                  )}
                </li>
              )}
              {droppedLabels.length > 0 && (
                <li className={css.consequence} data-tone="reopen">
                  Remove incompatible secondary{' '}
                  {droppedLabels.length === 1 ? 'layer' : 'layers'}:{' '}
                  <strong className={css.strong}>
                    {droppedLabels.join(', ')}
                  </strong>
                </li>
              )}
              {preview.objectivesAddedCount === 0 &&
                setAsideCount === 0 &&
                droppedLabels.length === 0 && (
                  <li className={css.consequence}>
                    Share the same objectives - no planning work changes
                  </li>
                )}
            </ul>

            {preview.amanahNotes.length > 0 && (
              <div
                className={own.amanahCallout}
                data-testid="plan-primary-change-amanah"
              >
                <p className={own.amanahEyebrow}>Amanah cautions</p>
                <ul className={own.amanahList}>
                  {preview.amanahNotes.map((n) => (
                    <li
                      key={`${n.direction}:${n.objectiveId}`}
                      className={own.amanahNote}
                    >
                      <span className={own.amanahDirection}>
                        {n.direction === 'added'
                          ? 'Taking on'
                          : 'Leaving behind'}
                      </span>{' '}
                      <span className={own.amanahNoteHead}>
                        {n.objectiveTitle}
                      </span>{' '}
                      &mdash; {n.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {needsTensionAck && (
          <div className={css.tensionWrap}>
            <WizardTensionPanel
              tensions={preview.newTensions}
              acknowledgedTensionIds={
                tensionsAcked ? preview.newTensions.map((t) => t.id) : []
              }
              onAcknowledge={() => setTensionsAcked(true)}
            />
          </div>
        )}

        {preview.eligible && (
          <div className={own.gates}>
            <label className={own.gateRow}>
              <input
                type="checkbox"
                checked={cloneBackup}
                onChange={(e) => setCloneBackup(e.target.checked)}
                data-testid="plan-primary-change-clone"
              />
              <span>
                Keep a backup copy of this project as a <strong>{fromLabel}</strong>
                <span className={own.gateHint}>
                  A frozen snapshot with the current objectives and progress.
                  Leave unticked to switch without keeping a copy.
                </span>
              </span>
            </label>
            <label className={own.gateRow}>
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                data-testid="plan-primary-change-understand"
              />
              <span>
                I understand this re-derives my objectives and discards progress
                on the set-aside objectives.
              </span>
            </label>
          </div>
        )}

        <div className={css.actions}>
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-primary-change-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={css.primary}
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="plan-primary-change-confirm"
          >
            {preview.eligible ? `Switch to ${candidateLabel}` : 'Change project type'}
          </button>
        </div>
      </div>
    </div>
  );
}
