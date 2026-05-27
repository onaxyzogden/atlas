// ObjectiveDetailPanel — right column of the Plan tier shell, mounted when a
// tier objective is selected (Plan Navigation Spec v1, Slice 1.6). Hosts the
// four spec sections: OBJECTIVE (ObjectiveHeader), MAP ACTIVATION
// (MapActivationStrip + ObjectiveMap), YOUR DECISIONS (Slice 1.7), and
// REFERENCE (Slice 1.8). LaunchActButton (Slice 1.9) anchors the bottom.
//
// activeOverlayIds is owned here so the strip and the map stay in lockstep.
// Reset is keyed to objective.id at the parent via `<ObjectiveDetailPanel
// key={objective.id} ... />` — clean reset, no useEffect.

import { useCallback, useState } from 'react';
import type {
  OverlayId,
  PlanTier,
  PlanTierObjective,
  PlanTierObjectiveStatus,
} from '@ogden/shared';
import type { Project } from '../../types.js';
import { usePlanTierProgressStore } from '../../../store/planTierStore.js';
import ObjectiveMap from '../../olos/map/ObjectiveMap.js';
import ObjectiveHeader from './ObjectiveHeader.js';
import MapActivationStrip from './MapActivationStrip.js';
import DecisionChecklist from './DecisionChecklist.js';
import css from './ObjectiveDetailPanel.module.css';

interface Props {
  projectId: string;
  tier: PlanTier;
  objective: PlanTierObjective;
  status: PlanTierObjectiveStatus;
  project: Project | null;
  onBackToTier: (tier: PlanTier) => void;
}

export default function ObjectiveDetailPanel({
  projectId,
  tier,
  objective,
  status,
  project,
  onBackToTier,
}: Props) {
  const [activeOverlayIds, setActiveOverlayIds] = useState<OverlayId[]>([
    ...objective.defaultOverlayBundle,
  ]);

  // Subscribe to just this objective's slice so toggles elsewhere don't
  // re-render the panel.
  const completedItemIds = usePlanTierProgressStore((s) =>
    s.getCompletedItemIds(projectId, objective.id),
  );
  const toggleItem = usePlanTierProgressStore((s) => s.toggleItem);
  const onToggleChecklistItem = useCallback(
    (itemId: string) => {
      if (!projectId) return;
      toggleItem(projectId, objective.id, itemId);
    },
    [toggleItem, projectId, objective.id],
  );

  const toggleOverlay = (overlayId: OverlayId) => {
    setActiveOverlayIds((prev) =>
      prev.includes(overlayId)
        ? prev.filter((id) => id !== overlayId)
        : [...prev, overlayId],
    );
  };

  return (
    <section
      className={css.panel}
      aria-label={`Objective: ${objective.title}`}
      data-testid="plan-objective-detail-panel"
    >
      <ObjectiveHeader
        tier={tier}
        objective={objective}
        status={status}
        onBackToTier={onBackToTier}
      />

      <MapActivationStrip
        objective={objective}
        activeOverlayIds={activeOverlayIds}
        onToggleOverlay={toggleOverlay}
      />

      <div className={css.mapBody}>
        <ObjectiveMap
          stage="plan"
          domain="land-base"
          project={project}
          activeOverlayIds={activeOverlayIds}
        />
      </div>

      <DecisionChecklist
        objective={objective}
        status={status}
        completedItemIds={completedItemIds}
        onToggleItem={onToggleChecklistItem}
      />

      <div className={css.placeholderStack}>
        <div className={css.placeholderSection}>
          <p className={css.placeholderEyebrow}>Reference</p>
          <p className={css.placeholderBody}>
            Legacy module card embed lands in Slice 1.8.
          </p>
        </div>
      </div>
    </section>
  );
}
