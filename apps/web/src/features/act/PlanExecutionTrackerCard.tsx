/**
 * PlanExecutionTrackerCard — ACT-stage Plan-Execution Tracker.
 *
 * Closes spec §5.2 (implement/task dashboard). The MVP-delta shipped a
 * navigable *plan doc*; this is the interactive execution ledger over
 * the same `phaseStore` build plan: every phase (including the synthetic
 * regeneration `order 1` and maintenance `order 99` phases woven by the
 * auto-design orchestrator) rendered as a checkable task list with real
 * progress %, overdue detection vs `scheduledStart`, design-layer
 * grouping, and maintenance-cadence display.
 *
 * Read-and-complete only: task add/edit/delete stays in Plan Module 7.
 * Marking a task done writes `PhaseTask.done`/`doneAt` via
 * `usePhaseStore.toggleTaskDone` — it does NOT freeze the row against
 * Goal-Compass regeneration (no `status: 'overridden'`).
 *
 * Derive discipline mirrors `PhasingScaleMatrixCard`: subscribe to
 * `state.phases` raw, filter+sort in `useMemo` (never call
 * `getProjectPhases` inside a selector — see
 * wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  usePhaseStore,
  type BuildPhase,
  type DesignLayer,
  type PhaseTask,
} from '../../store/phaseStore.js';
import { toast } from '../../components/Toast.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type GroupMode = 'phase' | 'layer';

const DESIGN_LAYER_LABEL: Record<DesignLayer | 'uncategorised', string> = {
  earthworks: 'Earthworks',
  water: 'Water',
  structures: 'Structures & energy',
  vegetation: 'Vegetation',
  uncategorised: 'Uncategorised',
};

const LAYER_ORDER: Array<DesignLayer | 'uncategorised'> = [
  'earthworks',
  'water',
  'structures',
  'vegetation',
  'uncategorised',
];

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function classifyLayer(t: PhaseTask): DesignLayer | 'uncategorised' {
  return t.designLayer ?? 'uncategorised';
}

/** A task plus the phase it belongs to (needed when grouping by layer). */
interface TaskRow {
  task: PhaseTask;
  phase: BuildPhase;
}

function isOverdue(t: PhaseTask, today: string): boolean {
  return !t.done && !!t.scheduledStart && t.scheduledStart < today;
}

interface Progress {
  done: number;
  total: number;
  pct: number;
}

function progressOf(tasks: PhaseTask[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      aria-hidden
      style={{
        height: 5,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'var(--color-confidence-high, #2d7a4f)',
          transition: 'width 160ms ease',
        }}
      />
    </div>
  );
}

