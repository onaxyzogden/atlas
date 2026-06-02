/**
 * PaddockStockingDensityWidget — live result for `paddock-stocking-density`.
 *
 * Per-paddock recommended stocking (head/ha) via
 * computePaddockRecommendedStocking, which reads each paddock's pastureQuality
 * (ground truth) first. Advisory only. Strictly ecological — never financial.
 */
import { useMemo } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { computePaddockRecommendedStocking } from '../../../../features/livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../../../../features/livestock/speciesData.js';
import css from './formulaWidget.module.css';

interface Props {
  projectId: string;
  resultLabel?: string;
}

export default function PaddockStockingDensityWidget({
  projectId,
  resultLabel,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const rows = useMemo(
    () =>
      paddocks
        .filter((p) => p.species.length > 0)
        .map((p) => {
          const primary = p.species[0]!;
          const info = LIVESTOCK_SPECIES[primary];
          return {
            id: p.id,
            name: p.name,
            label: info?.label ?? primary,
            unit: info?.stockingUnit ?? 'head',
            recommended: computePaddockRecommendedStocking(p),
            quality: p.pastureQuality,
          };
        }),
    [paddocks],
  );

  return (
    <div className={css.widget}>
      <h4 className={css.title}>
        {resultLabel ?? 'Recommended stocking density'}
      </h4>
      {rows.length > 0 ? (
        <>
          <p className={css.hint}>
            Advisory per-paddock recommended density. Pasture-quality grade is
            ground truth and overrides the derived forage multiplier when set.
          </p>
          <ul className={css.list}>
            {rows.map((r) => (
              <li key={r.id} className={css.row}>
                <span className={css.rowName}>
                  {r.name} · {r.label}
                  {r.quality ? ` (${r.quality})` : ''}
                </span>
                <span className={css.rowValue}>
                  {r.recommended.toFixed(1)} {r.unit}/ha
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting paddock data — assign a primary species to at least one
          paddock to see recommended stocking density.
        </p>
      )}
    </div>
  );
}
