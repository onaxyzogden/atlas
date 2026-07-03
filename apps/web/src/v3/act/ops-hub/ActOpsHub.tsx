/**
 * ActOpsHub — the Operations Hub, the new default Act shell.
 *
 * Replaces the map-centric tier-shell as the landing surface for the Act
 * stage: the steward arrives on a scannable "what needs doing today"
 * dashboard rather than a map they must already know how to read. Mounted by
 * ActLayout when `getActShellMode(project) === 'ops-hub'`.
 *
 * A canvas-only StageShell (no rails, mirroring the Observe dashboard branch).
 * A full-width top band carries the header, the objective quick-find search,
 * and the "Today on the Land" metric strip; below it a two-column body splits
 * (Phase 4) into a primary left column (work-category grid + embedded map) and
 * a 360px task rail (the whole existing ActOpsDashboard — Weather / Work /
 * Today's Priorities / Alerts / Upcoming Events — promoted from the tier-shell
 * right rail, with the Create-Task / Log-Observation CTAs beneath it). The body
 * collapses to a single column at ≤960px. Selecting a task (pin, category, the
 * search, or a deep link) opens the guided per-task walkthrough drawer.
 *
 * The shell-switcher that round-trips between the four Act shells is owned by
 * ActLayout, which floats one ActShellToggle over whichever shell it renders,
 * so every legacy shell stays reachable per the no-deletion rule without each
 * shell wiring its own toggle.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { getObjectiveObserveDomains, type UniversalDomain } from '@ogden/shared';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import StageShell from '../../_shell/StageShell.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useViewScope } from '../../roles/useViewScope.js';
import RoleFocusControl from '../../roles/RoleFocusControl.js';
import type { SectionRoleScope } from '../../roles/viewScope.js';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import ActOpsDashboard from '../field-action/ActOpsDashboard.js';
import QuickActions from '../ops/QuickActions.js';
import CreateFieldTaskDialog from '../../components/CreateFieldTaskDialog.js';
import LogObservationDialog from '../../components/LogObservationDialog.js';
import ActOpsHubHeader from './ActOpsHubHeader.js';
import ActOpsHubSearch from './ActOpsHubSearch.js';
import ActOpsHubMetricStrip from './ActOpsHubMetricStrip.js';
import ActWorkCategoryGrid from './ActWorkCategoryGrid.js';
import ActOpsHubTaskList, { type MetricKey } from './ActOpsHubTaskList.js';
import ActOpsHubMapPanel from './ActOpsHubMapPanel.js';
import ActTaskWalkthrough from './ActTaskWalkthrough.js';
import css from './ActOpsHub.module.css';

const FALLBACK_CENTER: [number, number] = [-78.2, 44.5];

export default function ActOpsHub() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
  };
  const navigate = useNavigate();

  const projects = useProjectStore((s) => s.projects);

  const project = useMemo(
    () =>
      projects.find(
        (p) => p.id === params.projectId || p.serverId === params.projectId,
      ) ?? MTC_SEED,
    [projects, params.projectId],
  );

  // Pin / category click selects an objective by routing to act/ops/$objectiveId
  // (deep-link parity; the walkthrough drawer that reads this param lands in
  // Phase 3). The route's beforeLoad redirects locked objectives back here.
  const handleSelectObjective = (objectiveId: string) => {
    if (!params.projectId) return;
    navigate({
      to: '/v3/project/$projectId/act/ops/$objectiveId',
      params: { projectId: params.projectId, objectiveId },
    });
  };

  // Closing the walkthrough drops the $objectiveId segment, returning to the
  // bare hub. The drawer (Phase 3) reads params.objectiveId; its absence here
  // is the closed state, so a no-op nav back to /act fully dismisses it.
  const handleCloseWalkthrough = () => {
    if (!params.projectId) return;
    navigate({
      to: '/v3/project/$projectId/act',
      params: { projectId: params.projectId },
    });
  };

  // Two mutually-exclusive filters drive the primary column (both session-scoped,
  // not persisted — they reset per visit, like the field-action filter):
  //   • activeDomain  — "Work by area": dims out-of-domain pins on the map via
  //     the role-layer scope mechanism (objectiveInScope); null ⇒ every pin full
  //     opacity. Lives here so the grid and the map panel stay in sync.
  //   • activeStatusKey — a metric tile: swaps the grid for a list of only the
  //     tasks in that status bucket.
  // Selecting one clears the other so the surface only ever shows one filter.
  const [activeDomain, setActiveDomain] = useState<UniversalDomain | null>(null);
  const [activeStatusKey, setActiveStatusKey] = useState<MetricKey | null>(null);

  // Operational Role Layer (opt-in "view as" for the Act stage). `roleScope` is
  // the never-hide de-emphasis source: the viewer's own operational-role
  // domains, or -- when a coordinator picks one -- a "view as" role's domains.
  // It drives the grid's "+N more" collapse and, when no manual "Work by area"
  // card is drilled, the map pin dimming.
  const { isScoped, scope, layerActive, canPickRole } = useViewScope(project.id, {
    allowRoleOverride: true,
  });
  const roleScope = isScoped ? scope : undefined;
  const showFocusBar = layerActive || canPickRole;

  // Precedence for the MAP: a manual "Work by area" pick wins (drill to one
  // domain); otherwise fall back to the role scope; otherwise no dimming.
  const scopedDomains = useMemo(
    () => (activeDomain ? new Set<UniversalDomain>([activeDomain]) : roleScope),
    [activeDomain, roleScope],
  );

  // Each objective's observe-domains, keyed by objective id. Identity is stable
  // across scope changes (depends only on the objectives), so the task-list
  // sections don't re-partition when the viewer merely flips My-focus/Full view.
  const { objectives } = useProjectObjectives(project.id);
  const domainsByObjective = useMemo(() => {
    const m = new Map<string, readonly UniversalDomain[]>();
    for (const o of objectives) m.set(o.id, getObjectiveObserveDomains(o));
    return m;
  }, [objectives]);

  // "My focus (N / M)" hint for the focus toggle: how many work-areas (present
  // domains) fall in the current scope. ViewFocusToggle shows it only in role
  // mode. Empty scope (full view / no roles) ⇒ every present domain counts.
  const { presentCount, inFocusCount } = useMemo(() => {
    const present = new Set<UniversalDomain>();
    for (const domains of domainsByObjective.values()) {
      for (const d of domains) present.add(d);
    }
    let inFocus = 0;
    for (const d of present) {
      if (scope.size === 0 || scope.has(d)) inFocus += 1;
    }
    return { presentCount: present.size, inFocusCount: inFocus };
  }, [domainsByObjective, scope]);

  // The never-hide de-emphasis source for the status-filtered task list. Bundles
  // the active scope with the objective→domains map so each section can order
  // out-of-role objective groups last (visible + dimmed, never removed). Absent
  // when the layer is off ⇒ the list renders byte-identical to before.
  const sectionRoleScope = useMemo<SectionRoleScope | undefined>(
    () => (isScoped ? { scope, domainsByObjective } : undefined),
    [isScoped, scope, domainsByObjective],
  );

  const handleSelectDomain = (domain: UniversalDomain | null) => {
    setActiveStatusKey(null);
    setActiveDomain(domain);
  };

  // The v3 project carries the parcel geometry the create-task / log-observation
  // dialogs seed their map from. Mirrors ActTools' proven wiring exactly: gate
  // the dialogs on a resolved v3 project, pass its boundary, fall back to the
  // shared centroid. (projectStore `project` above is the shell/seed record;
  // this is the geometry-bearing v3 read.)
  const v3 = useV3Project(project.id);
  const [taskOpen, setTaskOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // A metric tile click filters the primary column down to that status bucket
  // (the grid is swapped for ActOpsHubTaskList). Re-clicking the active tile
  // toggles back to the grid; selecting a tile clears any domain filter so the
  // two never stack.
  const handleMetricSelect = (key: string) => {
    setActiveDomain(null);
    setActiveStatusKey((prev) => (prev === key ? null : (key as MetricKey)));
  };

  return (
    <StageShell
      canvasLabel="Act operations hub"
      leftRail={null}
      canvas={
        <div className={css.hub}>
          <div className={css.scroll}>
            <div className={css.inner}>
              {/* Full-width top band: header, quick-find, "Today on the Land". */}
              <ActOpsHubHeader projectName={project.name} />
              <ActOpsHubSearch
                projectId={project.id}
                onSelectObjective={handleSelectObjective}
              />
              <ActOpsHubMetricStrip
                projectId={project.id}
                onSelect={handleMetricSelect}
                activeKey={activeStatusKey}
              />
              {showFocusBar && (
                <div className={css.focusBar}>
                  <RoleFocusControl
                    projectId={project.id}
                    inFocusCount={inFocusCount}
                    totalCount={presentCount}
                  />
                </div>
              )}

              {/* Two-column body: primary work surface + the task rail.
                  Collapses to one column at ≤960px (CSS). */}
              <div className={css.body}>
                <div className={css.primaryCol}>
                  {activeStatusKey ? (
                    <ActOpsHubTaskList
                      projectId={project.id}
                      statusKey={activeStatusKey}
                      onClear={() => setActiveStatusKey(null)}
                      onOpenObjective={handleSelectObjective}
                      {...(sectionRoleScope ? { roleScope: sectionRoleScope } : {})}
                    />
                  ) : (
                    <ActWorkCategoryGrid
                      projectId={project.id}
                      activeDomain={activeDomain}
                      onSelectDomain={handleSelectDomain}
                      scopedDomains={roleScope}
                    />
                  )}
                  <ActOpsHubMapPanel
                    projectId={project.id}
                    activeObjectiveId={params.objectiveId ?? null}
                    onSelectObjective={handleSelectObjective}
                    scopedDomains={scopedDomains}
                  />
                </div>
                <div className={css.railCol}>
                  <ActOpsDashboard projectId={project.id} />
                  <QuickActions
                    disabled={!params.projectId || !v3}
                    onCreateTask={() => setTaskOpen(true)}
                    onLogObservation={() => setLogOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>
          {params.objectiveId && (
            <ActTaskWalkthrough
              projectId={project.id}
              objectiveId={params.objectiveId}
              onClose={handleCloseWalkthrough}
            />
          )}
          {taskOpen && v3 && (
            <CreateFieldTaskDialog
              projectId={v3.id}
              boundary={v3.location.boundary}
              fallbackCenter={FALLBACK_CENTER}
              onClose={() => setTaskOpen(false)}
            />
          )}
          {logOpen && v3 && (
            <LogObservationDialog
              projectId={v3.id}
              boundary={v3.location.boundary}
              fallbackCenter={FALLBACK_CENTER}
              onClose={() => setLogOpen(false)}
            />
          )}
        </div>
      }
    />
  );
}
