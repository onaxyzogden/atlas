/**
 * InlineFeaturePopover — schema-driven mini-form docked at a fixed position
 * on the right edge of the map canvas.
 *
 * Renders the form provided via `useInlineFormStore`. Position is static
 * (CSS-driven) rather than tracking the feature's [lng, lat] — this keeps
 * the panel predictable and fully on-screen for features anywhere on the
 * map, including near the bottom edge.
 *
 * Key behaviours:
 *   - Save  → caller's onSave(values); store closes
 *   - Cancel/ESC/click-outside → caller's onCancel(); store closes
 *   - Required-field gate disables the Save button until all required values are non-empty
 *
 * The slide-up is reserved for written reports — this stays small.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useInlineFormStore,
  type FieldSpec,
  type InlineFormPayload,
} from './inlineFormStore.js';
import css from './InlineFeaturePopover.module.css';

interface Props {
  /** Retained so existing call sites typecheck; position is now CSS-driven. */
  map: MaplibreMap;
}

// Matches the host-canopy-union tooltip's exit-transition slack
// (120ms transition + 80ms jitter / prefers-reduced-motion fallback).
const EXIT_TIMEOUT_MS = 200;

export default function InlineFeaturePopover(_props: Props) {
  const active = useInlineFormStore((s) => s.active);
  const close = useInlineFormStore((s) => s.close);

  // Mirror that lives one exit-transition longer than the store's `active`,
  // so the popover can fade out after the steward saves/cancels/clicks
  // outside — same pattern as PlanDataLayers.displayedUnion. While
  // `active === null && displayed !== null` we're in the exit window:
  // the form renders its last-seen content, `data-exiting='true'` engages
  // the CSS exit transition, and either the opacity transitionend or the
  // EXIT_TIMEOUT_MS safety fallback clears `displayed`.
  const [displayed, setDisplayed] = useState<InlineFormPayload | null>(active);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  const [values, setValues] = useState<Record<string, string | number>>(() =>
    active ? { ...active.initial } : {},
  );
  const [prevActive, setPrevActive] = useState(active);
  // Per-disclosure expanded state (keyed by disclosure FieldSpec.key).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const popoverRef = useRef<HTMLFormElement | null>(null);

  // Reset draft synchronously when the active payload changes (React's
  // "store info from previous render" pattern — avoids a race where a
  // `useEffect` reset would clobber a same-tick `setVal` patch from the
  // caller's reactive `onValuesChange` hook). Active-going-null is NOT a
  // reset signal: the form stays mounted during the exit fade and the
  // last-seen values should remain visible until `displayed` clears.
  if (prevActive !== active) {
    setPrevActive(active);
    if (active) {
      setValues({ ...active.initial });
      // Auto-expand disclosures whose any child carries a non-empty initial value.
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
    }
  }

  // Drive the displayed mirror from active. New active → swap displayed +
  // clear exiting. active=null with a non-null displayed → start exit fade;
  // a safety setTimeout covers prefers-reduced-motion (where transitionend
  // doesn't fire because there's no transition).
  useEffect(() => {
    if (active) {
      setDisplayed(active);
      setExiting(false);
      return;
    }
    if (!displayed) return;
    setExiting(true);
    const t = window.setTimeout(() => {
      setDisplayed(null);
      setExiting(false);
    }, EXIT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
    // displayed is intentionally excluded from deps — including it would
    // re-arm the timeout every time we set it inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Flip data-visible='true' on mount so the enter transition fires from
  // the initial opacity:0/translateY values to opacity:1/translateY(0).
  // Clearing on displayed=null returns the next mount to its from-state.
  useLayoutEffect(() => {
    if (displayed && !exiting) {
      setVisible(true);
    } else if (!displayed) {
      setVisible(false);
    }
  }, [displayed, exiting]);

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

  // Render guard reads `displayed` (lives through the exit fade), not
  // `active` (clears at the moment the steward saves/cancels). Handlers
  // that mutate the store still guard on `active` so a mid-fade event
  // (which CSS pointer-events:none already blocks defensively) is a no-op.
  if (!displayed) return null;

  // Flatten disclosure children so required validation covers them too.
  // Skip fields whose visibleWhen predicate is currently false — they are
  // not rendered so they can't be required.
  const flatFields: FieldSpec[] = displayed.fields
    .filter((f) => !f.visibleWhen || f.visibleWhen(values))
    .flatMap((f) => (f.kind === 'disclosure' ? (f.children ?? []) : [f]))
    .filter((f) => !f.visibleWhen || f.visibleWhen(values));
  const requiredOk = flatFields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v));
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !requiredOk) return;
    active.onSave(values);
    close();
  };

  const onCancel = () => {
    if (!active) return;
    active.onCancel();
    close();
  };

  const onPopoverTransitionEnd = (ev: React.TransitionEvent<HTMLFormElement>) => {
    if (!exiting) return;
    if (ev.target !== ev.currentTarget) return;
    if (ev.propertyName !== 'opacity') return;
    setDisplayed(null);
    setExiting(false);
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
              {(f.optionsFor ? f.optionsFor(values) : (f.options ?? [])).map((opt) => (
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
    if (f.visibleWhen && !f.visibleWhen(values)) return null;
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
        {(f.children ?? [])
          .filter((c) => !c.visibleWhen || c.visibleWhen(values))
          .map((c) => renderLeafField(c))}
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
      onSubmit={onSubmit}
      role="dialog"
      aria-label={displayed.title}
      data-testid="inline-feature-popover"
      onTransitionEnd={onPopoverTransitionEnd}
      {...(visible && !exiting ? { 'data-visible': 'true' } : {})}
      {...(exiting ? { 'data-exiting': 'true' } : {})}
    >
      <span className={css.title}>{displayed.title}</span>
      {displayed.fields.map((f) => renderField(f))}
      <div className={css.btnRow}>
        <button
          type="button"
          className={css.secondaryBtn}
          onClick={onCancel}
        >
          Cancel
        </button>
        {(displayed.customActions ?? []).map((a, i) => (
          <button
            key={i}
            type="button"
            className={a.variant === 'danger' ? css.dangerBtn : css.secondaryBtn}
            onClick={() => a.onClick(values, close)}
          >
            {a.label}
          </button>
        ))}
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
