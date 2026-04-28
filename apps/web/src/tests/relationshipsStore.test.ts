/**
 * relationshipsStore — store round-trip and dedup tests for the Phase 2
 * canvas edges feature. Validation is owned by EdgeSchema (covered in
 * @ogden/shared tests); this suite proves the store wires safeParse,
 * dedup-on-add, and projectId scoping correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRelationshipsStore } from '../store/relationshipsStore.js';
import type { Edge } from '@ogden/shared/relationships';

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';

const VALID_EDGE: Edge = {
  fromId: 'orchard-1',
  fromOutput: 'biomass',
  toId: 'compost-1',
  toInput: 'biomass',
};

describe('relationshipsStore', () => {
  beforeEach(() => {
    useRelationshipsStore.setState({
      edgesByProject: {},
      pendingByProject: {},
      viewActive: false,
    });
  });

  it('round-trips a valid edge per project', () => {
    const result = useRelationshipsStore.getState().addEdge(PROJECT_A, VALID_EDGE);
    expect(result).toEqual({ ok: true });
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_A)).toHaveLength(1);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_B)).toHaveLength(0);
  });

  it('rejects an edge with an invalid resource type', () => {
    const bad = { ...VALID_EDGE, fromOutput: 'plutonium' as unknown as Edge['fromOutput'] };
    const result = useRelationshipsStore.getState().addEdge(PROJECT_A, bad);
    expect(result.ok).toBe(false);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_A)).toHaveLength(0);
  });

  it('dedupes identical edges on add', () => {
    useRelationshipsStore.getState().addEdge(PROJECT_A, VALID_EDGE);
    useRelationshipsStore.getState().addEdge(PROJECT_A, VALID_EDGE);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_A)).toHaveLength(1);
  });

  it('removes edges by predicate', () => {
    useRelationshipsStore.getState().addEdge(PROJECT_A, VALID_EDGE);
    useRelationshipsStore
      .getState()
      .removeEdge(PROJECT_A, (e) => e.fromId === VALID_EDGE.fromId);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_A)).toHaveLength(0);
  });

  it('clearProject wipes only the named project', () => {
    useRelationshipsStore.getState().addEdge(PROJECT_A, VALID_EDGE);
    useRelationshipsStore.getState().addEdge(PROJECT_B, VALID_EDGE);
    useRelationshipsStore.getState().clearProject(PROJECT_A);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_A)).toHaveLength(0);
    expect(useRelationshipsStore.getState().edgesFor(PROJECT_B)).toHaveLength(1);
  });
});
