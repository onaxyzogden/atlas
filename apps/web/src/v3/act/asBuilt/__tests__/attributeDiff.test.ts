/**
 * attributeDiff - the Act popover's edit -> AsBuiltDiff builder (Slice 2).
 *
 * Pins the branch the Plan reconciliation card (Slice 3) will consume:
 *  - nothing changed            -> null (no point emitted)
 *  - exactly one field changed  -> scalar asPlanned/asBuilt
 *  - a select changed           -> human option label, not the raw code
 *  - several fields changed      -> one bundled diff (`a+b`, keyed objects)
 */

import { describe, it, expect } from 'vitest';
import type { FieldSpec } from '../../../plan/draw/inlineFormStore.js';
import {
  buildAttributeDiff,
  labelForValue,
  type FormValues,
} from '../attributeDiff.js';

const NAME: FieldSpec = { key: 'name', label: 'Name', kind: 'text' };
const TYPE: FieldSpec = {
  key: 'type',
  label: 'Type',
  kind: 'select',
  options: [
    { value: 'orchard', label: 'Orchard' },
    { value: 'alley', label: 'Alley crop' },
  ],
};
const FIELDS: FieldSpec[] = [NAME, TYPE];

describe('buildAttributeDiff', () => {
  it('returns null when nothing changed', () => {
    const initial: FormValues = { name: 'North Block', type: 'orchard' };
    expect(buildAttributeDiff(FIELDS, initial, { ...initial })).toBeNull();
  });

  it('builds a scalar diff for a single changed text field', () => {
    const initial: FormValues = { name: 'North Block', type: 'orchard' };
    const values: FormValues = { name: 'North Orchard', type: 'orchard' };
    expect(buildAttributeDiff(FIELDS, initial, values)).toEqual({
      kind: 'attribute',
      field: 'name',
      label: 'Name',
      asPlanned: 'North Block',
      asBuilt: 'North Orchard',
      asPlannedRaw: 'North Block',
      asBuiltRaw: 'North Orchard',
    });
  });

  it('resolves select codes to human labels in the diff', () => {
    const initial: FormValues = { name: 'North Block', type: 'orchard' };
    const values: FormValues = { name: 'North Block', type: 'alley' };
    expect(buildAttributeDiff(FIELDS, initial, values)).toEqual({
      kind: 'attribute',
      field: 'type',
      label: 'Type',
      asPlanned: 'Orchard',
      asBuilt: 'Alley crop',
      // raw codes preserved for Apply, alongside the human labels for display
      asPlannedRaw: 'orchard',
      asBuiltRaw: 'alley',
    });
  });

  it('bundles multiple changed fields into one keyed diff', () => {
    const initial: FormValues = { name: 'North Block', type: 'orchard' };
    const values: FormValues = { name: 'North Orchard', type: 'alley' };
    expect(buildAttributeDiff(FIELDS, initial, values)).toEqual({
      kind: 'attribute',
      field: 'name+type',
      label: 'Multiple attributes',
      asPlanned: { name: 'North Block', type: 'Orchard' },
      asBuilt: { name: 'North Orchard', type: 'Alley crop' },
    });
  });
});

describe('labelForValue', () => {
  it('passes text values through unchanged', () => {
    expect(labelForValue(NAME, 'North Block')).toBe('North Block');
  });

  it('maps a select code to its option label', () => {
    expect(labelForValue(TYPE, 'alley')).toBe('Alley crop');
  });

  it('falls back to the raw value for an unknown select code', () => {
    expect(labelForValue(TYPE, 'mystery')).toBe('mystery');
  });

  it('coerces undefined to an empty string', () => {
    expect(labelForValue(NAME, undefined)).toBe('');
  });
});
