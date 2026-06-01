/**
 * ActAsBuiltPopover - Act-stage affordance for recording an "as-built"
 * deviation on a placed Plan feature. Anchored at the click point (pairs with
 * `ActFeatureClickHandler`). Slice 2 handles crop areas; paddock + zone arrive
 * in Slice 4.
 *
 * It reuses the Plan-stage field set (`buildCropEditSchema`) for parity, but
 * its Save does NOT call the geometry-store mutator. Instead it diffs the
 * steward's edits against the as-planned values and emits a single divergent
 * Observe data point (`recordAsBuiltDeviation`). The Plan reconciliation card
 * later offers "Apply to design" / "Keep plan" - the only place a Plan-store
 * mutation happens. This preserves "Act adds, it does not edit Plan decisions."
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useActAsBuiltPopoverStore } from './actAsBuiltPopoverStore.js';
import {
  recordAsBuiltDeviation,
  polygonCentroid,
} from './recordAsBuiltDeviation.js';
import { buildAttributeDiff, type FormValues } from './attributeDiff.js';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import { buildCropEditSchema } from '../../plan/layers/inlineEditSchemas.js';
import css from './ActAsBuiltPopover.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

const POPOVER_WIDTH = 280;

/** No-op standing in for the Plan-stage `updateCropArea`; the as-built flow
 *  reuses the schema only for its field set + initial values, never its
 *  geometry-store mutation. */
const NOOP_UPDATE = (_id: string, _updates: Partial<CropArea>): void => {};

export default function ActAsBuiltPopover({ map, projectId }: Props) {
  const active = useActAsBuiltPopoverStore((s) => s.active);
  const close = useActAsBuiltPopoverStore((s) => s.close);
  const cropAreas = useCropStore((s) => s.cropAreas);

  const [screen, setScreen] = useState<{
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const seededFor = useRef<string | null>(null);

  // Resolve the live feature. Slice 2: crop areas only.
  const crop =
    active?.kind === 'cropArea'
      ? cropAreas.find((c) => c.id === active.id) ?? null
      : null;

  const schema = useMemo(
    () => (crop ? buildCropEditSchema(crop, NOOP_UPDATE, []) : null),
    [crop],
  );

  // Auto-close if the feature was deleted while the popover was open.
  useEffect(() => {
    if (active && active.kind === 'cropArea' && !crop) close();
  }, [active, crop, close]);

  // Seed the form once per opened feature (don't clobber in-progress edits
  // if the store updates for unrelated reasons).
  useEffect(() => {
    if (!active) {
      seededFor.current = null;
      return;
    }
    const key = `${active.kind}:${active.id}`;
    if (seededFor.current === key) return;
    if (schema) {
      setValues({ ...schema.initial });
      seededFor.current = key;
    }
  }, [active, schema]);

  // Track anchor -> screen coords; re-project on map move/zoom/resize.
  useEffect(() => {
    if (!active) {
      setScreen(null);
      return;
    }
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

  // ESC closes
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  // Click-outside closes
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const node = popoverRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [active, close]);

  if (!active || !crop || !schema || !screen) return null;

  const initial = schema.initial;
  const hasChanges = schema.fields.some(
    (f) => String(values[f.key] ?? '') !== String(initial[f.key] ?? ''),
  );
  const canSave = hasChanges && Boolean(projectId);

  const onSave = () => {
    if (!projectId) return;
    const diff = buildAttributeDiff(schema.fields, initial, values);
    if (!diff) {
      close();
      return;
    }
    recordAsBuiltDeviation({
      projectId,
      kind: 'cropArea',
      featureId: crop.id,
      diff,
      centroid: polygonCentroid(crop.geometry),
    });
    close();
  };

  return (
    <div
      ref={popoverRef}
      className={css.popover}
      data-flipped={screen.flipped ? 'true' : 'false'}
      style={{ left: screen.x, top: screen.y }}
      role="dialog"
      aria-label="Record as-built change"
    >
      <div className={css.header}>
        <span className={css.title}>Record as-built change</span>
        <span className={css.subtitle}>{crop.name}</span>
      </div>

      <div className={css.body}>
        {schema.fields.map((field) => {
          const raw = values[field.key] ?? '';
          const isChanged = String(raw) !== String(initial[field.key] ?? '');
          const inputCls = isChanged
            ? `${css.input} ${css.changed}`
            : css.input;
          const selectCls = isChanged
            ? `${css.select} ${css.changed}`
            : css.select;
          return (
            <label className={css.field} key={field.key}>
              <span className={css.fieldLabel}>{field.label}</span>
              {field.kind === 'select' ? (
                <select
                  className={selectCls}
                  value={String(raw)}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                >
                  {(field.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputCls}
                  type={field.kind === 'number' ? 'number' : 'text'}
                  value={String(raw)}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                />
              )}
            </label>
          );
        })}
      </div>

      <div className={css.note}>
        Recorded to Observe as a divergence - does not change the Plan. Reconcile
        from the Plan stage.
      </div>

      <div className={css.btnRow}>
        <button
          type="button"
          className={css.primaryBtn}
          disabled={!canSave}
          onClick={onSave}
        >
          Record change
        </button>
        <button type="button" className={css.secondaryBtn} onClick={close}>
          Cancel
        </button>
      </div>
    </div>
  );
}
