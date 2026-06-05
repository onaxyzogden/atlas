import { describe, it, expect } from 'vitest';
import {
  selectProjectRows,
  mergeProjectRows,
} from '../planSnapshotMerge.js';

/**
 * The typed-design snapshot adapter (`planSnapshot.ts`) cannot be imported
 * under vitest — doing so drags the zundo+persist geometry stores in alongside
 * the `syncManifest` graph, and that combination crashes at module load
 * (`store.persist` undefined). So the restore-safety invariant is tested here
 * against the pure `planSnapshotMerge` core that the adapter delegates to:
 *   - capture = `selectProjectRows`
 *   - restore = `mergeProjectRows`
 * The manifest-driven (versioned-blob) half reuses `selectForProject` /
 * `applyForProject`, already covered by `lib/__tests__/syncManifest.test.ts`.
 */

interface Row {
  id: string;
  projectId: string;
}
const row = (id: string, projectId: string): Row => ({ id, projectId });
const ids = (rows: unknown[]) =>
  (rows as Row[]).map((r) => r.id).sort();

describe('selectProjectRows (capture)', () => {
  it("keeps only this project's rows", () => {
    const all = [row('a1', 'a'), row('b1', 'b'), row('a2', 'a')];
    expect(ids(selectProjectRows(all, 'a'))).toEqual(['a1', 'a2']);
  });

  it('returns an empty array for a non-array input', () => {
    expect(selectProjectRows(undefined, 'a')).toEqual([]);
    expect(selectProjectRows(null, 'a')).toEqual([]);
  });

  it('does not mutate its input', () => {
    const all = [row('a1', 'a'), row('b1', 'b')];
    const snap = JSON.stringify(all);
    selectProjectRows(all, 'a');
    expect(JSON.stringify(all)).toBe(snap);
  });
});

describe('mergeProjectRows (restore)', () => {
  it("replaces this project's rows and leaves other projects untouched", () => {
    // Current live state: project a wiped, project b gained a row.
    const current = [row('b1', 'b'), row('b2', 'b')];
    // Snapshot captured earlier: project a had two rows.
    const snapshot = [row('a1', 'a'), row('a2', 'a')];

    const merged = mergeProjectRows(current, 'a', snapshot);

    // a is restored…
    expect(ids((merged as Row[]).filter((r) => r.projectId === 'a'))).toEqual([
      'a1',
      'a2',
    ]);
    // …and b's rows survive intact (the critical restore-safety invariant).
    expect(ids((merged as Row[]).filter((r) => r.projectId === 'b'))).toEqual([
      'b1',
      'b2',
    ]);
  });

  it('drops a project entirely when restoring an empty slice', () => {
    const current = [row('a1', 'a'), row('b1', 'b')];
    const merged = mergeProjectRows(current, 'a', []);
    expect(ids(merged)).toEqual(['b1']);
  });

  it('treats non-array existing/incoming defensively', () => {
    expect(mergeProjectRows(undefined, 'a', [row('a1', 'a')])).toEqual([
      row('a1', 'a'),
    ]);
    expect(mergeProjectRows([row('b1', 'b')], 'a', undefined)).toEqual([
      row('b1', 'b'),
    ]);
  });

  it('does not mutate its inputs', () => {
    const current = [row('a1', 'a'), row('b1', 'b')];
    const incoming = [row('a2', 'a')];
    const cSnap = JSON.stringify(current);
    const iSnap = JSON.stringify(incoming);
    mergeProjectRows(current, 'a', incoming);
    expect(JSON.stringify(current)).toBe(cSnap);
    expect(JSON.stringify(incoming)).toBe(iSnap);
  });
});
