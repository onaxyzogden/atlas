/**
 * OperatingDashboardCard — D5 render-only composition surface.
 *
 * Composes the four D1–D4 engine results (graph / resourcing / budget /
 * field-proof) via the pure `computeOperatingHealth` engine into four
 * health lights plus a ranked, deterministic recommendation list. Strictly
 * render-only: no store writes, no spine-status mutation, no cross-card
 * navigation. Deep-link targets are shown as labelled, non-navigating hints.
 *
 * Covenant (D5, binding): operating analytics only — no riba / gharar /
 * financing / capital / investor / yield-as-return framing. The budget
 * signal is D3 drift surfaced verbatim, never re-framed.
 */
import { useMemo } from 'react';
import {
  analyzeWorkItemGraph,
  analyzeResourcing,
  analyzeBudget,
  analyzeFieldProof,
  computeOperatingHealth,
  type RecordedActual,
  type DomainEvent,
  type Light,
} from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useCrewMemberStore } from '../../store/crewMemberStore.js';
import { useWorkItemBudgetStore } from '../../store/workItemBudgetStore.js';
import { useProofEventStore } from '../../store/proofEventStore.js';
import { useMaintenanceLogStore } from '../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import { useNurseryStore } from '../../store/nurseryStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LIGHT_LABEL: Record<Light, string> = {
  ok: 'OK',
  warn: 'Warning',
  alert: 'Alert',
};

const TARGET_LABEL: Record<string, string> = {
  'act-plan-tracker': 'Plan tracker',
  'act-resourcing': 'Resourcing',
  'act-budget': 'Budget vs actuals',
  'field-proof': 'Field proof',
};

export default function OperatingDashboardCard({ project }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const members = useCrewMemberStore((s) => s.members);
  const actuals = useWorkItemBudgetStore((s) => s.actuals);
  const proofEvents = useProofEventStore((s) => s.events);
  const maintEvents = useMaintenanceLogStore((s) => s.events);
  const moveEvents = useLivestockMoveLogStore((s) => s.events);
  const nurseryTransfers = useNurseryStore((s) => s.transfers);

  const health = useMemo(() => {
    const projectItems = items.filter((it) => it.projectId === project.id);
    const crew = members.filter((m) => m.projectId === project.id);
    const projActuals = actuals.filter((a) => a.projectId === project.id);

    // Mirror BudgetCard's exact RecordedActual mapping.
    const actualsByItemId = new Map<string, RecordedActual>();
    for (const a of projActuals) {
      actualsByItemId.set(a.workItemId, {
        actual: a.actual,
        actualHrs: a.actualHrs,
      });
    }

    // Mirror FieldProofPanel's exact linkage + domain-event derivation so
    // proof counts match the D4 surface.
    const linkedEventsByItemId = new Map<string, string[]>();
    const push = (wid: string | undefined, eid: string) => {
      if (!wid) return;
      linkedEventsByItemId.set(wid, [
        ...(linkedEventsByItemId.get(wid) ?? []),
        eid,
      ]);
    };
    for (const e of proofEvents)
      if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of maintEvents)
      if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const e of moveEvents)
      if (e.projectId === project.id) push(e.workItemId, e.id);
    for (const t of nurseryTransfers)
      if (t.projectId === project.id) push(t.workItemId, t.id);

    const domainEvents: DomainEvent[] = [];
    for (const e of maintEvents)
      if (e.projectId === project.id)
        domainEvents.push({
          id: e.id,
          store: 'maintenance',
          projectId: e.projectId,
          date: e.date,
        });
    for (const e of moveEvents)
      if (e.projectId === project.id)
        domainEvents.push({
          id: e.id,
          store: 'livestock-move',
          projectId: e.projectId,
          date: e.date,
        });
    for (const t of nurseryTransfers)
      if (t.projectId === project.id)
        domainEvents.push({
          id: t.id,
          store: 'nursery',
          projectId: t.projectId,
          date: t.transferDate,
        });

    const graph = analyzeWorkItemGraph(projectItems);
    const resourcing = analyzeResourcing(projectItems, crew);
    const budget = analyzeBudget(projectItems, actualsByItemId);
    const proof = analyzeFieldProof(
      projectItems,
      linkedEventsByItemId,
      domainEvents,
      7,
    );

    return computeOperatingHealth({
      items: projectItems,
      graph,
      resourcing,
      budget,
      proof,
    });
  }, [
    items,
    members,
    actuals,
    proofEvents,
    maintEvents,
    moveEvents,
    nurseryTransfers,
    project.id,
  ]);

  const { lights, recommendations, counts } = health;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.heroTag}>Operating dashboard</span>
        <h2 className={styles.title}>Project health</h2>
        <p className={styles.lede}>
          Composed live from the four operating engines. Read-only — derived
          every render.
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Health</h3>
        <div className={styles.sectionBody}>
          <div className={styles.statRow}>
            Schedule: {LIGHT_LABEL[lights.schedule]} ({counts.blocked} blocked,{' '}
            {counts.overdue} overdue)
          </div>
          <div className={styles.statRow}>
            Resourcing: {LIGHT_LABEL[lights.resourcing]} (
            {counts.equipmentConflicts} equipment, {counts.overCapacity} crew)
          </div>
          <div className={styles.statRow}>
            Budget: {LIGHT_LABEL[lights.budget]} ({counts.budgetDrift} over
            variance)
          </div>
          <div className={styles.statRow}>
            Proof: {LIGHT_LABEL[lights.proof]} ({counts.unproven} of{' '}
            {counts.doneTotal} done unproven)
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recommended next actions</h3>
        <div className={styles.sectionBody}>
          {recommendations.length === 0 ? (
            <p className={styles.empty}>On track — no action needed.</p>
          ) : (
            <ul className={styles.list}>
              {recommendations.map((r) => (
                <li key={r.id} className={styles.listRow}>
                  <span>
                    [{r.severity.toUpperCase()}] {r.message}
                  </span>
                  <span className={styles.pillUnmet}>
                    → {TARGET_LABEL[r.targetCard] ?? r.targetCard}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
