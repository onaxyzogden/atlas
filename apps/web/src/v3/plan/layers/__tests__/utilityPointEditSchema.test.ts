/**
 * @vitest-environment happy-dom
 *
 * buildUtilityPointEditSchema — click-to-edit parity for typed utility
 * points (`utilityStore`, C2/C4). Verifies:
 *
 *   1. Fields mirror the C4 draw form (type / name / demand / capacity /
 *      phase), with the caller-supplied `phaseField` appended last.
 *   2. `initial` reflects the record (demand/cap fall back to '' when absent).
 *   3. onSave keeps a finite positive demand/capacity and drops it (→
 *      undefined) when blank / zero / non-finite.
 *   4. A type change re-routes `type` and, when the name is blank, falls back
 *      to the new type's `UTILITY_TYPE_CONFIG` label.
 *   5. onSave never writes a `color` (the render layer derives it; `Utility`
 *      has no `color` field).
 */

import { describe, it, expect } from 'vitest';
import type { FieldSpec } from '../../draw/inlineFormStore.js';
import {
  UTILITY_TYPE_CONFIG,
  type Utility,
} from '../../../../store/utilityStore.js';
import { buildUtilityPointEditSchema } from '../inlineEditSchemas.js';

const PHASE_FIELD: FieldSpec = {
  key: 'phase',
  label: 'Phase',
  kind: 'select',
  options: [{ value: '', label: '— Unassigned —' }],
};

function util(over: Partial<Utility> & { id: string }): Utility {
  return {
    projectId: 'p1',
    name: 'Rain Catchment',
    type: 'rain_catchment',
    center: [0, 0],
    phase: '',
    notes: '',
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    ...over,
  };
}

/** Capture the last `updateUtility` call so the pure builder needs no store. */
function makeCapture() {
  const calls: Array<{ id: string; updates: Partial<Utility> }> = [];
  const fn = (id: string, updates: Partial<Utility>) =>
    calls.push({ id, updates });
  return { fn, calls };
}

describe('buildUtilityPointEditSchema (fields + initial)', () => {
  it('exposes type/name/demand/capacity + the supplied phase field', () => {
    const u = util({ id: 'u1' });
    const { fn } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    expect(schema.title).toBe('Edit utility point');
    expect(schema.fields.map((f) => f.key)).toEqual([
      'type',
      'name',
      'demandKwhPerDay',
      'capacityGal',
      'phase',
    ]);
    // The phase field is the exact object the caller passed in.
    expect(schema.fields[schema.fields.length - 1]).toBe(PHASE_FIELD);
  });

  it('seeds initial from the record; absent demand/cap become empty strings', () => {
    const u = util({ id: 'u1', name: 'East tank', phase: 'phase-2' });
    const { fn } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    expect(schema.initial).toMatchObject({
      type: 'rain_catchment',
      name: 'East tank',
      demandKwhPerDay: '',
      capacityGal: '',
      phase: 'phase-2',
    });
  });

  it('seeds numeric demand/cap when present', () => {
    const u = util({ id: 'u1', demandKwhPerDay: 4, capacityGal: 250 });
    const { fn } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    expect(schema.initial.demandKwhPerDay).toBe(4);
    expect(schema.initial.capacityGal).toBe(250);
  });
});

describe('buildUtilityPointEditSchema onSave', () => {
  it('keeps a finite positive demand/capacity', () => {
    const u = util({ id: 'u1' });
    const { fn, calls } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    schema.onSave({
      ...schema.initial,
      name: 'Cistern',
      demandKwhPerDay: 6,
      capacityGal: 500,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.id).toBe('u1');
    expect(calls[0]!.updates).toMatchObject({
      name: 'Cistern',
      type: 'rain_catchment',
      demandKwhPerDay: 6,
      capacityGal: 500,
    });
  });

  it('drops demand/capacity when blank / zero / non-finite', () => {
    for (const bad of ['', 0, -3, 'abc']) {
      const u = util({ id: 'u1', demandKwhPerDay: 9, capacityGal: 9 });
      const { fn, calls } = makeCapture();
      const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
      schema.onSave({
        ...schema.initial,
        demandKwhPerDay: bad,
        capacityGal: bad,
      });
      expect(calls[0]!.updates.demandKwhPerDay).toBeUndefined();
      expect(calls[0]!.updates.capacityGal).toBeUndefined();
    }
  });

  it('falls back to the new type label when the name is blank on a type change', () => {
    const u = util({ id: 'u1' });
    const { fn, calls } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    schema.onSave({ ...schema.initial, type: 'compost', name: '   ' });
    expect(calls[0]!.updates.type).toBe('compost');
    expect(calls[0]!.updates.name).toBe(UTILITY_TYPE_CONFIG.compost.label);
  });

  it('never writes a color (render derives it; Utility has no color)', () => {
    const u = util({ id: 'u1' });
    const { fn, calls } = makeCapture();
    const schema = buildUtilityPointEditSchema(u, fn, PHASE_FIELD);
    schema.onSave({ ...schema.initial, name: 'X', demandKwhPerDay: 2 });
    expect('color' in calls[0]!.updates).toBe(false);
  });
});
