/**
 * PlanScheduleMoveTool — Plan Module 4 (Livestock & Subdivision): create a
 * `ScheduledLivestockMove` against an existing paddock or livestock-capable
 * structure (barn / animal shelter) directly from the Plan-stage map.
 *
 * Mirrors the Act-stage `LivestockMoveTool` but writes to
 * `scheduledLivestockMoveStore` instead of `livestockMoveLogStore`.
 *
 * Hit-test order: (1) point-in-polygon over `useLivestockStore.paddocks`
 * (paddock destination); (2) if no paddock hit, proximity test against
 * `useStructureStore.structures` `.center` within ~30 m (structure
 * destination). First match wins. Structures are only eligible if their
 * type supports `livestockMove` per `getActionsForType`.
 *
 * Persist-first pattern: on click, mints a skeleton plan via `addPlan`
 * with defaults (`direction: 'move_in'`, today as plannedDate, paddock's
 * first species or 'sheep'). Popover patches via `updatePlan`; ESC/Cancel
 * calls `removePlan` for true rollback. By ADR Q4 of
 * `2026-05-11-atlas-livestock-rotate-linked-pair.md`, scheduled plans are
 * single-destination — no `rotate_through` / exit-date disclosure here.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  type LivestockMoveDirection,
} from '../../../../store/livestockMoveLogStore.js';
import {
  useLivestockStore,
  type LivestockSpecies,
} from '../../../../store/livestockStore.js';
import { useStructureStore } from '../../../../store/structureStore.js';
import { useScheduledLivestockMoveStore } from '../../../../store/scheduledLivestockMoveStore.js';
import { getActionsForType } from '../../../act/data/structureActions.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { originDisclosureField, parseOriginValue } from '../../../act/originPicker.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SPECIES_VALUES = SPECIES_OPTIONS.map((o) => o.value);
const DIRECTION_VALUES = DIRECTION_OPTIONS
  .filter((o) => o.value !== 'rotate_through')
  .map((o) => o.value);
// Plan-stage picker omits 'rotate_through' (ADR Q4: scheduled plans are
// single-destination — rotation pairs only exist on the event side).
const PLAN_DIRECTION_OPTIONS = DIRECTION_OPTIONS.filter(
  (o) => o.value !== 'rotate_through',
);

const STRUCTURE_HIT_RADIUS_M = 30;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDirection(s: string): s is LivestockMoveDirection {
  return (DIRECTION_VALUES as string[]).includes(s);
}

function isSpecies(s: string): s is LivestockSpecies {
  return (SPECIES_VALUES as string[]).includes(s);
}

function distanceM(a: [number, number], b: [number, number]): number {
  const lat0 = (a[1] + b[1]) / 2;
  const dx = (a[0] - b[0]) * 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const dy = (a[1] - b[1]) * 110_540;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function PlanScheduleMoveTool({ map, projectId }: Props) {
  const addPlan = useScheduledLivestockMoveStore((s) => s.addPlan);
  const updatePlan = useScheduledLivestockMoveStore((s) => s.updatePlan);
  const removePlan = useScheduledLivestockMoveStore((s) => s.removePlan);
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

      let destKind: 'paddock' | 'structure' | null = null;
      let destId = '';
      let destName = '';
      let defaultSpecies: LivestockSpecies = 'sheep';

      // 1) Paddock hit
      for (const p of paddocks) {
        try {
          if (turf.booleanPointInPolygon(click, p.geometry)) {
            destKind = 'paddock';
            destId = p.id;
            destName = p.name || 'paddock';
            if (p.species[0]) defaultSpecies = p.species[0];
            break;
          }
        } catch {
          /* ignore malformed geom */
        }
      }

      // 2) Structure proximity (livestock-capable kinds only)
      if (!destKind) {
        const structures = useStructureStore
          .getState()
          .structures.filter(
            (s) =>
              s.projectId === projectId &&
              getActionsForType(s.type).includes('livestockMove'),
          );
        let best = Infinity;
        for (const s of structures) {
          const d = distanceM([lng, lat], s.center);
          if (d < best && d <= STRUCTURE_HIT_RADIUS_M) {
            best = d;
            destKind = 'structure';
            destId = s.id;
            destName = s.name || s.type;
          }
        }
      }

      if (!destKind) return;

      const id = newAnnotationId('slvm');
      const today = todayIso();
      addPlan({
        id,
        projectId,
        toPaddockId: destKind === 'paddock' ? destId : undefined,
        toStructureId: destKind === 'structure' ? destId : undefined,
        plannedDate: today,
        direction: 'move_in',
        species: defaultSpecies,
        headCount: null,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: `Schedule move — ${destName}`,
        anchor: [lng, lat],
        fields: [
          { key: 'plannedDate', label: 'Planned date', kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'direction',   label: 'Direction',    kind: 'select', required: true, options: PLAN_DIRECTION_OPTIONS },
          { key: 'species',     label: 'Species',      kind: 'select', required: true, options: SPECIES_OPTIONS },
          { key: 'headCount',   label: 'Head',         kind: 'number', placeholder: 'e.g. 24' },
          { key: 'who',         label: 'Who',          kind: 'text',   placeholder: 'optional' },
          { key: 'notes',       label: 'Notes',        kind: 'text',   placeholder: 'optional' },
          originDisclosureField(projectId, { kind: destKind, id: destId }),
        ],
        initial: {
          plannedDate: today,
          direction: 'move_in',
          species: defaultSpecies,
          headCount: '',
          who: '',
          notes: '',
          origin: '',
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
          const plannedDate = String(values.plannedDate ?? today);

          updatePlan(id, {
            plannedDate,
            direction,
            species,
            headCount,
            who: who === '' ? undefined : who,
            notes: notes === '' ? undefined : notes,
            fromPaddockId: origin?.kind === 'paddock' ? origin.id : undefined,
            fromStructureId: origin?.kind === 'structure' ? origin.id : undefined,
          });
        },
        onCancel: () => removePlan(id),
      });
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = prevCursor;
    };
  }, [map, projectId, addPlan, updatePlan, removePlan, openForm]);

  return (
    <div className={css.popover} role="dialog" aria-label="Schedule livestock move tool">
      <span className={css.title}>Schedule livestock move</span>
      <span className={css.hint}>
        Click a paddock or a livestock-capable structure (barn, animal shelter)
        to plan a forward-looking move. Capture date, species, head count, and
        (optionally) origin and notes.
      </span>
    </div>
  );
}
