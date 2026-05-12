/**
 * MachineryHousingFuelCard — assigns each inventory item to a structure
 * point or equipment-yard polygon as its shelter, and flags fuel-station
 * coverage gaps for diesel / petrol items.
 *
 * No spatial radius math — fuel coverage is a binary "is there at least
 * one fuel-station drawn?" check. The Phasing & Budgeting module is the
 * place for distance-based coverage analysis later.
 */

import { useMemo } from 'react';
import { useMachineryInventoryStore } from '../../../../store/machineryInventoryStore.js';
import { useDesignElementsForProject } from '../../../../store/builtEnvironmentSelectors.js';
import { useSectorStore } from '../../../../store/sectorStore.js';
import { detectNoiseSectorHits, describeElement } from './noiseSectorOverlap.js';
import css from './MachineryHousingFuelCard.module.css';

const EMPTY_ITEMS: ReturnType<typeof useMachineryInventoryStore.getState>['byProject'][string] = [];

const HOUSING_KINDS = new Set([
  'machinery-shed',
  'equipment-yard',
  'barn',
  'shed',
]);

const FOSSIL_FUELS = new Set(['diesel', 'petrol']);

interface Props {
  projectId: string;
}

export default function MachineryHousingFuelCard({ projectId }: Props) {
  const items = useMachineryInventoryStore(
    (s) => s.byProject[projectId] ?? EMPTY_ITEMS,
  );
  const elements = useDesignElementsForProject(projectId);
  const assignHousing = useMachineryInventoryStore((s) => s.assignHousing);

  const housingOptions = useMemo(
    () => elements.filter((e) => HOUSING_KINDS.has(e.kind)),
    [elements],
  );

  const hasFuelStation = useMemo(
    () => elements.some((e) => e.kind === 'fuel-station'),
    [elements],
  );

  const sectors = useSectorStore((s) => s.byProject[projectId]);
  const noiseHits = useMemo(
    () =>
      detectNoiseSectorHits({
        elements,
        noiseDirection: sectors?.noise,
        noiseHalfWidth: sectors?.noiseHalfWidth,
      }),
    [elements, sectors?.noise, sectors?.noiseHalfWidth],
  );

  const orphans = items.filter((it) => !it.housingElementId);
  const fossilItems = items.filter((it) => FOSSIL_FUELS.has(it.fuelType));

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Housing &amp; fuel</h2>
        <span className={css.cardHint}>
          {orphans.length} unhoused · {hasFuelStation ? '1+ fuel station' : 'no fuel station'}
        </span>
      </div>

      <p className={css.intro}>
        Assign each inventory item to a structure point or equipment yard.
        Diesel and petrol items need at least one drawn{' '}
        <code className={css.code}>fuel-station</code> on the canvas.
      </p>

      {noiseHits.length > 0 ? (
        <div className={css.flag}>
          <strong>Noise sector siting:</strong>
          <ul className={css.flagList}>
            {noiseHits.map((hit, i) => (
              <li key={`${hit.source.id}-${hit.dwelling.id}-${i}`}>
                {describeElement(hit.source)} sits within the prevailing-wind
                noise sector of {describeElement(hit.dwelling)}.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fossilItems.length > 0 && !hasFuelStation ? (
        <div className={css.flag}>
          {fossilItems.length} fossil-fuel item
          {fossilItems.length === 1 ? '' : 's'} declared but no fuel-station
          drawn on the Vision-Layout canvas.
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className={css.empty}>
          Add inventory items first, then come back to assign housing.
        </div>
      ) : (
        <ul className={css.list}>
          {items.map((it) => {
            const housing = housingOptions.find(
              (h) => h.id === it.housingElementId,
            );
            return (
              <li key={it.id} className={css.row}>
                <div className={css.rowMain}>
                  <strong>{it.name || '(unnamed)'}</strong>
                  <span className={css.fuelChip}>{it.fuelType}</span>
                </div>
                <div className={css.rowAssign}>
                  <label>
                    <span>Housing</span>
                    <select
                      value={it.housingElementId ?? ''}
                      onChange={(e) =>
                        assignHousing(
                          projectId,
                          it.id,
                          e.target.value === '' ? null : e.target.value,
                        )
                      }
                    >
                      <option value="">— unassigned —</option>
                      {housingOptions.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.label ?? h.kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  {housing === undefined && it.housingElementId ? (
                    <span className={css.stale}>
                      Stale: housing element no longer on canvas.
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {housingOptions.length === 0 ? (
        <p className={css.hint}>
          Tip: draw a <code className={css.code}>machinery-shed</code> or{' '}
          <code className={css.code}>equipment-yard</code> on the Vision-Layout
          canvas to enable housing assignment.
        </p>
      ) : null}
    </div>
  );
}
