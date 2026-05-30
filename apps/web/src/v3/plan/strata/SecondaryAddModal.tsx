// SecondaryAddModal - mid-project secondary-type addition (OLOS Plan
// Navigation Spec v1.1 section 9). Opened from the "Project type" trigger in
// PlanStratumShell. The steward picks one compatible secondary the project
// does not already carry; a live preview (useSecondaryAddPreview) shows the
// consequences BEFORE anything is written - new objectives, items added to
// existing objectives, completed objectives that would reopen for review, an
// Observe-stage data gap, and any newly-active design tension. When the
// pairing has a new tension the steward must acknowledge it (advisory, mirrors
// the wizard) before Confirm enables.
//
// This modal owns no store writes. On Confirm it hands the captured preview
// snapshot up to the parent, which performs the addSecondaryType mutation and
// drives the post-add reopen modal / observe-gap banner. The snapshot must be
// captured here, pre-mutation, because once the secondary is added the
// candidate is no longer eligible and a fresh preview would be empty.

import { useEffect, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import { findProjectType, type ProjectTypeId } from '@ogden/shared';
import WizardSecondaryPicker from '../../project-wizard/WizardSecondaryPicker.js';
import WizardTensionPanel from '../../project-wizard/WizardTensionPanel.js';
import {
  useSecondaryAddPreview,
  type SecondaryAddPreview,
} from './useSecondaryAddPreview.js';
import css from './SecondaryAddModal.module.css';

interface Props {
  projectId: string;
  primaryTypeId: ProjectTypeId;
  currentSecondaryIds: readonly ProjectTypeId[];
  /** Fired with the chosen secondary + its pre-mutation preview snapshot. */
  onConfirm: (secondaryTypeId: ProjectTypeId, preview: SecondaryAddPreview) => void;
  onDismiss: () => void;
}

export default function SecondaryAddModal({
  projectId,
  primaryTypeId,
  currentSecondaryIds,
  onConfirm,
  onDismiss,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [candidate, setCandidate] = useState<ProjectTypeId | null>(null);
  const [tensionsAcked, setTensionsAcked] = useState(false);

  // When the candidate is null the hook is fed the primary id as a sentinel
  // (candidate === primary fails the eligibility guard) so the preview is a
  // stable empty record - no special-casing in the hook.
  const preview = useSecondaryAddPreview(projectId, candidate ?? primaryTypeId);

  // A fresh candidate resets the tension acknowledgement gate.
  useEffect(() => {
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

  const candidateLabel = candidate
    ? (findProjectType(candidate)?.label ?? candidate)
    : '';

  const needsTensionAck = preview.eligible && preview.newTensions.length > 0;
  const canConfirm =
    candidate !== null &&
    preview.eligible &&
    (!needsTensionAck || tensionsAcked);

  const newObjectiveCount = preview.delta.newObjectiveIds.length;
  const expandedCount = preview.delta.objectivesWithNewItems.length;
  const reopenCount = preview.reopenedObjectives.length;
  const observeGapCount = preview.observeGapObjectiveIds.length;

  const handleConfirm = () => {
    if (!candidate || !canConfirm) return;
    onConfirm(candidate, preview);
  };

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-secondary-add-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secondary-add-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-secondary-add-card"
      >
        <button
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close add project type"
          data-testid="plan-secondary-add-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Layers size={20} />
        </div>

        <h2 className={css.title} id="secondary-add-title">
          Add a project type
        </h2>
        <p className={css.copy}>
          Layer a compatible secondary use onto this project. New objectives
          appear in the spine, and completed decisions that the new use touches
          are reopened for review - your existing answers are kept.
        </p>

        <div className={css.pickerWrap}>
          <WizardSecondaryPicker
            primaryId={primaryTypeId}
            selectedIds={candidate ? [candidate] : []}
            excludeIds={currentSecondaryIds}
            onToggle={(id) =>
              setCandidate((prev) => (prev === id ? null : id))
            }
          />
        </div>

        {candidate && preview.eligible && (
          <div
            className={css.consequences}
            data-testid="plan-secondary-add-consequences"
          >
            <p className={css.consequencesEyebrow}>
              Adding {candidateLabel} will
            </p>
            <ul className={css.consequenceList}>
              {newObjectiveCount > 0 && (
                <li className={css.consequence}>
                  Add{' '}
                  <strong className={css.strong}>
                    {newObjectiveCount}
                  </strong>{' '}
                  new objective{newObjectiveCount === 1 ? '' : 's'}
                </li>
              )}
              {expandedCount > 0 && (
                <li className={css.consequence}>
                  Add items to{' '}
                  <strong className={css.strong}>{expandedCount}</strong>{' '}
                  existing objective{expandedCount === 1 ? '' : 's'}
                </li>
              )}
              {reopenCount > 0 && (
                <li className={css.consequence} data-tone="reopen">
                  Reopen{' '}
                  <strong className={css.strong}>{reopenCount}</strong>{' '}
                  completed objective{reopenCount === 1 ? '' : 's'} for review
                </li>
              )}
              {observeGapCount > 0 && (
                <li className={css.consequence} data-tone="observe">
                  Need new field observations for{' '}
                  <strong className={css.strong}>{observeGapCount}</strong>{' '}
                  objective{observeGapCount === 1 ? '' : 's'}
                </li>
              )}
              {newObjectiveCount === 0 &&
                expandedCount === 0 &&
                reopenCount === 0 && (
                  <li className={css.consequence}>
                    Add no new planning work - this layer shares the current
                    objectives
                  </li>
                )}
            </ul>
          </div>
        )}

        {needsTensionAck && (
          <div className={css.tensionWrap}>
            <WizardTensionPanel
              tensions={preview.newTensions}
              acknowledgedTensionIds={tensionsAcked ? preview.newTensions.map((t) => t.id) : []}
              onAcknowledge={() => setTensionsAcked(true)}
            />
          </div>
        )}

        <div className={css.actions}>
          <button
            ref={closeButtonRef}
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-secondary-add-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={css.primary}
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="plan-secondary-add-confirm"
          >
            {candidate ? `Add ${candidateLabel}` : 'Add project type'}
          </button>
        </div>
      </div>
    </div>
  );
}
