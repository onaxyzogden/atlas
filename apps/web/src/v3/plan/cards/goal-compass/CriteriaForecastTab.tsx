/**
 * Goal Compass tab 4/4 — criteria forecast roll-up.
 *
 * Runs the engine + forecast against the current goal tree + site profile
 * and shows each criterion's projected value at year buckets {1,3,5,7,10,20}
 * plus a confidence indicator derived from the manual-facet pct.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useUtilityStore } from '../../../../store/utilityStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useAllStructures } from '../../../../store/builtEnvironmentSelectors.js';
import { useRotationPlanStore } from '../../../../store/rotationPlanStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useDesignElementsForProject } from '../../../../store/builtEnvironmentSelectors.js';
import { computeRestCompliancePct } from '../../../../features/livestock/rotationSequenceMath.js';
import { computeSilvopastureIntegrationPct } from '../../../../features/agroforestry/guildLivestockMath.js';
import { welfareSummaryForProject } from '../../../../features/livestock/welfarePass.js';
import { runSequencingEngine } from '../../engine/goalCompass/sequencingEngine.js';
import {
  computeForecast,
  FORECAST_YEARS,
} from '../../engine/goalCompass/criteriaForecast.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function CriteriaForecastTab({ project }: Props) {
  const goalTree = useGoalTreeStore((s) => s.goalTreesByProject[project.id] ?? null);
  const siteProfile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const allWaterNodes = useWaterSystemsStore((st) => st.waterNodes);
  const allStructures = useAllStructures();
  const rotationPlan = useRotationPlanStore(
    (s) => s.byProject[project.id] ?? null,
  );
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const designElements = useDesignElementsForProject(project.id);

  const currentValues = useMemo<Record<string, number>>(() => {
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const waterNodes = allWaterNodes.filter((n) => n.projectId === project.id);
    const structures = allStructures.filter((s2) => s2.projectId === project.id);
    const { paddockCount, passPct } = welfareSummaryForProject(
      paddocks,
      utilities,
      structures,
      waterNodes,
    );
    return {
      'livestock-paddocks-active-count': paddockCount,
      'livestock-welfare-pass-pct': passPct,
      'livestock-rotation-rest-compliance-pct': computeRestCompliancePct(
        paddocks,
        rotationPlan,
      ),
      'silvopasture-integration-pct': computeSilvopastureIntegrationPct({
        projectId: project.id,
        cropAreas: allCropAreas,
        designElements,
        paddocks: allPaddocks,
        guilds: allGuilds,
      }),
    };
  }, [
    allPaddocks,
    allUtilities,
    allWaterNodes,
    allStructures,
    rotationPlan,
    allGuilds,
    allCropAreas,
    designElements,
    project.id,
  ]);

  const forecast = useMemo(() => {
    if (!goalTree || !siteProfile) return null;
    const result = runSequencingEngine(goalTree, siteProfile, project.id);
    return computeForecast(result, goalTree, siteProfile, currentValues);
  }, [goalTree, siteProfile, project.id, currentValues]);

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 5 of 5</span>
        <h2 className={styles.title}>Criteria forecast</h2>
        <p className={styles.lede}>
          Projected criterion values at Year 1 / 3 / 5 / 7 / 10 / 20 from the
          generated plan. Confidence reflects how many site-profile facets
          are unverified manual entries.
        </p>
        {forecast ? (
          <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(232,220,200,0.6)' }}>
            Confidence: <ConfidencePill level={forecast.confidence} /> ·{' '}
            {forecast.manualFacetPct.toFixed(0)}% of facets are manual
          </div>
        ) : null}
      </div>

      {!forecast ? (
        <div className={styles.empty}>
          Fill Goal tree + Site profile tabs to see the forecast.
        </div>
      ) : (
        <section className={styles.section}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Criterion</th>
                <th className="num">Target</th>
                {FORECAST_YEARS.map((y) => (
                  <th key={y} className="num">
                    Y{y}
                  </th>
                ))}
                <th>By deadline</th>
              </tr>
            </thead>
            <tbody>
              {forecast.criteria.map((c) => (
                <tr key={c.criterion.id}>
                  <td>
                    <strong>{c.criterion.description}</strong>{' '}
                    <span style={{ color: 'rgba(232,220,200,0.45)' }}>
                      ({c.criterion.unit})
                    </span>
                  </td>
                  <td className="num">{c.criterion.target}</td>
                  {FORECAST_YEARS.map((y) => {
                    const p = c.points.find((pt) => pt.year === y);
                    return (
                      <td key={y} className="num">
                        {p ? p.value.toFixed(0) : '—'}
                      </td>
                    );
                  })}
                  <td>
                    {c.meetsTargetByDeadline ? (
                      <span className={`${styles.pill} ${styles.pillMet}`}>
                        Y{c.criterion.deadlineYear} ✓
                      </span>
                    ) : (
                      <span className={`${styles.pill} ${styles.pillUnmet}`}>
                        Y{c.criterion.deadlineYear} ✗
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {forecast.criteria.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    No criteria defined yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ConfidencePill({ level }: { level: 'low' | 'medium' | 'high' }) {
  const cls =
    level === 'high'
      ? styles.pillMet
      : level === 'medium'
        ? styles.pillPartial
        : styles.pillUnmet;
  return <span className={`${styles.pill} ${cls}`}>{level}</span>;
}
