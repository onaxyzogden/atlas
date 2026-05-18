// @vitest-environment happy-dom
/**
 * compostCycleStore — additive B2 persist slice.
 *
 * Covers: addBatch, updateBatch idempotency on id, removeBatch,
 * per-project isolation, clearProject.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCompostCycleStore,
  type CompostBatch,
} from '../compostCycleStore.js';

function batch(id: string, over: Partial<CompostBatch> = {}): CompostBatch {
  return {
    id,
    method: 'hot',
    startDateISO: '2026-05-01',
    status: 'planned',
    ...over,
  };
}

function reset(): void {
  useCompostCycleStore.setState({ byProject: {} });
}

describe('compostCycleStore', () => {
  beforeEach(reset);

  it('addBatch appends a batch for a project', () => {
    useCompostCycleStore.getState().addBatch('p1', batch('b1'));
    expect(useCompostCycleStore.getState().byProject['p1']).toHaveLength(1);
  });

  it('updateBatch replaces by id and is idempotent on id', () => {
    const { addBatch, updateBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p1', batch('b2'));
    updateBatch('p1', batch('b1', { method: 'vermicompost' }));
    const list = useCompostCycleStore.getState().byProject['p1']!;
    expect(list).toHaveLength(2);
    expect(list.find((b) => b.id === 'b1')!.method).toBe('vermicompost');
  });

  it('removeBatch drops only the matching id', () => {
    const { addBatch, removeBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p1', batch('b2'));
    removeBatch('p1', 'b1');
    const list = useCompostCycleStore.getState().byProject['p1']!;
    expect(list.map((b) => b.id)).toEqual(['b2']);
  });

  it('isolates batches per project', () => {
    const { addBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p2', batch('b2'));
    addBatch('p2', batch('b3'));
    const { byProject } = useCompostCycleStore.getState();
    expect(byProject['p1']!).toHaveLength(1);
    expect(byProject['p2']!).toHaveLength(2);
  });

  it('clearProject removes the project entry entirely', () => {
    const { addBatch, clearProject } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    clearProject('p1');
    expect(useCompostCycleStore.getState().byProject['p1']).toBeUndefined();
  });
});
