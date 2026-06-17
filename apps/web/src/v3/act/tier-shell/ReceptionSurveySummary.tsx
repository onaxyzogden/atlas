/**
 * ReceptionSurveySummary -- the inline-workbench affordance that surfaces a
 * Tier-1 Land-Reading survey's Observe Output on its objective's lead decision.
 * Generic over a `createSurveyStore` bundle, so ONE component serves all four
 * new Land-Reading surveys (climate / infrastructure / land-health /
 * landscape-context), mirroring the bespoke SlopeSurveySummary /
 * VegetationSurveySummary triggers.
 *
 * Unlike those two, this is DISPLAY-ONLY: the drawn features ARE the record (the
 * reception "Observe Output"), counted separately into the tier-scoped
 * survey-record count that feeds the Tier-1 view -- so it neither reads nor
 * writes the decision draft. The decision keeps its own capture body below; this
 * rides above it (right under the intent lens) as the objective-level survey
 * affordance.
 *
 * It shows a per-class drawn-feature COUNT (the survey palettes are mixed
 * geometry -- points/lines/polygons -- so a count, not a %, is the honest
 * readout) and an "Open map survey" / "Continue map survey" button that flips
 * the Plan shell into this survey's rail-takeover (`bundle.useStore.open`),
 * closing any generic objective-tools takeover first so the two focused map
 * modes never coexist (parity with the slope/veg triggers).
 */

import { useMemo } from 'react';
import { ArrowRight, Map as MapIcon, Telescope } from 'lucide-react';
import { useObjectiveToolsTakeoverStore } from '../../../store/objectiveToolsTakeoverStore.js';
import type { SurveyStoreBundle } from '../../../store/createSurveyStore.js';
import styles from './ReceptionSurveySummary.module.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
  projectId: string;
}

export default function ReceptionSurveySummary({ bundle, projectId }: Props) {
  const open = bundle.useStore((s) => s.open);
  const byProject = bundle.useStore((s) => s.byProject);
  // Reverse cross-store hygiene: opening this survey closes any generic
  // objective-tools takeover so the two focused modes never coexist (the
  // takeover store closes the surveys on its side; this closes it back).
  const closeToolsTakeover = useObjectiveToolsTakeoverStore((s) => s.close);

  const features = useMemo(
    () => Object.values(byProject[projectId] ?? {}),
    [byProject, projectId],
  );

  // Per-class drawn-feature counts (mixed geometry -> count, not %).
  const countByClass = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of features) {
      map[f.surveyClass] = (map[f.surveyClass] ?? 0) + 1;
    }
    return map;
  }, [features]);

  const total = features.length;

  return (
    <div className={styles.root} data-testid="reception-survey-summary">
      <div className={styles.secLbl}>
        <Telescope size={13} className={styles.secIcon} aria-hidden="true" />
        Observe Output{' '}
        <span className={styles.secOptional}>-- recorded on the map</span>
      </div>

      {total === 0 ? (
        <div className={styles.empty} data-testid="reception-survey-empty">
          Nothing drawn yet. Open the map survey to record what the land shows --
          each class is drawn directly onto the map.
        </div>
      ) : (
        <div className={styles.list} data-testid="reception-survey-list">
          {bundle.config.classes.map((c) => {
            const n = countByClass[c.key] ?? 0;
            if (n === 0) return null;
            return (
              <div key={c.key} className={styles.row}>
                <span
                  className={styles.swatch}
                  style={{ background: c.color }}
                  aria-hidden="true"
                />
                <span className={styles.name}>{c.label}</span>
                <span className={styles.count}>{n}</span>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={styles.openBtn}
        data-testid="reception-open-survey"
        onClick={() => {
          closeToolsTakeover();
          open(projectId);
        }}
      >
        <MapIcon size={13} aria-hidden="true" />
        {total === 0 ? 'Open map survey' : 'Continue map survey'}
      </button>

      <div className={styles.feedsBlock}>
        <ArrowRight size={13} className={styles.feedsIcon} aria-hidden="true" />
        <div className={styles.feedsTxt}>
          This survey record is the objective's <strong>Observe Output</strong>{' '}
          -- it feeds forward within Plan, distinct from the Act handoff.
        </div>
      </div>
    </div>
  );
}
