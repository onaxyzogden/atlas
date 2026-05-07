/**
 * AnnotationFormSlideUp — singleton slide-up form mounted from
 * `ObserveLayout`. Reads `useAnnotationFormStore.active` and renders the
 * matching `FIELD_SCHEMAS[active.kind]` schema. Writes (create or update)
 * are dispatched by the schema's `save()` handler so this component
 * doesn't need to know about individual stores.
 *
 * Mode semantics:
 *   - `mode: 'create'` — values seeded from `schema.defaults`, save calls
 *     the kind's `add<X>(...)` action with the carried geometry.
 *   - `mode: 'edit'`   — values seeded from `schema.loadDefaults(id)`,
 *     save calls `update<X>(id, patch)`. Geometry is preserved by the
 *     existing record (we never overwrite it on edit).
 *
 * Affordances:
 *   - ESC and backdrop click trigger Cancel.
 *   - Cancel does NOT clear the active tool — the steward may want to
 *     redraw. Save clears the active tool via `useMapToolStore`.
 *   - Plain enter inside `<input>` does not auto-submit; the explicit
 *     Save button is the single commit path.
 */

import { useEffect, useState } from 'react';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import {
  FIELD_SCHEMAS,
  type FieldDef,
  type FieldSchema,
} from './annotationFieldSchemas.js';
import type { SwotBucket } from '../../../../store/swotStore.js';
import css from './AnnotationFormSlideUp.module.css';

/** SWOT bucket inferred from the active tool id at form-open time, so the
 *  shared `swotTag` schema can dispatch into the right bucket without a
 *  per-bucket schema duplicate. */
function inferSwotBucket(activeTool: string | null): SwotBucket | undefined {
  if (!activeTool) return undefined;
  const tail = activeTool.split('.').pop();
  if (tail === 'strength') return 'S';
  if (tail === 'weakness') return 'W';
  if (tail === 'opportunity') return 'O';
  if (tail === 'threat') return 'T';
  return undefined;
}

export default function AnnotationFormSlideUp() {
  const active = useAnnotationFormStore((s) => s.active);
  const close = useAnnotationFormStore((s) => s.close);
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  if (!active) return null;
  const schema = FIELD_SCHEMAS[active.kind];
  return (
    <FormBody
      key={`${active.kind}:${active.existingId ?? 'create'}`}
      schema={schema}
      mode={active.mode}
      existingId={active.existingId}
      bucket={inferSwotBucket(activeTool)}
      onSave={(values) => {
        schema.save(values, {
          projectId: active.projectId,
          geometry: active.geometry,
          existingId: active.existingId,
          bucket: inferSwotBucket(activeTool),
        });
        close();
        // Clear active tool only when finishing a fresh create.
        if (active.mode === 'create') setActiveTool(null);
      }}
      onCancel={close}
    />
  );
}

function FormBody({
  schema,
  mode,
  existingId,
  bucket,
  onSave,
  onCancel,
}: {
  schema: FieldSchema;
  mode: 'create' | 'edit';
  existingId: string | undefined;
  bucket: SwotBucket | undefined;
  onSave: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (mode === 'edit' && existingId) {
      const loaded = schema.loadDefaults(existingId, '');
      if (loaded) return loaded;
    }
    return { ...schema.defaults };
  });

  // ESC closes (cancel).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const eyebrow =
    bucket && schema.title === 'SWOT tag'
      ? `${bucket} · SWOT tag`
      : mode === 'edit'
        ? 'Edit annotation'
        : 'New annotation';

  return (
    <div className={css.scrim} onClick={onCancel}>
      <div
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={schema.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={css.header}>
          <div>
            <div className={css.eyebrow}>{eyebrow}</div>
            <h2 className={css.title}>{schema.title}</h2>
          </div>
          <button
            type="button"
            className={css.close}
            onClick={onCancel}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
        <div className={css.body}>
          {schema.fields.map((f) => (
            <FieldInput
              key={f.name}
              field={f}
              value={values[f.name]}
              onChange={(v) => setValue(f.name, v)}
            />
          ))}
        </div>
        <div className={css.footer}>
          <button type="button" className={css.btn} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={() => onSave(values)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'checkbox') {
    return (
      <label className={css.fieldRow} style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={css.label} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
          {field.label}
        </span>
      </label>
    );
  }
  return (
    <div className={css.field}>
      <span className={css.label}>{field.label}</span>
      {field.type === 'select' ? (
        <select
          className={css.select}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className={css.textarea}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      ) : field.type === 'number' ? (
        <input
          className={css.input}
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'date' ? (
        <input
          className={css.input}
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={css.input}
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
