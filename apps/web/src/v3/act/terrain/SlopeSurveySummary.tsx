/**
 * SlopeSurveySummary -- the inline-workbench body for the s2-terrain-c2
 * "Slope gradients & aspects" decision. Replaces the old editable per-class
 * percent inputs: slope distribution is now DRAWN on the Act map
 * (SlopeSurveyPanel + SlopeSurveyDrawHost) and percentages are computed
 * automatically from polygon acreage as % of total site area.
 *
 * Drawing automates ONLY the slope-class % allocation. The compass `aspects`
 * field is NOT drawable, so this component keeps the manual aspects
 * multi-select (reusing TerrainCapture's COMPASS_DIRS) alongside the
 * auto-computed summary.
 *
 * This component:
 *   - subscribes to the slope-survey store for this project and shows a
 *     read-only, auto-computed per-class % summary (+ an "Unclassified / not
 *     yet surveyed" remainder);
 *   - offers an "Open map survey" button that flips the Act shell into the
 *     survey rail-takeover (`open(projectId)`);
 *   - keeps the manual aspects multi-select; and
 *   - keeps the decision's `terrainSlope` + `terrainAspects` FormValue in sync
 *     (so the Record button, validity gate, summary text, and the downstream
 *     Tier-3 feed all keep working unchanged).
 *
 * Because the parent replaces the whole FormValue on each onChange (the capture
 * owns its subtree), every write here emits BOTH terrainSlope and
 * terrainAspects together. The draft-sync effect runs ONLY when at least one
 * polygon has been drawn, so opening the decision on a project with legacy
 * hand-entered percentages does not clobber them with an empty set.
 */

import { useEffect, useMemo } from 'react';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import type { FormValue } from '../tier-shell/actToolCatalog.js';
import { SLOPE_CLASSES, COMPASS_DIRS } from '../tier-shell/TerrainCapture.js';
import { useV3Project } from '../../data/useV3Project.js';
import {
  useSlopeSurveyStore,
  selectSlopeSurveyTotals,
  SLOPE_CLASS_COLORS,
  type SlopeClassKey,
} from '../../../store/slopeSurveyStore.js';
import styles from './SlopeSurveySummary.module.css';

interface Props {
  projectId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

function asArr(v: FormValue[string] | undefined): string[] {
  return Array.isArray(v) ? v : [];
}

const COMPASS_SET = new Set(COMPASS_DIRS);

export default function SlopeSurveySummary({
  projectId,
  value,
  onChange,
}: Props) {
  const project = useV3Project(projectId);
  const open = useSlopeSurveyStore((s) => s.open);
  const byProject = useSlopeSurveyStore((s) => s.byProject);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );
  const siteAcres = project?.location.acreage ?? 0;
  const totals = useMemo(
    () => selectSlopeSurveyTotals(features, siteAcres),
    [features, siteAcres],
  );

  // Current manual aspects (filtered to the valid compass set) -- the draft is
  // the source of truth for aspects (drawing does not touch them).
  const aspects = useMemo(
    () => asArr(value.terrainAspects).filter((a) => COMPASS_SET.has(a)),
    [value.terrainAspects],
  );

  // Desired terrainSlope encoding from the computed totals (SLOPE_CLASSES
  // order, rounded percentages -- same `key::pct` shape decodeTerrain expects).
  const desired = useMemo(
    () =>
      SLOPE_CLASSES.flatMap((c) => {
        const entry = totals.byClass[c.key];
        return entry ? [`${c.key}::${Math.round(entry.pct)}`] : [];
      }),
    [totals],
  );

  // Sync computed totals into the decision draft -- ONLY when at least one
  // polygon exists (never clobber legacy values with empty). Emits both fields
  // (the parent replaces the whole FormValue). Guarded by a sorted-serialised
  // compare so it converges and never loops.
  useEffect(() => {
    if (features.length === 0) return;
    const current = [...asArr(value.terrainSlope)].sort();
    const next = [...desired].sort();
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    onChange({ terrainSlope: desired, terrainAspects: aspects });
  }, [features.length, desired, aspects, value, onChange]);

  const toggleAspect = (dir: string) => {
    const next = aspects.includes(dir)
      ? aspects.filter((a) => a !== dir)
      : [...aspects, dir];
    onChange({ terrainSlope: asArr(value.terrainSlope), terrainAspects: next });
  };

  const recorded = SLOPE_CLASSES.filter((c) => totals.byClass[c.key]);

  return (
    <div className={styles.root} data-terrain-mode="slope">
      <div>
        <div className={styles.secLbl}>
          Slope distribution{' '}
          <span className={styles.secOptional}>-- % of site (drawn on map)</span>
        </div>

        {recorded.length === 0 ? (
          <div className={styles.empty} data-testid="slope-summary-empty">
            No slope extents drawn yet. Open the map survey to draw each slope
            class -- percentages are computed automatically from the area you
            draw.
          </div>
        ) : (
          <div className={styles.list} data-testid="slope-summary-list">
            {recorded.map((c) => {
              const entry = totals.byClass[c.key];
              if (!entry) return null;
              return (
                <div key={c.key} className={styles.row}>
                  <span
                    className={styles.swatch}
                    style={{
                      background: SLOPE_CLASS_COLORS[c.key as SlopeClassKey],
                    }}
                    aria-hidden="true"
                  />
                  <span className={styles.name}>
                    {c.label} <span className={styles.sub}>{c.sub}</span>
                  </span>
                  <span className={styles.pct}>{Math.round(entry.pct)}%</span>
                </div>
              );
            })}
            <div className={`${styles.row} ${styles.unclassified}`}>
              <span
                className={`${styles.swatch} ${styles.swatchEmpty}`}
                aria-hidden="true"
              />
              <span className={styles.name}>Unclassified / not yet surveyed</span>
              <span className={styles.pct}>
                {Math.round(totals.unclassifiedPct)}%
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className={styles.openBtn}
          data-testid="slope-open-survey"
          onClick={() => open(projectId)}
        >
          <MapIcon size={13} aria-hidden="true" />
          {recorded.length === 0 ? 'Open map survey' : 'Continue map survey'}
        </button>
      </div>

      <div>
        <div className={styles.secLbl}>
          Aspects present{' '}
          <span className={styles.secOptional}>
            (tick all that exist on the site -- multi-select)
          </span>
        </div>
        <div className={styles.aspectHint}>
          In the southern hemisphere, N-facing = warm/productive &middot;
          S-facing = cool/sheltered
        </div>
        <div className={styles.dirChips} data-testid="aspect-chips">
          {COMPASS_DIRS.map((dir) => {
            const on = aspects.includes(dir);
            return (
              <button
                key={dir}
                type="button"
                className={styles.dirChip}
                data-testid={`aspect-${dir}`}
                data-on={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => toggleAspect(dir)}
              >
                {dir}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.feedsBlock}>
        <ArrowRight size={13} className={styles.feedsIcon} aria-hidden="true" />
        <div className={styles.feedsTxt}>
          Slope distribution feeds <strong>Tier 3: Zone allocation</strong>.
          Areas over 20% slope are typically excluded from vehicle access and
          intensive production without earthworks assessment.
        </div>
      </div>
    </div>
  );
}
