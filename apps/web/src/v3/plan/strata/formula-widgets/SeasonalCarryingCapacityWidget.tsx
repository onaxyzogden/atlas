/**
 * SeasonalCarryingCapacityWidget — live result for `carrying-capacity-seasonal`.
 *
 * Per-species seasonal carrying capacity across the project's total paddock
 * area, mirroring GrazingDashboard's read pattern exactly (siteData climate
 * layer → growing-season days + frost dates, fallbacks growingSeasonDays:150).
 * Strictly ecological (head capacity); reuses computeSeasonalCarryingCapacity.
 */
import { useMemo } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import {
  computeSeasonalCarryingCapacity,
  type CarryingCapacity,
} from '../../../../features/livestock/livestockAnalysis.js';
import type { LivestockSpecies } from '../../../../store/livestockStore.js';
import css from './formulaWidget.module.css';

interface ClimateSummary {
  growing_season_days?: number;
  first_frost_date?: string;
  last_frost_date?: string;
}

interface Props {
  projectId: string;
  resultLabel?: string;
}

export default function SeasonalCarryingCapacityWidget({
  projectId,
  resultLabel,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const siteData = useSiteData(projectId);

  const env = useMemo(() => {
    const climate = siteData
      ? getLayerSummary<ClimateSummary>(siteData, 'climate')
      : null;
    return {
      growingSeasonDays: climate?.growing_season_days ?? 150,
      firstFrost: climate?.first_frost_date ?? null,
      lastFrost: climate?.last_frost_date ?? null,
    };
  }, [siteData]);

  const totalHa = useMemo(
    () => paddocks.reduce((s, p) => s + p.areaM2, 0) / 10_000,
    [paddocks],
  );

  const uniqueSpecies = useMemo(() => {
    const set = new Set<LivestockSpecies>();
    for (const p of paddocks) for (const sp of p.species) set.add(sp);
    return Array.from(set);
  }, [paddocks]);

  const capacities = useMemo<CarryingCapacity[]>(
    () =>
      uniqueSpecies.map((sp) =>
        computeSeasonalCarryingCapacity(sp, totalHa, env.growingSeasonDays, {
          first: env.firstFrost,
          last: env.lastFrost,
        }),
      ),
    [uniqueSpecies, totalHa, env],
  );

  const ready = totalHa > 0 && capacities.length > 0;

  return (
    <div className={css.widget}>
      <h4 className={css.title}>{resultLabel ?? 'Seasonal carrying capacity'}</h4>
      {ready ? (
        <>
          <p className={css.hint}>
            Per-species capacity across {totalHa.toFixed(1)} ha, adjusted for a{' '}
            {env.growingSeasonDays}-day growing season
            {env.firstFrost && env.lastFrost ? ' and frost window' : ''}.
          </p>
          <ul className={css.list}>
            {capacities.map((c) => (
              <li key={c.species} className={css.row}>
                <span className={css.rowName}>{c.label}</span>
                <span className={css.rowValue}>
                  {c.adjustedCapacity} head ({Math.round(c.seasonMultiplier * 100)}% season)
                </span>
              </li>
            ))}
          </ul>
          <p className={css.footnote}>
            Coarse planning heuristic from species typical-stocking × area ×
            season — not a dry-matter forage budget.
          </p>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting paddock data — draw at least one paddock with an assigned
          species to compute seasonal carrying capacity.
        </p>
      )}
    </div>
  );
}
