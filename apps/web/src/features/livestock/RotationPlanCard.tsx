/**
 * RotationPlanCard — editable companion to the read-only RotationSequenceCard.
 *
 * Auto-persist designer: every inline edit writes through `upsertCell`
 * immediately (no save gate, matching the established B1/B2 editable-card
 * precedent). A "Seed from paddocks" action builds the full plan in one
 * `setPlan` write. Rest-compliance shortfalls render as non-blocking,
 * advisory-only per-row warnings — inputs are never disabled or gated.
 */

import { useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import {
  requiredRestDays,
  computeRestCompliance,
  type RotationCell,
  type RestComplianceRow,
} from './rotationSequenceMath.js';
import css from './RotationPlanCard.module.css';

interface RotationPlanCardProps {
  projectId: string;
}

export default function RotationPlanCard({ projectId }: RotationPlanCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const plan = useRotationPlanStore((s) => s.byProject[projectId] ?? null);
  const setPlan = useRotationPlanStore((s) => s.setPlan);
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const removeCell = useRotationPlanStore((s) => s.removeCell);
  const clearPlan = useRotationPlanStore((s) => s.clearPlan);

  const paddockById = useMemo(() => {
    const map = new Map<string, Paddock>();
    for (const p of paddocks) map.set(p.id, p);
    return map;
  }, [paddocks]);

  const complianceByPaddock = useMemo(() => {
    const map = new Map<string, RestComplianceRow>();
    for (const row of computeRestCompliance(paddocks, plan)) {
      map.set(row.paddockId, row);
    }
    return map;
  }, [paddocks, plan]);

  // Cells grouped by cellGroup: 'ungrouped' sorts last, otherwise
  // localeCompare; within a group ordered by sequenceOrder.
  const groupedCells = useMemo(() => {
    const cells = plan?.cells ?? [];
    const map = new Map<string, RotationCell[]>();
    for (const c of cells) {
      const list = map.get(c.cellGroup) ?? [];
      list.push(c);
      map.set(c.cellGroup, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'ungrouped') return 1;
      if (b === 'ungrouped') return -1;
      return a.localeCompare(b);
    });
  }, [plan]);

  const hasPaddocks = paddocks.length > 0;
  const hasPlan = plan != null && plan.cells.length > 0;

  function buildCell(
    cell: RotationCell,
    patch: Partial<RotationCell>,
  ): RotationCell {
    const next: RotationCell = { ...cell, ...patch };
    const trimmedNote = next.note?.trim();
    if (trimmedNote == null || trimmedNote.length === 0) {
      const { note: _omit, ...withoutNote } = next;
      void _omit;
      return withoutNote;
    }
    return next;
  }

  function handleSeed() {
    // sequenceOrder = index WITHIN the cellGroup (0-based).
    const groupCounters = new Map<string, number>();
    const cells: RotationCell[] = paddocks.map((p) => {
      const cellGroup = p.grazingCellGroup ?? 'ungrouped';
      const idx = groupCounters.get(cellGroup) ?? 0;
      groupCounters.set(cellGroup, idx + 1);
      return {
        paddockId: p.id,
        cellGroup,
        sequenceOrder: idx,
        targetGrazeDays: 3,
        targetRestDays: requiredRestDays(p),
      };
    });
    setPlan(projectId, cells);
  }

  if (!hasPaddocks) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation Plan</h3>
            <p className={css.cardHint}>
              Editable rotation-sequence designer. Edits persist
              automatically.
            </p>
          </div>
          <span className={css.modeBadge}>Editable</span>
        </div>
        <div className={css.empty}>
          No paddocks in this project yet. Draw paddocks in the livestock
          module first.
        </div>
      </section>
    );
  }

  if (!hasPlan) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation Plan</h3>
            <p className={css.cardHint}>
              Editable rotation-sequence designer. Edits persist
              automatically.
            </p>
          </div>
          <span className={css.modeBadge}>Editable</span>
        </div>
        <div className={css.empty}>
          No rotation plan yet. Seed one cell per paddock {'—'} graze days
          default to 3 and rest days to each paddock{'’'}s species recovery
          requirement {'—'} then fine-tune the sequence inline.
          <div className={css.emptyAction}>
            <button
              type="button"
              className={css.primaryButton}
              onClick={handleSeed}
            >
              Seed from paddocks
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Rotation Plan</h3>
          <p className={css.cardHint}>
            Editable rotation-sequence designer. Every edit persists
            automatically {'—'} no save step. Rest-shortfall notes are
            advisory only and never block.
          </p>
        </div>
        <span className={css.modeBadge}>Editable</span>
      </div>

      <div className={css.toolbar}>
        <button
          type="button"
          className={css.primaryButton}
          onClick={handleSeed}
        >
          Re-seed from paddocks
        </button>
        <button
          type="button"
          className={css.dangerButton}
          onClick={() => clearPlan(projectId)}
        >
          Clear all
        </button>
      </div>

      {groupedCells.map(([groupName, cells]) => {
        const groupLabel = groupName === 'ungrouped' ? 'Ungrouped' : groupName;
        return (
          <div key={groupName} className={css.groupBlock}>
            <div className={css.groupHead}>
              <span className={css.groupName}>{groupLabel}</span>
              <span className={css.groupMeta}>
                {cells.length} cell{cells.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className={css.rowList}>
              {cells.map((cell) => {
                const pad = paddockById.get(cell.paddockId);
                const compliance = complianceByPaddock.get(cell.paddockId);
                const showWarning =
                  compliance != null && compliance.compliant === false;
                return (
                  <div key={cell.paddockId} className={css.row}>
                    <div className={css.rowHead}>
                      <span className={css.paddockName}>
                        {pad ? pad.name : cell.paddockId}
                      </span>
                      {!pad && (
                        <span className={css.missingNote}>
                          (missing paddock)
                        </span>
                      )}
                      <button
                        type="button"
                        className={css.removeButton}
                        onClick={() => removeCell(projectId, cell.paddockId)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className={css.fieldGrid}>
                      <label className={css.field}>
                        <span>Order</span>
                        <input
                          type="number"
                          min={0}
                          value={cell.sequenceOrder}
                          onChange={(e) =>
                            upsertCell(
                              projectId,
                              buildCell(cell, {
                                sequenceOrder: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              }),
                            )
                          }
                        />
                      </label>
                      <label className={css.field}>
                        <span>Graze days</span>
                        <input
                          type="number"
                          min={1}
                          value={cell.targetGrazeDays}
                          onChange={(e) =>
                            upsertCell(
                              projectId,
                              buildCell(cell, {
                                targetGrazeDays: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              }),
                            )
                          }
                        />
                      </label>
                      <label className={css.field}>
                        <span>Rest days</span>
                        <input
                          type="number"
                          min={0}
                          value={cell.targetRestDays}
                          onChange={(e) =>
                            upsertCell(
                              projectId,
                              buildCell(cell, {
                                targetRestDays: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              }),
                            )
                          }
                        />
                      </label>
                      <label className={`${css.field} ${css.fieldWide}`}>
                        <span>Note</span>
                        <input
                          type="text"
                          value={cell.note ?? ''}
                          placeholder="optional"
                          onChange={(e) =>
                            upsertCell(
                              projectId,
                              buildCell(cell, { note: e.target.value }),
                            )
                          }
                        />
                      </label>
                    </div>

                    {showWarning && (
                      <div className={css.warning}>
                        planned rest {compliance.plannedRestDays}d {'<'} species
                        requirement {compliance.requiredRestDays}d
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
