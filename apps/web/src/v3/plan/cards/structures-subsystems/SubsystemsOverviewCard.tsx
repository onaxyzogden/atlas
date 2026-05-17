/* SubsystemsOverviewCard — read-only inventory of site subsystems (wells,
   septic, power lines, buried utilities) for the Plan "Built Environment"
   module. Surfaces data persisted to `ogden-built-environment-v2` so the
   module no longer renders blank (regen-farm run-2 finding #61). */

import {
  useWellsForProject,
  useSepticsForProject,
  usePowerLinesForProject,
  useBuriedUtilitiesForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import css from './StructuresSubsystems.module.css';

interface Props {
  projectId: string;
}

function fmtM(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} m`;
}

export default function SubsystemsOverviewCard({ projectId }: Props) {
  const wells = useWellsForProject(projectId);
  const septics = useSepticsForProject(projectId);
  const powerLines = usePowerLinesForProject(projectId);
  const buried = useBuriedUtilitiesForProject(projectId);

  const total =
    wells.length + septics.length + powerLines.length + buried.length;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Subsystems overview</h2>
        <span className={css.cardHint}>{total} placed</span>
      </div>
      <p className={css.intro}>
        Water, waste, power and buried-utility infrastructure placed on the map.
        These constrain siting and earthworks — keep them current as the design
        evolves.
      </p>

      {total === 0 ? (
        <div className={css.empty}>
          No subsystems placed yet. Use the Built-Environment map tools to add
          wells, septic, power lines or buried utilities.
        </div>
      ) : (
        <>
          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Wells</span>
              <span className={css.groupCount}>{wells.length}</span>
            </div>
            {wells.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {wells.map((w) => (
                  <li key={w.id} className={css.item}>
                    <strong>{w.label || 'Well'}</strong>
                    <span className={css.kindChip}>{w.kind}</span>
                    <span className={css.meta}>
                      {w.depthM != null ? `${Math.round(w.depthM)} m deep` : '—'}
                      {w.flowLpm != null ? ` · ${Math.round(w.flowLpm)} L/min` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Septic</span>
              <span className={css.groupCount}>{septics.length}</span>
            </div>
            {septics.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {septics.map((s) => (
                  <li key={s.id} className={css.item}>
                    <strong>{s.label || 'Septic'}</strong>
                    <span className={css.kindChip}>{s.kind}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Power lines</span>
              <span className={css.groupCount}>{powerLines.length}</span>
            </div>
            {powerLines.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {powerLines.map((p) => (
                  <li key={p.id} className={css.item}>
                    <strong>{p.label || 'Power line'}</strong>
                    <span className={css.kindChip}>{p.placement}</span>
                    <span className={css.meta}>{fmtM(p.lengthM)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Buried utilities</span>
              <span className={css.groupCount}>{buried.length}</span>
            </div>
            {buried.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {buried.map((u) => (
                  <li key={u.id} className={css.item}>
                    <strong>{u.label || 'Buried utility'}</strong>
                    <span className={css.kindChip}>{u.kind}</span>
                    <span className={css.meta}>{fmtM(u.lengthM)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
