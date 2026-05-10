/**
 * Action handoff helpers for the Act-stage structure inspector.
 *
 * Each helper closes the inspector popover, writes a skeleton record to
 * the matching log store, and opens an inline form pre-anchored at the
 * structure's center. Mirrors the skeleton-then-patch pattern the three
 * Act draw tools already use ([MaintenanceLogTool.tsx:125–171],
 * [LivestockMoveTool.tsx:102–151], [HarvestLogTool.tsx:105–151]) so
 * the handoff and the tools stay in sync without sharing a host
 * component.
 *
 * `onSave` patches the skeleton with normalized values; `onCancel`
 * removes the skeleton for true rollback.
 */

import type { Structure } from '../../store/structureStore.js';
import {
  useMaintenanceLogStore,
  type MaintenanceAction,
} from '../../store/maintenanceLogStore.js';
import {
  useLivestockMoveLogStore,
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  type LivestockMoveDirection,
} from '../../store/livestockMoveLogStore.js';
import {
  useHarvestLogStore,
  type HarvestUnit,
  type HarvestQuality,
} from '../../store/harvestLogStore.js';
import { type LivestockSpecies } from '../../store/livestockStore.js';
import { newAnnotationId } from '../../store/site-annotations.js';
import { useInlineFormStore } from '../plan/draw/inlineFormStore.js';
import { useActStructurePopoverStore } from '../../store/actStructurePopoverStore.js';
import { STRUCTURE_TEMPLATES } from '../../features/structures/footprints.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const MAINTENANCE_ACTION_OPTIONS: { value: MaintenanceAction; label: string }[] = [
  { value: 'inspect', label: 'Inspect' },
  { value: 'clear',   label: 'Clear / clean' },
  { value: 'repair',  label: 'Repair' },
  { value: 'replace', label: 'Replace' },
  { value: 'flush',   label: 'Flush / drain' },
];

function isMaintenanceAction(s: string): s is MaintenanceAction {
  return ['inspect', 'clear', 'repair', 'replace', 'flush'].includes(s);
}

const SPECIES_VALUES = SPECIES_OPTIONS.map((o) => o.value) as string[];
const DIRECTION_VALUES = DIRECTION_OPTIONS.map((o) => o.value) as string[];

function isDirection(s: string): s is LivestockMoveDirection {
  return DIRECTION_VALUES.includes(s);
}
function isSpecies(s: string): s is LivestockSpecies {
  return SPECIES_VALUES.includes(s);
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

/** Anchor for the inline form — structure's stored center. */
function anchorFor(structure: Structure): [number, number] {
  return [structure.center[0], structure.center[1]];
}

export function startMaintenanceLog(structure: Structure, projectId: string): void {
  const tpl = STRUCTURE_TEMPLATES[structure.type];
  const label = structure.name && structure.name !== tpl.label ? structure.name : tpl.label;

  useActStructurePopoverStore.getState().close();

  const id = newAnnotationId('mnt');
  const { addEvent, updateEvent, removeEvent } = useMaintenanceLogStore.getState();
  addEvent({
    id,
    projectId,
    sourceKind: 'structure',
    sourceId: structure.id,
    date: todayIso(),
    action: 'inspect',
  });

  useInlineFormStore.getState().open({
    title: `Maintenance — ${label}`,
    anchor: anchorFor(structure),
    fields: [
      { key: 'date',        label: 'Date',     kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'action',      label: 'Action',   kind: 'select', required: true, options: MAINTENANCE_ACTION_OPTIONS },
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
      const action: MaintenanceAction = isMaintenanceAction(rawAction) ? rawAction : 'inspect';
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
}

export function startLivestockMoveLog(structure: Structure, projectId: string): void {
  const tpl = STRUCTURE_TEMPLATES[structure.type];
  const label = structure.name && structure.name !== tpl.label ? structure.name : tpl.label;
  const defaultSpecies: LivestockSpecies = 'sheep';

  useActStructurePopoverStore.getState().close();

  const id = newAnnotationId('lvm');
  const { addEvent, updateEvent, removeEvent } = useLivestockMoveLogStore.getState();
  addEvent({
    id,
    projectId,
    structureId: structure.id,
    date: todayIso(),
    direction: 'move_in',
    species: defaultSpecies,
    headCount: null,
  });

  useInlineFormStore.getState().open({
    title: `Move — ${label}`,
    anchor: anchorFor(structure),
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
}

export function startHarvestLog(structure: Structure, projectId: string): void {
  const tpl = STRUCTURE_TEMPLATES[structure.type];
  const label = structure.name && structure.name !== tpl.label ? structure.name : tpl.label;

  useActStructurePopoverStore.getState().close();

  const id = newAnnotationId('hrv');
  const { addEntry, updateEntry, removeEntry } = useHarvestLogStore.getState();
  addEntry({
    id,
    projectId,
    sourceKind: 'structure',
    cropAreaId: '',
    structureId: structure.id,
    date: todayIso(),
    quantity: 0,
    unit: 'kg',
  });

  useInlineFormStore.getState().open({
    title: `Harvest — ${label}`,
    anchor: anchorFor(structure),
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
      unit: 'kg',
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
}
