/**
 * ResourcingCard — ACT-stage operational resourcing surface (Sub-project
 * D2). Dedicated card (NOT an extension of PlanExecutionTrackerCard).
 *
 * Reads the canonical `workItemStore` + the net-new `crewMemberStore` for
 * this project and renders three derived, render-only blocks:
 *   1. Assignee workload — per crew member, assigned items + this/next
 *      ISO-week hours vs soft `weeklyHoursCap` (over-cap badge);
 *   2. Equipment booking — per equipment id, the items claiming it, with a
 *      double-booking badge when scheduled spans overlap;
 *   3. BOM rollup — effective `materials ∪ materialsAuto` aggregated by
 *      label+unit (auto vs manual marked read-only).
 * Plus crew CRUD (people are steward-authored; Goal Compass never assigns).
 *
 * Strictly operational: hours/quantities only, NO cost column,
 * `BudgetActualsCard` untouched (cost is D3). Conflicts are derived at
 * render only — never written to `WorkItem.status` (single-writer spine).
 *
 * Derive discipline: subscribe to store arrays raw, filter+analyse in
 * `useMemo` (never a freshly-allocating selector inside a Zustand
 * selector — wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import { useMemo, useState } from 'react';
import {
  analyzeResourcing,
  rollUpBom,
  type CrewSkillLevel,
} from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  useCrewMemberStore,
  newCrewMemberId,
} from '../../store/crewMemberStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SKILL_LEVELS: CrewSkillLevel[] = [
  'lead',
  'skilled',
  'general',
  'apprentice',
];

const now = () => new Date().toISOString();

export default function ResourcingCard({ project }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const members = useCrewMemberStore((s) => s.members);
  const addMember = useCrewMemberStore((s) => s.addMember);
  const deleteMember = useCrewMemberStore((s) => s.deleteMember);

  const [name, setName] = useState('');
  const [skillLevel, setSkillLevel] = useState<CrewSkillLevel>('general');
  const [weeklyHoursCap, setWeeklyHoursCap] = useState('40');

  const projectItems = useMemo(
    () => items.filter((it) => it.projectId === project.id),
    [items, project.id],
  );
  const crew = useMemo(
    () => members.filter((m) => m.projectId === project.id),
    [members, project.id],
  );

  const result = useMemo(
    () => analyzeResourcing(projectItems, crew),
    [projectItems, crew],
  );

  const itemsByAssignee = useMemo(() => {
    const map = new Map<string, typeof projectItems>();
    for (const it of projectItems) {
      if (!it.assigneeId) continue;
      const b = map.get(it.assigneeId);
      if (b) b.push(it);
      else map.set(it.assigneeId, [it]);
    }
    return map;
  }, [projectItems]);

  const equipmentBookings = useMemo(() => {
    const map = new Map<string, { id: string; title: string }[]>();
    for (const it of projectItems) {
      for (const eq of [
        ...(it.equipmentRequired ?? []),
        ...(it.equipmentRequiredAuto ?? []),
      ]) {
        const b = map.get(eq);
        const row = { id: it.id, title: it.title };
        if (b) {
          if (!b.some((r) => r.id === it.id)) b.push(row);
        } else {
          map.set(eq, [row]);
        }
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [projectItems]);

  const conflictedEquip = useMemo(
    () => new Set(result.equipment.map((c) => c.equipmentId)),
    [result.equipment],
  );

  const bom = useMemo(() => rollUpBom(projectItems), [projectItems]);

  const canAdd = name.trim() !== '' && Number(weeklyHoursCap) >= 0;

  function handleAdd() {
    if (!canAdd) return;
    addMember({
      id: newCrewMemberId(),
      projectId: project.id,
      name: name.trim(),
      skillLevel,
      weeklyHoursCap: Number(weeklyHoursCap),
      createdAt: now(),
      updatedAt: now(),
    });
    setName('');
    setSkillLevel('general');
    setWeeklyHoursCap('40');
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Resourcing</span>
        <h1 className={styles.title}>Resourcing</h1>
        <p className={styles.lede}>
          Operational labour, equipment and materials for this project's
          planned work. Hours and quantities only — budget lives in Budget vs
          actuals.
        </p>
      </header>

      {/* ---- Crew roster + CRUD ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Crew</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="crew-name">Name</label>
            <input
              id="crew-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aisha"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="crew-skill">Skill level</label>
            <select
              id="crew-skill"
              value={skillLevel}
              onChange={(e) =>
                setSkillLevel(e.target.value as CrewSkillLevel)
              }
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="crew-cap">Weekly hours cap (soft)</label>
            <input
              id="crew-cap"
              type="number"
              min={0}
              value={weeklyHoursCap}
              onChange={(e) => setWeeklyHoursCap(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btn}
            disabled={!canAdd}
            onClick={handleAdd}
          >
            Add crew member
          </button>
        </div>

        {crew.length === 0 ? (
          <p className={styles.empty}>No crew members yet.</p>
        ) : (
          <ul className={styles.list} style={{ marginTop: 12 }}>
            {crew.map((m) => {
              const overCap = result.workload.some(
                (w) => w.memberId === m.id,
              );
              const assigned = itemsByAssignee.get(m.id) ?? [];
              return (
                <li key={m.id} className={styles.listRow}>
                  <div>
                    <strong>{m.name}</strong>{' '}
                    <span className={styles.listMeta}>
                      {m.skillLevel} · cap {m.weeklyHoursCap}h/wk ·{' '}
                      {assigned.length} assigned
                    </span>
                    {overCap && (
                      <span
                        className={styles.pillUnmet}
                        style={{ marginLeft: 8 }}
                      >
                        Over capacity
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => deleteMember(m.id)}
                    aria-label={`Remove ${m.name}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- Assignee workload ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Assignee workload</h2>
        {result.workload.length === 0 ? (
          <p className={styles.empty}>
            No over-capacity weeks detected.
          </p>
        ) : (
          <ul className={styles.list}>
            {result.workload.map((w) => {
              const member = crew.find((c) => c.id === w.memberId);
              return (
                <li
                  key={`${w.memberId}-${w.week}`}
                  className={styles.listRow}
                >
                  <div>
                    <strong>{member?.name ?? w.memberId}</strong>{' '}
                    <span className={styles.listMeta}>
                      {w.week} — {w.hours}h vs {w.cap}h cap
                    </span>
                  </div>
                  <span className={styles.pillUnmet}>Over capacity</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- Equipment booking ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Equipment booking</h2>
        {equipmentBookings.length === 0 ? (
          <p className={styles.empty}>No equipment required by planned work.</p>
        ) : (
          <ul className={styles.list}>
            {equipmentBookings.map(([eq, rows]) => (
              <li key={eq} className={styles.listRow}>
                <div>
                  <strong>{eq}</strong>{' '}
                  <span className={styles.listMeta}>
                    {rows.length} item{rows.length === 1 ? '' : 's'} —{' '}
                    {rows.map((r) => r.title).join(', ')}
                  </span>
                  {conflictedEquip.has(eq) && (
                    <span
                      className={styles.pillUnmet}
                      style={{ marginLeft: 8 }}
                    >
                      Double-booked
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- BOM rollup ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bill of materials</h2>
        {bom.length === 0 ? (
          <p className={styles.empty}>No materials on planned work.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Unit</th>
                <th className="num">Qty / acre</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((b) => (
                <tr key={`${b.label}-${b.unit}`}>
                  <td>{b.label}</td>
                  <td>{b.unit}</td>
                  <td className="num">
                    {b.quantityPerAcre ?? '—'}
                  </td>
                  <td>
                    <span className={styles.listMeta}>
                      {b.fromManual && b.fromAuto
                        ? 'manual + auto'
                        : b.fromAuto
                          ? 'auto'
                          : 'manual'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
