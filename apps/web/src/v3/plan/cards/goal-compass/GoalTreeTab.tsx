/**
 * Goal Compass tab 1/4 — edit the parent goal, sub-goals, and the
 * measurable success criteria that drive the sequencing engine.
 *
 * Seeded from `homesteadGoalTree.ts` on first mount; persisted per
 * project in `useGoalTreeStore`.
 */

import { useEffect } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import type { CriterionUnit, SuccessCriterion } from '../../data/goalCompassTypes.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const UNITS: CriterionUnit[] = ['pct', 'gallons', 'lbs', 'usd', 'kwh', 'count'];

export default function GoalTreeTab({ project }: Props) {
  const ensureDefault = useGoalTreeStore((s) => s.ensureDefault);
  const tree = useGoalTreeStore((s) => s.goalTreesByProject[project.id] ?? null);
  const setParentGoal = useGoalTreeStore((s) => s.setParentGoal);
  const updateSubGoal = useGoalTreeStore((s) => s.updateSubGoal);
  const updateCriterion = useGoalTreeStore((s) => s.updateCriterion);
  const addCriterion = useGoalTreeStore((s) => s.addCriterion);
  const removeCriterion = useGoalTreeStore((s) => s.removeCriterion);
  const resetToHomesteadTemplate = useGoalTreeStore((s) => s.resetToHomesteadTemplate);

  useEffect(() => {
    ensureDefault(project.id);
  }, [project.id, ensureDefault]);

  if (!tree) {
    return <div className={styles.empty}>Seeding homestead goal tree…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 1 of 4</span>
        <h2 className={styles.title}>Goal tree</h2>
        <p className={styles.lede}>
          Declare what success looks like for this parcel. The sequencing
          engine reads these measurable criteria to propose a phased plan.
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Parent goal</h3>
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="gc-parent-title">Title</label>
            <input
              id="gc-parent-title"
              value={tree.parentGoal.title}
              onChange={(e) => setParentGoal(project.id, { title: e.target.value })}
            />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="gc-parent-narrative">Narrative</label>
            <textarea
              id="gc-parent-narrative"
              value={tree.parentGoal.narrative}
              onChange={(e) => setParentGoal(project.id, { narrative: e.target.value })}
            />
          </div>
        </div>
      </section>

      {tree.subGoals.map((sg) => (
        <section key={sg.id} className={styles.section}>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.full}`}>
              <label htmlFor={`sg-${sg.id}-title`}>Sub-goal</label>
              <input
                id={`sg-${sg.id}-title`}
                value={sg.title}
                onChange={(e) => updateSubGoal(project.id, sg.id, { title: e.target.value })}
              />
            </div>
          </div>

          <table className={styles.table} style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Unit</th>
                <th className="num">Target</th>
                <th className="num">By year</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sg.criteria.map((c) => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  onChange={(patch) => updateCriterion(project.id, sg.id, c.id, patch)}
                  onRemove={() => removeCriterion(project.id, sg.id, c.id)}
                />
              ))}
              {sg.criteria.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No criteria yet — add one below.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className={styles.btnRow}>
            <button
              type="button"
              className={styles.btn}
              onClick={() =>
                addCriterion(project.id, sg.id, {
                  id: `${sg.id}-c-${Date.now()}`,
                  description: 'New criterion',
                  unit: 'pct',
                  target: 50,
                  deadlineYear: 5,
                })
              }
            >
              Add criterion
            </button>
          </div>
        </section>
      ))}

      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => resetToHomesteadTemplate(project.id)}
        >
          Reset to homestead template
        </button>
      </div>
    </div>
  );
}

function CriterionRow({
  criterion,
  onChange,
  onRemove,
}: {
  criterion: SuccessCriterion;
  onChange: (patch: Partial<SuccessCriterion>) => void;
  onRemove: () => void;
}) {
  return (
    <tr>
      <td>
        <input
          value={criterion.description}
          onChange={(e) => onChange({ description: e.target.value })}
          style={{ width: '100%' }}
        />
      </td>
      <td>
        <select
          value={criterion.unit}
          onChange={(e) => onChange({ unit: e.target.value as CriterionUnit })}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </td>
      <td className="num">
        <input
          type="number"
          value={criterion.target}
          onChange={(e) => onChange({ target: Number(e.target.value) || 0 })}
          style={{ width: 80, textAlign: 'right' }}
        />
      </td>
      <td className="num">
        <input
          type="number"
          value={criterion.deadlineYear}
          onChange={(e) => onChange({ deadlineYear: Number(e.target.value) || 0 })}
          style={{ width: 60, textAlign: 'right' }}
        />
      </td>
      <td>
        <button type="button" className={styles.removeBtn} onClick={onRemove}>
          Remove
        </button>
      </td>
    </tr>
  );
}
