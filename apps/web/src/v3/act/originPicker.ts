/**
 * originPicker — shared helper for the "From" picker on the three inline
 * livestock-move forms (ActStructurePopover Log/Schedule + LivestockMoveTool
 * draw tool).
 *
 * Shape: a single `disclosure` FieldSpec keyed `'origin'`, with one nested
 * `select` child also keyed `'origin'` (children write to the flat values
 * map — the disclosure key is just for expand-state tracking, the child
 * key is what carries the value).
 *
 * Value encoding: '' (none), 'paddock:<id>', 'structure:<id>'. Callers parse
 * via `parseOriginValue` and encode (for edit-mode prefill) via
 * `encodeOriginValue`.
 *
 * The default form stays at its existing field count; the picker only
 * reveals on demand. See ADR
 * `wiki/decisions/2026-05-10-atlas-livestock-move-event-v3.md` for the
 * "20-option select on a 6-field cramped panel" UX driver.
 */

import { useLivestockStore } from '../../store/livestockStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from '../../features/structures/footprints.js';
import { getActionsForType } from './data/structureActions.js';
import type { FieldSpec } from '../plan/draw/inlineFormStore.js';

export type OriginRef =
  | { kind: 'paddock'; id: string }
  | { kind: 'structure'; id: string }
  | null;

export function encodeOriginValue(ref: OriginRef): string {
  if (!ref) return '';
  return `${ref.kind}:${ref.id}`;
}

export function parseOriginValue(raw: string | number | undefined): OriginRef {
  if (raw === undefined || raw === '' || typeof raw !== 'string') return null;
  const idx = raw.indexOf(':');
  if (idx < 0) return null;
  const kind = raw.slice(0, idx);
  const id = raw.slice(idx + 1);
  if (kind === 'paddock' || kind === 'structure') return { kind, id };
  return null;
}

function sameRef(a: OriginRef, b: OriginRef): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.id === b.id;
}

/** Combined paddock + livestock-capable structure options for a project.
 *  The current destination (`exclude`) is filtered out so a plan/event can
 *  never self-target. Reads stores via `getState()` — call at form-open time. */
export function buildOriginOptions(
  projectId: string,
  exclude: OriginRef,
): { value: string; label: string }[] {
  const paddocks = useLivestockStore
    .getState()
    .paddocks.filter((p) => p.projectId === projectId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const structures = useStructureStore
    .getState()
    .structures.filter(
      (s) =>
        s.projectId === projectId &&
        getActionsForType(s.type).includes('livestockMove'),
    )
    .slice()
    .sort((a, b) => {
      const la = STRUCTURE_TEMPLATES[a.type]?.label ?? a.type;
      const lb = STRUCTURE_TEMPLATES[b.type]?.label ?? b.type;
      const byLabel = la.localeCompare(lb);
      if (byLabel !== 0) return byLabel;
      return (a.name || '').localeCompare(b.name || '');
    });

  const opts: { value: string; label: string }[] = [
    { value: '', label: 'No origin' },
  ];

  for (const p of paddocks) {
    const ref: OriginRef = { kind: 'paddock', id: p.id };
    if (sameRef(ref, exclude)) continue;
    opts.push({ value: encodeOriginValue(ref), label: `Paddock · ${p.name}` });
  }

  for (const s of structures) {
    const ref: OriginRef = { kind: 'structure', id: s.id };
    if (sameRef(ref, exclude)) continue;
    const tpl = STRUCTURE_TEMPLATES[s.type];
    const label = `${tpl?.label ?? s.type} · ${s.name || '(unnamed)'}`;
    opts.push({ value: encodeOriginValue(ref), label });
  }

  return opts;
}

/** Field spec slice callers spread into their `fields` array. */
export function originDisclosureField(
  projectId: string,
  excludeDestination: OriginRef,
): FieldSpec {
  return {
    key: 'originDisclosure',
    label: 'Origin',
    kind: 'disclosure',
    triggerLabel: '+ Add origin',
    children: [
      {
        key: 'origin',
        label: 'From',
        kind: 'select',
        options: buildOriginOptions(projectId, excludeDestination),
      },
    ],
  };
}
