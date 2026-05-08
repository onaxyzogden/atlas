/**
 * HarvestLogTool — Act Module 4 (Harvest & Succession): log a harvest entry
 * against an existing source on the map.
 *
 * Two source kinds, hit-tested in priority order:
 *   1. Plan crop area  → `sourceKind: 'crop'` + cropAreaId
 *   2. Plan paddock    → `sourceKind: 'livestock'` + paddockId
 * (paddocks lose ties to crop areas when a paddock overlaps a crop band —
 * crop wins because dedicated crop yields are usually the user's intent.)
 *
 * Unlike Plan tools, this is *not* drawing geometry. The Act stage is for
 * execution, not authoring; the harvest entry inherits the source feature's
 * polygon implicitly via cropAreaId or paddockId. We hit-test the click
 * against the relevant store with `turf.booleanPointInPolygon` (no
 * dependency on a rendered layer name).
 *
 * Persist-first pattern (mirrors PaddockTool): create a skeleton
 * HarvestEntry on click; popover patches fields; ESC/Cancel removes the
 * entry for true rollback.
 *
 * Click misses (no crop area or paddock under cursor) are silent — the
 * popover hint in the dock tells the steward what to do.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useHarvestLogStore,
  type HarvestUnit,
  type HarvestQuality,
} from '../../../../store/harvestLogStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useInlineFormStore } from '../../../plan/draw/inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const UNIT_OPTIONS: { value: HarvestUnit; label: string }[] = [
  { value: 'kg',    label: 'kg' },
  { value: 'lb',    label: 'lb' },
  { value: 'count', label: 'count' },
  { value: 'L',     label: 'L' },
];

const QUALITY_OPTIONS: { value: string; label: string }[] = [
  { value: '',  label: '— (ungraded)' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HarvestLogTool({ map, projectId }: Props) {
  const addEntry = useHarvestLogStore((s) => s.addEntry);
  const updateEntry = useHarvestLogStore((s) => s.updateEntry);
  const removeEntry = useHarvestLogStore((s) => s.removeEntry);
  const openForm = useInlineFormStore((s) => s.open);

  useEffect(() => {
    const prevCursor = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const click = turf.point([lng, lat]);

      const cropAreas = useCropStore.getState().cropAreas;
      const cropHit = cropAreas.find(
        (c) =>
          c.projectId === projectId &&
          turf.booleanPointInPolygon(click, c.geometry),
      );

      let sourceKind: 'crop' | 'livestock';
      let cropAreaId = '';
      let paddockId: string | undefined;
      let title: string;

      if (cropHit) {
        sourceKind = 'crop';
        cropAreaId = cropHit.id;
        title = `Harvest — ${cropHit.name}`;
      } else {
        const paddocks = useLivestockStore.getState().paddocks;
        const paddockHit = paddocks.find(
          (p) =>
            p.projectId === projectId &&
            turf.booleanPointInPolygon(click, p.geometry),
        );
        if (!paddockHit) return;
        sourceKind = 'livestock';
        paddockId = paddockHit.id;
        title = `Livestock harvest — ${paddockHit.name}`;
      }

      const id = newAnnotationId('hrv');
      addEntry({
        id,
        projectId,
        sourceKind,
        cropAreaId,
        paddockId,
        date: todayIso(),
        quantity: 0,
        unit: sourceKind === 'livestock' ? 'count' : 'kg',
      });

      openForm({
        title,
        anchor: [lng, lat],
        fields: [
          { key: 'date',     label: 'Date',     kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'quantity', label: 'Quantity', kind: 'number', required: true, placeholder: 'e.g. 8' },
          { key: 'unit',     label: 'Unit',     kind: 'select', required: true, options: UNIT_OPTIONS },
          { key: 'quality',  label: 'Quality',  kind: 'select', options: QUALITY_OPTIONS },
          { key: 'notes',    label: 'Notes',    kind: 'text',   placeholder: 'optional' },
        ],
        initial: {
          date: todayIso(),
          quantity: '',
          unit: sourceKind === 'livestock' ? 'count' : 'kg',
          quality: '',
          notes: '',
        },
        onSave: (values) => {
          const rawQty = String(values.quantity ?? '').trim();
          const qty = Number.isFinite(Number(rawQty)) ? Number(rawQty) : 0;
          const rawQual = String(values.quality ?? '').trim();
          const quality: HarvestQuality | undefined =
            rawQual === 'A' || rawQual === 'B' || rawQual === 'C'
              ? (rawQual as HarvestQuality)
              : undefined;
          const notes = String(values.notes ?? '').trim();
          updateEntry(id, {
            date: String(values.date ?? todayIso()),
            quantity: qty,
            unit: values.unit as HarvestUnit,
            quality,
            notes: notes === '' ? undefined : notes,
          });
        },
        onCancel: () => removeEntry(id),
      });
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = prevCursor;
    };
  }, [map, projectId, addEntry, updateEntry, removeEntry, openForm]);

  return (
    <div className={css.popover} role="dialog" aria-label="Harvest log tool">
      <span className={css.title}>Log harvest</span>
      <span className={css.hint}>
        Click an existing crop area or paddock to log a harvest. Crop hits
        win when both overlap. Capture date, quantity, unit, and
        (optionally) quality and notes.
      </span>
    </div>
  );
}
