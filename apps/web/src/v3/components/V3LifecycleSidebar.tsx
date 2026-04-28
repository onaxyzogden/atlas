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

import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { LIFECYCLE_STAGES, type BannerId } from "../../features/land-os/lifecycle.js";
import { useMatrixTogglesStore } from "../../store/matrixTogglesStore.js";
import MatrixTogglesPopover from "./MatrixTogglesPopover.js";
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

interface DisabledLink {
  id: string;
  label: string;
  description: string;
}

const DISABLED_LINKS: DisabledLink[] = [
  { id: "plants", label: "Plant Database", description: "Species lookup & guilds" },
  { id: "climate", label: "Climate Tools", description: "Hardiness · solar angle · weather" },
];

export interface V3LifecycleSidebarProps {
  activeStage: BannerId | "home";
}

export default function V3LifecycleSidebar({ activeStage }: V3LifecycleSidebarProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? "mtc";

  const [matrixOpen, setMatrixOpen] = useState(false);
  const matrixActiveCount = useMatrixTogglesStore(
    (s) => Number(s.topography) + Number(s.sectors) + Number(s.zones),
  );

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
          <li className={css.utilityItem}>
            <Link
              to="/v3/reference/ethics"
              className={css.utilityBtn}
              title="Earth Care · People Care · Fair Share"
            >
              <span className={css.utilityLabel}>Ethics &amp; Principles</span>
              <span className={css.utilityDesc}>
                Earth Care · People Care · Fair Share
              </span>
            </Link>
          </li>

          <li className={css.utilityItem}>
            <button
              type="button"
              className={css.utilityBtn}
              aria-expanded={matrixOpen}
              aria-haspopup="dialog"
              onClick={() => setMatrixOpen((open) => !open)}
              title="Topography · Sectors · Zones overlay"
            >
              <span className={css.utilityLabel}>
                Matrix Toggles
                {matrixActiveCount > 0 && (
                  <span className={css.utilityCount} aria-label={`${matrixActiveCount} active`}>
                    {matrixActiveCount}
                  </span>
                )}
              </span>
              <span className={css.utilityDesc}>
                Topography · Sectors · Zones overlay
              </span>
            </button>
          </li>

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
        {matrixOpen && (
          <MatrixTogglesPopover onClose={() => setMatrixOpen(false)} />
        )}
      </footer>
    </nav>
  );
}
