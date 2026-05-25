/**
 * V3LevelNavBridge — mounts LevelNavigatorProvider when the current pathname
 * is on a /v3/project/<id>/<observe|plan|act>... route.
 *
 * Lives inside AppShell so both the header (LevelNavigatorBar) and the main
 * content (LevelNavigatorSegments inside ObserveLayout) read the same
 * context. Self-suppresses on every other route — no provider mounted, both
 * consumers render null.
 */

import { useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  LevelNavigatorProvider,
  type Level,
  type Pillar,
  type PillarTask,
  type GateIndicator,
} from "../components/LevelNavigator/index.js";
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  isObserveModule,
} from "./observe/types.js";
import { useObserveProgress } from "./observe/progress/useObserveProgress.js";
import {
  PLAN_MODULES,
  PLAN_MODULE_LABEL,
  isPlanModule,
} from "./plan/types.js";
import { usePlanProgress } from "./plan/progress/usePlanProgress.js";

const LEVELS: Level[] = [
  {
    key: "observe",
    label: "Observe",
    title: "Observe",
    subtitle: "See the land",
    desc: "Map context, climate, terrain, water, ecology, and synthesis before designing.",
    routeSuffix: "observe/human-context",
  },
  {
    key: "plan",
    label: "Plan",
    title: "Plan",
    subtitle: "Design the response",
    desc: "Translate observation into a coherent design and proof plan.",
    routeSuffix: "plan",
  },
  {
    key: "act",
    label: "Act",
    title: "Act",
    subtitle: "Build and operate",
    desc: "Execute, run, and report on the design in the field.",
    routeSuffix: "act",
  },
];

const OBSERVE_PILLARS: Pillar[] = OBSERVE_MODULES.map((mod) => ({
  id: mod,
  label: OBSERVE_MODULE_LABEL[mod],
}));

/** The Observe→Plan gate hangs off the last module segment. */
const OBSERVE_GATE_AFTER_SEGMENT = "swot-synthesis";

const PLAN_PILLARS: Pillar[] = PLAN_MODULES.map((mod) => ({
  id: mod,
  label: PLAN_MODULE_LABEL[mod],
}));

/** The Plan→Act gate hangs off the last Plan module segment. */
const PLAN_GATE_AFTER_SEGMENT = "biodiversity-monitor";

interface V3RouteInfo {
  enabled: boolean;
  projectId: string | null;
  stage: "observe" | "plan" | "act" | "report" | null;
  module: string | null;
}

function parseV3Route(pathname: string): V3RouteInfo {
  const match = pathname.match(/^\/v3\/project\/([^/]+)\/(observe|plan|act|report)(?:\/([^/?#]+))?/);
  if (!match) return { enabled: false, projectId: null, stage: null, module: null };
  const [, projectId, stage, module] = match;
  return {
    enabled: true,
    projectId: projectId ?? null,
    stage: (stage as "observe" | "plan" | "act" | "report") ?? null,
    module: module ?? null,
  };
}

interface V3LevelNavBridgeProps {
  children: ReactNode;
}

export default function V3LevelNavBridge({ children }: V3LevelNavBridgeProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { enabled, projectId, stage, module } = parseV3Route(pathname);

  // Hooks must run unconditionally; each self-handles a null projectId.
  const progress = useObserveProgress(projectId);
  const planProgress = usePlanProgress(projectId);

  if (!enabled || !projectId || !stage) {
    return <>{children}</>;
  }

  const observePillarTasks: Record<string, PillarTask[]> = Object.fromEntries(
    OBSERVE_MODULES.map((mod) => [mod, progress.byModule[mod].tasks]),
  );

  const observeGate: GateIndicator = {
    afterSegmentId: OBSERVE_GATE_AFTER_SEGMENT,
    label: "Plan",
    status: progress.overall.requiredComplete
      ? "complete"
      : progress.overall.doneCount > 0
        ? "in-progress"
        : "pending",
  };

  const planPillarTasks: Record<string, PillarTask[]> = Object.fromEntries(
    PLAN_MODULES.map((mod) => [mod, planProgress.byModule[mod].tasks]),
  );

  const planGate: GateIndicator = {
    afterSegmentId: PLAN_GATE_AFTER_SEGMENT,
    label: "Act",
    status: planProgress.overall.requiredComplete
      ? "complete"
      : planProgress.overall.doneCount > 0
        ? "in-progress"
        : "pending",
  };

  const moduleSlug =
    module && stage === "plan" && isPlanModule(module)
      ? module
      : module && isObserveModule(module)
        ? module
        : undefined;

  const handleLevelChange = (key: string) => {
    if (key === "observe") {
      if (moduleSlug) {
        navigate({
          to: "/v3/project/$projectId/observe/$module",
          params: { projectId, module: moduleSlug },
        });
      } else {
        navigate({
          to: "/v3/project/$projectId/observe",
          params: { projectId },
        });
      }
    } else if (key === "plan") {
      navigate({
        to: "/v3/project/$projectId/plan",
        params: { projectId },
      });
    } else if (key === "act") {
      navigate({
        to: "/v3/project/$projectId/act",
        params: { projectId },
      });
    } else if (key === "report") {
      navigate({
        to: "/v3/project/$projectId/report",
        params: { projectId },
      });
    }
  };

  const handleSegmentClick = (pillarId: string, levelKey: string) => {
    if (levelKey === "observe") {
      if (!isObserveModule(pillarId)) return;
      if (pillarId === moduleSlug) {
        navigate({
          to: "/v3/project/$projectId/observe",
          params: { projectId },
        });
        return;
      }
      navigate({
        to: "/v3/project/$projectId/observe/$module",
        params: { projectId, module: pillarId },
      });
      return;
    }
    if (levelKey === "plan") {
      if (!isPlanModule(pillarId)) return;
      if (pillarId === moduleSlug) {
        navigate({
          to: "/v3/project/$projectId/plan",
          params: { projectId },
        });
        return;
      }
      navigate({
        to: "/v3/project/$projectId/plan/$module",
        params: { projectId, module: pillarId },
      });
    }
  };

  return (
    <LevelNavigatorProvider
      levels={LEVELS}
      controlledLevel={stage}
      onLevelChange={handleLevelChange}
      pillars={
        stage === "observe"
          ? OBSERVE_PILLARS
          : stage === "plan"
            ? PLAN_PILLARS
            : []
      }
      pillarTasks={
        stage === "observe"
          ? observePillarTasks
          : stage === "plan"
            ? planPillarTasks
            : {}
      }
      gateIndicators={
        stage === "observe"
          ? [observeGate]
          : stage === "plan"
            ? [planGate]
            : undefined
      }
      currentPillarId={moduleSlug}
      onSegmentClick={handleSegmentClick}
    >
      {children}
    </LevelNavigatorProvider>
  );
}
