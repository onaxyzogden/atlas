// ActRailModeToggle.tsx
//
// Left-rail segmented control for the Act tier shell: switch the rail between
// the stratum's design objectives and the standing-protocol library. Mirrors
// the Plan spine's Design/Protocol ModeToggle, but styled with the Act shell's
// theme vars (NOT the spine's hard-coded palette) so it sits natively in the
// Act rail. An aggregate amber attention badge appears on the Protocols segment
// whenever any protocol for this project is triggered and needs action.
//
// Aggregate-only by design: protocols carry no objective linkage today
// (ActivatedProtocolRecord has no objectiveId), so the signal is rail-level.

import styles from './ActTierShell.module.css';

export type RailMode = 'objectives' | 'protocols';

interface Props {
  mode: RailMode;
  onChange: (mode: RailMode) => void;
  /** Count of triggered protocols needing attention; >0 shows the amber badge. */
  attentionCount: number;
}

export default function ActRailModeToggle({
  mode,
  onChange,
  attentionCount,
}: Props) {
  return (
    <div
      className={styles.railToggle}
      role="radiogroup"
      aria-label="Rail view"
      data-testid="act-rail-mode-toggle"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'objectives'}
        data-active={mode === 'objectives'}
        className={styles.railToggleBtn}
        onClick={() => onChange('objectives')}
      >
        Objectives
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'protocols'}
        data-active={mode === 'protocols'}
        className={styles.railToggleBtn}
        onClick={() => onChange('protocols')}
      >
        Protocols
        {attentionCount > 0 && (
          <span
            className={styles.railToggleBadge}
            data-testid="act-rail-protocol-badge"
            aria-label={`${attentionCount} protocol${attentionCount === 1 ? '' : 's'} need attention`}
          >
            {attentionCount}
          </span>
        )}
      </button>
    </div>
  );
}
