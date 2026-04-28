/**
 * V3ProjectLayout — route-level layout for /v3/project/$projectId/*.
 *
 * Mounts LandOsShell with the v3 sidebar + rail. The active stage is derived
 * from the matched child route's pathname suffix.
 */

import { Outlet, useParams, useRouterState } from "@tanstack/react-router";
import LandOsShell from "../features/land-os/LandOsShell.js";
import V3LifecycleSidebar from "./components/V3LifecycleSidebar.js";
import V3DecisionRail from "./components/V3DecisionRail.js";
import { useV3Project } from "./data/useV3Project.js";
import type { LifecycleStage } from "./types.js";

const STAGE_IDS: readonly (LifecycleStage | "home")[] = [
  "home",
  "discover",
  "diagnose",
  "design",
  "prove",
  "build",
  "operate",
  "report",
];

function activeStageFromPath(pathname: string): LifecycleStage | "home" {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "home";
  return (STAGE_IDS as readonly string[]).includes(last)
    ? (last as LifecycleStage | "home")
    : "home";
}

export default function V3ProjectLayout() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeStage = activeStageFromPath(pathname);

  return (
    <LandOsShell
      sidebar={<V3LifecycleSidebar activeStage={activeStage} />}
      rail={
        <V3DecisionRail
          stage={activeStage}
          projectName={project?.name ?? "No project"}
          verdictLabel={project?.verdict.label ?? "—"}
        />
      }
    >
      <Outlet />
    </LandOsShell>
  );
}
