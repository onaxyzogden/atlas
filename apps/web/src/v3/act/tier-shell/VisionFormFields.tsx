/**
 * VisionFormFields -- the structured form-field rendering engine for Act
 * tier-shell kind:'form' tools. Renders a readonly FormFieldSpec[] against a
 * controlled FormValue and reports edits via onChange(nextValue). The component
 * is pure: it never calls resolveFieldOptions itself -- the modal injects a
 * resolveOptions(optionSetId) callback so this engine stays unit-testable with a
 * stub.
 *
 * Field kinds:
 *   - text leaf    -> <input> (or <textarea> when multiline). value[key] string.
 *   - hybrid leaf  -> <select> of resolved options + a "__free__" sentinel that
 *                     reveals a free-text <input>. Mirrors the FREE-sentinel
 *                     pattern in ActFlowConnectorPopover.
 *   - repeatable   -> one row per array entry (each row reuses the leaf render
 *                     against an array index), an Add button (disabled at max),
 *                     and per-row Remove buttons.
 *
 * value is the single source of truth for data. The only LOCAL state is which
 * hybrid controls are currently in explicit "free-text mode" (the user picked
 * the sentinel) -- tracked per control path so per-row hybrids toggle
 * independently. Free mode is also AUTO-detected when a stored string is
 * non-empty and not among the resolved options.
 */

import { useState } from 'react';
import type {
  FormFieldSpec,
  FormLeafField,
  FormValue,
} from './actToolCatalog.js';
import css from './VisionFormFields.module.css';

/** Sentinel select value that reveals the free-text input (mirrors ActFlowConnectorPopover). */
const FREE = '__free__';

interface VisionFormFieldsProps {
  fields: readonly FormFieldSpec[];
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** Resolve dropdown options for a hybrid field's optionSetId (modal wires this to resolveFieldOptions). */
  resolveOptions: (optionSetId: string) => readonly string[];
}

// ---------------------------------------------------------------------------
// Value coercion helpers (defensive against malformed FormValue shapes).
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

// ---------------------------------------------------------------------------
// Leaf rendering -- shared by top-level leaves and repeatable item rows.
// `current` is the stored string; `onLeafChange` writes the next string.
// `freeMode`/`setFreeMode` toggle the hybrid's explicit free-text mode for this
// specific control path.
// ---------------------------------------------------------------------------

interface LeafProps {
  leaf: FormLeafField;
  current: string;
  onLeafChange: (next: string) => void;
  resolveOptions: (optionSetId: string) => readonly string[];
  freeMode: boolean;
  setFreeMode: (next: boolean) => void;
  /** Stable id base for label/control association. */
  idBase: string;
}

