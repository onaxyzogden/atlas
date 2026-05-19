/**
 * operatingHealth — pure D5 composition engine.
 *
 * Composes the four D1–D4 engine results (graph / resourcing / budget /
 * proof) into four health lights plus a ranked, deterministic,
 * render-only recommendation list. It CALLS those engines' results;
 * it never re-derives their logic (budget drift stays D3-owned —
 * surfaced verbatim, never re-framed toward financing/capital).
 *
 * Covenant: strictly operating analytics. No riba/gharar/CSRA/salam,
 * no cost-of-capital/financing/investor/yield framing. Never reads or
 * writes WorkItem.status — derived at call time, no mutation.
 */
import type { WorkItem } from '../schemas/workItem.schema.js';
import type { WorkItemGraphResult } from './workItemGraph.js';
import type { ResourcingConflictResult } from './resourcingConflicts.js';
import type { BudgetAnalysis } from './budgetVariance.js';
import type { FieldProofAnalysis } from './fieldProof.js';

export type Light = 'ok' | 'warn' | 'alert';

export type RecommendationKind =
  | 'cycle'
  | 'blocked-critical'
  | 'equipment-conflict'
  | 'over-capacity'
  | 'budget-drift'
  | 'overdue'
  | 'unproven';

export type Severity = 'high' | 'med' | 'low';

export type TargetCard =
  | 'act-plan-tracker'
  | 'act-resourcing'
  | 'act-budget'
  | 'field-proof';

export type SourceSignal = 'schedule' | 'resourcing' | 'budget' | 'proof';

export interface Recommendation {
  id: string;
  severity: Severity;
  kind: RecommendationKind;
  message: string;
  sourceSignal: SourceSignal;
  targetCard: TargetCard;
}

export interface OperatingHealthCounts {
  blocked: number;
  critical: number;
  overdue: number;
  equipmentConflicts: number;
  overCapacity: number;
  budgetDrift: number;
  unproven: number;
  doneTotal: number;
}

export interface OperatingHealth {
  lights: {
    schedule: Light;
    resourcing: Light;
    budget: Light;
    proof: Light;
  };
  recommendations: Recommendation[];
  counts: OperatingHealthCounts;
}

export interface OperatingHealthInput {
  items: WorkItem[];
  graph: WorkItemGraphResult;
  resourcing: ResourcingConflictResult;
  budget: BudgetAnalysis;
  proof: FieldProofAnalysis;
  /** ISO timestamp used for overdue detection; defaults to now. */
  now?: string;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, med: 1, low: 2 };

function isOverdue(item: WorkItem, nowMs: number): boolean {
  if (item.status === 'done' || item.status === 'cancelled') return false;
  if (!item.scheduledEnd) return false;
  const end = new Date(item.scheduledEnd).getTime();
  return Number.isFinite(end) && end < nowMs;
}

