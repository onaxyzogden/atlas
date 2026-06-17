/**
 * IntentLensAccordion -- the collapsible "Intent lens -- what to look for" block
 * shown inside the Reception (Tier-2) working panel for a systems-reading survey.
 *
 * Each survey carries per-project-type Intent Lens rows (schema `intentLens`):
 * what to look for when reading THIS system through the Regenerative-Farm vs
 * Silvopasture vs Residential lens. This component renders them as a collapsible
 * disclosure (collapsed by default so the capture form stays the focus), one row
 * per contributing type with its human label resolved via `findProjectType`.
 *
 * Plan Reception only: it is mounted by DecisionWorkingPanel behind an optional
 * `lens` prop. When the prop is omitted/empty (every Act surface, and every Plan
 * surface that is not a reception survey) the component returns null and renders
 * nothing -- so the working panel stays byte-identical everywhere else.
 *
 * Pure display: no store, no draft, no persistence. ASCII-only; the lens and the
 * disclosure chevron are lucide icons.
 */

import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import type { IntentLensRow } from '@ogden/shared';
import { findProjectType } from '@ogden/shared';
import css from './IntentLensAccordion.module.css';

export interface IntentLensAccordionProps {
  /** Per-type lens rows for the active survey (empty/absent => renders nothing). */
  lens: readonly IntentLensRow[];
  /** Start expanded? Defaults to false (collapsed). */
  defaultOpen?: boolean;
}

const LENS_LABEL = 'Intent lens -- what to look for';

export default function IntentLensAccordion({
  lens,
  defaultOpen = false,
}: IntentLensAccordionProps): JSX.Element | null {
  const [open, setOpen] = useState(defaultOpen);

  if (lens.length === 0) return null;

  return (
    <div className={css.root} data-testid="intent-lens">
      <button
        type="button"
        className={css.head}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Eye size={13} className={css.headIcon} aria-hidden="true" />
        <span className={css.headLbl}>{LENS_LABEL}</span>
        <span className={css.count}>{lens.length}</span>
        <ChevronDown
          size={14}
          className={css.chevron}
          data-open={open || undefined}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className={css.rows}>
          {lens.map((row, i) => {
            const label = findProjectType(row.typeId)?.label ?? row.typeId;
            return (
              <div
                className={css.row}
                key={`${row.typeId}-${i}`}
                data-testid={`intent-lens-row-${row.typeId}`}
              >
                <div className={css.rowType}>{label}</div>
                <div className={css.rowText}>{row.text}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
