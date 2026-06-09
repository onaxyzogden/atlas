/**
 * SuccessCriteriaCapture -- an alternative, CONTROLLED renderer over the
 * success-criteria value shape `{ criteria: string[] }`. This is the SAME shape
 * Phase A's VisionFormFields produces for the success-criteria form, so
 * persistence and the legacy summary mirror are unchanged; this component just
 * implements the mockup's "prescribed options" chip-to-seed UX instead of the
 * generic repeatable-row engine.
 *
 * It renders ONLY two blocks:
 *   1. "Suggested criteria" -- domain-grouped chips (first 2 always visible; the
 *      rest behind a "Show N more suggestions" toggle). Clicking an unused chip
 *      appends its text as a new criterion.
 *   2. "Your criteria" -- one editable numbered row per entry, a dashed
 *      add-row capped at `max`, and an inline "-- add at least {min}" note.
 *
 * It deliberately does NOT render the rationale field, the feeds callout, the
 * Record/Defer buttons, or any panel header/footer -- those belong to the
 * DecisionWorkingPanel (a later task).
 *
 * CONTROLLED / pure: the criteria array is never held in internal state. It is
 * always read from `value.criteria` and the full next array is emitted via
 * `onChange`. The only internal UI-only state is the "show more" toggle.
 */

import { Fragment, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import type { CriterionOption } from '@ogden/shared';
import css from './SuccessCriteriaCapture.module.css';

export interface SuccessCriteriaCaptureProps {
  value: { criteria: string[] };
  onChange: (next: { criteria: string[] }) => void;
  /** Resolved suggestions (parent calls resolveSuccessCriteriaOptions). */
  options: readonly CriterionOption[];
  /** Minimum criteria expected before the row block is "satisfied". Default 3. */
  min?: number;
  /** Maximum criteria allowed. Default 5. */
  max?: number;
}

const ALWAYS_VISIBLE = 2;

/** Capitalize a domain word for display ("ecological" -> "Ecological"). */
function domainLabel(domain: CriterionOption['domain']): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export default function SuccessCriteriaCapture({
  value,
  onChange,
  options,
  min = 3,
  max = 5,
}: SuccessCriteriaCaptureProps): JSX.Element {
  // UI-only state: whether the collapsed suggestion region is expanded.
  const [showMore, setShowMore] = useState(false);

  const criteria = value.criteria;
  const atMax = criteria.length >= max;
  const filledCount = criteria.filter((c) => c.trim() !== '').length;
  const belowMin = filledCount < min;

  const visibleChips = showMore ? options : options.slice(0, ALWAYS_VISIBLE);
  const hiddenCount = options.length - ALWAYS_VISIBLE;
  const hasToggle = options.length > ALWAYS_VISIBLE;

  const addCriterion = (text: string) => {
    if (atMax) return;
    onChange({ criteria: [...criteria, text] });
  };

  const editCriterion = (idx: number, text: string) => {
    onChange({
      criteria: criteria.map((c, i) => (i === idx ? text : c)),
    });
  };

  const removeCriterion = (idx: number) => {
    onChange({ criteria: criteria.filter((_, i) => i !== idx) });
  };

  return (
    <div className={css.root}>
      {/* ---------- Suggested criteria (chips) ---------- */}
      <div className={css.optsBlock}>
        <div className={css.optsHeader}>
          <span className={css.optsLabel}>Suggested criteria</span>
          <span className={css.optsSub}>Select to add -- then edit freely</span>
        </div>
        <div className={css.optsGrid}>
          {visibleChips.map((opt, chipIdx) => {
            // "used" is derived from presence -- the component stays stateless and
            // rehydration-friendly. This is an intentional, documented divergence
            // from the mockup's permanent DOM flag: editing a seeded row away from
            // the exact chip text re-enables that chip.
            const used = criteria.includes(opt.text);
            const disabled = used || atMax;
            // Thin divider between the two always-visible chips and the revealed
            // "more" group (mockup's <div class="opts-divider">). Rendered just
            // before the first chip past ALWAYS_VISIBLE, only present once the
            // collapsible group is expanded (the hidden chips aren't in the DOM
            // when collapsed, so a separator there would dangle).
            const showDivider = hasToggle && showMore && chipIdx === ALWAYS_VISIBLE;
            return (
              <Fragment key={opt.text}>
                {showDivider ? (
                  <div className={css.optsDivider} data-testid="opts-divider" />
                ) : null}
                <button
                  type="button"
                  className={css.optChip}
                  data-domain={opt.domain}
                  data-used={used ? 'true' : 'false'}
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={() => {
                    if (used || atMax) return;
                    addCriterion(opt.text);
                  }}
                >
                  <span className={css.optIcon}>
                    {used ? <Check size={14} /> : <Plus size={14} />}
                  </span>
                  <span className={css.optBody}>
                    <span className={css.optText}>{opt.text}</span>
                    <span className={css.optDomain} data-domain={opt.domain}>
                      <span className={css.optDot} data-domain={opt.domain} />
                      {domainLabel(opt.domain)}
                    </span>
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
        {hasToggle ? (
          <button
            type="button"
            className={css.optsToggle}
            data-open={showMore ? 'true' : 'false'}
            onClick={() => setShowMore((s) => !s)}
          >
            <ChevronDown size={14} className={css.optsArrow} />
            <span>
              {showMore
                ? 'Show fewer suggestions'
                : `Show ${hiddenCount} more suggestions`}
            </span>
          </button>
        ) : null}
      </div>

      {/* ---------- Your criteria (rows) ---------- */}
      <div className={css.rowsBlock}>
        <div className={css.secLabel}>
          <span>Your criteria</span>
          {belowMin ? (
            <span className={css.secNote}>{`-- add at least ${min}`}</span>
          ) : null}
        </div>
        <div className={css.rows}>
          {criteria.map((entry, idx) => {
            const filled = entry.trim() !== '';
            return (
              <div
                key={idx}
                className={css.row}
                data-testid="criterion-row"
                data-filled={filled ? 'true' : 'false'}
              >
                <span className={css.rowNum} data-filled={filled ? 'true' : 'false'}>
                  {filled ? <Check size={12} /> : idx + 1}
                </span>
                <textarea
                  className={css.rowTextarea}
                  value={entry}
                  placeholder="Write a criterion you can verify in the field..."
                  onChange={(e) => editCriterion(idx, e.target.value)}
                />
                <button
                  type="button"
                  className={css.rowDelete}
                  aria-label={`Delete criterion ${idx + 1}`}
                  onClick={() => removeCriterion(idx)}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
        {atMax ? null : (
          <button type="button" className={css.addRow} onClick={() => addCriterion('')}>
            <Plus size={14} />
            <span>Write your own criterion</span>
          </button>
        )}
      </div>
    </div>
  );
}
