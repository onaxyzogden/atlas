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
} from "../components/LevelNavigator/index.js";
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  isObserveModule,
} from "./observe/types.js";

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

const PLACEHOLDER_SUBSEG_COUNT = 5;

const OBSERVE_PILLAR_TASKS: Record<string, PillarTask[]> = Object.fromEntries(
  OBSERVE_MODULES.map((mod) => [
    mod,
    Array.from({ length: PLACEHOLDER_SUBSEG_COUNT }, (_, i) => ({
      id: `${mod}-step-${i + 1}`,
      title: `${OBSERVE_MODULE_LABEL[mod]} step ${i + 1} — Phase B`,
      columnId: "observe_to_do",
    })),
  ]),
);

interface V3RouteInfo {
  enabled: boolean;
  projectId: string | null;
  stage: "observe" | "plan" | "act" | null;
  module: string | null;
}

function parseV3Route(pathname: string): V3RouteInfo {
  const match = pathname.match(/^\/v3\/project\/([^/]+)\/(observe|plan|act)(?:\/([^/?#]+))?/);
  if (!match) return { enabled: false, projectId: null, stage: null, module: null };
  const [, projectId, stage, module] = match;
  return {
    enabled: true,
    projectId: projectId ?? null,
    stage: (stage as "observe" | "plan" | "act") ?? null,
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

  if (!enabled || !projectId || !stage) {
    return <>{children}</>;
  }

  const moduleSlug = module && isObserveModule(module) ? module : undefined;

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
    }
  };

  const handleSegmentClick = (pillarId: string, levelKey: string) => {
    if (levelKey !== "observe") return;
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
  };

  return (
    <LevelNavigatorProvider
      levels={LEVELS}
      controlledLevel={stage}
      onLevelChange={handleLevelChange}
      pillars={stage === "observe" ? OBSERVE_PILLARS : []}
      pillarTasks={stage === "observe" ? OBSERVE_PILLAR_TASKS : {}}
      currentPillarId={moduleSlug}
      onSegmentClick={handleSegmentClick}
    >
      {children}
    </LevelNavigatorProvider>
  );
}
