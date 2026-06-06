/**
 * DecisionWorkingPanel -- the RIGHT pane of the Tier-0 workbench: the working
 * surface for the currently-selected decision.
 *
 * Presentational + locally-drafted. The component owns a single piece of real
 * state -- the working draft (a FormValue) plus the rationale draft string --
 * seeded from the persisted values passed in and RE-SEEDED whenever the selected
 * decision changes (keyed on decision.itemId). All persistence is lifted to the
 * parent via callbacks (onRecord / onSaveRationale / onToggleDefer); this
 * component never touches the store.
 *
 * Body router (in order):
 *   1. decision.isSuccessCriteria -> SuccessCriteriaCapture over { criteria }.
 *   2. decision.fields (non-empty)  -> VisionFormFields over the draft.
 *   3. otherwise                    -> a single textarea bound to draft.text.
 *
 * Validity drives the Record button + the gate note:
 *   - fields / success-criteria: isFormValueValid(decision.fields ?? [], draft).
 *   - textarea: draft.text trimmed is non-empty.
 *
 * Token substitutions are documented in DecisionWorkingPanel.module.css. ASCII
 * only: all glyphs are lucide icons.
 */

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, MousePointerClick } from 'lucide-react';
import type { CriterionOption } from '@ogden/shared';
import type { FormFieldSpec, FormValue } from './actToolCatalog.js';
import VisionFormFields, {
  initialFormValue,
  isFormValueValid,
  summariseFormValue,
} from './VisionFormFields.js';
import SuccessCriteriaCapture from './SuccessCriteriaCapture.js';
import css from './DecisionWorkingPanel.module.css';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DecisionPanelTarget {
  /** checklist item id (== form tool arm.formId), e.g. 's1-vision-c2'. */
  itemId: string;
  /** decision label -> panel header title. */
  label: string;
  optional?: boolean;
  /** tool prompt -> header hint line. */
  prompt?: string;
  /** the matching form tool's fields (undefined => textarea fallback). */
  fields?: readonly FormFieldSpec[];
  /** resolved "Feeds Observe: ..." text for the callout (null/undefined => no callout). */
  feedsLabel?: string | null;
  /** true => render SuccessCriteriaCapture over the { criteria } value. */
  isSuccessCriteria?: boolean;
}

export interface DecisionWorkingPanelProps {
  /** null => empty state. */
  decision: DecisionPanelTarget | null;
  /** for VisionFormFields hybrids. */
  resolveOptions: (optionSetId: string) => readonly string[];
  /** for SuccessCriteriaCapture chips. */
  successCriteriaOptions: readonly CriterionOption[];
  /** persisted structured value for this formId ({} => seed via initialFormValue(fields)). */
  initialValue: FormValue;
  /** persisted rationale text. */
  initialRationale: string;
  /** current defer annotation for this decision. */
  deferred: boolean;
  /** whether the decision is already complete (effective progress). */
  recorded: boolean;
  /** parent does saveVisionFormData + setItemComplete. */
  onRecord: (value: FormValue, summary: string) => void;
  /** parent does saveDecisionRationale. */
  onSaveRationale: (text: string) => void;
  /** parent does setDecisionDeferred. */
  onToggleDefer: (deferred: boolean) => void;
}

// ---------------------------------------------------------------------------
// Local value coercion (VisionFormFields does NOT export these).
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

function hasKeys(value: FormValue): boolean {
  return Object.keys(value).length > 0;
}

/** Seed the working draft for a decision from the persisted value (or a fresh one). */
function seedDraft(
  decision: DecisionPanelTarget,
  initialValue: FormValue,
): FormValue {
  if (hasKeys(initialValue)) return initialValue;
  return decision.fields ? initialFormValue(decision.fields) : { text: '' };
}

