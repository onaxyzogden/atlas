/**
 * projectState.schema — contract tests for the generic versioned-blob
 * sync envelope (Phase 2 of Full syncService Coverage).
 *
 * The blob path is the durable P0-1 fix's catch-all transport: one row per
 * (project, storeKey) carrying an opaque payload plus the metadata the
 * stale-write-reject conflict model needs (`schemaVersion`, `baseRev`/`rev`).
 * These tests pin the wire contract so client and server cannot drift.
 */

import { describe, it, expect } from 'vitest';
import {
  UpsertProjectStateInput,
  ProjectStateBlob,
} from '../schemas/projectState.schema.js';

describe('UpsertProjectStateInput', () => {
  it('accepts a well-formed upsert envelope with an opaque payload', () => {
    const parsed = UpsertProjectStateInput.parse({
      envelopeSchema: 1,
      schemaVersion: 3,
      baseRev: 7,
      payload: { anything: ['goes', 1, true, null] },
    });
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.baseRev).toBe(7);
    expect(parsed.payload).toEqual({ anything: ['goes', 1, true, null] });
  });

  it('pins envelopeSchema to the literal 1 (version-skew guard anchor)', () => {
    expect(() =>
      UpsertProjectStateInput.parse({
        envelopeSchema: 2,
        schemaVersion: 1,
        baseRev: 0,
        payload: {},
      }),
    ).toThrow();
  });

  it('rejects a negative baseRev and a non-integer schemaVersion', () => {
    expect(() =>
      UpsertProjectStateInput.parse({
        envelopeSchema: 1,
        schemaVersion: 1,
        baseRev: -1,
        payload: {},
      }),
    ).toThrow();
    expect(() =>
      UpsertProjectStateInput.parse({
        envelopeSchema: 1,
        schemaVersion: 1.5,
        baseRev: 0,
        payload: {},
      }),
    ).toThrow();
  });

  it('requires schemaVersion >= 1', () => {
    expect(() =>
      UpsertProjectStateInput.parse({
        envelopeSchema: 1,
        schemaVersion: 0,
        baseRev: 0,
        payload: {},
      }),
    ).toThrow();
  });
});

describe('ProjectStateBlob', () => {
  it('round-trips a server row shape', () => {
    const row = {
      projectId: '11111111-1111-1111-1111-111111111111',
      storeKey: 'ogden-vision',
      payload: { foo: 'bar' },
      schemaVersion: 2,
      rev: 5,
      updatedBy: '22222222-2222-2222-2222-222222222222',
      updatedAt: '2026-05-16T00:00:00.000Z',
    };
    expect(ProjectStateBlob.parse(row)).toEqual(row);
  });

  it('allows a null updatedBy (system/migration writes)', () => {
    const parsed = ProjectStateBlob.parse({
      projectId: '11111111-1111-1111-1111-111111111111',
      storeKey: 'ogden-vision',
      payload: null,
      schemaVersion: 1,
      rev: 1,
      updatedBy: null,
      updatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(parsed.updatedBy).toBeNull();
  });

  it('rejects a non-uuid projectId', () => {
    expect(() =>
      ProjectStateBlob.parse({
        projectId: 'not-a-uuid',
        storeKey: 'ogden-vision',
        payload: {},
        schemaVersion: 1,
        rev: 1,
        updatedBy: null,
        updatedAt: '2026-05-16T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
