// VisionFormsTabsModal.tsx
//
// Tabbed text-capture popup for the Act tier-shell kind:'form' tools. Replaces
// the one-textarea VisionFormModal at the mount point: clicking ANY form tile in
// a category opens THIS single popup with one tab per form tool in that category,
// focused on the clicked tool's tab. The steward can fill every field in the
// category without re-opening.
//
// PREFILLED ITEMS (fields-less tools only): a form tool whose formId matches a
// checklist item carrying an `answerSpec` that resolves as answered (e.g. an
// s1-vision project type / success criteria / capital item) is shown READ-ONLY
// -- the prior answer value + an "Edit in Plan" deep-link -- instead of an empty
// re-ask textarea. Editing those answers happens in Plan; the recap shows the
// value only.
//
// STRUCTURED TOOLS (arm.fields non-empty): the structured form engine
// (VisionFormFields) supersedes BOTH the recap and the textarea on this surface
// (recap precedence). To avoid data loss, a fresh structured draft is pre-seeded
// from any prior answerSpec answer via preSeedFromLabels when no structured value
// exists yet. See the 2026-06-05 structured-capture-forms decision note.
//
// State/persistence is unchanged from VisionFormModal: the parent's onSave writes
// text to actEvidenceStore (saveVisionForm) and marks the checklist item complete
// (planStratumProgressStore). Saving a tab does NOT close the popup -- the steward
// continues to other tabs; Esc / click-outside / the X close it (Modal handles).
//
// Per-tab draft state is kept in a Record keyed by formId so switching tabs never
// loses unsaved edits. Drafts are (re)seeded from the saved values only on the
// closed->open transition, so saving one tab never wipes unsaved edits in others.

import { useEffect, useId, useRef, useState } from 'react';
import type { PlanDecisionChecklistItem, ProjectMetadata } from '@ogden/shared';
import { resolveFieldOptions } from '@ogden/shared';
import { Modal } from '../../../components/ui/Modal.js';
import { Tabs } from '../../../components/ui/Tabs.js';
import { resolveAnswerSpec } from '../../strata/resolveAnswerSpec.js';
import { labelForOption } from '../../strata/answerOptionLabels.js';
import AnswerValue from './AnswerValue.js';
import EditInPlanButton from './EditInPlanButton.js';
import PrefillRecap from './PrefillRecap.js';
import VisionFormFields, {
  initialFormValue,
  isFormValueValid,
  summariseFormValue,
} from './VisionFormFields.js';
import type {
  ActTool,
  ActToolArm,
  FormFieldSpec,
  FormValue,
} from './actToolCatalog.js';
import type {
  FormPrefillResult,
  PrefillSuggestion,
} from '../../strata/resolveFormPrefill.js';
import styles from './VisionFormsTabsModal.module.css';

type FormArm = Extract<ActToolArm, { kind: 'form' }>;
type FormTool = ActTool & { arm: FormArm };

interface VisionFormsTabsModalProps {
  open: boolean;
  /** Category label, shown as the modal title (e.g. "Vision & Setup"). */
  title: string;
  /** The kind:'form' tools in the clicked tool's category (one tab each). */
  tools: ActTool[];
  /** Which tab (formId) is currently shown. */
  activeFormId: string;
  /** Saved text keyed by formId -- pre-populates each tab's textarea. */
  initialValues: Record<string, string>;
  /**
   * Structured form values keyed by formId -- pre-populates each fields tab.
   * Optional so the existing (pre-SF6) ActTierShell call site still compiles;
   * the next task wires it. Defaults to {} (no structured prefill).
   */
  initialData?: Record<string, FormValue>;
  /**
   * Non-destructive pre-fill suggestions keyed by formId (see resolveFormPrefill
   * / PrefillRecap). Each form's recap lists candidate values drawn from the
   * steward roster and prior objectives; a candidate applies to the LOCAL draft
   * only on an explicit "Use this" click and never overwrites a filled slot.
   * Optional -- absent at existing call sites (no recap rendered). Defaults {}.
   */
  prefillByFormId?: Record<string, FormPrefillResult>;
  /** Project id -- threads the Edit-in-Plan deep-link. */
  projectId: string;
  /** Project metadata -- resolves prefilled answerSpec values. */
  metadata: ProjectMetadata | null | undefined;
  /** Selected objective's checklist -- maps a tab (formId) back to its item. */
  checklistItems: PlanDecisionChecklistItem[];
  onTabChange: (formId: string) => void;
  onSave: (formId: string, text: string) => void;
  /**
   * Persist a structured form value (+ a human-readable summary mirror).
   * Optional so the existing (pre-SF6) ActTierShell call site still compiles;
   * the next task wires it. A no-op default is used when absent.
   */
  onSaveData?: (formId: string, value: FormValue, summary: string) => void;
  onClose: () => void;
}

