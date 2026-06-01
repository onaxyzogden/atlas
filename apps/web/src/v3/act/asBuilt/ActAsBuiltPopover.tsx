/**
 * ActAsBuiltPopover - Act-stage affordance for recording an "as-built"
 * deviation on a placed Plan feature. Anchored at the click point (pairs with
 * `ActFeatureClickHandler` for crop/paddock/zone, and with `ActStructurePopover`'s
 * "Record as-built change" hand-off for structures). Slice 4: all four kinds.
 *
 * It reuses the Plan-stage field sets (`buildCropEditSchema` /
 * `buildPaddockEditSchema` / `buildZoneEditSchema` / `buildBuildingEditSchema`)
 * for parity, but its Save does NOT call the geometry-store mutators. Instead it
 * diffs the steward's edits against the as-planned values and emits a single
 * divergent Observe data point (`recordAsBuiltDeviation`). The Plan
 * reconciliation card later offers "Apply to design" / "Keep plan" - the only
 * place a Plan-store mutation happens. This preserves "Act adds, it does not
 * edit Plan decisions."
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useActAsBuiltPopoverStore } from './actAsBuiltPopoverStore.js';
import {
  recordAsBuiltDeviation,
  polygonCentroid,
} from './recordAsBuiltDeviation.js';
import { buildAttributeDiff, type FormValues } from './attributeDiff.js';
import { buildGeometryDiff } from './geometryDiff.js';
import { parcelAreaM2 } from '../../../lib/geo.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import {
  buildCropEditSchema,
  buildPaddockEditSchema,
  buildZoneEditSchema,
  buildBuildingEditSchema,
} from '../../plan/layers/inlineEditSchemas.js';
import type { InlineFormPayload } from '../../plan/draw/inlineFormStore.js';
import css from './ActAsBuiltPopover.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

const POPOVER_WIDTH = 280;

/** No-op standing in for the Plan-stage geometry-store mutators; the as-built
 *  flow reuses each schema only for its field set + initial values, never its
 *  mutation. Parameterless so it is assignable to all builders' update-fn
 *  param types (`updateCropArea` / `updatePaddock` / `updateZone`). */
const NOOP_UPDATE = (): void => {};

type ResolvedSchema = Omit<InlineFormPayload, 'anchor'>;

/** Centroid for the divergence's `locationGeometry` + proximity supersession.
 *  Handles the kinds' geometry shapes; callers fall back to the click anchor. */
function featureCentroid(
  geometry: GeoJSON.Geometry | null | undefined,
): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') return polygonCentroid(geometry);
  if (geometry.type === 'MultiPolygon') {
    const first = geometry.coordinates[0];
    return first ? polygonCentroid({ type: 'Polygon', coordinates: first }) : null;
  }
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') return [lng, lat];
    return null;
  }
  return null;
}

