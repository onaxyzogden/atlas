/**
 * V3ProjectLayout — route-level layout for /v3/project/$projectId/*.
 *
 * Mounts LandOsShell with the v3 sidebar + rail. The active stage is derived
 * from the matched child route's pathname suffix.
 *
 * The LevelNavigatorProvider that powers both the AppShell header bar and the
 * in-page segments row lives in `V3LevelNavBridge` (mounted inside AppShell)
 * so the header and main content tree both see the same context.
 */

import { useEffect } from "react";
import { Outlet, useParams, useRouterState } from "@tanstack/react-router";
import LandOsShell from "../features/land-os/LandOsShell.js";
import V3LifecycleSidebar from "./components/V3LifecycleSidebar.js";
import ProjectBundleBar from "./components/ProjectBundleBar.js";
import DecisionRail, { type RailStage } from "./components/DecisionRail.js";
import { useV3Project } from "./data/useV3Project.js";
import { useProjectStore } from "../store/projectStore.js";
import type { LifecycleStage } from "./types.js";
import { isObserveModule, type ObserveModule } from "./observe/types.js";
import css from "./V3ProjectLayout.module.css";

const LIFECYCLE_STAGES: readonly (LifecycleStage | "home")[] = [
  "home",
  "discover",
  "diagnose",
  "design",
  "prove",
  "build",
  "operate",
  "report",
];

interface ActiveRoute {
  stage: RailStage;
  module?: ObserveModule;
}

function activeFromPath(pathname: string): ActiveRoute {
  const segments = pathname.split("/").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (!seg) continue;
    if (seg === "observe") {
      const next = segments[i + 1];
      const moduleParam = next && isObserveModule(next) ? next : undefined;
      return { stage: "observe", module: moduleParam };
    }
    if (seg === "plan") return { stage: "plan" };
    if (seg === "act") return { stage: "act" };
    if ((LIFECYCLE_STAGES as readonly string[]).includes(seg)) {
      return { stage: seg as LifecycleStage | "home" };
    }
  }
  return { stage: "home" };
}

// Stages that own their own right rail via StageShell.rightRail. The outer
// LandOsShell rail track is omitted entirely on these routes.
const SELF_RAILED_STAGES = new Set<RailStage>(["design", "prove", "operate", "plan", "act"]);

export default function V3ProjectLayout() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { stage, module } = activeFromPath(pathname);

  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  useEffect(() => {
    if (params.projectId) setActiveProject(params.projectId);
  }, [params.projectId, setActiveProject]);

  // The Stage Compass, Observe Command Centre, and the Stage 0 True North /
  // Fit Gate are full-screen surfaces that own their own chrome — skip
  // LandOsShell (sidebar/rail) and ProjectBundleBar entirely.
  if (
    pathname
      .split("/")
      .filter(Boolean)
      .some(
        (seg) =>
          seg === "compass" ||
          seg === "command-centre" ||
          seg === "true-north" ||
          seg === "fit-gate" ||
          seg === "olos",
      )
  ) {
    return <Outlet />;
  }

  const rail = SELF_RAILED_STAGES.has(stage)
    ? undefined
    : <DecisionRail stage={stage} project={project} activeModule={module} />;

  return (
    <LandOsShell
      sidebar={<V3LifecycleSidebar activeStage={stage} />}
      rail={rail}
    >
      <div className={css.frame}>
        <ProjectBundleBar />
        <div className={css.outletHost}>
          <Outlet />
        </div>
      </div>
    </LandOsShell>
  );
}
