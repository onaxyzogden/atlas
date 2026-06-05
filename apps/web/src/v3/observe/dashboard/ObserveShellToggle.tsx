// ObserveShellToggle — segmented two-state control that flips the Observe
// stage between the new Dashboard (OLOS Observe Dashboard Spec v1 —
// Unified Land State / Domain Detail / Temporal Layer) and the legacy
// 7-module bar. Lives in the canvas as a top-right overlay in both
// shells so the steward can switch back-and-forth while existing
// projects (MTC + builtins) keep their hand-seeded module content.
//
// Mirrors PlanNavToggle / ActShellToggle exactly; retires together with
// the legacy Observe shell in Phase 7.

import { Columns3, LayoutDashboard } from 'lucide-react';
import type { ObserveShellMode } from '../../../store/projectStore.js';
import css from './ObserveShellToggle.module.css';

interface Props {
  mode: ObserveShellMode;
  onChange: (mode: ObserveShellMode) => void;
}

const OPTIONS: ReadonlyArray<{
  mode: ObserveShellMode;
  label: string;
  Icon: typeof LayoutDashboard;
}> = [
  { mode: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { mode: 'module-bar', label: 'Module bar', Icon: Columns3 },
];

export default function ObserveShellToggle({ mode, onChange }: Props) {
  return (
    <div
      className={css.wrap}
      role="radiogroup"
      aria-label="Observe navigation shell"
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
