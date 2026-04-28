/**
 * V3LifecycleSidebar — clean 7-stage nav for the Atlas 3.0 lifecycle.
 *
 * Routes between /v3/project/$projectId/{stage}. No store coupling.
 * Reuses LIFECYCLE_STAGES from v2 for the stage IDs/labels.
 */

import { Link, useParams } from "@tanstack/react-router";
import { LIFECYCLE_STAGES, type BannerId } from "../../features/land-os/lifecycle.js";
import css from "./V3LifecycleSidebar.module.css";

const STAGE_DESCRIPTIONS: Record<BannerId, string> = {
  discover: "Understand the land and opportunities",
  diagnose: "Evaluate feasibility and risks",
  design: "Create resilient land designs",
  prove: "Validate outcomes and stress test",
  build: "Plan implementation and logistics",
  operate: "Manage systems and monitor performance",
  report: "Measure impact and communicate results",
};

export interface V3LifecycleSidebarProps {
  activeStage: BannerId | "home";
}

export default function V3LifecycleSidebar({ activeStage }: V3LifecycleSidebarProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? "mtc";

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

      <ol className={css.stages}>
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const active = activeStage === stage.id;
          return (
            <li key={stage.id} className={css.stageItem}>
              <Link
                to={"/v3/project/$projectId/" + stage.id}
                params={{ projectId }}
                className={`${css.stageLink} ${active ? css.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={css.stageIndex}>{idx + 1}</span>
                <span className={css.stageBody}>
                  <span className={css.stageLabel}>{stage.label}</span>
                  <span className={css.stageDesc}>{STAGE_DESCRIPTIONS[stage.id]}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
