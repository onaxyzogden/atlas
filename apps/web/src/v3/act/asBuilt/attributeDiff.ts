/**
 * attributeDiff - pure helpers that turn a steward's edits in the Act as-built
 * popover into a single `AsBuiltDiff`. Extracted from `ActAsBuiltPopover` so the
 * branching (one changed field vs many; select-code -> human label) is unit
 * testable without rendering the popover, and so the Plan reconciliation card
 * (Slice 3) can rely on a pinned diff shape.
 *
 * One Save = one data point. A single changed field yields a scalar
 * asPlanned/asBuilt; multiple changed fields are bundled under a `key+key` field
 * id with keyed objects. The store's proximity supersession keeps one active
 * divergence per feature (latest wins), so bundling is the right granularity.
 */

import type { AsBuiltDiff } from '@ogden/shared';
import type { FieldSpec } from '../../plan/draw/inlineFormStore.js';

export type FormValues = Record<string, string | number>;

/** Human label for a value - resolves a select code to its option label so the
 *  recorded diff (and the Plan card) reads "Orchard", not "orchard". */
export function labelForValue(
  field: FieldSpec,
  raw: string | number | undefined,
): string {
  const val = String(raw ?? '');
  if (field.kind === 'select' && field.options) {
    return field.options.find((o) => o.value === val)?.label ?? val;
  }
  return val;
}

/** Build a single attribute diff from the fields that changed. Returns null
 *  when nothing diverged. One changed field -> scalar asPlanned/asBuilt; many
 *  -> keyed objects under a `key+key` field id. */
export function buildAttributeDiff(
  fields: FieldSpec[],
  initial: FormValues,
  values: FormValues,
): AsBuiltDiff | null {
  const changed = fields.filter(
    (f) => String(values[f.key] ?? '') !== String(initial[f.key] ?? ''),
  );
  if (changed.length === 0) return null;
  const only = changed.length === 1 ? changed[0] : undefined;
  if (only) {
    return {
      kind: 'attribute',
      field: only.key,
      label: only.label,
      asPlanned: labelForValue(only, initial[only.key]),
      asBuilt: labelForValue(only, values[only.key]),
    };
  }
  const asPlanned: Record<string, string> = {};
  const asBuilt: Record<string, string> = {};
  for (const f of changed) {
    asPlanned[f.key] = labelForValue(f, initial[f.key]);
    asBuilt[f.key] = labelForValue(f, values[f.key]);
  }
  return {
    kind: 'attribute',
    field: changed.map((f) => f.key).join('+'),
    label: 'Multiple attributes',
    asPlanned,
    asBuilt,
  };
}
