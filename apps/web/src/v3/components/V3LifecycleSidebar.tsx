/**
 * V3LifecycleSidebar — stage-grouped project nav.
 *
 * Three stage groups (Observe / Plan / Act), each collapsible. The active
 * stage is expanded by default and shows its module list with the active
 * module highlighted; the other two are collapsed so the rail stays
 * scannable. Clicking a collapsed stage header navigates to that stage's
 * landing route and expands it. Project Home sits above the groups,
 * Reference utilities below.
 *
 * Module taxonomy is the same primitive Atlas already uses for routing,
 * slide-ups, and bottom ModuleBars — we don't introduce a separate
 * "domain manager" abstraction here.
 */

import { useMemo, useState } from 'react';
import { Link, useParams, useRouterState, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RailStage } from './DecisionRail.js';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  isObserveModule,
  type ObserveModule,
} from '../observe/types.js';
import {
  PLAN_MODULES,
  PLAN_MODULE_FULL_LABEL,
  isPlanModule,
  type PlanModule,
} from '../plan/types.js';
import {
  ACT_MODULES,
  ACT_MODULE_FULL_LABEL,
  isActModule,
  type ActModule,
} from '../act/types.js';
import { usePlanImpactFlagCounts } from '../plan/impact/usePlanImpactFlags.js';
import { usePlanDecisionCounts } from '../plan/decisions/usePlanDecisions.js';
import { usePlanWorkPackageCounts } from '../plan/work-packages/usePlanWorkPackages.js';
import { usePlanConflictCounts } from '../plan/conflicts/usePlanConflicts.js';
import css from './V3LifecycleSidebar.module.css';

interface DisabledLink {
  id: string;
  label: string;
  description: string;
}

const DISABLED_LINKS: DisabledLink[] = [
  { id: 'plants', label: 'Plant Database', description: 'Species lookup & guilds' },
  { id: 'climate', label: 'Climate Tools', description: 'Hardiness · solar angle · weather' },
];

type StageId = 'observe' | 'plan' | 'act';

const STAGE_LABEL: Record<StageId, string> = {
  observe: 'Observe',
  plan: 'Plan',
  act: 'Act',
};

const STAGE_DESC: Record<StageId, string> = {
  observe: 'Read the land',
  plan: 'Design the land',
  act: 'Build & operate',
};

export interface V3LifecycleSidebarProps {
  activeStage: RailStage;
}

interface StageEntry {
  id: StageId;
  modules: { id: string; label: string }[];
}

const OBSERVE_ENTRIES: StageEntry = {
  id: 'observe',
  modules: OBSERVE_MODULES.map((m) => ({
    id: m,
    label: OBSERVE_MODULE_LABEL[m],
  })),
};

const PLAN_ENTRIES: StageEntry = {
  id: 'plan',
  modules: PLAN_MODULES.map((m) => ({
    id: m,
    label: PLAN_MODULE_FULL_LABEL[m],
  })),
};

const ACT_ENTRIES: StageEntry = {
  id: 'act',
  modules: ACT_MODULES.map((m) => ({
    id: m,
    label: ACT_MODULE_FULL_LABEL[m],
  })),
};

const STAGE_ENTRIES: StageEntry[] = [OBSERVE_ENTRIES, PLAN_ENTRIES, ACT_ENTRIES];

function activeModuleFromPath(
  pathname: string,
  stage: StageId,
): string | null {
  const segments = pathname.split('/').filter(Boolean);
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === stage) {
      const next = segments[i + 1];
      if (!next) return null;
      if (stage === 'observe' && isObserveModule(next)) return next;
      if (stage === 'plan' && isPlanModule(next)) return next;
      if (stage === 'act' && isActModule(next)) return next;
    }
  }
  return null;
}

