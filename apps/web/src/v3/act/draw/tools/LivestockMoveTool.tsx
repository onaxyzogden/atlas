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
 *
 * Work-fulfilment hand-off: when `workExecutionStore.pending` is set (a
 * WorkItemRow's "Log this move" armed this tool), the form prefills from the
 * planned work, the popover shows a "Fulfilling: <title>" hint, a click in a
 * different paddock raises a non-blocking mismatch warning (the operator may
 * proceed — the field is the truth), and on save the logged event is linked
 * back via `confirmTypedProofMatch` (entry leg for rotate_through). Pending
 * clears on save and on tool disarm.
 */

import { useEffect, useState } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useLivestockMoveLogStore,
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  buildRotatePair,
  destPaddockId,
  type LivestockMoveDirection,
} from '../../../../store/livestockMoveLogStore.js';
import {
  useLivestockStore,
  type LivestockSpecies,
} from '../../../../store/livestockStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useWorkExecutionStore } from '../../../../store/workExecutionStore.js';
import { confirmTypedProofMatch } from '../../../../features/act/fieldProofActions.js';
import { useInlineFormStore } from '../../../plan/draw/inlineFormStore.js';
import { originDisclosureField, parseOriginValue } from '../../originPicker.js';
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
  // Reactive read for the popover hint only — the click handler reads
  // getState() so the map listener never re-binds on pending changes.
  const pendingWork = useWorkExecutionStore((s) => s.pending);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);

  // Disarming the tool abandons any in-flight fulfilment hand-off.
  useEffect(
    () => () => {
      useWorkExecutionStore.getState().clearPending();
    },
    [],
  );

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
      let paddockHasSpecies = false;
      for (const p of paddocks) {
        try {
          if (turf.booleanPointInPolygon(click, p.geometry)) {
            hitId = p.id;
            hitName = p.name || 'paddock';
            if (p.species[0]) {
              defaultSpecies = p.species[0];
              paddockHasSpecies = true;
            }
            break;
          }
        } catch {
          /* ignore malformed geom */
        }
      }

      if (!hitId) return;

      // Drop-placed / auto-designed paddocks carry no `species[]` (run-2
      // #71): silently falling back to 'sheep' mislabels e.g. a poultry
      // paddock. Use the species of the most recent move *into* this
      // paddock instead — the move log is the real record of what grazes
      // here once any rotation has been logged.
      if (!paddockHasSpecies) {
        const lastInto = useLivestockMoveLogStore
          .getState()
          .events.filter(
            (e) => e.projectId === projectId && destPaddockId(e) === hitId,
          )
          .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        if (lastInto) defaultSpecies = lastInto.species;
      }

      // Fulfilment hand-off prefill: planned work overrides the paddock's
      // species default; date/who come from the plan when present.
      const pending = useWorkExecutionStore.getState().pending;
      if (pending?.paddockId && pending.paddockId !== hitId) {
        const planned = paddocks.find((p) => p.id === pending.paddockId);
        setMismatchWarning(
          `Planned for ${planned?.name ?? 'another paddock'} — you clicked ${
            hitName
          }. Saving here is allowed (the field is the truth).`,
        );
      } else {
        setMismatchWarning(null);
      }
      const prefillSpecies =
        pending?.species && isSpecies(pending.species)
          ? pending.species
          : defaultSpecies;
      const prefillDate = pending?.date ?? todayIso();

      const id = newAnnotationId('lvm');
      addEvent({
        id,
        projectId,
        toPaddockId: hitId,
        date: prefillDate,
        direction: 'move_in',
        species: prefillSpecies,
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
          originDisclosureField(projectId, { kind: 'paddock', id: hitId }),
          {
            key: 'exitDateDisclosure',
            label: 'Exit date',
            kind: 'disclosure',
            triggerLabel: '+ Different exit date',
            visibleWhen: (v) => v.direction === 'rotate_through',
            children: [
              {
                key: 'exitDate',
                label: 'Exit date',
                kind: 'text',
                placeholder: 'YYYY-MM-DD (defaults to date)',
              },
            ],
          },
        ],
        initial: {
          date: prefillDate,
          direction: 'move_in',
          species: prefillSpecies,
          headCount: '',
          who: pending?.who ?? '',
          notes: '',
          origin: '',
          exitDate: '',
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
          const origin = parseOriginValue(values.origin);
          const date = String(values.date ?? todayIso());

          if (direction === 'rotate_through') {
            // Rotate convenience: discard the skeleton, write two linked legs.
            removeEvent(id);
            const exitDate = String(values.exitDate ?? '').trim();
            const [exitLeg, entryLeg] = buildRotatePair({
              projectId,
              entryDate: date,
              exitDate: exitDate || undefined,
              species,
              headCount,
              from: {
                paddockId: origin?.kind === 'paddock' ? origin.id : undefined,
                structureId: origin?.kind === 'structure' ? origin.id : undefined,
              },
              to: { paddockId: hitId },
              who: who === '' ? undefined : who,
              notes: notes === '' ? undefined : notes,
            });
            addEvent(exitLeg);
            addEvent(entryLeg);
            if (pending) {
              // Entry leg is the planned arrival — that's the proof event.
              confirmTypedProofMatch(
                pending.workItemId,
                { store: 'livestock-move', eventId: entryLeg.id },
                { actualEnd: entryLeg.date },
              );
              useWorkExecutionStore.getState().clearPending();
              setMismatchWarning(null);
            }
            return;
          }

          updateEvent(id, {
            date,
            direction,
            species,
            headCount,
            who: who === '' ? undefined : who,
            notes: notes === '' ? undefined : notes,
            fromPaddockId: origin?.kind === 'paddock' ? origin.id : undefined,
            fromStructureId: origin?.kind === 'structure' ? origin.id : undefined,
          });
          if (pending) {
            confirmTypedProofMatch(
              pending.workItemId,
              { store: 'livestock-move', eventId: id },
              { actualEnd: date },
            );
            useWorkExecutionStore.getState().clearPending();
            setMismatchWarning(null);
          }
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
      {pendingWork && (
        <span className={css.hint} style={{ color: '#c4a265' }}>
          Fulfilling: {pendingWork.title}
        </span>
      )}
      {mismatchWarning && (
        <span
          className={css.hint}
          role="alert"
          style={{ color: 'var(--color-danger, #d06a5f)' }}
        >
          {mismatchWarning}
        </span>
      )}
      <span className={css.hint}>
        Click inside a paddock to record a move-in / move-out / rotate-through.
        Capture date, species, head count, and (optionally) who and notes.
      </span>
    </div>
  );
}
