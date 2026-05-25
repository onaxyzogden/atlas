/**
 * ObserveCommandCentrePage — the aggregate "run the stage" surface for Observe.
 *
 * Two modes, per the OLOS Stage Command Center doc:
 *   1. Command Centre (awareness) — THIS page: site map with observation-need
 *      markers, open-observation-need launch cards, an observation timeline,
 *      plus the aggregate Observe summary / evidence / gaps / module dashboards.
 *   2. Observation Capture Workspace (execution) — ObserveLayout driven by
 *      `?need`, launched by clicking a card or marker here.
 *
 * The center of the Stage Compass still opens this route. It is no longer
 * gated on 100% completion: a steward records observations from here at any time
 * (the doc's "Command Centre for awareness, Capture Workspace for execution").
 * Readiness now only changes emphasis — the Plan-readiness banner activates once
 * every domain is verified. Rendered full-bleed by V3ProjectLayout (the
 * `command-centre` path skips LandOsShell).
 */

import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Compass, ArrowRight, Check } from 'lucide-react';
import { useCompassData } from '../compass/useCompassData.js';
import { useObservationNeeds } from '../observation-needs/useObservationNeeds.js';
import SiteMapPanel from './SiteMapPanel.js';
import OpenObservationNeedsPanel from './OpenObservationNeedsPanel.js';
import ObservationTimelinePanel from './ObservationTimelinePanel.js';
import EvidenceLibraryPanel from './EvidenceLibraryPanel.js';
import GapsPanel from './GapsPanel.js';
import ModuleDashboardsPanel from './ModuleDashboardsPanel.js';
import css from './ObserveCommandCentrePage.module.css';

export default function ObserveCommandCentrePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useCompassData(projectId);
  const needViews = useObservationNeeds(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const backToCompass = () =>
    navigate({ to: '/v3/project/$projectId/compass', params: { projectId } });

  // Launch action: open the Observation Capture Workspace for the chosen need by
  // deep-linking into ObserveLayout with its module + the `?need` driver.
  const launchNeed = (needId: string) => {
    const view = needViews.find((v) => v.objective.id === needId);
    if (!view) return;
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId, module: view.objective.module },
      search: { need: needId },
    });
  };

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerMain}>
          <p className="eyebrow">Observe · Command Centre</p>
          <h1 className={css.title}>Observe Command Centre</h1>
          <p className={css.subtitle}>
            {ready
              ? `Foundation verified across all ${data.views.length} domains — run the Observe stage from one place.`
              : `Run the Observe stage from one place. ${data.stage.pct}% verified across ${data.views.length} domains — launch an observation need to keep going.`}
          </p>
        </div>
        <button type="button" className={css.ghostBtn} onClick={backToCompass}>
          <Compass size={16} strokeWidth={2} /> Compass
        </button>
      </header>

      <div className={css.sections}>
        <SiteMapPanel
          projectId={projectId}
          views={needViews}
          onSelectObjective={setSelectedId}
        />

        <OpenObservationNeedsPanel
          views={needViews}
          selectedId={selectedId}
          onLaunch={launchNeed}
        />

        <div className={css.grid}>
          <section
            className={`${css.panel} ${css.summaryPanel}`}
            aria-label="Observe summary"
          >
            <p className="eyebrow">Observe summary</p>
            <ul className={css.objectiveList}>
              {data.views.map((v) => (
                <li key={v.objective.id} className={css.objectiveRow}>
                  <span
                    className={css.objectiveDot}
                    style={{ background: v.objective.accent }}
                  />
                  <span className={css.objectiveLabel}>{v.objective.label}</span>
                  <span className={css.objectiveMeta}>
                    {v.progress.verified}/{v.progress.total} verified
                  </span>
                  {v.progress.pct === 100 && (
                    <span className={css.objectiveCheck}>
                      <Check size={15} strokeWidth={2.5} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <ObservationTimelinePanel views={needViews} />
          <EvidenceLibraryPanel projectId={projectId} />
          <GapsPanel projectId={projectId} />
        </div>

        <section className={css.modSection} aria-label="Module dashboards">
          <p className="eyebrow">Module dashboards</p>
          <ModuleDashboardsPanel projectId={projectId} />
        </section>

        <section
          className={`${css.panel} ${css.planPanel}`}
          aria-label="Plan readiness"
        >
          <p className="eyebrow">Plan readiness</p>
          <p className={css.planBody}>
            {ready
              ? 'Observation is complete — the Plan stage is unlocked. Carry this verified intelligence into design.'
              : 'Complete and verify every Observe objective to unlock the Plan stage. You can still preview Plan at any time.'}
          </p>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={() =>
              navigate({
                to: '/v3/project/$projectId/plan',
                params: { projectId },
              })
            }
          >
            Go to Plan <ArrowRight size={16} strokeWidth={2} />
          </button>
        </section>
      </div>
    </div>
  );
}
