/**
 * MaintenanceLogTool — Act Module 2 (Maintenance & Operations): log a
 * maintenance event against an existing irrigation feature on the map.
 *
 * Source kinds, hit-tested in priority order:
 *   1. Earthwork (line)         → `sourceKind: 'earthwork'`
 *   2. Storage infrastructure   → `sourceKind: 'storage'`
 * (earthwork wins when the click happens to fall on both — a drip-line
 * along a swale is the most likely intent.)
 *
 * Lines are hit-tested with `turf.nearestPointOnLine` against a 12 m
 * tolerance — generous enough that a finger tap registers without the
 * steward needing pixel-level precision. Points use a 15 m radius from
 * the click.
 *
 * Persist-first pattern (mirrors HarvestLogTool): create a skeleton
 * MaintenanceEvent on click; popover patches fields; ESC/Cancel removes
 * the event for true rollback.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useMaintenanceLogStore,
  type MaintenanceAction,
} from '../../../../store/maintenanceLogStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useInlineFormStore } from '../../../plan/draw/inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const ACTION_OPTIONS: { value: MaintenanceAction; label: string }[] = [
  { value: 'inspect', label: 'Inspect' },
  { value: 'clear',   label: 'Clear / clean' },
  { value: 'repair',  label: 'Repair' },
  { value: 'replace', label: 'Replace' },
  { value: 'flush',   label: 'Flush / drain' },
];

const LINE_TOLERANCE_M = 12;
const POINT_RADIUS_M = 15;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isMaintenanceAction(s: string): s is MaintenanceAction {
  return ['inspect', 'clear', 'repair', 'replace', 'flush'].includes(s);
}

export default function MaintenanceLogTool({ map, projectId }: Props) {
  const addEvent = useMaintenanceLogStore((s) => s.addEvent);
  const updateEvent = useMaintenanceLogStore((s) => s.updateEvent);
  const removeEvent = useMaintenanceLogStore((s) => s.removeEvent);
  const openForm = useInlineFormStore((s) => s.open);

  useEffect(() => {
    const prevCursor = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const click = turf.point([lng, lat]);

      const earthworks = useWaterSystemsStore
        .getState()
        .earthworks.filter((w) => w.projectId === projectId);
      const storages = useWaterSystemsStore
        .getState()
        .storageInfra.filter((s) => s.projectId === projectId);

      let sourceKind: 'earthwork' | 'storage' | null = null;
      let sourceId = '';
      let title = '';

      // Lines first — earthworks are the more common maintenance target.
      let bestLineDistKm = Infinity;
      let bestLineId = '';
      let bestLineLabel = '';
      for (const w of earthworks) {
        try {
          const snap = turf.nearestPointOnLine(w.geometry, click, { units: 'kilometers' });
          const distKm = snap.properties?.dist ?? Infinity;
          if (distKm < bestLineDistKm) {
            bestLineDistKm = distKm;
            bestLineId = w.id;
            bestLineLabel = w.type.replace('_', ' ');
          }
        } catch {
          /* ignore malformed geom */
        }
      }
      if (bestLineDistKm * 1000 <= LINE_TOLERANCE_M) {
        sourceKind = 'earthwork';
        sourceId = bestLineId;
        title = `Maintenance — ${bestLineLabel}`;
      } else {
        // Storage points — pick the nearest within radius.
        let bestPtDistKm = Infinity;
        let bestPtId = '';
        let bestPtLabel = '';
        for (const s of storages) {
          const distKm = turf.distance(click, turf.point(s.center), { units: 'kilometers' });
          if (distKm < bestPtDistKm) {
            bestPtDistKm = distKm;
            bestPtId = s.id;
            bestPtLabel = s.type.replace('_', ' ');
          }
        }
        if (bestPtDistKm * 1000 <= POINT_RADIUS_M) {
          sourceKind = 'storage';
          sourceId = bestPtId;
          title = `Maintenance — ${bestPtLabel}`;
        }
      }

      if (!sourceKind) return;

      const id = newAnnotationId('mnt');
      addEvent({
        id,
        projectId,
        sourceKind,
        sourceId,
        date: todayIso(),
        action: 'inspect',
      });

      openForm({
        title,
        anchor: [lng, lat],
        fields: [
          { key: 'date',        label: 'Date',     kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'action',      label: 'Action',   kind: 'select', required: true, options: ACTION_OPTIONS },
          { key: 'durationMin', label: 'Minutes',  kind: 'number', placeholder: 'e.g. 25' },
          { key: 'who',         label: 'Who',      kind: 'text',   placeholder: 'optional' },
          { key: 'notes',       label: 'Notes',    kind: 'text',   placeholder: 'optional' },
        ],
        initial: {
          date: todayIso(),
          action: 'inspect',
          durationMin: '',
          who: '',
          notes: '',
        },
        onSave: (values) => {
          const rawAction = String(values.action ?? '').trim();
          const action: MaintenanceAction = isMaintenanceAction(rawAction)
            ? rawAction
            : 'inspect';
          const rawMin = String(values.durationMin ?? '').trim();
          const durationMin =
            rawMin !== '' && Number.isFinite(Number(rawMin)) ? Number(rawMin) : undefined;
          const who = String(values.who ?? '').trim();
          const notes = String(values.notes ?? '').trim();
          updateEvent(id, {
            date: String(values.date ?? todayIso()),
            action,
            durationMin,
            who: who === '' ? undefined : who,
            notes: notes === '' ? undefined : notes,
          });
        },
        onCancel: () => removeEvent(id),
      });
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = prevCursor;
    };
  }, [map, projectId, addEvent, updateEvent, removeEvent, openForm]);

  return (
    <div className={css.popover} role="dialog" aria-label="Maintenance log tool">
      <span className={css.title}>Log maintenance</span>
      <span className={css.hint}>
        Click an existing swale, drain, cistern, pond, or rain garden.
        Earthworks (lines) win when both overlap. Capture date, action,
        minutes, and (optionally) who and notes.
      </span>
    </div>
  );
}
