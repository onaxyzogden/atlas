/**
 * CompostCycleCard — Plan Module 5 (Soil Fertility), Sub-project B2.
 *
 * Editable compost / vermicompost / compost-tea cycle designer over the
 * additive `compostCycleStore` slice. Rows auto-persist (no save gate,
 * matching the B1 SuccessionPathCard precedent). A method-driven cadence
 * hint and a display-only feedstock-inventory context line (read from
 * compostInventoryStore — no cross-store writes) guide the steward;
 * inline warnings are non-blocking.
 *
 * The read-only closed-loop graph remains the system projection; this
 * card is the editable cycle intent.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useCompostInventoryStore } from '../../../../store/compostInventoryStore.js';
import {
  useCompostCycleStore,
  type CompostBatch,
  type CompostMethod,
} from '../../../../store/compostCycleStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const METHOD_LABEL: Record<CompostMethod, string> = {
  hot: 'Hot (thermophilic)',
  cold: 'Cold (slow)',
  vermicompost: 'Vermicompost',
  compost_tea: 'Compost tea',
};

const METHOD_HINT: Record<CompostMethod, string> = {
  hot: 'Turn ≈ every 7 days; ready ≈ 8 weeks.',
  cold: 'No turning required; ready ≈ 6–12 months.',
  vermicompost: 'No turning; harvest ≈ 12 weeks; keep 15–25 °C.',
  compost_tea: 'Brew 24–48 h with aeration; use within hours.',
};

const METHODS: CompostMethod[] = [
  'hot',
  'cold',
  'vermicompost',
  'compost_tea',
];

function newId(): string {
  return `cb_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CompostCycleCard({ project }: Props) {
  const byProject = useCompostCycleStore((s) => s.byProject);
  const addBatch = useCompostCycleStore((s) => s.addBatch);
  const updateBatch = useCompostCycleStore((s) => s.updateBatch);
  const removeBatch = useCompostCycleStore((s) => s.removeBatch);
  const clearProject = useCompostCycleStore((s) => s.clearProject);

  const inventory = useCompostInventoryStore((s) => s.byProject);

  const batches = byProject[project.id] ?? [];

  const feedstock = useMemo(() => {
    const inv = inventory[project.id] ?? {};
    const ids = Object.keys(inv);
    const totalM3 = Object.values(inv).reduce((a, b) => a + b, 0);
    return { count: ids.length, totalM3 };
  }, [inventory, project.id]);

  const onAdd = () => {
    addBatch(project.id, {
      id: newId(),
      method: 'hot',
      startDateISO: todayISO(),
      status: 'planned',
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Compost cycle</h1>
        <p className={styles.lede}>
          The editable compost, vermicompost, and compost-tea cycle for
          this project: when each batch is built, how often it is turned,
          and when it is expected ready. Edits persist immediately — there
          is no save step. The read-only closed-loop graph remains the
          system projection.
        </p>
      </header>

      <div className={styles.section}>
        <div className={styles.statRow}>
          <span>Feedstock streams inventoried (Greens &amp; browns)</span>
          <span>
            {feedstock.count} · ~{Math.round(feedstock.totalM3)} m³
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className={styles.pill}
            style={{ cursor: 'pointer' }}
            onClick={onAdd}
          >
            Add batch
          </button>
          {batches.length > 0 && (
            <button
              type="button"
              className={styles.pill}
              style={{ cursor: 'pointer' }}
              onClick={() => clearProject(project.id)}
              title="Clear all compost batches for this project"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {batches.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No compost batches yet. Use "Add batch" to plan a hot,
            cold, vermicompost, or compost-tea cycle.
          </p>
        </div>
      )}

      {batches.map((b) => {
        const readyBeforeStart =
          !!b.readyDateISO &&
          !!b.startDateISO &&
          b.readyDateISO < b.startDateISO;
        const badCadence =
          b.turnEveryDays != null && b.turnEveryDays <= 0;
        const noFeedstock = !b.feedstockNote?.trim();
        const patch = (over: Partial<CompostBatch>) =>
          updateBatch(project.id, { ...b, ...over });
        return (
          <div className={styles.section} key={b.id}>
            <h2 className={styles.sectionTitle}>
              <select
                value={b.method}
                onChange={(e) =>
                  patch({ method: e.target.value as CompostMethod })
                }
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.pill}
                style={{ cursor: 'pointer', marginLeft: 8 }}
                onClick={() => removeBatch(project.id, b.id)}
              >
                Remove
              </button>
            </h2>

            <p className={styles.listMeta}>{METHOD_HINT[b.method]}</p>

            <div className={styles.statRow}>
              <span>Start date</span>
              <input
                type="date"
                value={b.startDateISO}
                onChange={(e) => patch({ startDateISO: e.target.value })}
              />
            </div>
            <div className={styles.statRow}>
              <span>Ready date</span>
              <input
                type="date"
                value={b.readyDateISO ?? ''}
                onChange={(e) =>
                  patch({ readyDateISO: e.target.value || undefined })
                }
              />
            </div>
            <div className={styles.statRow}>
              <span>Turn every (days)</span>
              <input
                type="number"
                min={1}
                value={b.turnEveryDays ?? ''}
                onChange={(e) =>
                  patch({
                    turnEveryDays: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                style={{ width: 80 }}
              />
            </div>
            <div className={styles.statRow}>
              <span>Status</span>
              <select
                value={b.status}
                onChange={(e) =>
                  patch({
                    status: e.target.value as CompostBatch['status'],
                  })
                }
              >
                <option value="planned">planned</option>
                <option value="active">active</option>
                <option value="cured">cured</option>
              </select>
            </div>
            <div className={styles.statRow}>
              <span>Feedstock note</span>
              <input
                type="text"
                value={b.feedstockNote ?? ''}
                onChange={(e) =>
                  patch({ feedstockNote: e.target.value || undefined })
                }
                placeholder="e.g. 2:1 browns:greens, manure"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>

            {(readyBeforeStart || badCadence || noFeedstock) && (
              <ul className={styles.list}>
                {readyBeforeStart && (
                  <li className={styles.listRow}>
                    <span
                      className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                    >
                      ready date is before start date
                    </span>
                  </li>
                )}
                {badCadence && (
                  <li className={styles.listRow}>
                    <span
                      className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                    >
                      turn cadence must be ≥ 1 day
                    </span>
                  </li>
                )}
                {noFeedstock && (
                  <li className={styles.listRow}>
                    <span className={styles.pill}>
                      no feedstock note — C:N balance unrecorded
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