export default function ActAsBuiltPopover({ map, projectId }: Props) {
  const active = useActAsBuiltPopoverStore((s) => s.active);
  const close = useActAsBuiltPopoverStore((s) => s.close);
  // Subscribe to every kind's store unconditionally (Rules of Hooks); the
  // resolution memo below picks the one matching active.kind.
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const zones = useZoneStore((s) => s.zones);
  const structures = useBuiltEnvironmentStoreV2((s) => s.entities);

  const [screen, setScreen] = useState<{
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [values, setValues] = useState<FormValues>({});
  // Slice 5 geometry capture: the steward toggles "shape differs", optionally
  // adding a note + approximate as-built area. Geometry takes precedence over
  // attribute edits on Save (one Save = one data point).
  const [shapeDiffers, setShapeDiffers] = useState(false);
  const [geomNote, setGeomNote] = useState('');
  const [asBuiltAreaInput, setAsBuiltAreaInput] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const seededFor = useRef<string | null>(null);

  // Resolve the live feature + its Plan-stage field schema, per kind. Slice 4:
  // all four kinds. Each schema is reused for its `fields` + `initial` ONLY;
  // the mutators are no-ops (cropArea/paddock/zone) or never invoked
  // (buildBuildingEditSchema closures its own store and is never Save()d here).
  const resolved = useMemo<{
    id: string;
    name: string;
    geometry: GeoJSON.Geometry | null | undefined;
    schema: ResolvedSchema;
  } | null>(() => {
    if (!active) return null;
    switch (active.kind) {
      case 'cropArea': {
        const c = cropAreas.find((x) => x.id === active.id);
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          geometry: c.geometry,
          schema: buildCropEditSchema(c, NOOP_UPDATE, []),
        };
      }
      case 'paddock': {
        const pd = paddocks.find((x) => x.id === active.id);
        if (!pd) return null;
        return {
          id: pd.id,
          name: pd.name,
          geometry: pd.geometry,
          schema: buildPaddockEditSchema(pd, NOOP_UPDATE, []),
        };
      }
      case 'zone': {
        const z = zones.find((x) => x.id === active.id);
        if (!z) return null;
        return {
          id: z.id,
          name: z.name,
          geometry: z.geometry,
          schema: buildZoneEditSchema(z, NOOP_UPDATE),
        };
      }
      case 'structure': {
        const s = structures.find((x) => x.id === active.id);
        if (!s) return null;
        return {
          id: s.id,
          name: s.label ?? 'Structure',
          geometry: s.geometry,
          schema: buildBuildingEditSchema(s),
        };
      }
      default:
        return null;
    }
  }, [active, cropAreas, paddocks, zones, structures]);

  const schema = resolved?.schema ?? null;

  // Auto-close if the feature was deleted while the popover was open.
  useEffect(() => {
    if (active && !resolved) close();
  }, [active, resolved, close]);

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
      // Reset the geometry-capture controls for each newly opened feature.
      setShapeDiffers(false);
      setGeomNote('');
      setAsBuiltAreaInput('');
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

  if (!active || !resolved || !schema || !screen) return null;

  const initial = schema.initial;
  const hasChanges = schema.fields.some(
    (f) => String(values[f.key] ?? '') !== String(initial[f.key] ?? ''),
  );
  // Geometry path is "armed" only when the toggle is on AND the steward gave a
  // note or an as-built area (a bare toggle records nothing).
  const trimmedNote = geomNote.trim();
  const geometryArmed =
    shapeDiffers && (trimmedNote !== '' || asBuiltAreaInput.trim() !== '');
  const canSave = Boolean(projectId) && (geometryArmed || hasChanges);

  const onSave = () => {
    if (!projectId) return;
    const centroid = featureCentroid(resolved.geometry) ?? active.anchor;

    // Geometry takes precedence: one Save = one data point, so when the shape
    // toggle is armed any attribute edits in the same form are ignored.
    if (geometryArmed) {
      const plannedArea = resolved.geometry
        ? parcelAreaM2(resolved.geometry)
        : null;
      const parsedArea =
        asBuiltAreaInput.trim() === '' ? null : Number(asBuiltAreaInput);
      const builtArea =
        parsedArea != null && Number.isFinite(parsedArea) ? parsedArea : null;
      const geomDiff = buildGeometryDiff(plannedArea, geomNote, builtArea);
      if (!geomDiff) {
        close();
        return;
      }
      recordAsBuiltDeviation({
        projectId,
        kind: active.kind,
        featureId: resolved.id,
        diff: geomDiff,
        centroid,
      });
      close();
      return;
    }

    const diff = buildAttributeDiff(schema.fields, initial, values);
    if (!diff) {
      close();
      return;
    }
    recordAsBuiltDeviation({
      projectId,
      kind: active.kind,
      featureId: resolved.id,
      diff,
      centroid,
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
        <span className={css.subtitle}>{resolved.name}</span>
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

      <div className={css.shapeSection}>
        <label className={css.toggleRow}>
          <input
            type="checkbox"
            checked={shapeDiffers}
            onChange={(e) => setShapeDiffers(e.target.checked)}
          />
          <span>Shape differs on the ground</span>
        </label>
        {shapeDiffers ? (
          <>
            <label className={css.field}>
              <span className={css.fieldLabel}>How it differs</span>
              <textarea
                className={css.textarea}
                value={geomNote}
                placeholder="e.g. north edge ~3 m short of plan"
                onChange={(e) => setGeomNote(e.target.value)}
              />
            </label>
            <label className={css.field}>
              <span className={css.fieldLabel}>As-built area (m2, optional)</span>
              <input
                className={css.input}
                type="number"
                value={asBuiltAreaInput}
                placeholder="approx square metres"
                onChange={(e) => setAsBuiltAreaInput(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      <div className={css.note}>
        {geometryArmed
          ? 'Records a shape deviation (note + area) - the polygon is not redrawn. Reconcile from the Plan stage.'
          : 'Recorded to Observe as a divergence - does not change the Plan. Reconcile from the Plan stage.'}
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
