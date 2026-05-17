/* StructuresOverviewCard — read-only inventory of placed structures, buildings,
   fences and gates for the Plan "Built Environment" module. The underlying data
   persists to `ogden-built-environment-v2`; this card surfaces it so the module
   no longer renders blank (regen-farm run-2 finding #61). */

import {
  useStructuresForProject,
  useBuildingsForProject,
  useFencesForProject,
  useGatesForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import css from './StructuresSubsystems.module.css';

interface Props {
  projectId: string;
}

function fmtM(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} m`;
}

function fmtArea(m2?: number): string {
  if (m2 == null || !Number.isFinite(m2)) return '—';
  return `${Math.round(m2)} m²`;
}

export default function StructuresOverviewCard({ projectId }: Props) {
  const structures = useStructuresForProject(projectId);
  const buildings = useBuildingsForProject(projectId);
  const fences = useFencesForProject(projectId);
  const gates = useGatesForProject(projectId);

  const total =
    structures.length + buildings.length + fences.length + gates.length;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Structures overview</h2>
        <span className={css.cardHint}>{total} placed</span>
      </div>
      <p className={css.intro}>
        Buildings, proposed structures, fencing and gates already placed on the
        map for this project. Add or move items from the Built-Environment map
        tools — they will appear here.
      </p>

      {total === 0 ? (
        <div className={css.empty}>
          No structures placed yet. Use the Built-Environment map tools to add
          buildings, fences or gates.
        </div>
      ) : (
        <>
          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Proposed structures</span>
              <span className={css.groupCount}>{structures.length}</span>
            </div>
            {structures.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {structures.map((s) => (
                  <li key={s.id} className={css.item}>
                    <strong>{s.name || 'Untitled structure'}</strong>
                    <span className={css.kindChip}>
                      {s.type.replace(/_/g, ' ')}
                    </span>
                    <span className={css.meta}>
                      {Math.round(s.widthM)}×{Math.round(s.depthM)} m · phase{' '}
                      {s.phase}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Buildings</span>
              <span className={css.groupCount}>{buildings.length}</span>
            </div>
            {buildings.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {buildings.map((b) => (
                  <li key={b.id} className={css.item}>
                    <strong>{b.label || 'Building'}</strong>
                    <span className={css.kindChip}>{b.subtype}</span>
                    <span className={css.meta}>{fmtArea(b.areaM2)}</span>
                    {b.notes && <span className={css.notes}>{b.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Fences</span>
              <span className={css.groupCount}>{fences.length}</span>
            </div>
            {fences.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {fences.map((f) => (
                  <li key={f.id} className={css.item}>
                    <strong>{f.label || 'Fence'}</strong>
                    <span className={css.kindChip}>{f.kind}</span>
                    <span className={css.meta}>{fmtM(f.lengthM)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={css.group}>
            <div className={css.groupHead}>
              <span>Gates</span>
              <span className={css.groupCount}>{gates.length}</span>
            </div>
            {gates.length === 0 ? (
              <div className={css.groupEmpty}>None</div>
            ) : (
              <ul className={css.list}>
                {gates.map((g) => (
                  <li key={g.id} className={css.item}>
                    <strong>{g.label || 'Gate'}</strong>
                    {g.notes && <span className={css.notes}>{g.notes}</span>}
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
