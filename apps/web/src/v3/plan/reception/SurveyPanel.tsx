/**
 * SurveyPanel -- the rail-width takeover editor for ONE reception survey.
 * Generic over a `createSurveyStore` bundle (mirrors SlopeSurveyPanel). Each
 * class row arms that class's draw tool (bundle.TOOL_BY_CLASS) and shows a live
 * readout keyed off the class's geometry kind:
 *   - poly  -> `% of site` (summed drawn acres / parcel acres, via
 *              resolveSiteAcres) + a "count.acres" meta;
 *   - line  -> total length (m / km) + count;
 *   - point -> a count.
 * A trailing "Unclassified / not yet surveyed" row surfaces the polygon coverage
 * gap -- computed from the POLY classes only (line/point pct is not meaningful),
 * and shown only when the survey has >= 1 area class. Per-feature delete lives in
 * an expandable list under the active row.
 *
 * The optional `footnote` is the seam the 2.5 livestock-water panel uses to
 * surface the `stock-water-demand` formula reference (a read-only caption -- the
 * survey records observation, never a fabricated demand figure).
 */

import { useMemo } from 'react';
import { Telescope, type LucideIcon } from 'lucide-react';
import { useV3Project } from '../../data/useV3Project.js';
import { resolveSiteAcres } from '../../data/siteArea.js';
import {
  useMapToolStore,
  type MapToolId,
} from '../../observe/components/measure/useMapToolStore.js';
import {
  selectSurveyTotals,
  type SurveyFeatureKind,
  type SurveyStoreBundle,
} from '../../../store/createSurveyStore.js';
import styles from './SurveyPanel.module.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
  projectId: string;
  /** Header label (e.g. "Water & hydrology survey"). */
  title?: string;
  /** Header icon (lucide). Defaults to a telescope (systems-reading lens). */
  icon?: LucideIcon;
  /** Optional read-only caption under the list (2.5 surfaces the demand formula). */
  footnote?: string;
}

export default function SurveyPanel({
  bundle,
  projectId,
  title = 'Reception survey',
  icon: Icon = Telescope,
  footnote,
}: Props) {
  const project = useV3Project(projectId);
  const close = bundle.useStore((s) => s.close);
  const removeFeature = bundle.useStore((s) => s.removeFeature);
  const byProject = bundle.useStore((s) => s.byProject);
  const activeTool = useMapToolStore((s) => s.activeTool);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );

  const siteAcres = resolveSiteAcres(project?.location);
  const totals = useMemo(
    () => selectSurveyTotals(features, siteAcres),
    [features, siteAcres],
  );

  const featuresByClass = useMemo(() => {
    const map: Record<string, typeof features> = {};
    for (const f of features) {
      (map[f.surveyClass] ??= []).push(f);
    }
    return map;
  }, [features]);

  const handleDone = () => {
    useMapToolStore.getState().setActiveTool(null);
    close();
  };

  const handleSelect = (key: string) => {
    const tool = bundle.TOOL_BY_CLASS[key] as MapToolId;
    if (activeTool === tool) {
      useMapToolStore.getState().setActiveTool(null);
      return;
    }
    useMapToolStore.getState().setActiveTool(tool);
  };

  const toolArmed =
    activeTool != null &&
    (Object.values(bundle.TOOL_BY_CLASS) as string[]).includes(activeTool);

  // Polygon coverage remainder: only area classes contribute (line/point pct is
  // nonsense), so re-derive the poly pct sum rather than reading unclassifiedPct.
  const hasPoly = bundle.config.classes.some((c) => c.kind === 'poly');
  const polyPctSum = bundle.config.classes.reduce(
    (acc, c) => (c.kind === 'poly' ? acc + (totals.byClass[c.key]?.pct ?? 0) : acc),
    0,
  );
  const unclassifiedPct = Math.max(0, 100 - polyPctSum);

  const fmtPct = (pct: number) => `${Math.round(pct)}%`;
  const fmtAcres = (a: number) => (a >= 10 ? a.toFixed(0) : a.toFixed(1));
  const fmtMeters = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
  const fmtFeature = (kind: SurveyFeatureKind, measure: number) =>
    kind === 'poly'
      ? `${fmtAcres(measure)} ac`
      : kind === 'line'
        ? fmtMeters(measure)
        : 'point';
  const featureNoun = (kind: SurveyFeatureKind) =>
    kind === 'point' ? 'Point' : kind === 'line' ? 'Line' : 'Polygon';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Icon aria-hidden="true" size={14} />
          {title}
          {features.length > 0 ? (
            <span className={styles.count}>{features.length}</span>
          ) : null}
        </span>
        <button type="button" className={styles.doneBtn} onClick={handleDone}>
          Done
        </button>
      </div>

      <p className={styles.hint}>
        {toolArmed
          ? 'Draw on the map to record this class. Readouts update automatically.'
          : 'Select a class, then draw its zone, path, or point on the map.'}
      </p>

      <ul className={styles.list}>
        {bundle.config.classes.map((c) => {
          const entry = totals.byClass[c.key];
          const pct = entry?.pct ?? 0;
          const count = entry?.count ?? 0;
          const measure = entry?.measure ?? 0;
          const selected = activeTool === bundle.TOOL_BY_CLASS[c.key];
          const rowFeatures = featuresByClass[c.key] ?? [];
          const metaText =
            count > 0
              ? c.kind === 'poly'
                ? `${count}·${fmtAcres(measure)}ac`
                : c.kind === 'line'
                  ? `${count}·${fmtMeters(measure)}`
                  : `${count}`
              : '—';
          return (
            <li key={c.key} className={styles.rowWrap}>
              <button
                type="button"
                className={`${styles.row} ${selected ? styles.rowActive : ''}`}
                aria-pressed={selected}
                onClick={() => handleSelect(c.key)}
              >
                <span
                  className={styles.swatch}
                  style={{ background: c.color }}
                  aria-hidden="true"
                />
                <span className={styles.label}>{c.label}</span>
                <span className={styles.pct}>
                  {c.kind === 'poly' ? fmtPct(pct) : '—'}
                </span>
                <span className={styles.meta}>{metaText}</span>
              </button>

              {selected && rowFeatures.length > 0 ? (
                <ul className={styles.features}>
                  {rowFeatures.map((f, i) => (
                    <li key={f.id} className={styles.featureRow}>
                      <span className={styles.featureLabel}>
                        {featureNoun(c.kind)} {i + 1} · {fmtFeature(c.kind, f.measure)}
                      </span>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        aria-label={`Remove ${c.label} ${i + 1}`}
                        title="Remove this feature"
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

        {hasPoly ? (
          <li className={`${styles.rowWrap} ${styles.unclassifiedWrap}`}>
            <div className={`${styles.row} ${styles.unclassifiedRow}`}>
              <span
                className={`${styles.swatch} ${styles.swatchEmpty}`}
                aria-hidden="true"
              />
              <span className={styles.label}>Unclassified / not yet surveyed</span>
              <span className={styles.pct}>{fmtPct(unclassifiedPct)}</span>
              <span className={styles.meta}>—</span>
            </div>
          </li>
        ) : null}
      </ul>

      {footnote ? <p className={styles.footnote}>{footnote}</p> : null}
    </div>
  );
}
