/**
 * VegetationSurveyPanel -- Act right-rail takeover for the s2-ecology-c1
 * "Vegetation survey". Opened by the DecisionWorkingPanel "Open map survey"
 * button (via `useVegetationSurveyStore.getState().open(projectId)`);
 * `ActTierShell` renders it in the `rightBody` slot in place of the workbench
 * while the survey is active.
 *
 * Mirrors `SectorsEditorPanel` structure: a Done header, then one row per
 * vegetation community. Selecting a community row sets `activeCommunity` AND
 * arms the `act.ecology.veg-survey` map tool, so the next polygon the steward
 * draws is tagged to that community. Each row shows the live, auto-computed
 * `% of site` (summed drawn acres / parcel acres, via `resolveSiteAcres`) and a
 * feature count; a trailing "Unclassified / not yet surveyed" row surfaces the
 * coverage gap.
 * Per-feature delete lives in an expandable list under each active row.
 */

import { useMemo } from 'react';
import { Trees } from 'lucide-react';
import { useV3Project } from '../../data/useV3Project.js';
import { resolveSiteAcres } from '../../data/siteArea.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  useVegetationSurveyStore,
  selectVegetationSurveyTotals,
  VEG_COMMUNITY_COLORS,
  type VegCommunityKey,
} from '../../../store/vegetationSurveyStore.js';
import { VEG_COMMUNITIES } from '../tier-shell/EcologyCapture.js';
import styles from './VegetationSurveyPanel.module.css';

interface Props {
  projectId: string;
}

const VEG_SURVEY_TOOL = 'act.ecology.veg-survey' as const;

export default function VegetationSurveyPanel({ projectId }: Props) {
  const project = useV3Project(projectId);
  const close = useVegetationSurveyStore((s) => s.close);
  const activeCommunity = useVegetationSurveyStore((s) => s.activeCommunity);
  const setActiveCommunity = useVegetationSurveyStore((s) => s.setActiveCommunity);
  const removeFeature = useVegetationSurveyStore((s) => s.removeFeature);
  const byProject = useVegetationSurveyStore((s) => s.byProject);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );

  const siteAcres = resolveSiteAcres(project?.location);
  const totals = useMemo(
    () => selectVegetationSurveyTotals(features, siteAcres),
    [features, siteAcres],
  );

  const featuresByCommunity = useMemo(() => {
    const map: Record<string, typeof features> = {};
    for (const f of features) {
      (map[f.community] ??= []).push(f);
    }
    return map;
  }, [features]);

  const handleDone = () => {
    // Disarm the draw tool, then close the takeover.
    useMapToolStore.getState().setActiveTool(null);
    close();
  };

  const handleSelect = (community: VegCommunityKey) => {
    if (activeCommunity === community) {
      // Toggle off -> stop drawing.
      setActiveCommunity(null);
      useMapToolStore.getState().setActiveTool(null);
      return;
    }
    setActiveCommunity(community);
    useMapToolStore.getState().setActiveTool(VEG_SURVEY_TOOL);
  };

  const fmtPct = (pct: number) => `${Math.round(pct)}%`;
  const fmtAcres = (acres: number) =>
    acres >= 10 ? acres.toFixed(0) : acres.toFixed(1);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Trees aria-hidden="true" size={14} />
          Vegetation survey
          {features.length > 0 ? (
            <span className={styles.count}>{features.length}</span>
          ) : null}
        </span>
        <button type="button" className={styles.doneBtn} onClick={handleDone}>
          Done
        </button>
      </div>

      <p className={styles.hint}>
        {activeCommunity
          ? 'Draw a polygon on the map to record this community. Percentages update automatically.'
          : 'Select a community, then draw its extent on the map.'}
      </p>

      <ul className={styles.list}>
        {VEG_COMMUNITIES.map((c) => {
          const key = c.key as VegCommunityKey;
          const entry = totals.byCommunity[key];
          const pct = entry?.pct ?? 0;
          const count = entry?.count ?? 0;
          const acres = entry?.acres ?? 0;
          const selected = activeCommunity === key;
          const rowFeatures = featuresByCommunity[key] ?? [];
          return (
            <li key={key} className={styles.rowWrap}>
              <button
                type="button"
                className={`${styles.row} ${selected ? styles.rowActive : ''}`}
                aria-pressed={selected}
                onClick={() => handleSelect(key)}
              >
                <span
                  className={styles.swatch}
                  style={{ background: VEG_COMMUNITY_COLORS[key] }}
                  aria-hidden="true"
                />
                <span className={styles.label}>{c.label}</span>
                <span className={styles.pct}>{fmtPct(pct)}</span>
                <span className={styles.meta}>
                  {count > 0 ? `${count}·${fmtAcres(acres)}ac` : '—'}
                </span>
              </button>

              {selected && rowFeatures.length > 0 ? (
                <ul className={styles.features}>
                  {rowFeatures.map((f, i) => (
                    <li key={f.id} className={styles.featureRow}>
                      <span className={styles.featureLabel}>
                        Polygon {i + 1} · {fmtAcres(f.acreage)} ac
                      </span>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        aria-label={`Remove ${c.label} polygon ${i + 1}`}
                        title="Remove this polygon"
                        onClick={() => removeFeature(projectId, f.id)}
                      >
                        {'×'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}

        <li className={`${styles.rowWrap} ${styles.unclassifiedWrap}`}>
          <div className={`${styles.row} ${styles.unclassifiedRow}`}>
            <span
              className={`${styles.swatch} ${styles.swatchEmpty}`}
              aria-hidden="true"
            />
            <span className={styles.label}>Unclassified / not yet surveyed</span>
            <span className={styles.pct}>{fmtPct(totals.unclassifiedPct)}</span>
            <span className={styles.meta}>—</span>
          </div>
        </li>
      </ul>
    </div>
  );
}
