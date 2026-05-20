/**
 * PlanExecutionTrackerCard — ACT-stage Plan-Execution Tracker.
 *
 * D0 proof-of-spine surface. Closes spec §5.2 (implement/task dashboard).
 * Reads the canonical `workItemStore`: every planned WorkItem for the
 * project — Goal-Compass phase tasks AND the four other planned sources
 * (field tasks, maintenance, scheduled livestock moves, nursery batches) —
 * rendered as one checkable execution ledger with progress %, overdue
 * detection vs `scheduledStart`, design-layer grouping, and recurrence
 * display. phaseStore is read ONLY to resolve phase headers (name /
 * timeframe / order / completed); unphased planned work (phaseId == null)
 * collects under a synthetic "Operations (unphased)" group so all five
 * sources surface in one place.
 *
 * Read-and-complete only: task add/edit/delete stays in Plan Module 7.
 * Marking done flips `WorkItem.status` via `workItemStore.toggleDone` — it
 * does NOT set `overridden`, so the Goal-Compass engine may still
 * regenerate the row (mirrors the legacy `toggleTaskDone` contract).
 *
 * Derive discipline: subscribe to `state.items` / `state.phases` raw,
 * filter+group in `useMemo` (never call a freshly-allocating selector
 * inside a Zustand selector — see
 * wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import { useMemo, useState } from 'react';
import type { WorkItem, MaterialLine } from '@ogden/shared';
import {
  analyzeWorkItemGraph,
  detectCycle,
  type WorkItemGraphNode,
} from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore, type DesignLayer } from '../../store/phaseStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useWorkItemDraftStore } from '../../store/workItemDraftStore.js';
import { toast } from '../../components/Toast.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';
import FieldProofPanel from './FieldProofPanel.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type GroupMode = 'phase' | 'layer' | 'timeline';

const UNPHASED_ID = '__unphased__';

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

function classifyLayer(w: WorkItem): DesignLayer | 'uncategorised' {
  return (w.designLayer as DesignLayer | undefined) ?? 'uncategorised';
}

function isDone(w: WorkItem): boolean {
  return w.status === 'done';
}

/** A WorkItem plus the group (phase or synthetic) it renders under. */
interface TaskRow {
  item: WorkItem;
  groupId: string;
  groupName: string;
}

function isOverdue(w: WorkItem, today: string): boolean {
  return !isDone(w) && !!w.scheduledStart && w.scheduledStart < today;
}

interface Progress {
  done: number;
  total: number;
  pct: number;
}