function LeafControl({
  leaf,
  current,
  onLeafChange,
  resolveOptions,
  freeMode,
  setFreeMode,
  idBase,
}: LeafProps) {
  if (leaf.kind === 'text') {
    const common = {
      id: idBase,
      className: css.input,
      value: current,
      placeholder: leaf.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onLeafChange(e.target.value),
    };
    return leaf.multiline ? (
      <textarea {...common} className={css.textarea} />
    ) : (
      <input type="text" {...common} />
    );
  }

  // hybrid
  const options = leaf.optionSetId ? resolveOptions(leaf.optionSetId) : [];
  const valueIsKnownOption = current !== '' && options.includes(current);
  // Show the free-text input when the user explicitly entered free mode OR when
  // the stored value is a non-empty string that is not one of the options.
  const showFree = freeMode || (current !== '' && !valueIsKnownOption);
  const selectValue = showFree ? FREE : current;

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const picked = e.target.value;
    if (picked === FREE) {
      setFreeMode(true);
      // Keep the current free string (if any); do not clobber it on entering mode.
      return;
    }
    setFreeMode(false);
    // picked is either '' (placeholder) or a real option.
    onLeafChange(picked);
  };

  return (
    <>
      <select
        id={idBase}
        className={css.select}
        value={selectValue}
        onChange={onSelectChange}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={FREE}>Other (type your own)</option>
      </select>
      {showFree ? (
        <input
          type="text"
          className={css.input}
          value={current}
          placeholder={leaf.placeholder}
          onChange={(e) => onLeafChange(e.target.value)}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisionFormFields({
  fields,
  value,
  onChange,
  resolveOptions,
}: VisionFormFieldsProps): JSX.Element {
  // Explicit free-mode flags keyed by a stable control path:
  //   top-level hybrid -> the field key
  //   repeatable hybrid row -> `${repeatableKey}.${index}`
  const [freeModes, setFreeModes] = useState<Record<string, boolean>>({});

  const setFree = (path: string, next: boolean) =>
    setFreeModes((prev) => ({ ...prev, [path]: next }));

  const writeLeaf = (key: string, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const writeArray = (key: string, nextArr: string[]) => {
    onChange({ ...value, [key]: nextArr });
  };

  return (
    <div className={css.fields}>
      {fields.map((field, fieldIndex) => {
        if (field.kind === 'repeatable') {
          const arr = asArray(value[field.key]);
          const atMax = arr.length >= field.max;
          const itemLabel = field.itemLabel ?? 'Item';
          return (
            <fieldset key={field.key} className={css.repeatable}>
              <legend className={css.legend}>{field.label}</legend>
              {arr.map((entry, idx) => {
                const path = `${field.key}.${idx}`;
                return (
                  <div key={idx} className={css.row}>
                    <div className={css.rowControl}>
                      <LeafControl
                        leaf={field.item}
                        current={entry}
                        onLeafChange={(next) => {
                          const nextArr = arr.slice();
                          nextArr[idx] = next;
                          writeArray(field.key, nextArr);
                        }}
                        resolveOptions={resolveOptions}
                        freeMode={Boolean(freeModes[path])}
                        setFreeMode={(next) => setFree(path, next)}
                        idBase={`${field.key}-${idx}`}
                      />
                    </div>
                    <button
                      type="button"
                      className={css.removeBtn}
                      aria-label={`Remove ${itemLabel} ${idx + 1}`}
                      onClick={() => {
                        const nextArr = arr.filter((_, i) => i !== idx);
                        // Compact the free-mode flags so they stay index-aligned.
                        setFreeModes((prev) => {
                          const compacted: Record<string, boolean> = {};
                          for (const [k, v] of Object.entries(prev)) {
                            if (!k.startsWith(`${field.key}.`)) {
                              compacted[k] = v;
                              continue;
                            }
                            const i = Number(k.slice(field.key.length + 1));
                            if (i < idx) compacted[k] = v;
                            else if (i > idx) compacted[`${field.key}.${i - 1}`] = v;
                            // i === idx is dropped.
                          }
                          return compacted;
                        });
                        writeArray(field.key, nextArr);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className={css.addBtn}
                disabled={atMax}
                onClick={() => writeArray(field.key, [...arr, ''])}
              >
                {field.addLabel ?? 'Add'}
              </button>
            </fieldset>
          );
        }

        // Top-level leaf (text | hybrid). Defensively skip a leaf with no key.
        if (!field.key) return null;
        const key = field.key;
        const idBase = `field-${key}-${fieldIndex}`;
        return (
          <div key={key} className={css.field}>
            <label className={css.label} htmlFor={idBase}>
              {field.label}
            </label>
            <LeafControl
              leaf={field}
              current={asString(value[key])}
              onLeafChange={(next) => writeLeaf(key, next)}
              resolveOptions={resolveOptions}
              freeMode={Boolean(freeModes[key])}
              setFreeMode={(next) => setFree(key, next)}
              idBase={idBase}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported pure helpers
// ---------------------------------------------------------------------------

/**
 * Build the initial FormValue for a spec: '' for each text/hybrid leaf (by key),
 * and an array of `min` empty strings for each repeatable (so the minimum rows
 * render). Top-level leaves without a key are skipped defensively.
 */
export function initialFormValue(fields: readonly FormFieldSpec[]): FormValue {
  const out: FormValue = {};
  for (const field of fields) {
    if (field.kind === 'repeatable') {
      out[field.key] = Array.from({ length: Math.max(0, field.min) }, () => '');
    } else if (field.key) {
      out[field.key] = '';
    }
  }
  return out;
}

/**
 * Human-readable multi-line summary used to mirror into the legacy visionForms
 * string map. One line per non-empty leaf ("Label: value"); for repeatables, a
 * label line followed by each non-empty entry. Empty leaves and empty entries
 * are skipped. Deterministic and readable.
 */
export function summariseFormValue(
  fields: readonly FormFieldSpec[],
  value: FormValue,
): string {
  const lines: string[] = [];
  for (const field of fields) {
    if (field.kind === 'repeatable') {
      const entries = asArray(value[field.key])
        .map((e) => e.trim())
        .filter((e) => e !== '');
      if (entries.length === 0) continue;
      lines.push(`${field.label}:`);
      for (const entry of entries) {
        lines.push(`  - ${entry}`);
      }
      continue;
    }
    if (!field.key) continue;
    const v = asString(value[field.key]).trim();
    if (v === '') continue;
    const label = field.label ?? field.key;
    lines.push(`${label}: ${v}`);
  }
  return lines.join('\n');
}

/**
 * True when every required leaf is non-empty (trimmed) AND every repeatable has
 * at least `min` non-empty (trimmed) entries. Used by the modal for canSave.
 */
export function isFormValueValid(
  fields: readonly FormFieldSpec[],
  value: FormValue,
): boolean {
  for (const field of fields) {
    if (field.kind === 'repeatable') {
      const filled = asArray(value[field.key]).filter(
        (e) => e.trim() !== '',
      ).length;
      if (filled < field.min) return false;
      continue;
    }
    if (!field.key) continue;
    if (field.required && asString(value[field.key]).trim() === '') {
      return false;
    }
  }
  return true;
}
