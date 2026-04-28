/**
 * V3LifecycleSidebar — permaculture-grounded lifecycle nav.
 *
 * Stages grouped into three permaculture phases (Understand · Design · Live)
 * with renamed labels per the Permaculture Scholar dialogue
 * (wiki/concepts/atlas-sidebar-permaculture.md, 2026-04-28):
 *   Discover → Observe, Prove → Test, Operate → Steward, Report → Evaluate.
 *
 * Route slugs in LIFECYCLE_STAGES are unchanged — labels are v3-only overrides.
 * Steward carries a "↻ loops to Observe" affordance because permaculture
 * stewardship is a continuous feedback loop, not a terminal step.
 *
 * Sidebar footer hosts four utility links (Ethics & Principles, Matrix
 * Toggles, Plant Database, Climate Tools); P0 entries are real navigation
 * stubs, P1 entries are disabled "Coming soon" placeholders.
 */

import { Link, useParams } from "@tanstack/react-router";
import { LIFECYCLE_STAGES, type BannerId } from "../../features/land-os/lifecycle.js";
import css from "./V3LifecycleSidebar.module.css";

const V3_STAGE_LABELS: Record<BannerId, string> = {
  discover: "Observe",
  diagnose: "Diagnose",
  design: "Design",
  prove: "Test",
  build: "Build",
  operate: "Steward",
  report: "Evaluate",
};

const STAGE_DESCRIPTIONS: Record<BannerId, string> = {
  discover: "Thoughtful, protracted observation",
  diagnose: "Site analysis — flows and constraints",
  design: "Arrange interconnected systems",
  prove: "Pilot small and slow before scaling",
  build: "Implement the designed systems",
  operate: "Tend the living relationship",
  report: "Continuous feedback and adaptation",
};

interface PhaseGroup {
  id: "understand" | "design" | "live";
  label: string;
  stageIds: BannerId[];
}

const PHASE_GROUPS: PhaseGroup[] = [
  { id: "understand", label: "Understand", stageIds: ["discover", "diagnose"] },
  { id: "design", label: "Design", stageIds: ["design", "prove"] },
  { id: "live", label: "Live", stageIds: ["build", "operate", "report"] },
];

interface UtilityLink {
  id: string;
  label: string;
  description: string;
  priority: "p0" | "p1";
}

const UTILITY_LINKS: UtilityLink[] = [
  { id: "ethics", label: "Ethics & Principles", description: "Earth Care · People Care · Fair Share", priority: "p0" },
  { id: "matrix", label: "Matrix Toggles", description: "Topography · Sectors · Zones overlay", priority: "p0" },
  { id: "plants", label: "Plant Database", description: "Species lookup & guilds", priority: "p1" },
  { id: "climate", label: "Climate Tools", description: "Hardiness · solar angle · weather", priority: "p1" },
];

export interface V3LifecycleSidebarProps {
  activeStage: BannerId | "home";
}

export default function V3LifecycleSidebar({ activeStage }: V3LifecycleSidebarProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? "mtc";

  const stagesById = new Map(LIFECYCLE_STAGES.map((s) => [s.id, s]));

  return (
    <nav aria-label="Project lifecycle" className={css.sidebar}>
      <header className={css.header}>
        <span className={css.eyebrow}>Project Lifecycle</span>
      </header>

      <Link
        to="/v3/project/$projectId/home"
        params={{ projectId }}
        className={`${css.homeLink} ${activeStage === "home" ? css.active : ""}`}
      >
        Project Home
      </Link>

      <div className={css.groups}>
        {PHASE_GROUPS.map((group) => (
          <section key={group.id} className={css.group}>
            <span className={css.groupLabel}>{group.label}</span>
            <ol className={css.stages}>
              {group.stageIds.map((stageId) => {
                const stage = stagesById.get(stageId);
                if (!stage) return null;
                const active = activeStage === stage.id;
                const isSteward = stage.id === "operate";
                const overallIndex = LIFECYCLE_STAGES.findIndex((s) => s.id === stage.id) + 1;
                return (
                  <li key={stage.id} className={css.stageItem}>
                    <Link
                      to={"/v3/project/$projectId/" + stage.id}
                      params={{ projectId }}
                      className={`${css.stageLink} ${active ? css.active : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={css.stageIndex}>{overallIndex}</span>
                      <span className={css.stageBody}>
                        <span className={css.stageLabel}>
                          {V3_STAGE_LABELS[stage.id]}
                          {isSteward && (
                            <span className={css.loopBadge} title="Stewardship loops back to Observe">↻</span>
                          )}
                        </span>
                        <span className={css.stageDesc}>{STAGE_DESCRIPTIONS[stage.id]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <footer className={css.footer}>
        <span className={css.eyebrow}>Reference</span>
        <ul className={css.utilityList}>
          {UTILITY_LINKS.map((link) => {
            const disabled = link.priority === "p1";
            return (
              <li key={link.id} className={css.utilityItem}>
                <button
                  type="button"
                  className={`${css.utilityBtn} ${disabled ? css.utilityDisabled : ""}`}
                  disabled={disabled}
                  title={disabled ? "Coming soon" : link.description}
                >
                  <span className={css.utilityLabel}>{link.label}</span>
                  <span className={css.utilityDesc}>
                    {disabled ? "Coming soon" : link.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </footer>
    </nav>
  );
}
