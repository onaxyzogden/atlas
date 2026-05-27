/**
 * ActShellToggle — segmented two-state control that flips the Act stage
 * between the new field-action dashboard (View B / View A) and the
 * legacy command-centre module shell. Mirrors PlanNavToggle precisely
 * so the two stages feel like the same control pattern. Persisted
 * per-project on `LocalProject.actShellMode` via `updateProject`.
 */

import { ClipboardCheck, LayoutGrid } from 'lucide-react';
import type { ActShellMode } from '../../../store/projectStore.js';
import css from './ActShellToggle.module.css';

interface Props {
  mode: ActShellMode;
  onChange: (mode: ActShellMode) => void;
}

const OPTIONS: ReadonlyArray<{
  mode: ActShellMode;
  label: string;
  Icon: typeof ClipboardCheck;
}> = [
  { mode: 'field-action', label: 'Field actions', Icon: ClipboardCheck },
  { mode: 'command-centre', label: 'Command centre', Icon: LayoutGrid },
];

export default function ActShellToggle({ mode, onChange }: Props) {
  return (
    <div className={css.wrap} role="radiogroup" aria-label="Act navigation shell">
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
