/**
 * SlopeSurveyPanel -- Act right-rail takeover for the s2-terrain-c2 slope
 * survey. Opened by the SlopeSurveySummary "Open map survey" button (via
 * `useSlopeSurveyStore.getState().open(projectId)`); `ActTierShell` renders it
 * in the `rightBody` slot in place of the workbench while the survey is active.
 *
 * Sibling of VegetationSurveyPanel, with one structural difference: slope
 * exposes a bottom-rail draw tool PER class, so the armed map tool itself
 * encodes the class. A row here is the SECOND arming surface -- clicking it
 * arms that class's 'act.terrain.slope-*' tool (so the steward can arm from the
 * panel or the bottom tray interchangeably). Each row shows the live,
 * auto-computed `% of site` (summed drawn acres / parcel acres, via
 * `resolveSiteAcres`) and a feature count; a trailing "Unclassified / not yet
 * surveyed" row surfaces
 * the coverage gap. Per-feature delete lives in an expandable list under the
 * active row.
 */

import { useMemo } from 'react';
import { Mountain } from 'lucide-react';
import { useV3Project } from '../../data/useV3Project.js';
import { resolveSiteAcres } from '../../data/siteArea.js';
import {
  useMapToolStore,
  type MapToolId,
} from '../../observe/components/measure/useMapToolStore.js';
import {
  useSlopeSurveyStore,
  selectSlopeSurveyTotals,
  SLOPE_CLASS_COLORS,
  SLOPE_TOOL_BY_CLASS,
  type SlopeClassKey,
} from '../../../store/slopeSurveyStore.js';
import { SLOPE_CLASSES } from '../tier-shell/TerrainCapture.js';
import styles from './SlopeSurveyPanel.module.css';

interface Props {
  projectId: string;
}

export default function SlopeSurveyPanel({ projectId }: Props) {
  const project = useV3Project(projectId);
  const close = useSlopeSurveyStore((s) => s.close);
  const removeFeature = useSlopeSurveyStore((s) => s.removeFeature);
  const byProject = useSlopeSurveyStore((s) => s.byProject);
  const activeTool = useMapToolStore((s) => s.activeTool);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );

  const siteAcres = resolveSiteAcres(project?.location);
  const totals = useMemo(
    () => selectSlopeSurveyTotals(features, siteAcres),
    [features, siteAcres],
  );

  const featuresByClass = useMemo(() => {
    const map: Record<string, typeof features> = {};
    for (const f of features) {
      (map[f.slopeClass] ??= []).push(f);
    }
    return map;
  }, [features]);

  const handleDone = () => {
    // Disarm the draw tool, then close the takeover.
    useMapToolStore.getState().setActiveTool(null);
    close();
  };

  const handleSelect = (key: SlopeClassKey) => {
    // SLOPE_TOOL_BY_CLASS is typed string (the store stays decoupled from the
    // MapToolId union); every value is a member of that union by construction.
    const tool = SLOPE_TOOL_BY_CLASS[key] as MapToolId;
    if (activeTool === tool) {
      // Toggle off -> stop drawing.
      useMapToolStore.getState().setActiveTool(null);
      return;
    }
    useMapToolStore.getState().setActiveTool(tool);
  };

  const slopeToolArmed =
    activeTool != null &&
    (Object.values(SLOPE_TOOL_BY_CLASS) as string[]).includes(activeTool);

  const fmtPct = (pct: number) => `${Math.round(pct)}%`;
  const fmtAcres = (acres: number) =>
    acres >= 10 ? acres.toFixed(0) : acres.toFixed(1);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Mountain aria-hidden="true" size={14} />
          Slope survey
          {features.length > 0 ? (
            <span className={styles.count}>{features.length}</span>
          ) : null}
        </span>
        <button type="button" className={styles.doneBtn} onClick={handleDone}>
          Done
        </button>
      </div>

      <p className={styles.hint}>
        {slopeToolArmed
          ? 'Draw a polygon on the map to record this slope class. Percentages update automatically.'
          : 'Select a slope class (here or in the bottom toolbar), then draw its extent on the map.'}
      </p>

      <ul className={styles.list}>
        {SLOPE_CLASSES.map((c) => {
          const key = c.key as SlopeClassKey;
          const entry = totals.byClass[key];
          const pct = entry?.pct ?? 0;
          const count = entry?.count ?? 0;
          const acres = entry?.acres ?? 0;
          const selected = activeTool === SLOPE_TOOL_BY_CLASS[key];
          const rowFeatures = featuresByClass[key] ?? [];
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
                  style={{ background: SLOPE_CLASS_COLORS[key] }}
                  aria-hidden="true"
                />
                <span className={styles.label}>
                  {c.label} <span className={styles.sub}>{c.sub}</span>
                </span>
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
