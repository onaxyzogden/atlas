// PlanNavToggle — segmented two-state control that flips the Plan stage
// between the new 7-tier spine (OLOS Plan Navigation Spec v1) and the
// legacy module-bar shell. Lives in the canvas as a top-right overlay
// in both shells so the steward can switch back-and-forth while we
// migrate the 52 module cards into tier objectives.
//
// Retires in Phase 7 alongside the module bar itself.

import { Columns3, ListTree } from 'lucide-react';
import type { PlanShellMode } from '../../store/projectStore.js';
import css from './PlanNavToggle.module.css';

interface Props {
  mode: PlanShellMode;
  onChange: (mode: PlanShellMode) => void;
}

const OPTIONS: ReadonlyArray<{
  mode: PlanShellMode;
  label: string;
  Icon: typeof ListTree;
}> = [
  { mode: 'tier-spine', label: 'Stratum spine', Icon: ListTree },
  { mode: 'module-bar', label: 'Module bar', Icon: Columns3 },
];

export default function PlanNavToggle({ mode, onChange }: Props) {
  return (
    <div
      className={css.wrap}
      role="radiogroup"
      aria-label="Plan navigation shell"
    >
      {OPTIONS.map(({ mode: optMode, label, Icon }) => {
        const isActive = mode === optMode;
        return (
          <button
            key={optMode}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={css.option}
            data-active={isActive}
            onClick={() => onChange(optMode)}
            title={label}
          >
            <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