/** A form arm with a non-empty `fields` array renders the structured engine. */
function armFields(tool: FormTool): readonly FormFieldSpec[] | null {
  const f = tool.arm.fields;
  return Array.isArray(f) && f.length > 0 ? f : null;
}

/** True when any value in a FormValue is a non-empty string (or array entry). */
function formValueHasContent(value: FormValue | undefined): boolean {
  if (!value) return false;
  for (const v of Object.values(value)) {
    if (Array.isArray(v)) {
      if (v.some((e) => typeof e === 'string' && e.trim() !== '')) return true;
    } else if (typeof v === 'string' && v.trim() !== '') {
      return true;
    }
  }
  return false;
}

/**
 * Deterministically distribute prior answerSpec labels into a fresh
 * initialFormValue when no structured value exists yet, so no data is lost when
 * the structured form supersedes the recap. Rule (no heuristics beyond this):
 *  - exactly ONE repeatable and NO other repeatable -> that repeatable's array
 *    is set to the labels (truncated to `max`; padded with '' up to `min`).
 *  - NO repeatable + EXACTLY ONE text/hybrid leaf -> that leaf value is set to
 *    `labels.join(", ")`.
 *  - otherwise (multiple repeatables, or multi-leaf mix) -> no pre-seed.
 * Returns a NEW FormValue; never mutates `base`.
 */
function preSeedFromLabels(
  fields: readonly FormFieldSpec[],
  base: FormValue,
  labels: readonly string[],
): FormValue {
  if (labels.length === 0) return base;

  const repeatables = fields.filter((f) => f.kind === 'repeatable');
  if (repeatables.length === 1) {
    const rep = repeatables[0] as Extract<FormFieldSpec, { kind: 'repeatable' }>;
    let arr = labels.slice(0, rep.max);
    while (arr.length < rep.min) arr = [...arr, ''];
    return { ...base, [rep.key]: arr };
  }

  if (repeatables.length === 0) {
    // Only pre-seed when the form is a SINGLE text/hybrid leaf. A multi-leaf
    // form (e.g. capital-budget: initialBudget + annualOperating + restrictions)
    // has no unambiguous target for a flat label list, so joining the labels
    // into the first leaf would surface wrong, cross-axis content -- keep the
    // initialFormValue defaults instead (the answered values still live in Plan).
    const leaves = fields.filter(
      (f) => (f.kind === 'text' || f.kind === 'hybrid') && !!f.key,
    );
    const only = leaves[0];
    if (leaves.length === 1 && only && only.kind !== 'repeatable' && only.key) {
      return { ...base, [only.key]: labels.join(', ') };
    }
  }

  // Ambiguous mapping -- keep initialFormValue defaults (data still lives in Plan).
  return base;
}