const MIN_CRITERIA = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DecisionWorkingPanel({
  decision,
  resolveOptions,
  successCriteriaOptions,
  initialValue,
  initialRationale,
  deferred,
  recorded,
  onRecord,
  onSaveRationale,
  onToggleDefer,
}: DecisionWorkingPanelProps): JSX.Element {
  // The only real state: the working draft + the rationale draft. Seeded once on
  // mount and RE-SEEDED whenever the selected decision changes (keyed on itemId).
  const [draft, setDraft] = useState<FormValue>(() =>
    decision ? seedDraft(decision, initialValue) : {},
  );
  const [rationaleDraft, setRationaleDraft] = useState<string>(initialRationale);

  const itemId = decision?.itemId ?? null;

  // Re-seed the draft + rationale whenever the selected decision changes. Keyed
  // on itemId so switching decisions (or returning to one) reloads its persisted
  // value rather than carrying the previous decision's edits.
  useEffect(() => {
    if (!decision) return;
    setDraft(seedDraft(decision, initialValue));
    setRationaleDraft(initialRationale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // ---------- Empty state ----------
  if (!decision) {
    return (
      <div className={css.root}>
        <div className={css.empty}>
          <span className={css.emptyIcon} aria-hidden="true">
            <MousePointerClick size={22} />
          </span>
          <div className={css.emptyTxt}>
            Select a decision from the list to work through it here.
          </div>
        </div>
      </div>
    );
  }

  const fields = decision.fields;
  const hasFields = Boolean(fields && fields.length > 0);

  // ---------- Validity ----------
  let valid: boolean;
  if (decision.isSuccessCriteria || hasFields) {
    valid = isFormValueValid(fields ?? [], draft);
  } else {
    valid = asString(draft.text).trim() !== '';
  }
  const invalid = !valid;

  // ---------- Gate note ----------
  let gateNote: JSX.Element | null = null;
  if (invalid) {
    if (decision.isSuccessCriteria) {
      const filled = asArray(draft.criteria).filter(
        (c) => c.trim() !== '',
      ).length;
      const remaining = Math.max(0, MIN_CRITERIA - filled);
      gateNote = (
        <div className={css.gateNote}>
          <strong>{remaining}</strong> more criteria needed before recording
        </div>
      );
    } else {
      gateNote = (
        <div className={css.gateNote}>
          Complete the required fields before recording
        </div>
      );
    }
  }

  // ---------- Record ----------
  const handleRecord = () => {
    if (invalid) return;
    const summary = fields
      ? summariseFormValue(fields, draft)
      : asString(draft.text);
    onRecord(draft, summary);
  };

  return (
    <div className={css.root}>
      {/* ---------- Header ---------- */}
      <div className={css.header}>
        <div className={css.eyebrowRow}>
          <span className={css.eyebrow}>Working on</span>
          {recorded ? (
            <span className={css.recordedBadge}>
              <Check size={12} />
              Recorded
            </span>
          ) : null}
        </div>
        <div className={css.title}>
          {decision.label}
          {decision.optional ? (
            <span className={css.optBadge}>optional</span>
          ) : null}
        </div>
        {decision.prompt ? (
          <div className={css.hint}>{decision.prompt}</div>
        ) : null}
      </div>

      {/* ---------- Body router ---------- */}
      <div className={css.body}>
        {decision.isSuccessCriteria ? (
          <SuccessCriteriaCapture
            value={{ criteria: asArray(draft.criteria) }}
            onChange={(next) =>
              setDraft((d) => ({ ...d, criteria: next.criteria }))
            }
            options={successCriteriaOptions}
          />
        ) : hasFields ? (
          <VisionFormFields
            fields={fields ?? []}
            value={draft}
            onChange={setDraft}
            resolveOptions={resolveOptions}
          />
        ) : (
          <textarea
            className={css.fallbackTextarea}
            aria-label={decision.label}
            value={asString(draft.text)}
            placeholder="Capture this decision in your own words."
            onChange={(e) =>
              setDraft((d) => ({ ...d, text: e.target.value }))
            }
          />
        )}
      </div>

      {/* ---------- Footer ---------- */}
      <div className={css.foot}>
        {decision.feedsLabel ? (
          <div className={css.feedsBlock}>
            <ArrowRight size={14} className={css.feedsIcon} aria-hidden="true" />
            <div className={css.feedsTxt}>{decision.feedsLabel}</div>
          </div>
        ) : null}

        <div className={css.ratBlock}>
          <div className={css.secLbl}>
            <span>Why these?</span>
            <span className={css.secOptional}>(optional)</span>
          </div>
          <textarea
            className={css.ratTa}
            aria-label="Rationale"
            value={rationaleDraft}
            placeholder="What evidence or reasoning shapes this set? (optional)"
            onChange={(e) => setRationaleDraft(e.target.value)}
            onBlur={() => onSaveRationale(rationaleDraft)}
          />
        </div>

        {gateNote}

        <div className={css.actions}>
          <button
            type="button"
            className={css.recordBtn}
            disabled={invalid}
            data-locked={invalid ? 'true' : 'false'}
            onClick={handleRecord}
          >
            <Check size={15} />
            Record this decision
          </button>
          <button
            type="button"
            className={css.deferBtn}
            data-deferred={deferred ? 'true' : 'false'}
            aria-pressed={deferred}
            onClick={() => onToggleDefer(!deferred)}
          >
            <Clock size={14} className={css.deferIcon} />
            {deferred
              ? 'Deferred -- needs observation'
              : 'Not ready -- needs more observation'}
          </button>
        </div>
      </div>
    </div>
  );
}
