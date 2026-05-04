/**
 * V3ProjectLayout — route-level layout for /v3/project/$projectId/*.
 *
 * Mounts LandOsShell with the v3 sidebar + rail. The active stage is derived
 * from the matched child route's pathname suffix. A thin sticky header above
 * the Outlet hosts LifecycleProgressRing (added 2026-04-28 concept-polish
 * pass — replaces the rejected per-stage backdrop tints with one unifying
 * indicator per Permaculture Scholar "Integrate Rather Than Segregate").
 */

import { Outlet, useParams, useRouterState } from "@tanstack/react-router";
import LandOsShell from "../features/land-os/LandOsShell.js";
import V3LifecycleSidebar from "./components/V3LifecycleSidebar.js";
import DecisionRail from "./components/DecisionRail.js";
import LifecycleProgressRing from "./components/LifecycleProgressRing.js";
import { useV3Project } from "./data/useV3Project.js";
import type { LifecycleStage } from "./types.js";
import css from "./V3ProjectLayout.module.css";

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
      rail={<DecisionRail stage={activeStage} project={project} />}
    >
      <div className={css.frame}>
        <header className={css.header} aria-label="Lifecycle position">
          <LifecycleProgressRing activeStage={activeStage} />
        </header>
        <div className={css.outletHost}>
          <Outlet />
        </div>
      </div>
    </LandOsShell>
  );
}
