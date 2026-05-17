/**
 * successionMilestone.schema — contract tests for the typed-table sync
 * path (Phase 3 of Full syncService Coverage).
 *
 * `successionStore` (ogden-act-succession) is server-queryable per-zone /
 * per-year, so it rides a real typed table. Milestone ids are NOT uuids
 * (`sm-<ts>-<rand>` — see SuccessionTrackerCard) so the schema must accept
 * an opaque string id. `phase` is a small stable enum owned by the store
 * and is mirrored here.
 */

import { describe, it, expect } from 'vitest';
import {
  CreateSuccessionMilestoneInput,
  UpdateSuccessionMilestoneInput,
  SuccessionMilestoneSummary,
} from '../schemas/successionMilestone.schema.js';

describe('CreateSuccessionMilestoneInput', () => {
  it('accepts a well-formed milestone with a non-uuid client id', () => {
    const parsed = CreateSuccessionMilestoneInput.parse({
      id: 'sm-1715900000000-ab12cd',
      zoneId: 'zone-7',
      year: 2028,
      phase: 'mid',
      observation: 'Canopy closing over the swale.',
      photoDataUrl: 'data:image/png;base64,xxx',
    });
    expect(parsed.id).toBe('sm-1715900000000-ab12cd');
    expect(parsed.phase).toBe('mid');
  });

  it('treats id, zoneId and photoDataUrl as optional', () => {
    const parsed = CreateSuccessionMilestoneInput.parse({
      year: 2030,
      phase: 'climax',
      observation: 'Site-wide note.',
    });
    expect(parsed.id).toBeUndefined();
    expect(parsed.zoneId).toBeUndefined();
  });

  it('rejects an unknown phase and a non-integer year', () => {
    expect(() =>
      CreateSuccessionMilestoneInput.parse({
        year: 2030,
        phase: 'mature',
        observation: 'x',
      }),
    ).toThrow();
    expect(() =>
      CreateSuccessionMilestoneInput.parse({
        year: 2030.5,
        phase: 'pioneer',
        observation: 'x',
      }),
    ).toThrow();
  });
});

describe('UpdateSuccessionMilestoneInput', () => {
  it('is a partial — accepts a single changed field', () => {
    const parsed = UpdateSuccessionMilestoneInput.parse({ observation: 'revised' });
    expect(parsed.observation).toBe('revised');
  });
});

describe('SuccessionMilestoneSummary', () => {
  it('round-trips a server row shape (zoneId/photoDataUrl nullable)', () => {
    const row = {
      id: 'sm-1',
      projectId: '11111111-1111-1111-1111-111111111111',
      zoneId: null,
      year: 2028,
      phase: 'pioneer' as const,
      observation: 'First nitrogen-fixers in.',
      photoDataUrl: null,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    };
    expect(SuccessionMilestoneSummary.parse(row)).toEqual(row);
  });

  it('rejects a non-uuid projectId', () => {
    expect(() =>
      SuccessionMilestoneSummary.parse({
        id: 'sm-1',
        projectId: 'not-a-uuid',
        zoneId: null,
        year: 2028,
        phase: 'pioneer',
        observation: 'x',
        photoDataUrl: null,
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
