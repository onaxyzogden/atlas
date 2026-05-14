/**
 * Goal Compass tab 1/5 — edit the parent goal, sub-goals, and the
 * measurable success criteria that drive the sequencing engine.
 *
 * Seeded from a project-type-keyed template (see `goalTreeTemplates.ts`)
 * on first mount. Default UI lets the steward tune criterion targets and
 * deadlines; structural edits (add/remove criterion, edit description /
 * sub-goal title) live behind an Advanced collapse.
 */

import { useEffect } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import type { CriterionUnit, SuccessCriterion } from '../../data/goalCompassTypes.js';
import {
  PLAN_PROJECT_TYPE_KEYS,
  type PlanProjectTypeKey,
} from '../../data/planProjectTypeTemplates.js';
import {
  GOAL_TREE_TEMPLATE_LABEL,
  GOAL_TREE_TEMPLATES,
} from '../../data/goalTreeTemplates.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const UNITS: CriterionUnit[] = ['pct', 'gallons', 'lbs', 'usd', 'kwh', 'count'];

function asTemplateKey(value: string | null | undefined): PlanProjectTypeKey {
  if (value && (PLAN_PROJECT_TYPE_KEYS as readonly string[]).includes(value)) {
    return value as PlanProjectTypeKey;
  }
  return 'homestead';
}

/** Reverse-map a loaded tree's archetype string (e.g. `'regenerative-farm'`)
 *  back to its template key (e.g. `'regenerative_farm'`). The two namespaces
 *  diverge — archetypes use hyphens, keys use underscores — so we resolve by
 *  scanning the template table rather than mechanical string-munging. */
function archetypeToTemplateKey(archetype: string | null | undefined): PlanProjectTypeKey | null {
  if (!archetype) return null;
  for (const key of PLAN_PROJECT_TYPE_KEYS) {
    if (GOAL_TREE_TEMPLATES[key].archetype === archetype) return key;
  }
  return null;
}

export default function GoalTreeTab({ project }: Props) {
  const ensureDefault = useGoalTreeStore((s) => s.ensureDefault);
  const tree = useGoalTreeStore((s) => s.goalTreesByProject[project.id] ?? null);
  const setParentGoal = useGoalTreeStore((s) => s.setParentGoal);
  const updateSubGoal = useGoalTreeStore((s) => s.updateSubGoal);
  const updateCriterion = useGoalTreeStore((s) => s.updateCriterion);
  const addCriterion = useGoalTreeStore((s) => s.addCriterion);
  const removeCriterion = useGoalTreeStore((s) => s.removeCriterion);
  const switchTemplate = useGoalTreeStore((s) => s.switchTemplate);

  // Picker reflects the currently-loaded tree (the steward may have switched
  // templates independently of `project.projectType`). Falls back to the
  // project's own type, then to 'homestead', when no tree exists yet.
  const currentTemplateKey =
    archetypeToTemplateKey(tree?.archetype) ?? asTemplateKey(project.projectType);

  useEffect(() => {
    ensureDefault(project.id, project.projectType);
  }, [project.id, project.projectType, ensureDefault]);

  if (!tree) {
    return <div className={styles.empty}>Seeding goal tree from project template…</div>;
  }

  const handleTemplateChange = (key: PlanProjectTypeKey) => {
    const ok = window.confirm(
      `Switch to the "${GOAL_TREE_TEMPLATE_LABEL[key]}" template? This replaces the current criteria.`,
    );
    if (!ok) return;
    switchTemplate(project.id, key);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 1 of 5</span>
        <h2 className={styles.title}>Goal tree</h2>
        <p className={styles.lede}>
          Declare what success looks like for this parcel. The sequencing
          engine reads these measurable criteria to propose a phased plan.
        </p>
        <div className={styles.btnRow} style={{ marginTop: 12 }}>
          <label htmlFor="gc-template-picker" className={styles.hint} style={{ fontSize: 12 }}>
            Template:
          </label>
          <select
            id="gc-template-picker"
            value={currentTemplateKey}
            onChange={(e) => handleTemplateChange(e.target.value as PlanProjectTypeKey)}
          >
            {PLAN_PROJECT_TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {GOAL_TREE_TEMPLATE_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Parent goal</h3>
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Title</label>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(232,220,200,0.92)' }}>
              {tree.parentGoal.title}
            </div>
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Narrative</label>
            <div style={{ fontSize: 12, color: 'rgba(232,220,200,0.7)', lineHeight: 1.5 }}>
              {tree.parentGoal.narrative}
            </div>
          </div>
        </div>
      </section>

      {tree.subGoals.map((sg) => (
        <section key={sg.id} className={styles.section}>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Sub-goal</label>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(232,220,200,0.9)' }}>
                {sg.title}
              </div>
            </div>
          </div>

          <table className={styles.table} style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Unit</th>
                <th className="num">Target</th>
                <th className="num">By year</th>
              </tr>
            </thead>
            <tbody>
              {sg.criteria.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontSize: 13, color: 'rgba(232,220,200,0.85)' }}>
                      {c.description}
                    </div>
                  </td>
                  <td>
                    <span className={styles.pill}>{c.unit}</span>
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      value={c.target}
                      onChange={(e) =>
                        updateCriterion(project.id, sg.id, c.id, {
                          target: Number(e.target.value) || 0,
                        })
                      }
                      style={{ width: 80, textAlign: 'right' }}
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      value={c.deadlineYear}
                      onChange={(e) =>
                        updateCriterion(project.id, sg.id, c.id, {
                          deadlineYear: Number(e.target.value) || 0,
                        })
                      }
                      style={{ width: 60, textAlign: 'right' }}
                    />
                  </td>
                </tr>
              ))}
              {sg.criteria.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    No criteria yet — open Advanced to add one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ))}

      <details className={styles.section} style={{ marginTop: 12 }}>
        <summary
          style={{
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(232,220,200,0.55)',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Advanced — edit structure
        </summary>
        <p className={styles.hint} style={{ fontSize: 12 }}>
          Edit parent / sub-goal titles and narratives, or add and remove
          criteria. Most stewards leave these alone.
        </p>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Parent goal (edit)</h3>
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
          <section key={`adv-${sg.id}`} className={styles.section}>
            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor={`sg-${sg.id}-title`}>Sub-goal title</label>
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
                  <th>Criterion description</th>
                  <th>Unit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sg.criteria.map((c) => (
                  <tr key={`adv-c-${c.id}`}>
                    <td>
                      <input
                        value={c.description}
                        onChange={(e) =>
                          updateCriterion(project.id, sg.id, c.id, {
                            description: e.target.value,
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <select
                        value={c.unit}
                        onChange={(e) =>
                          updateCriterion(project.id, sg.id, c.id, {
                            unit: e.target.value as CriterionUnit,
                          })
                        }
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeCriterion(project.id, sg.id, c.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
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
                  } as SuccessCriterion)
                }
              >
                Add criterion
              </button>
            </div>
          </section>
        ))}
      </details>
    </div>
  );
}
