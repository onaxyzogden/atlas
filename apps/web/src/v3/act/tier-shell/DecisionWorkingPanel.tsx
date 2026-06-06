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
 * Body router (in order -- bespoke arms first, generic fallbacks last):
 *   1. decision.isVisionClassify  -> VisionClassifyCapture over { committed,
 *                                    aspirational }.
 *   2. decision.isLabourInventory -> LabourInventoryCapture over the labour model.
 *   3. decision.isSuccessCriteria -> SuccessCriteriaCapture over { criteria }.
 *   4. decision.fields (non-empty) -> VisionFormFields over the draft.
 *   5. otherwise                   -> a single textarea bound to draft.text.
 *
 * Validity drives the Record button + the gate note:
 *   - isVisionClassify:  isVisionClassifyValid (>=1 element classified).
 *   - isLabourInventory: isLabourValid (>=1 labour row).
 *   - fields / success-criteria: isFormValueValid(decision.fields ?? [], draft).
 *   - textarea: draft.text trimmed is non-empty.
 *
 * Token substitutions are documented in DecisionWorkingPanel.module.css. ASCII
 * only: all glyphs are lucide icons.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock, MousePointerClick } from 'lucide-react';
import type { CriterionOption } from '@ogden/shared';
import type { FormFieldSpec, FormValue } from './actToolCatalog.js';
import VisionFormFields, {
  initialFormValue,
  isFormValueValid,
  summariseFormValue,
} from './VisionFormFields.js';
import SuccessCriteriaCapture from './SuccessCriteriaCapture.js';
import LabourInventoryCapture, {
  decode,
  isLabourValid,
  summariseLabour,
  type LabourModel,
} from './LabourInventoryCapture.js';
import VisionClassifyCapture, {
  decodeClassify,
  isVisionClassifyValid,
  summariseVisionClassify,
  type ClassifyValue,
} from './VisionClassifyCapture.js';
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
  /** true => render LabourInventoryCapture (bespoke labour surface) over the draft. */
  isLabourInventory?: boolean;
  /** true => render VisionClassifyCapture over { committed, aspirational }. */
  isVisionClassify?: boolean;
}

export interface DecisionWorkingPanelProps {
  /** null => empty state. */
  decision: DecisionPanelTarget | null;
  /** for VisionFormFields hybrids. */
  resolveOptions: (optionSetId: string) => readonly string[];
  /** for SuccessCriteriaCapture chips. */
  successCriteriaOptions: readonly CriterionOption[];
  /** resolved skill suggestions for LabourInventoryCapture (LC4 populates; default []). */
  labourSkillSuggestions?: readonly string[];
  /** suggestions for VisionClassifyCapture chips. */
  visionClassifySuggestions?: readonly string[];
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
  labourSkillSuggestions,
  visionClassifySuggestions = [],
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

  // Always holds the LATEST typed rationale so the effect cleanup can flush the
  // freshest value rather than a stale closure capture. Assigned on every render.
  const rationaleDraftRef = useRef<string>(rationaleDraft);
  rationaleDraftRef.current = rationaleDraft;

  // Re-seed the draft + rationale whenever the selected decision changes. Keyed
  // on itemId so switching decisions (or returning to one) reloads its persisted
  // value rather than carrying the previous decision's edits.
  //
  // The cleanup flushes the OUTGOING decision's rationale before re-seeding (and
  // on unmount). `initialRationale` and `onSaveRationale` here are the closure
  // values from the render that CREATED this effect -- i.e. bound to the OUTGOING
  // item -- which is exactly what we want. This covers switches that never blur
  // the textarea (e.g. programmatic selection); the onBlur save remains as a
  // complementary, idempotent path. Saving only when the value actually changed
  // avoids spurious writes and keeps the flush off the keystroke path.
  useEffect(() => {
    if (!decision) return;
    setDraft(seedDraft(decision, initialValue));
    setRationaleDraft(initialRationale);
    return () => {
      if (rationaleDraftRef.current !== initialRationale) {
        onSaveRationale(rationaleDraftRef.current);
      }
    };
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

  // Decode the draft into the labour model once -- reused by validity, the gate
  // note, and the record summary so labour never routes through the generic
  // FormValue engine.
  const labourModel: LabourModel | null = decision.isLabourInventory
    ? decode(draft)
    : null;

  // Decode the draft into the classify model once -- reused by validity, the
  // record summary, and the body renderer (mirrors the labour pattern above).
  const classifyModel: ClassifyValue | null = decision.isVisionClassify
    ? decodeClassify(draft)
    : null;

  // ---------- Validity ----------
  let valid: boolean;
  if (decision.isVisionClassify) {
    valid = isVisionClassifyValid(classifyModel!);
  } else if (decision.isLabourInventory) {
    valid = isLabourValid(labourModel!);
  } else if (decision.isSuccessCriteria || hasFields) {
    valid = isFormValueValid(fields ?? [], draft);
  } else {
    valid = asString(draft.text).trim() !== '';
  }
  const invalid = !valid;

  // ---------- Gate note ----------
  let gateNote: JSX.Element | null = null;
  if (invalid) {
    if (decision.isVisionClassify) {
      gateNote = (
        <div className={css.gateNote}>
          Classify at least one element before recording
        </div>
      );
    } else if (decision.isLabourInventory && labourModel) {
      const missing: string[] = [];
      if (labourModel.who === '') missing.push('team');
      if (labourModel.hours <= 0) missing.push('weekly hours');
      if (labourModel.skills.length < 1) missing.push('at least one skill');
      gateNote = (
        <div className={css.gateNote}>
          Add <strong>{missing.join(', ')}</strong> before recording
        </div>
      );
    } else if (decision.isSuccessCriteria) {
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
    let summary: string;
    if (decision.isVisionClassify) {
      summary = summariseVisionClassify(classifyModel!);
    } else if (decision.isLabourInventory) {
      summary = summariseLabour(labourModel!);
    } else if (fields) {
      summary = summariseFormValue(fields, draft);
    } else {
      summary = asString(draft.text);
    }
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
        {decision.isVisionClassify ? (
          <VisionClassifyCapture
            value={classifyModel!}
            onChange={(next) =>
              setDraft((d) => ({
                ...d,
                committed: next.committed,
                aspirational: next.aspirational,
              }))
            }
            suggestions={visionClassifySuggestions}
          />
        ) : decision.isSuccessCriteria ? (
          <SuccessCriteriaCapture
            value={{ criteria: asArray(draft.criteria) }}
            onChange={(next) =>
              setDraft((d) => ({ ...d, criteria: next.criteria }))
            }
            options={successCriteriaOptions}
          />
        ) : decision.isLabourInventory ? (
          <LabourInventoryCapture
            value={draft}
            onChange={setDraft}
            skillSuggestions={labourSkillSuggestions ?? []}
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
