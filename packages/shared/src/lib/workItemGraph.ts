/**
 * workItemGraph — the pure dependency / critical-path engine (Sub-project D1).
 *
 * No React, no store, no I/O. Input is a project-scoped `WorkItem[]`; output
 * is a single computed result object. It is the sole owner of the dependency
 * DAG, the Critical Path Method (CPM) pass, and derived blocked-state — D0
 * deliberately *stored* the edges (`dependsOn` / `dependsOnAuto`) without
 * computing anything; D1 computes.
 *
 * Edge semantics: an id in `item.dependsOn` ∪ `item.dependsOnAuto` is a
 * *predecessor* — that dependency must finish before this item starts. The
 * effective DAG is the union of both arrays (manual ∪ Goal-Compass-seeded);
 * provenance is irrelevant to the math and is resolved at the editor surface.
 *
 * Blocked-state is *derived only* — it is never written back into
 * `WorkItem.status` (single-writer-spine discipline, consistent with D0.1).
 *
 * Defensive on bad input: dangling/missing target ids are ignored (no throw);
 * if the effective graph contains a cycle, `cyclic` is reported `true` and the
 * CPM numbers degrade gracefully to zero rather than looping.
 */

import type { WorkItem } from '../schemas/workItem.schema.js';

/** Hours in one scheduling workday — used for the laborHrs duration fallback. */
const WORKDAY_HOURS = 8;
const MS_PER_DAY = 86_400_000;

/** A dependency whose status does not yet clear the gate (`done`/`cancelled`). */
const COMPLETE_STATUSES = new Set<WorkItem['status']>(['done', 'cancelled']);

export interface WorkItemGraphNode {
  /** CPM forward pass (in days, relative to project start = 0). */
  earliestStart: number;
  earliestFinish: number;
  /** CPM backward pass. */
  latestStart: number;
  latestFinish: number;
  /** `latestStart − earliestStart`. `slack === 0` ⇒ on the critical path. */
  slack: number;
  critical: boolean;
  /** Effective duration in days used by the CPM pass (see `itemDuration`). */
  duration: number;
  /**
   * Derived: any *existing* dependency whose status is not `done`/`cancelled`.
   * Never mutates spine status — purely a render-time annotation.
   */
  blocked: boolean;
  /** Ids of the dependencies that cause `blocked` (subset of effective deps). */
  blockedBy: string[];
}

export interface WorkItemGraphResult {
  byId: Map<string, WorkItemGraphNode>;
  /** True if the effective DAG is not acyclic (CPM then degrades to zeros). */
  cyclic: boolean;
  /** A topological order of the (existing) item ids; `[]` when `cyclic`. */
  order: string[];
}

/** The effective predecessor ids of an item: `dependsOn ∪ dependsOnAuto`. */
export function effectiveDependencies(item: WorkItem): string[] {
  const manual = item.dependsOn ?? [];
  const auto = item.dependsOnAuto ?? [];
  if (auto.length === 0) return [...new Set(manual)];
  return [...new Set([...manual, ...auto])];
}

/**
 * Adjacency from the union edges, restricted to ids that actually exist in
 * `items` (dangling targets silently dropped). Returns both directions plus
 * the id set so callers don't re-derive them.
 */
export function buildEffectiveGraph(items: WorkItem[]): {
  ids: Set<string>;
  /** id → its existing predecessor (dependency) ids. */
  deps: Map<string, string[]>;
  /** id → ids that depend on it (reverse edges). */
  dependents: Map<string, string[]>;
} {
  const ids = new Set(items.map((it) => it.id));
  const deps = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  for (const id of ids) {
    deps.set(id, []);
    dependents.set(id, []);
  }
  for (const item of items) {
    const seen = new Set<string>();
    for (const dep of effectiveDependencies(item)) {
      if (dep === item.id || !ids.has(dep) || seen.has(dep)) continue;
      seen.add(dep);
      deps.get(item.id)!.push(dep);
      dependents.get(dep)!.push(item.id);
    }
  }
  return { ids, deps, dependents };
}

/**
 * Would adding the manual edge `from → to` (i.e. `from` depends on `to`)
 * introduce a cycle? Self-edge is always a cycle. Otherwise true iff `to`
 * can already reach `from` along existing dependency edges (so closing
 * `from → to` would form a loop). Pure pre-write guard for the editor.
 */
