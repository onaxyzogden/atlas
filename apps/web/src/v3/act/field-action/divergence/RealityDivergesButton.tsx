/**
 * RealityDivergesButton — always-enabled action button per OLOS Act Command
 * Center Spec v1 §9.5. Renders inline with the other task actions on
 * ActTaskDetail; opens DivergenceCaptureForm below the action row.
 *
 * Per spec §6.1, divergence is amber (loop / refresh metaphor), NOT red —
 * the red palette is reserved for `blocked`. Disabled only when the action
 * is in a terminal state (`verified` / `diverged`).
 */

import { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import type { FieldAction } from '@ogden/shared';
import { isTerminal } from '@ogden/shared/relationships';
import DivergenceCaptureForm from './DivergenceCaptureForm.js';
import css from './Divergence.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

export default function RealityDivergesButton({ projectId, action }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = isTerminal(action.status);

  return (
    <>
      <button
        type="button"
        className={css.btn}
        onClick={() => setOpen(true)}
        disabled={disabled || open}
        data-testid="act-task-diverge"
        aria-expanded={open}
      >
        <RefreshCcw size={12} strokeWidth={2} aria-hidden="true" />
        Reality diverges
      </button>
      {open && (
        <DivergenceCaptureForm
          projectId={projectId}
          action={action}
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
