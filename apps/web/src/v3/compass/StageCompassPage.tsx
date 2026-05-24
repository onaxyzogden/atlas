/**
 * StageCompassPage — full-screen Observe "mission select" for a project.
 *
 * Lands the steward on a single overview before the map: a wheel of the Observe
 * objectives (progress + gated node-paths), a left progression rail, and a
 * right detail panel for the selected objective. "Open on Map" enters the
 * existing Observe map for that module. Rendered full-bleed by V3ProjectLayout
 * (no LandOsShell sidebar/rail) so the compass owns its own chrome.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useCompassData } from './useCompassData.js';
import StageSpine from './StageSpine.js';
import StageProgressionRail from './StageProgressionRail.js';
import ObserveCompassWheel from './ObserveCompassWheel.js';
import SelectedObjectivePanel from './SelectedObjectivePanel.js';
import TrueNorthAdvisoryBanner from '../true-north/TrueNorthAdvisoryBanner.js';
import type { ObserveModule } from '../observe/types.js';
import css from './StageCompassPage.module.css';

const LEGEND: { state: string; label: string }[] = [
  { state: 'verified', label: 'Verified outcome' },
  { state: 'evidence-in', label: 'Evidence in' },
  { state: 'open', label: 'Ready to start' },
  { state: 'locked', label: 'Locked — verify the previous step' },
];

export default function StageCompassPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useCompassData(projectId);

  // "The outer ring readies the stage; the center runs it." The hub unlocks
  // only once every Observe objective is fully verified.
  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const goCommandCentre = () =>
    navigate({
      to: '/v3/project/$projectId/observe/command-centre',
      params: { projectId },
    });

  // Default selection: first objective that isn't fully verified, else first.
  const defaultModule = useMemo<ObserveModule>(() => {
    const firstIncomplete = data.views.find((v) => v.progress.pct < 100);
    // OBSERVE_COMPASS_OBJECTIVES is non-empty, so views[0] always exists.
    return (firstIncomplete ?? data.views[0]!).objective.id;
  }, [data.views]);

  const [selected, setSelected] = useState<ObserveModule | null>(defaultModule);
  const selectedView = selected ? (data.byId[selected] ?? null) : null;

  return (
    <div className={css.page}>
      <TrueNorthAdvisoryBanner projectId={projectId} />
      <header className={css.top}>
        <StageSpine projectId={projectId} observeProgress={data.stage} />
      </header>

      <div className={css.body}>
        <StageProgressionRail observeProgress={data.stage} />

        <main className={css.center} aria-label="Observe compass">
          <div className={css.wheelHost}>
            <ObserveCompassWheel
              views={data.views}
              selected={selected}
              onSelect={setSelected}
              ready={ready}
              onEnterCommandCentre={goCommandCentre}
            />
          </div>
          <ul className={css.legend}>
            {LEGEND.map((item) => (
              <li key={item.state} className={css.legendItem}>
                <span className={css.legendDot} data-state={item.state} />
                {item.label}
              </li>
            ))}
          </ul>
        </main>

        <SelectedObjectivePanel view={selectedView} projectId={projectId} />
      </div>
    </div>
  );
}
