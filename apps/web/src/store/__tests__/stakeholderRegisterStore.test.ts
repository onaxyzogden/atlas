/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../stakeholderRegisterStore';
import type { StakeholderRecord } from '../stakeholderRegisterStore';

const P = 'proj-test';

function minSeed(
  overrides?: Partial<Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'>>,
): Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'> {
  return {
    name: 'Alice Neighbour',
    type: 'neighbour',
    role: 'Adjacent landowner',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useStakeholderRegisterStore.setState({ byProject: {} });
});

// ---------------------------------------------------------------------------
// 1. createStakeholder - auto-generated id/createdAt
// ---------------------------------------------------------------------------
describe('createStakeholder - auto id + createdAt', () => {
  it('returns a record with id starting "stakeholder-", correct projectId, and valid ISO createdAt', () => {
    const rec = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed());

    expect(rec.id.startsWith('stakeholder-')).toBe(true);
    expect(rec.projectId).toBe(P);
    expect(Number.isNaN(Date.parse(rec.createdAt))).toBe(false);
  });

  it('stores the record under byProject[projectId][rec.id]', () => {
    const rec = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed());

    const stored = useStakeholderRegisterStore.getState().byProject[P]?.[rec.id];
    expect(stored).toEqual(rec);
  });
});

// ---------------------------------------------------------------------------
// 2. createStakeholder - explicit id/createdAt
// ---------------------------------------------------------------------------
describe('createStakeholder - explicit id + createdAt', () => {
  it('honours an explicit id when provided', () => {
    const rec = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, { ...minSeed(), id: 'stakeholder-explicit-id' });

    expect(rec.id).toBe('stakeholder-explicit-id');
  });

  it('honours an explicit createdAt when provided', () => {
    const ts = '2026-01-15T10:00:00.000Z';
    const rec = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, { ...minSeed(), createdAt: ts });

    expect(rec.createdAt).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// 3. listForProject
// ---------------------------------------------------------------------------
describe('listForProject', () => {
  it('returns [] for an unknown project', () => {
    const result = useStakeholderRegisterStore
      .getState()
      .listForProject('nonexistent-project');

    expect(result).toEqual([]);
  });

  it('returns all rows for a populated project', () => {
    const s = useStakeholderRegisterStore.getState();
    s.createStakeholder(P, minSeed({ name: 'Alice' }));
    s.createStakeholder(P, minSeed({ name: 'Bob', type: 'authority' }));

    const list = useStakeholderRegisterStore.getState().listForProject(P);
    expect(list).toHaveLength(2);
    const names = list.map((r) => r.name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('does not bleed rows across projects', () => {
    const s = useStakeholderRegisterStore.getState();
    s.createStakeholder('proj-a', minSeed({ name: 'Alice' }));
    s.createStakeholder('proj-b', minSeed({ name: 'Bob' }));

    const listA = useStakeholderRegisterStore.getState().listForProject('proj-a');
    const listB = useStakeholderRegisterStore.getState().listForProject('proj-b');
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA[0]!.name).toBe('Alice');
    expect(listB[0]!.name).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// 4. getStakeholder
// ---------------------------------------------------------------------------
describe('getStakeholder', () => {
  it('returns the stored row by id', () => {
    const created = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed());

    const retrieved = useStakeholderRegisterStore
      .getState()
      .getStakeholder(P, created.id);
    expect(retrieved).toEqual(created);
  });

  it('returns undefined for a missing id', () => {
    useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed());

    const missing = useStakeholderRegisterStore
      .getState()
      .getStakeholder(P, 'stakeholder-does-not-exist');
    expect(missing).toBeUndefined();
  });

  it('returns undefined for an unknown project', () => {
    const missing = useStakeholderRegisterStore
      .getState()
      .getStakeholder('no-such-project', 'stakeholder-abc');
    expect(missing).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. updateStakeholder
// ---------------------------------------------------------------------------
describe('updateStakeholder', () => {
  it('applies the patch but preserves id, projectId, and createdAt', () => {
    const created = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed({ name: 'Alice' }));

    useStakeholderRegisterStore
      .getState()
      .updateStakeholder(P, created.id, {
        name: 'Alice Updated',
        role: 'Updated role',
        // attempt to override protected fields -- must be ignored
        id: 'hacked-id' as string,
        projectId: 'hacked-project' as string,
        createdAt: '1970-01-01T00:00:00.000Z',
      });

    const updated = useStakeholderRegisterStore
      .getState()
      .getStakeholder(P, created.id)!;

    expect(updated.name).toBe('Alice Updated');
    expect(updated.role).toBe('Updated role');
    // Protected fields must not change
    expect(updated.id).toBe(created.id);
    expect(updated.projectId).toBe(P);
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('is a no-op when the stakeholderId does not exist (state unchanged)', () => {
    // No rows in project -- bucket should remain undefined
    useStakeholderRegisterStore
      .getState()
      .updateStakeholder(P, 'stakeholder-missing', { name: 'Ghost' });

    const bucket = useStakeholderRegisterStore.getState().byProject[P];
    expect(bucket).toBeUndefined();
  });

  it('is a no-op when the stakeholderId is not in the bucket (existing bucket unchanged)', () => {
    const created = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed({ name: 'Alice' }));

    const bucketBefore = {
      ...useStakeholderRegisterStore.getState().byProject[P],
    };

    useStakeholderRegisterStore
      .getState()
      .updateStakeholder(P, 'stakeholder-missing', { name: 'Ghost' });

    const bucketAfter = useStakeholderRegisterStore.getState().byProject[P];
    expect(bucketAfter).toEqual(bucketBefore);
    // Original record untouched
    expect(bucketAfter![created.id]!.name).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// 6. deleteStakeholder
// ---------------------------------------------------------------------------
describe('deleteStakeholder', () => {
  it('removes the row', () => {
    const created = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed());

    useStakeholderRegisterStore
      .getState()
      .deleteStakeholder(P, created.id);

    const retrieved = useStakeholderRegisterStore
      .getState()
      .getStakeholder(P, created.id);
    expect(retrieved).toBeUndefined();
  });

  it('is a no-op when deleting a missing id (does not throw, other rows preserved)', () => {
    const created = useStakeholderRegisterStore
      .getState()
      .createStakeholder(P, minSeed({ name: 'Alice' }));

    expect(() => {
      useStakeholderRegisterStore
        .getState()
        .deleteStakeholder(P, 'stakeholder-missing');
    }).not.toThrow();

    // Alice still present
    const alice = useStakeholderRegisterStore
      .getState()
      .getStakeholder(P, created.id);
    expect(alice).toBeDefined();
    expect(alice!.name).toBe('Alice');
  });

  it('is a no-op when project bucket does not exist (does not throw)', () => {
    expect(() => {
      useStakeholderRegisterStore
        .getState()
        .deleteStakeholder('no-such-project', 'stakeholder-abc');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Persistence config
// ---------------------------------------------------------------------------
describe('persistence config', () => {
  it('has name === "ogden-stakeholder-register"', () => {
    const opts = useStakeholderRegisterStore.persist.getOptions();
    expect(opts.name).toBe('ogden-stakeholder-register');
  });

  it('has version === 2', () => {
    const opts = useStakeholderRegisterStore.persist.getOptions();
    expect(opts.version).toBe(2);
  });

  it('migrate v1 -> v2 coerces legacy commsChannel string into commsChannels array', () => {
    const opts = useStakeholderRegisterStore.persist.getOptions();
    const migrate = opts.migrate as unknown as (
      persisted: unknown,
      version: number,
    ) => { byProject: Record<string, Record<string, StakeholderRecord & { commsChannel?: string }>> };
    const v1 = {
      byProject: {
        [P]: {
          'stakeholder-1': {
            id: 'stakeholder-1',
            projectId: P,
            name: 'Alice',
            type: 'neighbour',
            role: 'Shares boundary',
            commsChannel: 'Email',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    };
    const out = migrate(v1, 1);
    const row = out.byProject[P]!['stakeholder-1']!;
    expect(row.commsChannels).toEqual(['Email']);
    expect('commsChannel' in row).toBe(false);
  });

  it('partialize returns only byProject (no extra keys)', () => {
    const opts = useStakeholderRegisterStore.persist.getOptions();
    const partialize = opts.partialize as unknown as (s: Record<string, unknown>) => Record<string, unknown>;
    expect(partialize).toBeDefined();
    const result = partialize({ byProject: { a: 1 }, extra: 2 } as never);
    expect(result).toEqual({ byProject: { a: 1 } });
    expect('extra' in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. EMPTY_STAKEHOLDERS_BY_ID
// ---------------------------------------------------------------------------
describe('EMPTY_STAKEHOLDERS_BY_ID', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(EMPTY_STAKEHOLDERS_BY_ID)).toBe(true);
  });

  it('is referentially stable (same object across multiple accesses)', async () => {
    // Re-import via dynamic import to check module-level identity
    const mod1 = await import('../stakeholderRegisterStore');
    const mod2 = await import('../stakeholderRegisterStore');
    expect(mod1.EMPTY_STAKEHOLDERS_BY_ID).toBe(mod2.EMPTY_STAKEHOLDERS_BY_ID);
  });

  it('is an empty object with no own keys', () => {
    expect(Object.keys(EMPTY_STAKEHOLDERS_BY_ID)).toHaveLength(0);
  });
});
