/**
 * @ogden/shared/relationships — Edge CRUD helpers.
 *
 * Pure functions over `RelationshipsState`. Callers (Phase 3 persistence
 * layer) own the storage; this module returns new state objects so the
 * value-object semantics survive.
 */

import { EdgeSchema, type Edge, type RelationshipsState, type PlacedEntity } from './types.js';

export function addEdge(state: RelationshipsState, edge: Edge): RelationshipsState {
  const validated = EdgeSchema.parse(edge);
  return { ...state, edges: [...state.edges, validated] };
}

export function removeEdge(
  state: RelationshipsState,
  predicate: (e: Edge) => boolean,
): RelationshipsState {
  return { ...state, edges: state.edges.filter((e) => !predicate(e)) };
}

export function addEntity(
  state: RelationshipsState,
  entity: PlacedEntity,
): RelationshipsState {
  return { ...state, entities: [...state.entities, entity] };
}

export function removeEntity(
  state: RelationshipsState,
  id: string,
): RelationshipsState {
  return {
    entities: state.entities.filter((e) => e.id !== id),
    edges: state.edges.filter((e) => e.fromId !== id && e.toId !== id),
  };
}

export const emptyState = (): RelationshipsState => ({ entities: [], edges: [] });
