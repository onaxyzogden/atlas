/**
 * ViewFocusToggle -- the segmented "My focus / Full view" control for the
 * Operational Role Layer (ADR 2026-06-24). Pure + presentational: the parent
 * shell mounts it ONLY when the layer is active (`useViewScope().layerActive`)
 * and feeds it the current mode + an optional in-focus count. Flipping a
 * segment calls `onChange`; the shell persists it via `setFocusMode`.
 *
 * "My focus" = scope to the viewer's operational domains (de-emphasizing, never
 * hiding, out-of-scope work). "Full view" = the unfiltered catalogue. The
 * in-focus count reassures the steward that scoped-away work still exists and
 * is one click away. ASCII-only copy.
 */

import type { ViewFocusMode } from '../../store/uiStore.js';
import css from './ViewFocusToggle.module.css';

export interface ViewFocusToggleProps {
  focusMode: ViewFocusMode;
  onChange: (mode: ViewFocusMode) => void;
  /** Items in focus under role scope -- annotates the "My focus" segment. */
  inFocusCount?: number;
  /** Total items, for an "N / M" hint on the "My focus" segment. */
  totalCount?: number;
}

export default function ViewFocusToggle({
  focusMode,
  onChange,
  inFocusCount,
  totalCount,
}: ViewFocusToggleProps): JSX.Element {
  const showCount = typeof inFocusCount === 'number';
  const countLabel = showCount
    ? typeof totalCount === 'number'
      ? ` (${inFocusCount} / ${totalCount})`
      : ` (${inFocusCount})`
    : '';

  return (
    <div
      className={css.root}
      role="group"
      aria-label="View focus"
      data-testid="view-focus-toggle"
    >
      <button
        type="button"
        className={css.segment}
        data-active={focusMode === 'role'}
        aria-pressed={focusMode === 'role'}
        onClick={() => onChange('role')}
        data-testid="view-focus-role"
      >
        My focus
        {focusMode === 'role' ? countLabel : ''}
      </button>
      <button
        type="button"
        className={css.segment}
        data-active={focusMode === 'full'}
        aria-pressed={focusMode === 'full'}
        onClick={() => onChange('full')}
        data-testid="view-focus-full"
      >
        Full view
      </button>
    </div>
  );
}
