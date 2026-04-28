/**
 * @ogden/shared/relationships — cycle algorithms.
 *
 * - `orphanOutputs`: outputs declared by an entity's catalog row that no
 *   edge in the project routes to a destination. Surfacing these is how
 *   Atlas tells the designer "this resource is going to waste."
 * - `unmetInputs`: inputs declared by an entity's catalog row that no
 *   edge in the project supplies. Surfacing these is how Atlas tells the
 *   designer "this entity needs something it isn't getting."
 * - `closedLoops`: simple directed cycles in the entity graph (two or
 *   more entities cyclically routing outputs to one another). The
 *   permaculture frame rewards closed loops as evidence of integration.
 * - `integrationScoreFromEdges`: fraction of the project's catalog
 *   outputs routed by at least one edge. Range [0, 1]; vacuously 1 when
 *   the placed set declares no outputs at all.
 */

import { OUTPUTS_BY_TYPE, INPUTS_BY_TYPE, type EntityType } from './catalog.js';
import type { Edge, PlacedEntity, ResourceType } from './types.js';

export interface OrphanOutput {
  fromId: string;
  fromOutput: ResourceType;
}

export interface UnmetInput {
  toId: string;
  toInput: ResourceType;
}

function asEntityType(type: string): EntityType {
  return type as EntityType;
}

export function orphanOutputs(
  entities: ReadonlyArray<PlacedEntity>,
  edges: ReadonlyArray<Edge>,
): OrphanOutput[] {
  const routed = new Set<string>();
  for (const e of edges) routed.add(`${e.fromId}::${e.fromOutput}`);

  const out: OrphanOutput[] = [];
  for (const ent of entities) {
    const outputs = OUTPUTS_BY_TYPE[asEntityType(ent.type)] ?? [];
    for (const r of outputs) {
      if (!routed.has(`${ent.id}::${r}`)) {
        out.push({ fromId: ent.id, fromOutput: r });
      }
    }
  }
  return out;
}

export function unmetInputs(
  entities: ReadonlyArray<PlacedEntity>,
  edges: ReadonlyArray<Edge>,
): UnmetInput[] {
  const supplied = new Set<string>();
  for (const e of edges) supplied.add(`${e.toId}::${e.toInput}`);

  const out: UnmetInput[] = [];
  for (const ent of entities) {
    const inputs = INPUTS_BY_TYPE[asEntityType(ent.type)] ?? [];
    for (const r of inputs) {
      if (!supplied.has(`${ent.id}::${r}`)) {
        out.push({ toId: ent.id, toInput: r });
      }
    }
  }
  return out;
}

/**
 * Find simple directed cycles using Johnson-style DFS over the entity
 * adjacency induced by edges. Returns each cycle as a list of entity ids
 * in traversal order (without repeating the closing node). Order of
 * returned cycles is not guaranteed; callers should treat it as a set.
 */
export function closedLoops(
  entities: ReadonlyArray<PlacedEntity>,
  edges: ReadonlyArray<Edge>,
): string[][] {
  const ids = new Set(entities.map((e) => e.id));
  const adj = new Map<string, Set<string>>();
  for (const id of ids) adj.set(id, new Set());
  for (const e of edges) {
    if (ids.has(e.fromId) && ids.has(e.toId) && e.fromId !== e.toId) {
      adj.get(e.fromId)!.add(e.toId);
    }
  }

  const cycles: string[][] = [];
  const seen = new Set<string>();

  const dfs = (start: string, current: string, path: string[], visited: Set<string>) => {
    for (const next of adj.get(current) ?? []) {
      if (next === start && path.length >= 2) {
        const rotated = canonicalRotation(path);
        const key = rotated.join('>');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(rotated);
        }
      } else if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(start, next, path, visited);
        path.pop();
        visited.delete(next);
      }
    }
  };

  for (const start of ids) {
    const visited = new Set<string>([start]);
    dfs(start, start, [start], visited);
  }
  return cycles;
}

function canonicalRotation(cycle: string[]): string[] {
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if ((cycle[i] as string) < (cycle[minIdx] as string)) minIdx = i;
  }
  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
}

/**
 * Fraction of catalog-declared outputs across all placed entities that
 * are routed by at least one edge. Vacuously 1.0 when no outputs are
 * declared (no waste possible).
 */
export function integrationScoreFromEdges(
  entities: ReadonlyArray<PlacedEntity>,
  edges: ReadonlyArray<Edge>,
): number {
  const routed = new Set<string>();
  for (const e of edges) routed.add(`${e.fromId}::${e.fromOutput}`);

  let total = 0;
  let covered = 0;
  for (const ent of entities) {
    const outputs = OUTPUTS_BY_TYPE[asEntityType(ent.type)] ?? [];
    for (const r of outputs) {
      total += 1;
      if (routed.has(`${ent.id}::${r}`)) covered += 1;
    }
  }
  if (total === 0) return 1;
  return covered / total;
}
