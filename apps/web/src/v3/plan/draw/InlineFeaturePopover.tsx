/**
 * InlineFeaturePopover — floating mini-form anchored at a [lng, lat] on the map.
 *
 * Renders the schema-driven form provided via `useInlineFormStore`. Position
 * tracks the anchor on map move/zoom by re-projecting through `map.project()`
 * each frame. Auto-flips to the left side of the anchor when the right side
 * would clip the viewport.
 *
 * Key behaviours:
 *   - Save  → caller's onSave(values); store closes
 *   - Cancel/ESC/click-outside → caller's onCancel(); store closes
 *   - Required-field gate disables the Save button until all required values are non-empty
 *
 * The slide-up is reserved for written reports — this stays small.
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useInlineFormStore, type FieldSpec } from './inlineFormStore.js';
import css from './InlineFeaturePopover.module.css';

interface Props {
  map: MaplibreMap;
}

export default function InlineFeaturePopover({ map }: Props) {
  const active = useInlineFormStore((s) => s.active);
  const close = useInlineFormStore((s) => s.close);

  const [values, setValues] = useState<Record<string, string | number>>(() =>
    active ? { ...active.initial } : {},
  );
  const [prevActive, setPrevActive] = useState(active);
  const [screen, setScreen] = useState<{ x: number; y: number; flipped: boolean } | null>(null);
  // Per-disclosure expanded state (keyed by disclosure FieldSpec.key).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const popoverRef = useRef<HTMLFormElement | null>(null);

  // Reset draft synchronously when the active payload changes (React's
  // "store info from previous render" pattern — avoids a race where a
  // `useEffect` reset would clobber a same-tick `setVal` patch from the
  // caller's reactive `onValuesChange` hook).
  if (prevActive !== active) {
    setPrevActive(active);
    setValues(active ? { ...active.initial } : {});
    // Auto-expand disclosures whose any child carries a non-empty initial value.
    if (active) {
      const nextExpanded: Record<string, boolean> = {};
      for (const f of active.fields) {
        if (f.kind === 'disclosure' && f.children) {
          const anyFilled = f.children.some((c) => {
            const v = active.initial[c.key];
            return v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v));
          });
          if (anyFilled) nextExpanded[f.key] = true;
        }
      }
      setExpanded(nextExpanded);
    } else {
      setExpanded({});
    }
  }

  // Track anchor → screen coords; re-project on map move/zoom/resize.
  useEffect(() => {
    if (!active) {
      setScreen(null);
      return;
    }
    const POPOVER_WIDTH = 280;
    const recalc = () => {
      const p = map.project(active.anchor);
      const canvasW = map.getCanvas().clientWidth;
      const flipped = p.x + POPOVER_WIDTH + 24 > canvasW;
      setScreen({ x: p.x, y: p.y, flipped });
    };
    recalc();
    map.on('move', recalc);
    map.on('zoom', recalc);
    map.on('resize', recalc);
    return () => {
      map.off('move', recalc);
      map.off('zoom', recalc);
      map.off('resize', recalc);
    };
  }, [active, map]);

  // ESC closes (cancels)
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        active.onCancel();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  // Click-outside cancels — bind to mousedown on the document so the popover's
  // own clicks (handled via ref containment) don't trigger.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const node = popoverRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      // Clicks on the Plan selection floater are companion UI, not
      // "outside". Don't dismiss the form when the steward reaches for
      // Edit vertices / Delete / Clear.
      if (
        e.target instanceof Element &&
        e.target.closest('[role="toolbar"][aria-label="Plan selection actions"]')
      ) {
        return;
      }
      active.onCancel();
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [active, close]);

  if (!active || !screen) return null;

  // Flatten disclosure children so required validation covers them too.
  const flatFields: FieldSpec[] = active.fields.flatMap((f) =>
    f.kind === 'disclosure' ? (f.children ?? []) : [f],
  );
  const requiredOk = flatFields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v));
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredOk) return;
    active.onSave(values);
    close();
  };

  const onCancel = () => {
    active.onCancel();
    close();
  };

  const setVal = (
    key: string,
    kind: 'text' | 'number' | 'select' | 'textarea',
    raw: string,
  ) => {
    setValues((prev) => {
      const value = kind === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
      const next: Record<string, string | number> = { ...prev, [key]: value };
      const patch = active?.onValuesChange?.(next, prev, { key, value });
      if (patch) {
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined) next[k] = v as string | number;
        }
      }
      return next;
    });
  };

  const renderLeafField = (f: FieldSpec) => {
    const v = values[f.key];
    const valStr = v === undefined ? '' : String(v);
    return (
      <label key={f.key} className={css.field}>
        <span className={css.fieldLabel}>
          {f.label}
          {f.required ? ' *' : ''}
        </span>
        <span className={css.inputRow}>
          {f.kind === 'select' ? (
            <select
              className={css.select}
              value={valStr}
              onChange={(e) => setVal(f.key, 'select', e.target.value)}
            >
              <option value="">— pick —</option>
              {(f.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : f.kind === 'textarea' ? (
            <textarea
              className={css.input}
              value={valStr}
              readOnly={f.readonly}
              placeholder={f.placeholder}
              rows={3}
              onChange={(e) => setVal(f.key, 'textarea', e.target.value)}
            />
          ) : (
            <input
              className={css.input}
              type={f.kind === 'number' ? 'number' : 'text'}
              value={valStr}
              readOnly={f.readonly}
              placeholder={f.placeholder}
              onChange={(e) =>
                setVal(f.key, f.kind === 'number' ? 'number' : 'text', e.target.value)
              }
              step={f.kind === 'number' ? 'any' : undefined}
            />
          )}
          {f.suffix ? <span className={css.suffix}>{f.suffix}</span> : null}
        </span>
      </label>
    );
  };

  const renderField = (f: FieldSpec) => {
    if (f.kind !== 'disclosure') return renderLeafField(f);
    const isOpen = !!expanded[f.key];
    const toggle = () => setExpanded((prev) => ({ ...prev, [f.key]: !prev[f.key] }));
    if (!isOpen) {
      return (
        <button
          key={f.key}
          type="button"
          className={css.secondaryBtn}
          onClick={toggle}
          style={{ alignSelf: 'flex-start' }}
        >
          {f.triggerLabel ?? f.label}
        </button>
      );
    }
    return (
      <div key={f.key} className={css.field}>
        {(f.children ?? []).map((c) => renderLeafField(c))}
        <button
          type="button"
          className={css.secondaryBtn}
          onClick={toggle}
          style={{ alignSelf: 'flex-start' }}
        >
          Hide
        </button>
      </div>
    );
  };

  return (
    <form
      ref={popoverRef}
      className={css.popover}
      data-flipped={screen.flipped ? 'true' : 'false'}
      style={{ left: screen.x, top: screen.y }}
      onSubmit={onSubmit}
      role="dialog"
      aria-label={active.title}
    >
      <span className={css.title}>{active.title}</span>
      {active.fields.map((f) => renderField(f))}
      <div className={css.btnRow}>
        <button
          type="button"
          className={css.secondaryBtn}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={css.primaryBtn}
          disabled={!requiredOk}
        >
          Save
        </button>
      </div>
    </form>
  );
}