export default function V3LifecycleSidebar({ activeStage }: V3LifecycleSidebarProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const reviewCounts = usePlanImpactFlagCounts(projectId);
  const decisionCounts = usePlanDecisionCounts(projectId);
  const workPackageCounts = usePlanWorkPackageCounts(projectId);
  const conflictCounts = usePlanConflictCounts(projectId);

  const stageIsActive = (id: StageId): boolean =>
    (activeStage as string) === id;

  const initialExpanded = useMemo(() => {
    const rec: Record<StageId, boolean> = { observe: false, plan: false, act: false };
    if (stageIsActive('observe')) rec.observe = true;
    if (stageIsActive('plan')) rec.plan = true;
    if (stageIsActive('act')) rec.act = true;
    return rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage]);

  const [expanded, setExpanded] = useState(initialExpanded);

  const handleHeaderClick = (id: StageId) => {
    const isActive = stageIsActive(id);
    if (isActive) {
      // Toggle expansion of the active stage in-place.
      setExpanded((s) => ({ ...s, [id]: !s[id] }));
      return;
    }
    // Navigate to the stage's landing and expand it.
    setExpanded((s) => ({ ...s, [id]: true }));
    navigate({
      to: `/v3/project/$projectId/${id}` as
        | '/v3/project/$projectId/observe'
        | '/v3/project/$projectId/plan'
        | '/v3/project/$projectId/act',
      params: { projectId },
    });
  };

  return (
    <nav aria-label="Project chrome" className={css.sidebar}>
      <header className={css.header}>
        <span className={css.eyebrow}>Project</span>
      </header>

      <Link
        to="/v3/project/$projectId/true-north"
        params={{ projectId }}
        className={css.homeLink}
        data-active={pathname.includes('/true-north') ? 'true' : 'false'}
      >
        True North · Stage 0
      </Link>

      <Link
        to="/v3/project/$projectId/home"
        params={{ projectId }}
        className={css.homeLink}
        data-active={activeStage === 'home' ? 'true' : 'false'}
      >
        Project Home
      </Link>

      <Link
        to="/v3/project/$projectId/report"
        params={{ projectId }}
        className={css.homeLink}
        data-active={activeStage === 'report' ? 'true' : 'false'}
      >
        Report
      </Link>

      <div className={css.stageGroups}>
        {STAGE_ENTRIES.map((entry) => {
          const isActive = stageIsActive(entry.id);
          const isOpen = expanded[entry.id];
          const activeModule = isActive
            ? activeModuleFromPath(pathname, entry.id)
            : null;

          return (
            <section
              key={entry.id}
              className={css.stageGroup}
              data-active={isActive ? 'true' : 'false'}
              data-stage={entry.id}
            >
              <button
                type="button"
                className={css.stageGroupHeader}
                aria-expanded={isOpen}
                onClick={() => handleHeaderClick(entry.id)}
              >
                <span className={css.stageGroupChevron} aria-hidden="true">
                  {isOpen ? (
                    <ChevronDown size={12} strokeWidth={2} />
                  ) : (
                    <ChevronRight size={12} strokeWidth={2} />
                  )}
                </span>
                <span className={css.stageGroupLabel}>
                  {STAGE_LABEL[entry.id]}
                </span>
                <span className={css.stageGroupDesc}>
                  {STAGE_DESC[entry.id]}
                </span>
              </button>
              {isOpen ? (
                <ul className={css.moduleList}>
                  {entry.modules.map((m) => {
                    const isModuleActive = activeModule === m.id;
                    return (
                      <li key={m.id} className={css.moduleItem}>
                        <Link
                          to={
                            entry.id === 'observe'
                              ? '/v3/project/$projectId/observe/$module'
                              : entry.id === 'plan'
                                ? '/v3/project/$projectId/plan/$module'
                                : '/v3/project/$projectId/act/$module'
                          }
                          params={{ projectId, module: m.id }}
                          className={css.moduleLink}
                          data-active={isModuleActive ? 'true' : 'false'}
                        >
                          <span className={css.moduleDot} aria-hidden="true" />
                          <span className={css.moduleLabel}>{m.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {entry.id === 'plan' ? (
                    <li className={css.moduleItem}>
                      <Link
                        to="/v3/project/$projectId/plan/review"
                        params={{ projectId }}
                        className={css.moduleLink}
                        data-active={
                          pathname.includes('/plan/review') ? 'true' : 'false'
                        }
                      >
                        <span className={css.moduleDot} aria-hidden="true" />
                        <span className={css.moduleLabel}>
                          Plan Reviews
                          {reviewCounts.open > 0 ? (
                            <span className={css.utilityCount}>
                              {reviewCounts.open}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ) : null}
                  {entry.id === 'plan' ? (
                    <li className={css.moduleItem}>
                      <Link
                        to="/v3/project/$projectId/plan/decisions"
                        params={{ projectId }}
                        className={css.moduleLink}
                        data-active={
                          pathname.includes('/plan/decisions') ? 'true' : 'false'
                        }
                      >
                        <span className={css.moduleDot} aria-hidden="true" />
                        <span className={css.moduleLabel}>
                          Decision Log
                          {decisionCounts.draft > 0 ? (
                            <span className={css.utilityCount}>
                              {decisionCounts.draft}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ) : null}
                  {entry.id === 'plan' ? (
                    <li className={css.moduleItem}>
                      <Link
                        to="/v3/project/$projectId/plan/work-packages"
                        params={{ projectId }}
                        className={css.moduleLink}
                        data-active={
                          pathname.includes('/plan/work-packages')
                            ? 'true'
                            : 'false'
                        }
                      >
                        <span className={css.moduleDot} aria-hidden="true" />
                        <span className={css.moduleLabel}>
                          Work Packages
                          {workPackageCounts.draft > 0 ? (
                            <span className={css.utilityCount}>
                              {workPackageCounts.draft}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ) : null}
                  {entry.id === 'plan' ? (
                    <li className={css.moduleItem}>
                      <Link
                        to="/v3/project/$projectId/plan/conflicts"
                        params={{ projectId }}
                        className={css.moduleLink}
                        data-active={
                          pathname.includes('/plan/conflicts') ? 'true' : 'false'
                        }
                      >
                        <span className={css.moduleDot} aria-hidden="true" />
                        <span className={css.moduleLabel}>
                          Plan Conflicts
                          {conflictCounts.open > 0 ? (
                            <span className={css.utilityCount}>
                              {conflictCounts.open}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className={css.footer}>
        <span className={css.eyebrow}>Reference</span>
        <ul className={css.utilityList}>
          <li className={css.utilityItem}>
            <Link
              to="/v3/project/$projectId/reference/ethics"
              params={{ projectId }}
              className={css.utilityBtn}
              title="Earth Care · People Care · Fair Share"
            >
              <span className={css.utilityLabel}>Ethics &amp; Principles</span>
              <span className={css.utilityDesc}>
                Earth Care · People Care · Fair Share
              </span>
            </Link>
          </li>

          {(import.meta.env.VITE_ATLAS_TELEMETRY_ENABLED ?? (import.meta.env.DEV ? 'true' : 'false')) === 'true' && (
            <li className={css.utilityItem}>
              <Link
                to="/v3/project/$projectId/reference/affinity-telemetry"
                params={{ projectId }}
                className={css.utilityBtn}
                title="Dev: observed Act-module touch counts vs. v1 affinity"
              >
                <span className={css.utilityLabel}>Affinity telemetry</span>
                <span className={css.utilityDesc}>Dev · observed vs. v1 ranking</span>
              </Link>
            </li>
          )}

          {DISABLED_LINKS.map((link) => (
            <li key={link.id} className={css.utilityItem}>
              <button
                type="button"
                className={`${css.utilityBtn} ${css.utilityDisabled}`}
                disabled
                title="Coming soon"
              >
                <span className={css.utilityLabel}>{link.label}</span>
                <span className={css.utilityDesc}>Coming soon</span>
              </button>
            </li>
          ))}
        </ul>
      </footer>
    </nav>
  );
}
