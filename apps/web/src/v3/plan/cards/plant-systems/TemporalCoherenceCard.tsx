/**
 * TemporalCoherenceCard — Plan Module 4 (Plant Systems), readout.
 *
 * Surfaces the canopy-overlap evaluator behind the temporal slider
 * (Holmgren P9 — Use small and slow solutions, 2026-04-28 Permaculture
 * Scholar review Rec #2). Lists every pair of placed vegetation point
 * trees whose canopies overlap within a 5-year forward lookahead from
 * the current scrub year, plus the project's design-horizon snap chip.
 *
 * Reads:
 *   - `useTemporalScrubStore.currentYear` — drives the lookahead window.
 *   - `useLandDesignStore.byProject[projectId]` — vegetation point list.
 *   - `getDesignHorizon(project)` — default snap target.
 *
 * Writes:
 *   - `updateProject(id, { metadata: { designHorizonYears: y } })` via
 *     the "Set as default" chip.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useProjectStore,
  getDesignHorizon,
} from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import { useTemporalScrubStore } from '../../canvas/temporalScrubStore.js';
import { findOverlaps, type CanopyOverlap } from './temporalCoherenceMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LOOKAHEAD_YEARS = 5;

function fmt(m: number): string {
  return `${m.toFixed(1)} m`;
}

export default function TemporalCoherenceCard({ project }: Props) {
  const currentYear = useTemporalScrubStore((s) => s.currentYear);
  const setYear = useTemporalScrubStore((s) => s.setYear);
  const byProject = useLandDesignStore((s) => s.byProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const horizon = getDesignHorizon(project);

  const vegetation = useMemo(() => {
    const list = byProject[project.id] ?? [];
    return list.filter(
      (e) => e.category === 'vegetation' && e.geometry.type === 'Point',
    );
  }, [byProject, project.id]);

  const overlapsNext5y = useMemo<CanopyOverlap[]>(
    () => findOverlaps(vegetation, currentYear, LOOKAHEAD_YEARS),
    [vegetation, currentYear],
  );

  const overlapsByHorizon = useMemo<CanopyOverlap[]>(
    () =>
      findOverlaps(
        vegetation,
        currentYear,
        Math.max(0, horizon - currentYear),
      ),
    [vegetation, currentYear, horizon],
  );

  const onSetHorizon = () => {
    updateProject(project.id, {
      metadata: {
        ...(project.metadata ?? {}),
        designHorizonYears: currentYear,
      },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Canopy maturity · Year {currentYear}</h1>
        <p className={styles.lede}>
          Scrub the year cursor (bottom of the canvas) to preview canopy
          maturity for placed trees. This card lists every pair whose
          crowns will overlap within the next {LOOKAHEAD_YEARS} years from
          the current cursor — flagging crowding before it costs a tree
          (Holmgren P9, Small &amp; Slow Solutions). All trees are assumed
          planted at Year 0; per-tree planted-year override lands in v2.
        </p>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project rollup</h2>
        <div className={styles.statRow}>
          <span>Placed trees</span>
          <span>{vegetation.length}</span>
        </div>
        <div className={styles.statRow}>
          <span>Pairs overlapping in next {LOOKAHEAD_YEARS} y</span>
          <span>
            {overlapsNext5y.length}
            {' · '}
            <span
              className={`${styles.pill} ${
                overlapsNext5y.length > 0
                  ? (styles.pillUnmet ?? '')
                  : (styles.pillMet ?? '')
              }`}
            >
              {overlapsNext5y.length > 0 ? 'CROWDING' : 'CLEAR'}
            </span>
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Pairs overlapping by design horizon (Year {horizon})</span>
          <span>{overlapsByHorizon.length}</span>
        </div>
        <div className={styles.statRow}>
          <span>Design horizon</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            Year {horizon}
            <button
              type="button"
              onClick={() => setYear(horizon)}
              className={styles.pill}
              style={{ cursor: 'pointer' }}
              title="Snap the year scrubber to this project's design horizon"
            >
              ↺ snap
            </button>
            <button
              type="button"
              onClick={onSetHorizon}
              className={styles.pill}
              style={{ cursor: 'pointer' }}
              disabled={currentYear === horizon}
              title="Set the current scrub year as this project's design horizon"
            >
              Set Year {currentYear} as default
            </button>
          </span>
        </div>
      </div>

      {vegetation.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No trees placed yet. Arm a tree kind from the Plan tool rail
            (Vegetation category) and stamp a few; this card will list any
            crowding pairs as you scrub the year cursor.
          </p>
        </div>
      )}

      {vegetation.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Crowding pairs (next {LOOKAHEAD_YEARS} years)
          </h2>
          {overlapsNext5y.length === 0 ? (
            <p className={styles.empty}>
              No canopy conflicts in the next {LOOKAHEAD_YEARS} years from
              Year {currentYear}.
            </p>
          ) : (
            <ul className={styles.list}>
              {overlapsNext5y.map((o) => (
                <li
                  key={`${o.aId}-${o.bId}`}
                  className={styles.listRow}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>
                        {o.aLabel} ↔ {o.bLabel}
                      </strong>
                      <span
                        className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                      >
                        Year {o.yearOfOverlap}
                      </span>
                    </div>
                    <div className={styles.listMeta}>
                      Separation {fmt(o.separationM)} · combined crown{' '}
                      {fmt(o.combinedRadiusM)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
