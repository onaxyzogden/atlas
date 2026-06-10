/**
 * VegetationSurveySummary -- the inline-workbench body for the s2-ecology-c1
 * "Vegetation survey" decision. Replaces the old editable toggle/percent list:
 * vegetation cover is now DRAWN on the Act map (VegetationSurveyPanel +
 * VegetationSurveyDrawHost) and percentages are computed automatically from
 * polygon acreage.
 *
 * This component:
 *   - subscribes to the vegetation-survey store for this project and shows a
 *     read-only, auto-computed per-community % summary (+ an "Unclassified /
 *     not yet surveyed" remainder);
 *   - offers an "Open map survey" button that flips the Act shell into the
 *     survey rail-takeover (`open(projectId)`); and
 *   - keeps the decision's existing `ecologyCommunities` FormValue in sync with
 *     the computed totals (so the Record button, validity gate, summary text,
 *     and the downstream Tier-3 feed all keep working unchanged).
 *
 * The draft-sync effect runs ONLY when at least one polygon has been drawn, so
 * opening the decision on a project with legacy hand-entered percentages does
 * not clobber them with an empty set before the steward re-surveys.
 */

import { useEffect, useMemo } from 'react';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import type { FormValue } from '../tier-shell/actToolCatalog.js';
import { VEG_COMMUNITIES } from '../tier-shell/EcologyCapture.js';
import { useV3Project } from '../../data/useV3Project.js';
import {
  useVegetationSurveyStore,
  selectVegetationSurveyTotals,
  VEG_COMMUNITY_COLORS,
  type VegCommunityKey,
} from '../../../store/vegetationSurveyStore.js';
import styles from './VegetationSurveySummary.module.css';

interface Props {
  projectId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
}

function asArr(v: FormValue[string] | undefined): string[] {
  return Array.isArray(v) ? v : [];
}

export default function VegetationSurveySummary({
  projectId,
  value,
  onChange,
}: Props) {
  const project = useV3Project(projectId);
  const open = useVegetationSurveyStore((s) => s.open);
  const byProject = useVegetationSurveyStore((s) => s.byProject);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );
  const siteAcres = project?.location.acreage ?? 0;
  const totals = useMemo(
    () => selectVegetationSurveyTotals(features, siteAcres),
    [features, siteAcres],
  );

  // Desired ecologyCommunities encoding from the computed totals (VEG_COMMUNITIES
  // order, rounded percentages -- same `key::pct` shape decodeEcology expects).
  const desired = useMemo(
    () =>
      VEG_COMMUNITIES.flatMap((c) => {
        const entry = totals.byCommunity[c.key];
        return entry ? [`${c.key}::${Math.round(entry.pct)}`] : [];
      }),
    [totals],
  );

  // Sync computed totals into the decision draft -- ONLY when at least one
  // polygon exists (never clobber legacy values with empty). Guarded by a
  // sorted-serialised compare so it converges and never loops.
  useEffect(() => {
    if (features.length === 0) return;
    const current = [...asArr(value.ecologyCommunities)].sort();
    const next = [...desired].sort();
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    onChange({ ecologyCommunities: desired });
  }, [features.length, desired, value, onChange]);

  const recorded = VEG_COMMUNITIES.filter((c) => totals.byCommunity[c.key]);

  return (
    <div className={styles.root} data-ecology-mode="vegetation">
      <div>
        <div className={styles.secLbl}>
          Community types recorded{' '}
          <span className={styles.secOptional}>-- % of site (drawn on map)</span>
        </div>

        {recorded.length === 0 ? (
          <div className={styles.empty} data-testid="veg-summary-empty">
            No community extents drawn yet. Open the map survey to draw each
            community -- percentages are computed automatically from the area
            you draw.
          </div>
        ) : (
          <div className={styles.list} data-testid="veg-summary-list">
            {recorded.map((c) => {
              const entry = totals.byCommunity[c.key];
              if (!entry) return null;
              return (
                <div key={c.key} className={styles.row}>
                  <span
                    className={styles.swatch}
                    style={{
                      background: VEG_COMMUNITY_COLORS[c.key as VegCommunityKey],
                    }}
                    aria-hidden="true"
                  />
                  <span className={styles.name}>{c.label}</span>
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
          data-testid="veg-open-survey"
          onClick={() => open(projectId)}
        >
          <MapIcon size={13} aria-hidden="true" />
          {recorded.length === 0 ? 'Open map survey' : 'Continue map survey'}
        </button>
      </div>

      <div className={styles.feedsBlock}>
        <ArrowRight size={13} className={styles.feedsIcon} aria-hidden="true" />
        <div className={styles.feedsTxt}>
          Vegetation communities feed <strong>Tier 3: Zone allocation</strong>{' '}
          -- identifying where native vegetation should be retained, enhanced,
          or restored as a design priority.
        </div>
      </div>
    </div>
  );
}
