/**
 * ForageCarryingCapacityWidget — live result for `forage-carrying-capacity`.
 *
 * Forage carrying capacity from the precipitation-based proxy lifted into
 * computeForageCarryingCapacity (shared helper, same math the
 * PastureUtilizationCard uses). Reads annual precip from the climate
 * site-data layer (mirrors GrazingDashboard / PastureUtilizationCard).
 * Strictly ecological (forage / head / AU) — never financial.
 */
import { useMemo } from 'react';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import { computeForageCarryingCapacity } from '../../../../features/livestock/forageCarryingCapacityMath.js';
import css from './formulaWidget.module.css';

interface ClimateLite {
  annual_precip_mm?: number | null;
}

interface Props {
  projectId: string;
  resultLabel?: string;
}

export default function ForageCarryingCapacityWidget({
  projectId,
  resultLabel,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const siteData = useSiteData(projectId);
  const precip = useMemo(() => {
    const climate = siteData
      ? getLayerSummary<ClimateLite>(siteData, 'climate')
      : null;
    return climate?.annual_precip_mm ?? null;
  }, [siteData]);

  const result = useMemo(
    () => computeForageCarryingCapacity(paddocks, precip),
    [paddocks, precip],
  );

  const ready = result.totalRecommendedHead > 0;

  return (
    <div className={css.widget}>
      <h4 className={css.title}>
        {resultLabel ?? 'Forage carrying capacity'}
      </h4>
      {ready ? (
        <>
          <p className={css.hint}>
            Carrying capacity from a precipitation forage proxy (
            {result.capacityFactor.toFixed(2)}×
            {precip != null ? ` from ${precip.toFixed(0)} mm/yr` : ' — climate layer absent, neutral 1.0×'}
            ) across {result.totalAreaHa.toFixed(2)} ha.
          </p>
          <div className={css.statGrid}>
            <div className={css.stat}>
              <span className={css.statLabel}>Capacity (head)</span>
              <span className={css.statValue}>
                {result.totalRecommendedHead.toFixed(0)}
              </span>
            </div>
            <div className={css.stat}>
              <span className={css.statLabel}>Capacity (AU)</span>
              <span className={css.statValue}>
                {result.totalRecommendedAu.toFixed(1)}
              </span>
            </div>
            <div className={css.stat}>
              <span className={css.statLabel}>Factor</span>
              <span className={css.statValue}>
                {result.capacityFactor.toFixed(2)}×
              </span>
            </div>
          </div>
          <p className={css.footnote}>
            Coarse precipitation proxy — substitute NRCS forage productivity or
            on-site clipping data for peer-reviewed targets.
          </p>
        </>
      ) : (
        <p className={css.empty}>
          Awaiting paddock data — draw paddocks with an assigned species to
          estimate forage carrying capacity.
        </p>
      )}
    </div>
  );
}
