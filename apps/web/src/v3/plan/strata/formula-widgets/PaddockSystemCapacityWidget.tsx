/**
 * PaddockSystemCapacityWidget — live result for `paddock-system-capacity`.
 *
 * Rotation-aware AU carrying capacity per cell-group via
 * computeRotationCarryingCapacity(projectPaddocks, projectPlan). Reads the
 * per-project rotation plan from rotationPlanStore. Strictly ecological
 * (animal-unit grazing load) — never financial.
 */
import { useMemo } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import {
  useRotationPlanStore,
  planFor,
} from '../../../../store/rotationPlanStore.js';
import {
  computeRotationCarryingCapacity,
  type GroupCapacityRow,
} from '../../../../features/livestock/rotationCapacityMath.js';
import css from './formulaWidget.module.css';

interface Props {
  projectId: string;
  resultLabel?: string;
}

function tagClass(status: GroupCapacityRow['status']): string {
  switch (status) {
    case 'ok':
      return css.tagOk!;
    case 'tight':
      return css.tagTight!;
    case 'over':
      return css.tagOver!;
  }
}

export default function PaddockSystemCapacityWidget({
  projectId,
  resultLabel,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const plan = useRotationPlanStore((s) => planFor(s, projectId));

  const rows = useMemo<GroupCapacityRow[]>(
    () => computeRotationCarryingCapacity(paddocks, plan),
    [paddocks, plan],
  );

  return (
    <div className={css.widget}>
      <h4 className={css.title}>
        {resultLabel ?? 'Paddock system capacity'}
      </h4>
      {rows.length > 0 ? (
        <>
          <p className={css.hint}>
            Rotation-aware animal-unit demand vs. supply per cell group across
            one full cycle.
          </p>
          <ul className={css.list}>
            {rows.map((r) => (
              <li key={r.cellGroup} className={css.row}>
                <span className={css.rowName}>
                  {r.cellGroup} · {r.paddockCount} paddock
                  {r.paddockCount !== 1 ? 's' : ''} · {r.cycleDays}d cycle
                </span>
                <span className={`${css.rowValue} ${tagClass(r.status)}`}>
                  {r.utilizationPct}% ({r.status})
                </span>
              </li>
            ))}
          </ul>
          <p className={css.footnote}>
            Coarse AU planning heuristic — no dry-matter intake or regrowth
            curve.
          </p>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting a rotation plan — assign paddocks to cell groups and set
          graze/rest days to compute rotation-aware capacity.
        </p>
      )}
    </div>
  );
}