export default function PlanExecutionTrackerCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const toggleTaskDone = usePhaseStore((s) => s.toggleTaskDone);

  const [group, setGroup] = useState<GroupMode>('phase');

  const phases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === project.id)
        .slice()
        .sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const today = todayISO();

  const allRows = useMemo<TaskRow[]>(
    () =>
      phases.flatMap((phase) =>
        (phase.tasks ?? []).map((task) => ({ task, phase })),
      ),
    [phases],
  );

  const summary = useMemo(() => {
    const tasks = allRows.map((r) => r.task);
    const prog = progressOf(tasks);
    let openLaborHrs = 0;
    let openCostUSD = 0;
    let overdue = 0;
    for (const t of tasks) {
      if (!t.done) {
        openLaborHrs += t.laborHrs;
        openCostUSD += t.costUSD;
      }
      if (isOverdue(t, today)) overdue += 1;
    }
    return { ...prog, openLaborHrs, openCostUSD, overdue };
  }, [allRows, today]);

  const layerGroups = useMemo(() => {
    const m = new Map<DesignLayer | 'uncategorised', TaskRow[]>();
    for (const row of allRows) {
      const k = classifyLayer(row.task);
      const list = m.get(k) ?? [];
      list.push(row);
      m.set(k, list);
    }
    return LAYER_ORDER.filter((k) => (m.get(k)?.length ?? 0) > 0).map((k) => ({
      key: k,
      label: DESIGN_LAYER_LABEL[k],
      rows: m.get(k) ?? [],
    }));
  }, [allRows]);

  function onToggle(row: TaskRow) {
    const willBeDone = !row.task.done;
    toggleTaskDone(row.phase.id, row.task.id);
    if (willBeDone) toast.success(`Marked done: ${row.task.title}`);
    else toast.info(`Reopened: ${row.task.title}`);
  }

  function TaskItem({ row, showPhase }: { row: TaskRow; showPhase: boolean }) {
    const { task: t } = row;
    const overdue = isOverdue(t, today);
    const when =
      t.scheduledStart && t.scheduledEnd
        ? `${t.scheduledStart} → ${t.scheduledEnd}`
        : t.scheduledStart
          ? `from ${t.scheduledStart}`
          : t.season;
    return (
      <li
        className={styles.listRow}
        style={
          overdue
            ? { borderLeft: '3px solid rgba(220,90,90,0.7)', paddingLeft: 10 }
            : undefined
        }
      >
        <span>
          <strong
            style={
              t.done
                ? { textDecoration: 'line-through', opacity: 0.6 }
                : undefined
            }
          >
            {t.title}
          </strong>
          <div className={styles.listMeta}>
            {showPhase ? `${row.phase.name} · ` : ''}
            {when} · {t.laborHrs} h · {fmtUSD(t.costUSD)}
            {t.designLayer ? ` · ${DESIGN_LAYER_LABEL[t.designLayer]}` : ''}
            {t.isMaintenanceTask && t.recurrenceFrequency
              ? ` · recurring ${t.recurrenceFrequency}`
              : ''}
            {overdue ? ' · OVERDUE' : ''}
            {t.done && t.doneAt
              ? ` · done ${new Date(t.doneAt).toLocaleDateString()}`
              : ''}
          </div>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => onToggle(row)}
          >
            {t.done ? 'Reopen' : 'Mark done'}
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Plan Execution Tracker</span>
        <h1 className={styles.title}>Plan execution tracker</h1>
        <p className={styles.lede}>
          The phased build plan as a working ledger. Check tasks off as
          they&rsquo;re built — progress, remaining labour and cost, and
          overdue work update live. Regeneration and ongoing-maintenance
          phases are included.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        <div className={styles.statRow}>
          <span>Progress</span>
          <span>
            {summary.done} / {summary.total} tasks ({summary.pct}%)
          </span>
        </div>
        <ProgressBar pct={summary.pct} />
        <div className={styles.statRow} style={{ marginTop: 10 }}>
          <span>Remaining labour</span>
          <span>{summary.openLaborHrs} h</span>
        </div>
        <div className={styles.statRow}>
          <span>Remaining cost</span>
          <span>{fmtUSD(summary.openCostUSD)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Overdue</span>
          <span>
            {summary.overdue === 0 ? 'none' : `${summary.overdue} task${summary.overdue === 1 ? '' : 's'}`}
          </span>
        </div>
      </section>

      {phases.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No build plan yet — generate one from Plan &rarr; Goal Compass.
          </p>
        </section>
      ) : (
        <section className={styles.section}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Tasks
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={group === 'phase' ? styles.tagActive : styles.tag}
                onClick={() => setGroup('phase')}
              >
                By phase
              </button>
              <button
                type="button"
                className={group === 'layer' ? styles.tagActive : styles.tag}
                onClick={() => setGroup('layer')}
              >
                By design layer
              </button>
            </div>
          </div>

          {group === 'phase'
            ? phases.map((phase) => {
                const tasks = phase.tasks ?? [];
                const prog = progressOf(tasks);
                return (
                  <div key={phase.id} style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <strong>
                        {phase.name}
                        {phase.completed ? (
                          <span className={styles.pillMet} style={{ marginLeft: 8 }}>
                            phase complete
                          </span>
                        ) : null}
                      </strong>
                      <span className={styles.listMeta}>
                        {phase.timeframe} · {prog.done}/{prog.total} ({prog.pct}%)
                      </span>
                    </div>
                    <ProgressBar pct={prog.pct} />
                    {tasks.length === 0 ? (
                      <p className={styles.empty} style={{ marginTop: 8 }}>
                        No tasks in this phase.
                      </p>
                    ) : (
                      <ul className={styles.list} style={{ marginTop: 8 }}>
                        {tasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            row={{ task, phase }}
                            showPhase={false}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            : layerGroups.map(({ key, label, rows }) => {
                const prog = progressOf(rows.map((r) => r.task));
                return (
                  <div key={key} style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <strong>{label}</strong>
                      <span className={styles.listMeta}>
                        {prog.done}/{prog.total} ({prog.pct}%)
                      </span>
                    </div>
                    <ProgressBar pct={prog.pct} />
                    <ul className={styles.list} style={{ marginTop: 8 }}>
                      {rows.map((row) => (
                        <TaskItem
                          key={`${row.phase.id}:${row.task.id}`}
                          row={row}
                          showPhase
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
        </section>
      )}
    </div>
  );
}
