/**
 * LivestockMoveTool — Act Module 3 (Livestock & Rotation): log a move
 * event against an existing Paddock on the map.
 *
 * Hit-test: point-in-polygon over `livestockStore.paddocks` (no tolerance —
 * paddocks are large). First match wins.
 *
 * Persist-first pattern (mirrors MaintenanceLogTool): create a skeleton
 * LivestockMoveEvent on click; popover patches fields; ESC/Cancel removes
 * the event for true rollback.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useLivestockMoveLogStore,
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  type LivestockMoveDirection,
} from '../../../../store/livestockMoveLogStore.js';
import {
  useLivestockStore,
  type LivestockSpecies,
} from '../../../../store/livestockStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useInlineFormStore } from '../../../plan/draw/inlineFormStore.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

// DIRECTION_OPTIONS / SPECIES_OPTIONS canonical lists live in livestockMoveLogStore.
const SPECIES_VALUES = SPECIES_OPTIONS.map((o) => o.value);
const DIRECTION_VALUES = DIRECTION_OPTIONS.map((o) => o.value);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDirection(s: string): s is LivestockMoveDirection {
  return (DIRECTION_VALUES as string[]).includes(s);
}

function isSpecies(s: string): s is LivestockSpecies {
  return (SPECIES_VALUES as string[]).includes(s);
}

export default function LivestockMoveTool({ map, projectId }: Props) {
  const addEvent = useLivestockMoveLogStore((s) => s.addEvent);
  const updateEvent = useLivestockMoveLogStore((s) => s.updateEvent);
  const removeEvent = useLivestockMoveLogStore((s) => s.removeEvent);
  const openForm = useInlineFormStore((s) => s.open);

  useEffect(() => {
    const prevCursor = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const click = turf.point([lng, lat]);

      const paddocks = useLivestockStore
        .getState()
        .paddocks.filter((p) => p.projectId === projectId);

      let hitId = '';
      let hitName = '';
      let defaultSpecies: LivestockSpecies = 'sheep';
      for (const p of paddocks) {
        try {
          if (turf.booleanPointInPolygon(click, p.geometry)) {
            hitId = p.id;
            hitName = p.name || 'paddock';
            if (p.species[0]) defaultSpecies = p.species[0];
            break;
          }
        } catch {
          /* ignore malformed geom */
        }
      }

      if (!hitId) return;

      const id = newAnnotationId('lvm');
      addEvent({
        id,
        projectId,
        toPaddockId: hitId,
        date: todayIso(),
        direction: 'move_in',
        species: defaultSpecies,
        headCount: null,
      });

      openForm({
        title: `Move — ${hitName}`,
        anchor: [lng, lat],
        fields: [
          { key: 'date',      label: 'Date',      kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'direction', label: 'Direction', kind: 'select', required: true, options: DIRECTION_OPTIONS },
          { key: 'species',   label: 'Species',   kind: 'select', required: true, options: SPECIES_OPTIONS },
          { key: 'headCount', label: 'Head',      kind: 'number', placeholder: 'e.g. 24' },
          { key: 'who',       label: 'Who',       kind: 'text',   placeholder: 'optional' },
          { key: 'notes',     label: 'Notes',     kind: 'text',   placeholder: 'optional' },
        ],
        initial: {
          date: todayIso(),
          direction: 'move_in',
          species: defaultSpecies,
          headCount: '',
          who: '',
          notes: '',
        },
        onSave: (values) => {
          const rawDir = String(values.direction ?? '').trim();
          const direction: LivestockMoveDirection = isDirection(rawDir) ? rawDir : 'move_in';
          const rawSpecies = String(values.species ?? '').trim();
          const species: LivestockSpecies = isSpecies(rawSpecies) ? rawSpecies : defaultSpecies;
          const rawHead = String(values.headCount ?? '').trim();
          const headCount =
            rawHead !== '' && Number.isFinite(Number(rawHead)) ? Number(rawHead) : null;
          const who = String(values.who ?? '').trim();
          const notes = String(values.notes ?? '').trim();
          updateEvent(id, {
            date: String(values.date ?? todayIso()),
            direction,
            species,
            headCount,
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
    <div className={css.popover} role="dialog" aria-label="Livestock move tool">
      <span className={css.title}>Log livestock move</span>
      <span className={css.hint}>
        Click inside a paddock to record a move-in / move-out / rotate-through.
        Capture date, species, head count, and (optionally) who and notes.
      </span>
    </div>
  );
}