function progressOf(items: WorkItem[]): Progress {
  const total = items.length;
  const done = items.filter(isDone).length;
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

interface GroupView {
  id: string;
  name: string;
  /** Phase timeframe label, or null for the synthetic unphased group. */
  timeframe: string | null;
  completed: boolean;
  order: number;
  items: WorkItem[];
}

export default function PlanExecutionTrackerCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allItems = useWorkItemStore((s) => s.items);
  const toggleDone = useWorkItemStore((s) => s.toggleDone);
  const addDependency = useWorkItemStore((s) => s.addDependency);
  const removeDependency = useWorkItemStore((s) => s.removeDependency);
  const addItem = useWorkItemStore((s) => s.addItem);

  const draft = useWorkItemDraftStore((s) => s.draft);
  const clearDraft = useWorkItemDraftStore((s) => s.clearDraft);

  const [group, setGroup] = useState<GroupMode>('phase');
  const [openDepEditor, setOpenDepEditor] = useState<string | null>(null);
  const [openResourcingEditor, setOpenResourcingEditor] = useState<
    string | null
  >(null);
  const [depPick, setDepPick] = useState<Record<string, string>>({});
  const [depError, setDepError] = useState<Record<string, string>>({});

  const today = todayISO();

  function createFromDraft() {
    if (!draft) return;
    const now = new Date().toISOString();
    addItem({
      id: crypto.randomUUID(),
      projectId: project.id,
      source: 'goal-compass',
      overridden: false,
      createdAt: now,
      updatedAt: now,
      title: draft.title,
      phaseId: null,
      status: 'todo',
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
    });
    clearDraft();
  }

  const projectItems = useMemo(
    () => allItems.filter((w) => w.projectId === project.id),
    [allItems, project.id],
  );

  // D1 — the dependency / critical-path engine over this project's spine
  // rows. Pure; recomputed only when the project's items change. Blocked /
  // critical / slack are derived here and never written back to status.
  const graph = useMemo(
    () => analyzeWorkItemGraph(projectItems),
    [projectItems],
  );

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of projectItems) m.set(w.id, w.title);
    return m;
  }, [projectItems]);

  function tryAddDependency(item: WorkItem, depId: string) {
    if (!depId) return;
    if (detectCycle(projectItems, item.id, depId)) {
      setDepError((e) => ({
        ...e,
        [item.id]:
          depId === item.id
            ? 'A task cannot depend on itself.'
            : `Adding this would create a dependency cycle (${
                titleById.get(depId) ?? depId
              }).`,
      }));
      return;
    }
    addDependency(item.id, depId);
    setDepError((e) => ({ ...e, [item.id]: '' }));
    setDepPick((p) => ({ ...p, [item.id]: '' }));
  }

  // Phase headers come from phaseStore; the WorkItem rows that hang under
  // each are sourced from the spine by `phaseId`. Anything with no phase
  // (the four non-Goal-Compass planned sources) collects under one
  // synthetic group so the tracker is the unified five-source ledger.
  const groups = useMemo<GroupView[]>(() => {
    const phases = allPhases
      .filter((p) => p.projectId === project.id)
      .slice()
      .sort((a, b) => a.order - b.order);

    const byPhase = new Map<string, WorkItem[]>();
    const unphased: WorkItem[] = [];
    for (const w of projectItems) {
      if (w.phaseId == null) {
        unphased.push(w);
        continue;
      }
      const list = byPhase.get(w.phaseId);
      if (list) list.push(w);
      else byPhase.set(w.phaseId, [w]);
    }

    const out: GroupView[] = phases.map((p) => ({
      id: p.id,
      name: p.name,
      timeframe: p.timeframe,
      completed: p.completed,
      order: p.order,
      items: byPhase.get(p.id) ?? [],
    }));

    if (unphased.length > 0) {
      out.push({
        id: UNPHASED_ID,
        name: 'Operations (unphased)',
        timeframe: null,
        completed: false,
        order: Number.MAX_SAFE_INTEGER,
        items: unphased,
      });
    }
    return out;
  }, [allPhases, projectItems, project.id]);

  const hasPlan = groups.length > 0;

  const allRows = useMemo<TaskRow[]>(
    () =>
      groups.flatMap((g) =>
        g.items.map((item) => ({
          item,
          groupId: g.id,
          groupName: g.name,
        })),
      ),
    [groups],
  );

  const summary = useMemo(() => {
    const items = allRows.map((r) => r.item);
    const prog = progressOf(items);
    let openLaborHrs = 0;
    let openCostUSD = 0;
    let overdue = 0;
    for (const w of items) {
      if (!isDone(w)) {
        openLaborHrs += w.laborHrs ?? 0;
        openCostUSD += w.costUSD ?? 0;
      }
      if (isOverdue(w, today)) overdue += 1;
    }
    return { ...prog, openLaborHrs, openCostUSD, overdue };
  }, [allRows, today]);

  const layerGroups = useMemo(() => {
    const m = new Map<DesignLayer | 'uncategorised', TaskRow[]>();
    for (const row of allRows) {
      const k = classifyLayer(row.item);
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
    const willBeDone = !isDone(row.item);
    toggleDone(row.item.id);
    if (willBeDone) toast.success(`Marked done: ${row.item.title}`);
    else toast.info(`Reopened: ${row.item.title}`);
  }

  function DepBadges({ node }: { node: WorkItemGraphNode | undefined }) {
    if (!node) return null;
    return (
      <>
        {node.critical ? (
          <span
            className={styles.pillMet}
            style={{ marginLeft: 8 }}
            title="On the critical path — zero slack; any delay slips the plan."
          >
            Critical
          </span>
        ) : null}
        {node.blocked ? (
          <span
            className={styles.pillMet}
            style={{
              marginLeft: 8,
              background: 'rgba(220,90,90,0.18)',
              color: 'rgb(230,140,140)',
            }}
            title={`Blocked by: ${node.blockedBy
              .map((id) => titleById.get(id) ?? id)
              .join(', ')}`}
          >
            Blocked
          </span>
        ) : null}
        {!node.critical && node.slack > 0 ? (
          <span className={styles.listMeta} style={{ marginLeft: 8 }}>
            slack {Math.round(node.slack)}d
          </span>
        ) : null}
      </>
    );
  }

  function DependencyEditor({ w }: { w: WorkItem }) {
    const manual = w.dependsOn ?? [];
    const auto = w.dependsOnAuto ?? [];
    const taken = new Set([...manual, ...auto, w.id]);
    const options = projectItems.filter((o) => !taken.has(o.id));
    const err = depError[w.id];
    return (
      <div
        style={{
          margin: '6px 0 2px',
          padding: '8px 10px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          fontSize: 12,
        }}
      >
        <div className={styles.listMeta} style={{ marginBottom: 4 }}>
          Depends on
        </div>
        {manual.length === 0 && auto.length === 0 ? (
          <div className={styles.listMeta}>No dependencies.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {manual.map((d) => (
              <li
                key={`m:${d}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2px 0',
                }}
              >
                <span>{titleById.get(d) ?? d}</span>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => removeDependency(w.id, d)}
                >
                  Remove
                </button>
              </li>
            ))}
            {auto.map((d) => (
              <li
                key={`a:${d}`}
                className={styles.listMeta}
                style={{ padding: '2px 0' }}
              >
                {titleById.get(d) ?? d} · auto (Goal Compass)
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select
            value={depPick[w.id] ?? ''}
            onChange={(e) =>
              setDepPick((p) => ({ ...p, [w.id]: e.target.value }))
            }
            style={{ flex: 1, fontSize: 12 }}
          >
            <option value="">Add a dependency…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.btn}
            disabled={!depPick[w.id]}
            onClick={() => tryAddDependency(w, depPick[w.id] ?? '')}
          >
            Add
          </button>
        </div>
        {err ? (
          <div
            style={{ marginTop: 5, color: 'rgb(230,140,140)', fontSize: 12 }}
          >
            {err}
          </div>
        ) : null}
      </div>
    );
  }

  function ResourcingEditor({ w }: { w: WorkItem }) {
    const [equipment, setEquipment] = useState<string[]>(
      () => w.equipmentRequired ?? [],
    );
    const [materials, setMaterials] = useState<
      { line: MaterialLine; _rk: string }[]
    >(() =>
      (w.materials ?? []).map((line) => ({
        line,
        _rk: crypto.randomUUID(),
      })),
    );
    const [equipDraft, setEquipDraft] = useState('');

    function addEquipment() {
      const v = equipDraft.trim();
      if (!v) return;
      setEquipment((cur) => (cur.includes(v) ? cur : [...cur, v]));
      setEquipDraft('');
    }

    function removeEquipment(v: string) {
      setEquipment((cur) => cur.filter((e) => e !== v));
    }

    function addMaterialRow() {
      setMaterials((cur) => [
        ...cur,
        { line: { label: '', unit: '' }, _rk: crypto.randomUUID() },
      ]);
    }

    function patchMaterial(rk: string, patch: Partial<MaterialLine>) {
      setMaterials((cur) =>
        cur.map((m) =>
          m._rk === rk ? { ...m, line: { ...m.line, ...patch } } : m,
        ),
      );
    }

    function removeMaterial(rk: string) {
      setMaterials((cur) => cur.filter((m) => m._rk !== rk));
    }

    function save() {
      const cleaned = materials
        .map((m) => m.line)
        .filter((m) => m.label.trim() !== '');
      useWorkItemStore.getState().updateItem(w.id, {
        overridden: true,
        equipmentRequired: equipment,
        materials: cleaned,
      });
      setOpenResourcingEditor(null);
    }

    return (
      <div
        role="group"
        aria-label="Resourcing"
        style={{
          margin: '6px 0 2px',
          padding: '8px 10px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          fontSize: 12,
        }}
      >
        <div className={styles.listMeta} style={{ marginBottom: 4 }}>
          Equipment required
        </div>
        {equipment.length === 0 ? (
          <div className={styles.listMeta}>None.</div>
        ) : (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}
          >
            {equipment.map((e) => (
              <span
                key={e}
                className={styles.listMeta}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                {e}
                <button
                  type="button"
                  className={styles.btn}
                  aria-label={`Remove ${e}`}
                  onClick={() => removeEquipment(e)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            type="text"
            placeholder="Add equipment…"
            value={equipDraft}
            onChange={(e) => setEquipDraft(e.target.value)}
            className={styles.field}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={!equipDraft.trim()}
            onClick={addEquipment}
          >
            Add
          </button>
        </div>

        <div
          className={styles.listMeta}
          style={{ marginBottom: 4, marginTop: 10 }}
        >
          Materials
        </div>
        {materials.length === 0 ? (
          <div className={styles.listMeta}>None.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {materials.map(({ line: m, _rk }, i) => (
              <li
                key={_rk}
                className={styles.listRow}
                style={{ gap: 6, padding: '3px 0' }}
              >
                <input
                  type="text"
                  placeholder="Label"
                  value={m.label}
                  onChange={(e) =>
                    patchMaterial(_rk, { label: e.target.value })
                  }
                  className={styles.field}
                  style={{ flex: 2, fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={m.unit}
                  onChange={(e) => patchMaterial(_rk, { unit: e.target.value })}
                  className={styles.field}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <input
                  type="number"
                  placeholder="Qty per acre"
                  value={m.quantityPerAcre ?? ''}
                  onChange={(e) =>
                    patchMaterial(_rk, {
                      quantityPerAcre:
                        e.target.value.trim() === ''
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                  className={styles.field}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={m.notes ?? ''}
                  onChange={(e) =>
                    patchMaterial(_rk, {
                      notes:
                        e.target.value === '' ? undefined : e.target.value,
                    })
                  }
                  className={styles.field}
                  style={{ flex: 2, fontSize: 12 }}
                />
                <button
                  type="button"
                  className={styles.btn}
                  aria-label={`Remove material ${i + 1}`}
                  onClick={() => removeMaterial(_rk)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            className={styles.btn}
            onClick={addMaterialRow}
          >
            Add material
          </button>
        </div>

        <div className={styles.btnRow} style={{ marginTop: 10, gap: 6 }}>
          <button type="button" className={styles.btn} onClick={save}>
            Save
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => setOpenResourcingEditor(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function TaskItem({ row, showPhase }: { row: TaskRow; showPhase: boolean }) {
    const w = row.item;
    const done = isDone(w);
    const overdue = isOverdue(w, today);
    const node = graph.byId.get(w.id);
    const editing = openDepEditor === w.id;
    const editingResourcing = openResourcingEditor === w.id;
    const resourcingCount =
      (w.equipmentRequired?.length ?? 0) + (w.materials?.length ?? 0);
    const when =
      w.scheduledStart && w.scheduledEnd
        ? `${w.scheduledStart} → ${w.scheduledEnd}`
        : w.scheduledStart
          ? `from ${w.scheduledStart}`
          : w.season ?? '';
    return (
      <li
        className={styles.listRow}
        style={{
          flexDirection: 'column',
          alignItems: 'stretch',
          ...(overdue
            ? { borderLeft: '3px solid rgba(220,90,90,0.7)', paddingLeft: 10 }
            : {}),
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span>
            <strong
              style={
                done
                  ? { textDecoration: 'line-through', opacity: 0.6 }
                  : undefined
              }
            >
              {w.title}
            </strong>
            <DepBadges node={node} />
            <div className={styles.listMeta}>
              {showPhase ? `${row.groupName} · ` : ''}
              {when} · {w.laborHrs ?? 0} h · {fmtUSD(w.costUSD ?? 0)}
              {w.designLayer
                ? ` · ${DESIGN_LAYER_LABEL[w.designLayer as DesignLayer]}`
                : ''}
              {w.isRecurring && w.recurrenceFrequency
                ? ` · recurring ${w.recurrenceFrequency}`
                : ''}
              {overdue ? ' · OVERDUE' : ''}
              {done && w.doneAt
                ? ` · done ${new Date(w.doneAt).toLocaleDateString()}`
                : ''}
            </div>
          </span>
          <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              className={styles.btn}
              aria-expanded={editing}
              onClick={() =>
                setOpenDepEditor((cur) => (cur === w.id ? null : w.id))
              }
            >
              Deps
              {(w.dependsOn?.length ?? 0) + (w.dependsOnAuto?.length ?? 0) > 0
                ? ` (${(w.dependsOn?.length ?? 0) + (w.dependsOnAuto?.length ?? 0)})`
                : ''}
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-expanded={editingResourcing}
              onClick={() =>
                setOpenResourcingEditor((cur) =>
                  cur === w.id ? null : w.id,
                )
              }
            >
              Resourcing
              {resourcingCount > 0 ? ` (${resourcingCount})` : ''}
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => onToggle(row)}
            >
              {done ? 'Reopen' : 'Mark done'}
            </button>
          </span>
        </div>
        {editing ? <DependencyEditor w={w} /> : null}
        {editingResourcing ? <ResourcingEditor w={w} /> : null}
      </li>
    );
  }

  function Timeline() {
    const ordered =
      graph.order.length > 0
        ? graph.order
            .map((id) => projectItems.find((w) => w.id === id))
            .filter((w): w is WorkItem => !!w)
        : [...projectItems].sort(
            (a, b) =>
              (graph.byId.get(a.id)?.earliestStart ?? 0) -
                (graph.byId.get(b.id)?.earliestStart ?? 0) ||
              a.title.localeCompare(b.title),
          );

    const projectDuration = Math.max(
      1,
      ...ordered.map((w) => graph.byId.get(w.id)?.earliestFinish ?? 0),
    );

    const LABEL_W = 200;
    const TRACK_W = 720;
    const ROW_H = 28;
    const BAR_H = 14;
    const pxPerDay = TRACK_W / projectDuration;
    const idx = new Map(ordered.map((w, i) => [w.id, i]));
    const x = (d: number) => LABEL_W + d * pxPerDay;
    const yMid = (i: number) => i * ROW_H + ROW_H / 2;

    return (
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        {graph.cyclic ? (
          <p
            className={styles.empty}
            style={{ color: 'rgb(230,140,140)', marginBottom: 10 }}
          >
            Dependency cycle detected — timeline scheduling is unavailable
            until the cycle is resolved in the per-task dependency editor.
          </p>
        ) : null}
        <div
          style={{
            position: 'relative',
            width: LABEL_W + TRACK_W,
            height: ordered.length * ROW_H + 8,
          }}
        >
          <svg
            width={LABEL_W + TRACK_W}
            height={ordered.length * ROW_H + 8}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {ordered.flatMap((w) => {
              const to = idx.get(w.id)!;
              const node = graph.byId.get(w.id);
              const startX = x(node?.earliestStart ?? 0);
              const deps = [
                ...(w.dependsOn ?? []),
                ...(w.dependsOnAuto ?? []),
              ];
              return deps
                .filter((d) => idx.has(d))
                .map((d) => {
                  const from = idx.get(d)!;
                  const fx = x(graph.byId.get(d)?.earliestFinish ?? 0);
                  return (
                    <line
                      key={`${d}->${w.id}`}
                      x1={fx}
                      y1={yMid(from)}
                      x2={startX}
                      y2={yMid(to)}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={1}
                    />
                  );
                });
            })}
          </svg>
          {ordered.map((w, i) => {
            const node = graph.byId.get(w.id);
            const es = node?.earliestStart ?? 0;
            const dur = node?.duration ?? 0;
            const done = isDone(w);
            const critical = node?.critical;
            const color = done
              ? 'rgba(120,160,135,0.55)'
              : critical
                ? 'var(--color-confidence-high, #2d7a4f)'
                : 'rgba(140,170,210,0.7)';
            return (
              <div
                key={w.id}
                style={{
                  position: 'absolute',
                  top: i * ROW_H,
                  left: 0,
                  height: ROW_H,
                  width: LABEL_W + TRACK_W,
                }}
              >
                <div
                  className={styles.listMeta}
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: LABEL_W - 8,
                    top: (ROW_H - 14) / 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                    color: critical ? 'rgb(150,210,170)' : undefined,
                  }}
                  title={w.title}
                >
                  {w.title}
                </div>
                {dur === 0 ? (
                  <div
                    title={`${w.title} · milestone (day ${Math.round(es)})`}
                    style={{
                      position: 'absolute',
                      left: x(es) - 6,
                      top: (ROW_H - 12) / 2,
                      width: 12,
                      height: 12,
                      background: color,
                      transform: 'rotate(45deg)',
                    }}
                  />
                ) : (
                  <div
                    title={`${w.title} · day ${Math.round(es)}–${Math.round(
                      es + dur,
                    )}${critical ? ' · critical' : ''}`}
                    style={{
                      position: 'absolute',
                      left: x(es),
                      top: (ROW_H - BAR_H) / 2,
                      width: Math.max(6, dur * pxPerDay),
                      height: BAR_H,
                      background: color,
                      borderRadius: 3,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          className={styles.listMeta}
          style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: 'var(--color-confidence-high, #2d7a4f)',
                marginRight: 5,
                verticalAlign: 'middle',
              }}
            />
            Critical path
          </span>
          <span>◆ Milestone (zero-duration)</span>
          <span>Bars span earliest start → finish (days from plan start)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {draft ? (
        <div
          data-testid="adherence-draft-banner"
          style={{
            padding: 8,
            border: '1px solid rgba(232,220,200,0.18)',
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <p style={{ margin: 0 }}>{draft.title}</p>
          {draft.notes ? (
            <p style={{ margin: 0, opacity: 0.7 }}>{draft.notes}</p>
          ) : null}
          <button type="button" onClick={createFromDraft}>
            Create work item
          </button>
          <button type="button" onClick={clearDraft}>
            Dismiss
          </button>
        </div>
      ) : null}
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

      <FieldProofPanel project={project} />

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

      {!hasPlan ? (
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
              <button
                type="button"
                className={group === 'timeline' ? styles.tagActive : styles.tag}
                onClick={() => setGroup('timeline')}
              >
                Timeline
              </button>
            </div>
          </div>

          {group === 'timeline' ? (
            <Timeline />
          ) : group === 'phase' ? (
            groups.map((g) => {
                const prog = progressOf(g.items);
                return (
                  <div key={g.id} style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <strong>
                        {g.name}
                        {g.completed ? (
                          <span className={styles.pillMet} style={{ marginLeft: 8 }}>
                            phase complete
                          </span>
                        ) : null}
                      </strong>
                      <span className={styles.listMeta}>
                        {g.timeframe ? `${g.timeframe} · ` : ''}
                        {prog.done}/{prog.total} ({prog.pct}%)
                      </span>
                    </div>
                    <ProgressBar pct={prog.pct} />
                    {g.items.length === 0 ? (
                      <p className={styles.empty} style={{ marginTop: 8 }}>
                        No tasks in this phase.
                      </p>
                    ) : (
                      <ul className={styles.list} style={{ marginTop: 8 }}>
                        {g.items.map((item) => (
                          <TaskItem
                            key={item.id}
                            row={{ item, groupId: g.id, groupName: g.name }}
                            showPhase={false}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            ) : (
              layerGroups.map(({ key, label, rows }) => {
                const prog = progressOf(rows.map((r) => r.item));
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
                          key={`${row.groupId}:${row.item.id}`}
                          row={row}
                          showPhase
                        />
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
        </section>
      )}
    </div>
  );
}
