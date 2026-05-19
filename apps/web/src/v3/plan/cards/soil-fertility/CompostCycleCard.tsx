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
import { COMPOST_METHOD_SPEC } from './compostMethodSpec.js';
import {
  estimateYield,
  projectInventoryVolumeM3,
} from './compostYieldMath.js';
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

/** Spec-driven one-line cadence/band hint from COMPOST_METHOD_SPEC. */
function methodHint(method: CompostMethod): string {
  const s = COMPOST_METHOD_SPEC[method];
  const turn =
    s.turnEveryDays == null
      ? 'no turning'
      : `turn ≈ every ${s.turnEveryDays} d`;
  const cure = `ready ≈ ${s.cureWeeksLow}–${s.cureWeeksHigh} wk`;
  const cn = `C:N ${s.cnTargetLow}–${s.cnTargetHigh}:1`;
  const temp =
    s.tempCLow != null && s.tempCHigh != null
      ? `, ${s.tempCLow}–${s.tempCHigh} °C`
      : '';
  return `${cn} · ${turn} · ${cure}${temp}.`;
}

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
    const count = Object.keys(inv).filter((k) => (inv[k] ?? 0) > 0).length;
    const totalM3 = projectInventoryVolumeM3(inv);
    return { count, totalM3 };
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
        const curedNoApplication =
          b.status === 'cured' && !b.appliedToZone?.trim();
        const projected = estimateYield(b.method, feedstock.totalM3);
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

            <p className={styles.listMeta}>{methodHint(b.method)}</p>
            <p className={styles.listMeta}>
              {feedstock.totalM3 > 0
                ? `Projected yield ≈ ${projected.finishedM3} m³ finished from ${projected.feedstockM3} m³ inventoried feedstock (${projected.retentionPct}% retention — coarse heuristic, not a lab assay).`
                : 'Projected yield: log feedstock volume in Resource inventory to estimate finished compost.'}
            </p>

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

            <div className={styles.statRow}>
              <span>Applied to (guild / zone)</span>
              <input
                type="text"
                value={b.appliedToZone ?? ''}
                onChange={(e) =>
                  patch({ appliedToZone: e.target.value || undefined })
                }
                placeholder="e.g. fruit guild, north beds"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
            <div className={styles.statRow}>
              <span>Application date</span>
              <input
                type="date"
                value={b.applicationDateISO ?? ''}
                onChange={(e) =>
                  patch({ applicationDateISO: e.target.value || undefined })
                }
              />
            </div>
            <div className={styles.statRow}>
              <span>Application rate</span>
              <input
                type="text"
                value={b.applicationRateNote ?? ''}
                onChange={(e) =>
                  patch({
                    applicationRateNote: e.target.value || undefined,
                  })
                }
                placeholder="e.g. 5 cm top-dress"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>

            {(readyBeforeStart ||
              badCadence ||
              noFeedstock ||
              curedNoApplication) && (
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
                {curedNoApplication && (
                  <li className={styles.listRow}>
                    <span className={styles.pill}>
                      cured but no application target — finished compost
                      unassigned
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
