/**
 * useActProgress — the only React/store-coupled layer of the Act objectives
 * engine. Subscribes to the per-project slice of each Act-domain store,
 * assembles a plain `ActProgressInput` bag, and runs the pure `evaluateAct`
 * predicates from `objectives.ts`.
 *
 * Selector stability: each store hook subscribes to a *raw* state field
 * (array) — never a freshly-allocated derived value — and all counting happens
 * inside a single `useMemo`. This avoids the zustand `Object.is` re-render loop
 * documented in `wiki/decisions/2026-04-26-zustand-selector-stability.md`.
 *
 * Store-shape note: every Act store is a flat array of `.projectId`-tagged
 * rows EXCEPT `hazardsStore`, whose state is a nested
 * `byProject: { projectId, hazards[] }[]` — handled specially below.
 */

import { useMemo } from 'react';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { usePilotPlotStore } from '../../../store/pilotPlotStore.js';
import { useMaintenanceLogStore } from '../../../store/maintenanceLogStore.js';
import { useLivestockMoveLogStore } from '../../../store/livestockMoveLogStore.js';
import { useHarvestLogStore } from '../../../store/harvestLogStore.js';
import { useSwotStore } from '../../../store/swotStore.js';
import { useHazardsStore } from '../../../store/hazardsStore.js';
import { useNetworkStore } from '../../../store/networkStore.js';
import { useCommunityEventStore } from '../../../store/communityEventStore.js';
import { useAppropriateTechStore } from '../../../store/appropriateTechStore.js';
import {
  EMPTY_ACT_INPUT,
  evaluateAct,
  type ActProgress,
} from './objectives.js';

export function useActProgress(projectId: string | null): ActProgress {
  const workItems = useWorkItemStore((s) => s.items);
  const phases = usePhaseStore((s) => s.phases);
  const pilots = usePilotPlotStore((s) => s.pilots);
  const maintenanceEvents = useMaintenanceLogStore((s) => s.events);
  const livestockMoves = useLivestockMoveLogStore((s) => s.events);
  const harvestEntries = useHarvestLogStore((s) => s.entries);
  const swot = useSwotStore((s) => s.swot);
  const hazardsByProject = useHazardsStore((s) => s.byProject);
  const contacts = useNetworkStore((s) => s.contacts);
  const communityEvents = useCommunityEventStore((s) => s.events);
  const appropriateTech = useAppropriateTechStore((s) => s.items);

  return useMemo(() => {
    if (!projectId) return evaluateAct(EMPTY_ACT_INPUT);

    const byProject = <T extends { projectId: string }>(arr: T[]): number =>
      arr.reduce((n, item) => (item.projectId === projectId ? n + 1 : n), 0);

    const hazardCount =
      hazardsByProject.find((p) => p.projectId === projectId)?.hazards.length ??
      0;

    return evaluateAct({
      workItemDoneCount: workItems.reduce(
        (n, w) =>
          w.projectId === projectId && w.status === 'done' ? n + 1 : n,
        0,
      ),
      phaseCompletedCount: phases.reduce(
        (n, p) => (p.projectId === projectId && p.completed ? n + 1 : n),
        0,
      ),
      pilotCount: byProject(pilots),
      maintenanceEventCount: byProject(maintenanceEvents),
      livestockMoveCount: byProject(livestockMoves),
      harvestEntryCount: byProject(harvestEntries),
      swotCount: byProject(swot),
      hazardCount,
      contactCount: byProject(contacts),
      communityEventCount: byProject(communityEvents),
      appropriateTechCount: byProject(appropriateTech),
    });
  }, [
    projectId,
    workItems,
    phases,
    pilots,
    maintenanceEvents,
    livestockMoves,
    harvestEntries,
    swot,
    hazardsByProject,
    contacts,
    communityEvents,
    appropriateTech,
  ]);
}