export default function VisionFormsTabsModal({
  open,
  title,
  tools,
  activeFormId,
  initialValues,
  initialData = {},
  prefillByFormId = {},
  projectId,
  metadata,
  checklistItems,
  onTabChange,
  onSave,
  onSaveData,
  onClose,
}: VisionFormsTabsModalProps) {
  const formTools = tools.filter((t): t is FormTool => t.arm.kind === 'form');

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dataDrafts, setDataDrafts] = useState<Record<string, FormValue>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);
  const hintId = useId();

  // Resolve a hybrid field's dropdown options against the project's type(s).
  // Pure passthrough to the shared resolver; guarded for null metadata.
  const resolveOptions = (optionSetId: string): readonly string[] =>
    resolveFieldOptions(
      optionSetId,
      metadata?.projectTypeRecord?.primaryTypeId,
      metadata?.projectTypeRecord?.secondaryTypeIds ?? [],
    );

  // Resolve a tab's prefilled answer (if any). A tab is a read-only recap when
  // its formId maps to a checklist item whose answerSpec resolves as answered.
  function recapFor(formId: string) {
    const item = checklistItems.find((i) => i.id === formId);
    const spec = item?.answerSpec;
    const resolved = spec ? resolveAnswerSpec(metadata, spec) : null;
    const isRecap = !!spec && !!resolved?.isAnswered;
    return { spec, resolved, isRecap };
  }

  // Seed per-tab drafts from saved values on the closed->open transition only.
  // Reseeding on every initialValues change would wipe unsaved edits in other
  // tabs after one tab is saved (saving updates the store -> initialValues prop).
  useEffect(() => {
    if (open && !wasOpen.current) {
      const seed: Record<string, string> = {};
      const dataSeed: Record<string, FormValue> = {};
      for (const t of formTools) {
        const formId = t.arm.formId;
        seed[formId] = initialValues[formId] ?? '';

        const fields = armFields(t);
        if (!fields) continue;

        // Priority 1: an existing structured value -> clone it.
        const existing = initialData[formId];
        if (existing !== undefined) {
          dataSeed[formId] = structuredClone(existing);
          continue;
        }

        // Priority 2: initialFormValue + deterministic pre-seed from a prior
        // answerSpec answer (only when no structured value exists).
        let value = initialFormValue(fields);
        const item = checklistItems.find((i) => i.id === formId);
        const spec = item?.answerSpec;
        const resolved = spec ? resolveAnswerSpec(metadata, spec) : null;
        if (spec && resolved?.isAnswered) {
          const labels = resolved.values
            .map((v) => labelForOption(spec.optionSetId, v))
            .map((s) => s.trim())
            .filter(Boolean);
          value = preSeedFromLabels(fields, value, labels);
        }
        dataSeed[formId] = value;
      }
      setDrafts(seed);
      setDataDrafts(dataSeed);
    }
    wasOpen.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formTools, initialValues, initialData]);

  // Autofocus the active tab's textarea when the popup opens or the tab changes.
  // No-op on a recap tab (no textarea is rendered).
  useEffect(() => {
    if (open) {
      // Defer one tick so the Modal portal / panel finishes mounting.
      const id = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, activeFormId]);

  function setDraft(formId: string, text: string) {
    setDrafts((d) => ({ ...d, [formId]: text }));
  }

  function setDataDraft(formId: string, value: FormValue) {
    setDataDrafts((d) => ({ ...d, [formId]: value }));
  }

  // Apply ONE pre-fill suggestion to the local draft (never saves, never marks
  // complete). Routes by target shape: a null fieldKey fills the textarea draft;
  // a keyed suggestion merges a single field into the structured draft. Both use
  // a functional update so concurrent "Use this" clicks compose, and both refuse
  // to overwrite an already-filled slot (the recap's clobber guard, defended
  // again here so a stale render can never clobber an entered value).
  function applyPrefill(formId: string, s: PrefillSuggestion) {
    if (s.fieldKey === null) {
      const text = Array.isArray(s.value) ? s.value.join(', ') : s.value;
      setDrafts((d) => {
        if ((d[formId] ?? '').trim() !== '') return d;
        return { ...d, [formId]: text };
      });
      return;
    }
    const key = s.fieldKey;
    setDataDrafts((d) => {
      const current = d[formId] ?? {};
      const slot = current[key];
      const filled = Array.isArray(slot)
        ? slot.some((e) => typeof e === 'string' && e.trim() !== '')
        : typeof slot === 'string' && slot.trim() !== '';
      if (filled) return d;
      return { ...d, [formId]: { ...current, [key]: s.value } };
    });
  }

  // The active tool drives the save / validity branch (structured vs. textarea).
  const activeTool = formTools.find((t) => t.arm.formId === activeFormId);
  const activeFields = activeTool ? armFields(activeTool) : null;

  function handleSave() {
    if (activeFields) {
      const value = dataDrafts[activeFormId] ?? {};
      if (!isFormValueValid(activeFields, value)) return;
      onSaveData?.(activeFormId, value, summariseFormValue(activeFields, value));
      return;
    }
    // Textarea path (unchanged): a recap tab has nothing to save.
    if (recapFor(activeFormId).isRecap) return;
    const text = (drafts[activeFormId] ?? '').trim();
    if (!text) return;
    onSave(activeFormId, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter / Cmd+Enter saves the active tab without leaving the textarea.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  // Save validity: structured tabs use isFormValueValid; textarea tabs require a
  // non-empty trimmed draft and a non-recap tab.
  const activeIsRecap = !activeFields && recapFor(activeFormId).isRecap;
  const canSave = activeFields
    ? isFormValueValid(activeFields, dataDrafts[activeFormId] ?? {})
    : !activeIsRecap && (drafts[activeFormId] ?? '').trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!canSave}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      }
    >
      <Tabs value={activeFormId} onChange={onTabChange}>
        <Tabs.List className={styles.tabList}>
          {formTools.map((tool) => {
            const Icon = tool.icon;
            const formId = tool.arm.formId;
            const fields = armFields(tool);
            const captured = fields
              ? formValueHasContent(initialData[formId]) ||
                (initialValues[formId] ?? '').length > 0
              : recapFor(formId).isRecap ||
                (initialValues[formId] ?? '').length > 0;
            return (
              <Tabs.Tab key={tool.arm.formId} value={tool.arm.formId}>
                <span className={styles.tabLabel}>
                  <Icon size={14} aria-hidden />
                  {tool.label}
                  {captured ? (
                    <span className={styles.capturedDot} aria-hidden />
                  ) : null}
                </span>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {formTools.map((tool) => {
          const formId = tool.arm.formId;
          const fields = armFields(tool);
          const { spec, resolved, isRecap } = recapFor(formId);
          return (
            <Tabs.Panel key={formId} value={formId}>
              <div className={styles.body}>
                <label id={hintId} className={styles.prompt}>
                  {tool.arm.prompt}
                </label>
                {/* Show the pre-fill recap above the structured engine, or above
                    a plain textarea -- but never above the read-only answerSpec
                    recap (that case is `!fields && isRecap`). */}
                {fields || !isRecap ? (
                  <PrefillRecap
                    result={prefillByFormId[formId]}
                    draft={dataDrafts[formId] ?? {}}
                    textDraft={drafts[formId] ?? ''}
                    onUse={(s) => applyPrefill(formId, s)}
                  />
                ) : null}
                {fields ? (
                  // Structured form supersedes both the recap and the textarea
                  // on this surface (recap precedence).
                  <VisionFormFields
                    fields={fields}
                    value={dataDrafts[formId] ?? {}}
                    onChange={(next) => setDataDraft(formId, next)}
                    resolveOptions={resolveOptions}
                  />
                ) : isRecap && spec && resolved ? (
                  <div className={styles.recapActions}>
                    <AnswerValue resolved={resolved} optionSetId={spec.optionSetId} />
                    <span className={styles.hint}>
                      Answered in Plan - edit there to change
                    </span>
                    <EditInPlanButton projectId={projectId} editRoute={spec.editRoute} />
                  </div>
                ) : (
                  <>
                    <textarea
                      ref={tool.arm.formId === activeFormId ? textareaRef : undefined}
                      aria-labelledby={hintId}
                      className={styles.textarea}
                      value={drafts[tool.arm.formId] ?? ''}
                      onChange={(e) => setDraft(tool.arm.formId, e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={tool.arm.placeholder}
                      rows={6}
                      spellCheck
                    />
                    <span className={styles.hint}>
                      {canSave ? 'Ctrl+Enter to save' : 'Enter your response above'}
                    </span>
                  </>
                )}
              </div>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Modal>
  );
}