export function computeOperatingHealth(
  inp: OperatingHealthInput,
): OperatingHealth {
  const { items, graph, resourcing, budget, proof } = inp;
  const nowMs = inp.now ? new Date(inp.now).getTime() : Date.now();

  let blocked = 0;
  let critical = 0;
  let criticalBlocked = 0;
  let overdue = 0;
  for (const it of items) {
    const node = graph.byId.get(it.id);
    if (node?.blocked) blocked += 1;
    if (node?.critical) critical += 1;
    if (node?.blocked && node.critical) criticalBlocked += 1;
    if (isOverdue(it, nowMs)) overdue += 1;
  }

  const equipmentConflicts = resourcing.equipment.length;
  const overCapacity = resourcing.workload.length;

  let budgetDrift = 0;
  for (const c of budget.byItemId.values()) if (c.drift) budgetDrift += 1;
  const varianceOverPlan =
    budget.total.variance.mid > budget.total.planned.high;

  const doneTotal = proof.counts.proven + proof.counts.claimed;
  const unproven = proof.counts.claimed;
  const closureRatio = doneTotal > 0 ? proof.counts.proven / doneTotal : 1;

  const counts: OperatingHealthCounts = {
    blocked,
    critical,
    overdue,
    equipmentConflicts,
    overCapacity,
    budgetDrift,
    unproven,
    doneTotal,
  };

  // --- Lights ---
  const schedule: Light =
    graph.cyclic || criticalBlocked > 0
      ? 'alert'
      : overdue > 0 || blocked > 0
        ? 'warn'
        : 'ok';

  const resourcingLight: Light =
    equipmentConflicts > 0 ? 'alert' : overCapacity > 0 ? 'warn' : 'ok';

  const budgetLight: Light =
    budgetDrift > 0 && varianceOverPlan
      ? 'alert'
      : budgetDrift > 0
        ? 'warn'
        : 'ok';

  const proofLight: Light =
    doneTotal > 0 && closureRatio < 0.5
      ? 'alert'
      : unproven > 0
        ? 'warn'
        : 'ok';

  // --- Recommendations (each fires only on its trigger) ---
  const recs: Recommendation[] = [];

  if (graph.cyclic) {
    recs.push({
      id: 'cycle',
      severity: 'high',
      kind: 'cycle',
      message:
        'Dependency cycle detected — resolve the loop in the Plan tracker.',
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (criticalBlocked > 0) {
    recs.push({
      id: 'blocked-critical',
      severity: 'high',
      kind: 'blocked-critical',
      message: `${criticalBlocked} critical-path work item(s) blocked — unblock the prerequisite first.`,
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (equipmentConflicts > 0) {
    recs.push({
      id: 'equipment-conflict',
      severity: 'high',
      kind: 'equipment-conflict',
      message: `${equipmentConflicts} equipment double-booking(s) — reschedule the overlap.`,
      sourceSignal: 'resourcing',
      targetCard: 'act-resourcing',
    });
  }
  if (overCapacity > 0) {
    recs.push({
      id: 'over-capacity',
      severity: 'med',
      kind: 'over-capacity',
      message: `${overCapacity} crew week(s) over capacity — rebalance assignments.`,
      sourceSignal: 'resourcing',
      targetCard: 'act-resourcing',
    });
  }
  if (budgetDrift > 0) {
    recs.push({
      id: 'budget-drift',
      severity: 'med',
      kind: 'budget-drift',
      message: `${budgetDrift} work item(s) over budget variance — review in Budget vs actuals.`,
      sourceSignal: 'budget',
      targetCard: 'act-budget',
    });
  }
  if (overdue > 0) {
    recs.push({
      id: 'overdue',
      severity: 'med',
      kind: 'overdue',
      message: `${overdue} work item(s) past scheduled end — advance the schedule.`,
      sourceSignal: 'schedule',
      targetCard: 'act-plan-tracker',
    });
  }
  if (unproven > 0) {
    recs.push({
      id: 'unproven',
      severity: 'low',
      kind: 'unproven',
      message: `${unproven} completed work item(s) lack field proof — capture evidence.`,
      sourceSignal: 'proof',
      targetCard: 'field-proof',
    });
  }

  const countOf = (r: Recommendation): number => {
    switch (r.kind) {
      case 'blocked-critical':
        return criticalBlocked;
      case 'equipment-conflict':
        return equipmentConflicts;
      case 'over-capacity':
        return overCapacity;
      case 'budget-drift':
        return budgetDrift;
      case 'overdue':
        return overdue;
      case 'unproven':
        return unproven;
      case 'cycle':
        return 1;
      default: {
        const _exhaustive: never = r.kind;
        void _exhaustive;
        return 0;
      }
    }
  };

  recs.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    const c = countOf(b) - countOf(a);
    if (c !== 0) return c;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return {
    lights: {
      schedule,
      resourcing: resourcingLight,
      budget: budgetLight,
      proof: proofLight,
    },
    recommendations: recs,
    counts,
  };
}
