/**
 * EquipmentReplacementScheduleCard — phasing-budgeting matrix that surfaces
 * which inventory items will hit replacement age in each build phase.
 *
 * Replacement year = acquisitionYear + lifecycleYearsEstimate. Items missing
 * either field are surfaced separately as "lifecycle unknown" so the steward
 * can backfill from the Inventory card.
 */

import { useMemo } from 'react';
import {
  useMachineryInventoryStore,
  type MachineryItem,
} from '../../../../store/machineryInventoryStore.js';
import { usePhaseStore, type BuildPhase } from '../../../../store/phaseStore.js';
import css from './EquipmentReplacementScheduleCard.module.css';

const EMPTY_ITEMS: MachineryItem[] = [];

interface Props {
  projectId: string;
}

interface PhaseRange {
  startYear: number;
  endYear: number; // Number.POSITIVE_INFINITY for open-ended ("Year 5+").
}

/**
 * Parse a phase timeframe string like "Year 0-1", "Year 1-3", "Year 5+".
 * Falls back to a 0..0 range if the format isn't recognised — those phases
 * just match no items rather than crashing the matrix.
 */
function parseTimeframe(tf: string): PhaseRange {
  const cleaned = tf.replace(/year/i, '').trim();
  const openEnded = /\+\s*$/.test(cleaned);
  const numbers = cleaned.match(/\d+/g)?.map((n) => parseInt(n, 10)) ?? [];
  if (numbers.length === 0) return { startYear: 0, endYear: 0 };
  if (openEnded) {
    return { startYear: numbers[0]!, endYear: Number.POSITIVE_INFINITY };
  }
  if (numbers.length === 1) {
    return { startYear: numbers[0]!, endYear: numbers[0]! };
  }
  return { startYear: numbers[0]!, endYear: numbers[1]! };
}

function replacementYearsFromNow(item: MachineryItem, currentYear: number): number | null {
  if (item.acquisitionYear == null || item.lifecycleYearsEstimate == null) return null;
  const absolute = item.acquisitionYear + item.lifecycleYearsEstimate;
  return absolute - currentYear;
}

export default function EquipmentReplacementScheduleCard({ projectId }: Props) {
  const items = useMachineryInventoryStore(
    (s) => s.byProject[projectId] ?? EMPTY_ITEMS,
  );
  const allPhases = usePhaseStore((s) => s.phases);

  const phases: BuildPhase[] = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const currentYear = new Date().getFullYear();

  // Bucket items into phases by replacement-year offset from "now".
  const { byPhase, unknown } = useMemo(() => {
    const buckets = new Map<string, MachineryItem[]>();
    const unknownItems: MachineryItem[] = [];
    for (const phase of phases) buckets.set(phase.id, []);

    for (const item of items) {
      const offset = replacementYearsFromNow(item, currentYear);
      if (offset == null) {
        unknownItems.push(item);
        continue;
      }
      const matched = phases.find((p) => {
        const r = parseTimeframe(p.timeframe);
        return offset >= r.startYear && offset <= r.endYear;
      });
      if (matched) buckets.get(matched.id)!.push(item);
    }
    return { byPhase: buckets, unknown: unknownItems };
  }, [items, phases, currentYear]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Equipment replacement schedule</h2>
        <span className={css.cardHint}>
          {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
          {phases.length} phase{phases.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className={css.intro}>
        Items hit replacement age when{' '}
        <code className={css.code}>acquisitionYear + lifecycleYearsEstimate</code>
        {' '}lands inside a phase's timeframe (relative to {currentYear}). Set
        these fields on the Inventory card to populate this view.
      </p>

      {phases.length === 0 ? (
        <div className={css.empty}>
          No phases defined yet — add phases in the Phasing matrix card first.
        </div>
      ) : (
        <ul className={css.phaseList}>
          {phases.map((phase) => {
            const list = byPhase.get(phase.id) ?? [];
            return (
              <li key={phase.id} className={css.phaseRow}>
                <div className={css.phaseHead}>
                  <span
                    className={css.phaseDot}
                    style={{ background: phase.color }}
                  />
                  <strong className={css.phaseName}>{phase.name}</strong>
                  <span className={css.phaseTime}>{phase.timeframe}</span>
                  <span className={css.phaseCount}>
                    {list.length} due
                  </span>
                </div>
                {list.length === 0 ? (
                  <div className={css.phaseEmpty}>—</div>
                ) : (
                  <ul className={css.itemList}>
                    {list.map((it) => (
                      <li key={it.id} className={css.item}>
                        <strong>{it.name || '(unnamed)'}</strong>
                        <span className={css.kindChip}>{it.kind}</span>
                        <span className={css.itemMeta}>
                          acq {it.acquisitionYear} · life {it.lifecycleYearsEstimate}y
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {unknown.length > 0 ? (
        <div className={css.unknown}>
          <strong>Lifecycle unknown ({unknown.length})</strong>
          <ul className={css.unknownList}>
            {unknown.map((it) => (
              <li key={it.id}>
                {it.name || '(unnamed)'} <span className={css.kindChip}>{it.kind}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
