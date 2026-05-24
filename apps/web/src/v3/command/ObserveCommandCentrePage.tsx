/**
 * ObserveCommandCentrePage — the aggregate "run the stage" surface for Observe.
 *
 * The doc's mechanic: "the outer ring readies the stage; the center runs it."
 * The Stage Compass center unlocks (all objectives verified) and opens this
 * Command Centre — one place to see the whole Observe stage instead of the
 * scattered per-module maps. Rendered full-bleed by V3ProjectLayout (the
 * `command-centre` path skips LandOsShell, like the compass).
 *
 * Readiness mirrors the compass exactly (`useCompassData` → every objective at
 * 100%). Reaching this route while not ready shows a quiet "locked" state with
 * a path back to the compass rather than a hard redirect.
 *
 * Composition: a full site map, the Observe summary, an evidence-library tally,
 * a gaps heuristic, the seven embedded module dashboards, and a Plan-readiness
 * banner. Each module card deep-links back to its working surface.
 */

import { useParams, useNavigate } from '@tanstack/react-router';
import { Compass, ArrowRight, Lock, Check } from 'lucide-react';
import { useCompassData } from '../compass/useCompassData.js';
import SiteMapPanel from './SiteMapPanel.js';
import EvidenceLibraryPanel from './EvidenceLibraryPanel.js';
import GapsPanel from './GapsPanel.js';
import ModuleDashboardsPanel from './ModuleDashboardsPanel.js';
import css from './ObserveCommandCentrePage.module.css';

export default function ObserveCommandCentrePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();
  const data = useCompassData(projectId);

  const ready =
    data.views.length > 0 && data.views.every((v) => v.progress.pct === 100);

  const backToCompass = () =>
    navigate({ to: '/v3/project/$projectId/compass', params: { projectId } });

  if (!ready) {
    return (
      <div className={css.lockedPage}>
        <div className={css.lockedCard}>
          <span className={css.lockedIcon}>
            <Lock size={26} strokeWidth={1.75} />
          </span>
          <h1 className={css.lockedTitle}>Command Centre locked</h1>
          <p className={css.lockedBody}>
            Complete and verify every Observe objective to open the Command
            Centre. You&apos;re at {data.stage.pct}% across {data.views.length}{' '}
            objectives.
          </p>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={backToCompass}
          >
            <Compass size={16} strokeWidth={2} /> Back to Stage Compass
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerMain}>
          <p className="eyebrow">Observe · Command Centre</p>
          <h1 className={css.title}>Observe Command Centre</h1>
          <p className={css.subtitle}>
            Foundation verified across all {data.views.length} objectives — run
            the Observe stage from one place.
          </p>
        </div>
        <button type="button" className={css.ghostBtn} onClick={backToCompass}>
          <Compass size={16} strokeWidth={2} /> Compass
        </button>
      </header>

      <div className={css.sections}>
        <SiteMapPanel projectId={projectId} />

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
                  <span className={css.objectiveCheck}>
                    <Check size={15} strokeWidth={2.5} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

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
            Observation is complete — the Plan stage is unlocked. Carry this
            verified intelligence into design.
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
