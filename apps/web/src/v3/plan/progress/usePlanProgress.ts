/**
 * usePlanProgress — the only React/store-coupled layer of the Plan objectives
 * engine. Subscribes to the per-project slice of each Plan-domain store,
 * assembles a plain `PlanProgressInput` bag, and runs the pure `evaluatePlan`
 * predicates from `objectives.ts`.
 *
 * Selector stability: each store hook subscribes to a *raw* state field
 * (array / record) — never a freshly-allocated derived value — and all
 * counting happens inside a single `useMemo`. This avoids the zustand
 * `Object.is` re-render loop documented in
 * `wiki/decisions/2026-04-26-zustand-selector-stability.md`.
 */

import { useMemo } from 'react';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useSuccessionPathStore } from '../../../store/successionPathStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { usePrincipleCheckStore } from '../../../store/principleCheckStore.js';
import {
  EMPTY_PLAN_INPUT,
  evaluatePlan,
  type PlanProgress,
} from './objectives.js';

export function usePlanProgress(projectId: string | null): PlanProgress {
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const guilds = usePolycultureStore((s) => s.guilds);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const successionByProject = useSuccessionPathStore((s) => s.byProject);
  const phases = usePhaseStore((s) => s.phases);
  const workItems = useWorkItemStore((s) => s.items);
  const beEntities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const materialFlows = useClosedLoopStore((s) => s.materialFlows);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const principleByProject = usePrincipleCheckStore((s) => s.byProject);

  return useMemo(() => {
    if (!projectId) return evaluatePlan(EMPTY_PLAN_INPUT);

    const byProject = <T extends { projectId: string }>(arr: T[]): number =>
      arr.reduce((n, item) => (item.projectId === projectId ? n + 1 : n), 0);

    const successionPlanned =
      (successionByProject[projectId]?.milestones?.length ?? 0) > 0;

    const principleMetCount = Object.values(
      principleByProject[projectId] ?? {},
    ).reduce((n, check) => (check.status === 'met' ? n + 1 : n), 0);

    return evaluatePlan({
      waterNodeCount: byProject(waterNodes),
      zoneCount: byProject(zones),
      pathCount: byProject(paths),
      guildCount: byProject(guilds),
      cropAreaCount: byProject(cropAreas),
      successionPlanned,
      phaseCount: byProject(phases),
      workItemCount: byProject(workItems),
      builtProposedCount: beEntities.reduce(
        (n, e) =>
          e.projectId === projectId && e.state === 'proposed' ? n + 1 : n,
        0,
      ),
      soilFlowCount: byProject(materialFlows) + byProject(fertilityInfra),
      paddockCount: byProject(paddocks),
      principleMetCount,
    });
  }, [
    projectId,
    waterNodes,
    zones,
    paths,
    guilds,
    cropAreas,
    successionByProject,
    phases,
    workItems,
    beEntities,
    materialFlows,
    fertilityInfra,
    paddocks,
    principleByProject,
  ]);
}
