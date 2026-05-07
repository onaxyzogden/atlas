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

import { Outlet, useParams, useRouterState } from "@tanstack/react-router";
import LandOsShell from "../features/land-os/LandOsShell.js";
import V3LifecycleSidebar from "./components/V3LifecycleSidebar.js";
import DecisionRail, { type RailStage } from "./components/DecisionRail.js";
import { useV3Project } from "./data/useV3Project.js";
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

export default function V3ProjectLayout() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { stage, module } = activeFromPath(pathname);

  return (
    <LandOsShell
      sidebar={<V3LifecycleSidebar activeStage={stage} />}
      rail={<DecisionRail stage={stage} project={project} activeModule={module} />}
    >
      <div className={css.frame}>
        <div className={css.outletHost}>
          <Outlet />
        </div>
      </div>
    </LandOsShell>
  );
}
