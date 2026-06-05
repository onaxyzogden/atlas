// PrimarySetModal - set the PRIMARY project type when none has been chosen
// yet (e.g. the builtin MTC project, created without a type). Opened from the
// "Set project type" trigger in PlanStratumShell when primaryTypeId is null.
//
// The steward picks one primary purpose; on Confirm the parent performs the
// (additive, non-destructive) setPrimaryType mutation, which writes a fresh
// ProjectTypeRecord and re-derives the objective list. Replacing an
// already-set primary mid-project is out of scope (the wizard owns that), so
// this modal only ever mounts when no primary exists.
//
// It reuses WizardProjectTypeGrid unchanged - that grid renders only
// PRIMARY_TYPES, so residential (secondary-only) cannot be picked here - and
// borrows the SecondaryAddModal stylesheet for visual parity. No tension panel
// or consequence preview: a bare primary has nothing to reconcile against.

import { useEffect, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import { type ProjectTypeId } from '@ogden/shared';
import WizardProjectTypeGrid from '../../project-wizard/WizardProjectTypeGrid.js';
import css from './SecondaryAddModal.module.css';

interface Props {
  /** Fired with the chosen primary type id. */
  onConfirm: (primaryTypeId: ProjectTypeId) => void;
  onDismiss: () => void;
}

export default function PrimarySetModal({ onConfirm, onDismiss }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<ProjectTypeId | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const handleConfirm = () => {
    if (selected === null) return;
    onConfirm(selected);
  };

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onClick={onDismiss}
      data-testid="plan-primary-set-backdrop"
    >
      <div
        className={css.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="primary-set-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-primary-set-card"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={css.close}
          onClick={onDismiss}
          aria-label="Close set project type"
          data-testid="plan-primary-set-close"
        >
          <X size={16} aria-hidden />
        </button>

        <div className={css.iconWrap} aria-hidden>
          <Layers size={20} />
        </div>

        <h2 className={css.title} id="primary-set-title">
          Set project type
        </h2>
        <p className={css.copy}>
          Pick the primary purpose - this sets the objectives you will plan
          against. You can layer compatible secondary uses on afterwards.
        </p>

        <div className={css.pickerWrap}>
          <WizardProjectTypeGrid selectedId={selected} onSelect={setSelected} />
        </div>

        <div className={css.actions}>
          <button
            type="button"
            className={css.secondary}
            onClick={onDismiss}
            data-testid="plan-primary-set-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className={css.primary}
            onClick={handleConfirm}
            disabled={selected === null}
            data-testid="plan-primary-set-confirm"
          >
            Set project type
          </button>
        </div>
      </div>
    </div>
  );
}
