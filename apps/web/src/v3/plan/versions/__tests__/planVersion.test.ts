import { describe, it, expect } from 'vitest';
import {
  emptyPlanVersion,
  sortVersions,
  PLAN_VERSION_STATUSES,
  PLAN_VERSION_STATUS_LABEL,
  type PlanVersion,
  type PlanVersionStatus,
} from '../planVersion.js';
import type { PlanSnapshot } from '../planSnapshot.js';

function snapshot(capturedAt = '2026-05-20T10:00:00.000Z'): PlanSnapshot {
  return { schemaVersion: 1, capturedAt, blobs: {} };
}

/** A minimal version; override status/createdAt per case. */
function version(overrides: Partial<PlanVersion> = {}): PlanVersion {
  return {
    id: 'v-1',
    projectId: 'mtc',
    label: 'Baseline',
    note: '',
    status: 'draft',
    snapshot: snapshot(),
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('emptyPlanVersion', () => {
  it('opens as a draft wrapping the given snapshot', () => {
    const snap = snapshot();
    const v = emptyPlanVersion('mtc', snap, 'Pre-monsoon');
    expect(v.projectId).toBe('mtc');
    expect(v.status).toBe('draft');
    expect(v.label).toBe('Pre-monsoon');
    expect(v.note).toBe('');
    expect(v.snapshot).toBe(snap);
    expect(v.id).toBeTruthy();
    expect(v.createdAt).toBeTruthy();
    expect(v.updatedAt).toBe(v.createdAt);
    expect(v.approvedAt).toBeUndefined();
  });

  it('falls back to a timestamped label when blank', () => {
    const v = emptyPlanVersion('mtc', snapshot(), '   ');
    expect(v.label).toMatch(/^Snapshot \d{4}-\d{2}-\d{2}$/);
  });
});

describe('sortVersions', () => {
  it('groups by status order, newest-created first within a group', () => {
    const sorted = sortVersions([
      version({ id: 'oldApproved', status: 'approved', createdAt: '2026-05-01T00:00:00.000Z' }),
      version({ id: 'superseded', status: 'superseded', createdAt: '2026-06-01T00:00:00.000Z' }),
      version({ id: 'newApproved', status: 'approved', createdAt: '2026-05-20T00:00:00.000Z' }),
      version({ id: 'draft', status: 'draft', createdAt: '2026-04-01T00:00:00.000Z' }),
    ]);
    expect(sorted.map((v) => v.id)).toEqual([
      'draft',
      'newApproved',
      'oldApproved',
      'superseded',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [
      version({ id: 'a', status: 'approved' }),
      version({ id: 'b', status: 'draft' }),
    ];
    const snap = JSON.stringify(input);
    sortVersions(input);
    expect(JSON.stringify(input)).toBe(snap);
  });
});

describe('status labels', () => {
  it('has a label for every status', () => {
    for (const s of PLAN_VERSION_STATUSES) {
      expect(PLAN_VERSION_STATUS_LABEL[s as PlanVersionStatus]).toBeTruthy();
    }
  });
});