export function detectCycle(
  items: WorkItem[],
  fromId: string,
  toId: string,
): boolean {
  if (fromId === toId) return true;
  const { ids, deps } = buildEffectiveGraph(items);
  if (!ids.has(fromId) || !ids.has(toId)) return false;
  // DFS from `to` over dependency edges; if we reach `from`, a cycle closes.
  const stack = [toId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === fromId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const d of deps.get(cur) ?? []) stack.push(d);
  }
  return false;
}

/**
 * Effective CPM duration in *days*:
 *  1. `scheduledEnd − scheduledStart` (clamped ≥ 0) when both parse;
 *  2. else `laborHrs` rounded up to whole workdays (`WORKDAY_HOURS`);
 *  3. else 0 — a zero-duration milestone.
 */
export function itemDuration(item: WorkItem): number {
  const s = item.scheduledStart ? Date.parse(item.scheduledStart) : NaN;
  const e = item.scheduledEnd ? Date.parse(item.scheduledEnd) : NaN;
  if (!Number.isNaN(s) && !Number.isNaN(e)) {
    return Math.max(0, (e - s) / MS_PER_DAY);
  }
  if (typeof item.laborHrs === 'number' && item.laborHrs > 0) {
    return Math.ceil(item.laborHrs / WORKDAY_HOURS);
  }
  return 0;
}

/** Kahn topological order over the dependency edges; `null` if cyclic. */
function topoOrder(
  ids: Set<string>,
  deps: Map<string, string[]>,
  dependents: Map<string, string[]>,
): string[] | null {
  const indegree = new Map<string, number>();
  for (const id of ids) indegree.set(id, deps.get(id)!.length);
  const queue: string[] = [];
  for (const [id, d] of indegree) if (d === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const next = indegree.get(dependent)! - 1;
      indegree.set(dependent, next);
      if (next === 0) queue.push(dependent);
    }
  }
  return order.length === ids.size ? order : null;
}

/**
 * Full analysis: effective graph → topo order → CPM forward/backward →
 * slack/critical → derived blocked. Single pass over the project's items.
 */
export function analyzeWorkItemGraph(items: WorkItem[]): WorkItemGraphResult {
  const { ids, deps, dependents } = buildEffectiveGraph(items);
  const byId = new Map<string, WorkItemGraphNode>();
  const duration = new Map<string, number>();
  const itemById = new Map(items.map((it) => [it.id, it]));
  for (const it of items) duration.set(it.id, itemDuration(it));

  const order = topoOrder(ids, deps, dependents);

  // Derived blocked-state is independent of the CPM math — always computable.
  const blockedById = new Map<string, { blocked: boolean; blockedBy: string[] }>();
  for (const id of ids) {
    const blockedBy: string[] = [];
    for (const dep of deps.get(id) ?? []) {
      const depItem = itemById.get(dep);
      if (depItem && !COMPLETE_STATUSES.has(depItem.status)) blockedBy.push(dep);
    }
    blockedById.set(id, { blocked: blockedBy.length > 0, blockedBy });
  }

  if (!order) {
    // Cyclic: report it; degrade CPM to zeros rather than looping.
    for (const id of ids) {
      const b = blockedById.get(id)!;
      byId.set(id, {
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: 0,
        latestFinish: 0,
        slack: 0,
        critical: false,
        duration: duration.get(id) ?? 0,
        blocked: b.blocked,
        blockedBy: b.blockedBy,
      });
    }
    return { byId, cyclic: true, order: [] };
  }

  // Forward pass — earliest start/finish.
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    let start = 0;
    for (const dep of deps.get(id)!) start = Math.max(start, ef.get(dep) ?? 0);
    es.set(id, start);
    ef.set(id, start + (duration.get(id) ?? 0));
  }
  const projectDuration = order.reduce(
    (m, id) => Math.max(m, ef.get(id) ?? 0),
    0,
  );

  // Backward pass — latest finish/start (reverse topological order).
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]!;
    const succ = dependents.get(id) ?? [];
    let finish = projectDuration;
    for (const s of succ) finish = Math.min(finish, ls.get(s) ?? projectDuration);
    lf.set(id, finish);
    ls.set(id, finish - (duration.get(id) ?? 0));
  }

  for (const id of order) {
    const slack = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    const b = blockedById.get(id)!;
    byId.set(id, {
      earliestStart: es.get(id) ?? 0,
      earliestFinish: ef.get(id) ?? 0,
      latestStart: ls.get(id) ?? 0,
      latestFinish: lf.get(id) ?? 0,
      slack,
      critical: Math.abs(slack) < 1e-9,
      duration: duration.get(id) ?? 0,
      blocked: b.blocked,
      blockedBy: b.blockedBy,
    });
  }

  return { byId, cyclic: false, order };
}
