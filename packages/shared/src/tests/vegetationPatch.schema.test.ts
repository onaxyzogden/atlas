/**
 * vegetationPatch.schema — contract tests for the typed-table sync path
 * (Phase 3 of Full syncService Coverage).
 *
 * `vegetationStore` (ogden-vegetation) is server-queryable, so it rides a
 * real typed table rather than the opaque versioned-blob transport. The
 * id is client-supplied (opaque string — vegetation patches use a UUID,
 * but the column is text so the schema must not require uuid) so the local
 * zustand store keeps one id from creation through later updates without a
 * roundtrip swap (mirrors machineryItem.schema.ts).
 */

import { describe, it, expect } from 'vitest';
import {
  CreateVegetationPatchInput,
  UpdateVegetationPatchInput,
  VegetationPatchSummary,
} from '../schemas/vegetationPatch.schema.js';

describe('CreateVegetationPatchInput', () => {
  it('accepts a well-formed patch with a client-supplied id', () => {
    const parsed = CreateVegetationPatchInput.parse({
      id: 'sm-or-uuid-123',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      successionStage: 'climax',
      groundCover: 'forest',
      label: 'Mature oak stand',
      notes: 'north ridge',
      createdAt: '2026-05-17T00:00:00.000Z',
    });
    expect(parsed.id).toBe('sm-or-uuid-123');
    expect(parsed.successionStage).toBe('climax');
    expect(parsed.groundCover).toBe('forest');
  });

  it('treats id, label, notes and createdAt as optional (server fills in)', () => {
    const parsed = CreateVegetationPatchInput.parse({
      geometry: { type: 'Polygon', coordinates: [] },
      successionStage: 'pioneer',
      groundCover: 'sparse-grasses',
    });
    expect(parsed.id).toBeUndefined();
    expect(parsed.label).toBeUndefined();
  });

  it('rejects a missing successionStage / groundCover', () => {
    expect(() =>
      CreateVegetationPatchInput.parse({
        geometry: { type: 'Polygon', coordinates: [] },
        groundCover: 'forest',
      }),
    ).toThrow();
  });
});

describe('UpdateVegetationPatchInput', () => {
  it('is a partial — accepts a single changed field', () => {
    const parsed = UpdateVegetationPatchInput.parse({ successionStage: 'mid' });
    expect(parsed.successionStage).toBe('mid');
  });
});

describe('VegetationPatchSummary', () => {
  it('round-trips a server row shape (label/notes nullable)', () => {
    const row = {
      id: 'veg-1',
      projectId: '11111111-1111-1111-1111-111111111111',
      geometry: { type: 'Polygon', coordinates: [] },
      successionStage: 'climax',
      groundCover: 'forest',
      label: null,
      notes: null,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    };
    expect(VegetationPatchSummary.parse(row)).toEqual(row);
  });

  it('rejects a non-uuid projectId', () => {
    expect(() =>
      VegetationPatchSummary.parse({
        id: 'veg-1',
        projectId: 'not-a-uuid',
        geometry: {},
        successionStage: 'climax',
        groundCover: 'forest',
        label: null,
        notes: null,
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
