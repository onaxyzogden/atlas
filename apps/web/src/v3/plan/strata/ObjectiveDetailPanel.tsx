// ObjectiveDetailPanel — right column of the Plan stratum shell, mounted when a
// stratum objective is selected (Plan Navigation Spec v1, Slice 1.6). Hosts the
// four spec sections: OBJECTIVE (ObjectiveHeader), MAP ACTIVATION
// (MapActivationStrip + ObjectiveMap), YOUR DECISIONS (Slice 1.7), and
// REFERENCE (Slice 1.8). LaunchActButton (Slice 1.9) anchors the bottom.
//
// activeOverlayIds is owned here so the strip and the map stay in lockstep.
// Reset is keyed to objective.id at the parent via `<ObjectiveDetailPanel
// key={objective.id} ... />` — clean reset, no useEffect.

import { useEffect, useState } from 'react';
import type {
  OverlayId,
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { isCyclicalReviewDue } from '@ogden/shared';
import type { Project } from '../../types.js';
import { usePlanStratumProgressStore } from '../../../store/planStratumStore.js';
import { useCyclicalReviewStore } from '../../../store/cyclicalReviewStore.js';
import ObjectiveMap from '../../olos/map/ObjectiveMap.js';
import ObjectiveHeader from './ObjectiveHeader.js';
import MapActivationStrip from './MapActivationStrip.js';
import ActProgressBar from './ActProgressBar.js';
import DecisionChecklist from './DecisionChecklist.js';
import DetailsExpander from './DetailsExpander.js';
import LaunchActButton from './LaunchActButton.js';
import CyclicalReviewBanner from './CyclicalReviewBanner.js';
import CyclicalReviewModal from './CyclicalReviewModal.js';
import type { VisionDerivedMap } from './visionProfileToChecklist.js';
// Plan Spine re-skin — the panel is now the full-bleed RIGHT pane of the
// 3-column spine shell (no longer a bordered BentoBox card). Its inner sections
// (map body, reference placeholders) keep their existing CSS module, which
// already resolves against the app's dark `--color-*` theme.
import { C } from '../spine/tokens.js';
import css from './ObjectiveDetailPanel.module.css';

interface Props {
  projectId: string;
  stratum: PlanStratum;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  project: Project | null;
  onBackToStratum: (stratum: PlanStratum) => void;
  /** Slice 1.12 — items the Vision Builder bridge has pre-satisfied. */
  visionDerivedMap?: VisionDerivedMap;
}

export default function ObjectiveDetailPanel({
  projectId,
  stratum,
  objective,
  status,
  project,
  onBackToStratum,
  visionDerivedMap,
}: Props) {
  const [activeOverlayIds, setActiveOverlayIds] = useState<OverlayId[]>([
    ...objective.defaultOverlayBundle,
  ]);

  // Subscribe to just this objective's completion slice. Phase B made the Plan
  // checklist read-only ("decisions are worked through in Act"), so the panel
  // only READS completion state here — no toggling wiring.
  const completedItemIds = usePlanStratumProgressStore((s) =>
    s.getCompletedItemIds(projectId, objective.id),
  );

  // Slice 1.11 — cyclical review wiring. Subscribe to this objective's
  // review record so the banner mounts/unmounts the moment the steward
  // hits Confirm/Revise. The forced-trigger flag plugs into the predicate
  // via observeRevisionFlag — Phase 4 will swap this for real Observe
  // data; until then it is set by `cyclicalReviewStore.forceTrigger`
  // (dev-tools entry exposed at window.cyclicalReviewStore).
  const reviewRecord = useCyclicalReviewStore((s) =>
    s.getRecord(projectId, objective.id),
  );
  const isForced = useCyclicalReviewStore((s) =>
    s.isForced(projectId, objective.id),
  );
  const noteCompletion = useCyclicalReviewStore((s) => s.noteCompletion);
  const confirmDecision = useCyclicalReviewStore((s) => s.confirmDecision);
  const acknowledgeRevise = useCyclicalReviewStore((s) => s.acknowledgeRevise);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Start the 90-day clock the first time the objective reaches `complete`.
  // The store guards re-writes so re-renders from other state are no-ops.
  useEffect(() => {
    if (!projectId) return;
    if (status === 'complete') {
      noteCompletion(projectId, objective.id);
    }
  }, [projectId, objective.id, status, noteCompletion]);

  const reviewDue = isCyclicalReviewDue({
    objective,
    currentStatus: status,
    lastReviewedAt: reviewRecord.lastReviewedAt,
    now: Date.now(),
    observeRevisionFlag: isForced ? () => true : undefined,
  });

  const handleConfirmDecision = () => {
    if (!projectId) return;
    confirmDecision(projectId, objective.id);
    setShowConfirmModal(true);
  };

  const handleReviseDecision = () => {
    if (!projectId) return;
    acknowledgeRevise(projectId, objective.id);
  };

  const toggleOverlay = (overlayId: OverlayId) => {
    setActiveOverlayIds((prev) =>
      prev.includes(overlayId)
        ? prev.filter((id) => id !== overlayId)
        : [...prev, overlayId],
    );
  };

  // Only mount the MAP ACTIVATION region (strip + embedded map) when the
  // objective actually has overlays bound. Exact inverse of the
  // OverlayBundleStrip empty-state (`bundle.length === 0`), so we never show
  // a map with a "No overlays bound to this objective." strip above it. The
  // region reappears automatically once an objective gets a non-empty bundle.
  const hasOverlays = objective.defaultOverlayBundle.length > 0;

  return (
    <section
      aria-label={`Objective: ${objective.title}`}
      data-testid="plan-objective-detail-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden auto',
        background: C.bg,
      }}
    >
      <ObjectiveHeader
        stratum={stratum}
        objective={objective}
        status={status}
        onBackToStratum={onBackToStratum}
      />

      {reviewDue && (
        <CyclicalReviewBanner
          onConfirm={handleConfirmDecision}
          onRevise={handleReviseDecision}
        />
      )}

      {hasOverlays && (
        <>
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
        </>
      )}

      <ActProgressBar projectId={projectId} objectiveId={objective.id} />

      <DecisionChecklist
        objective={objective}
        status={status}
        completedItemIds={completedItemIds}
        derivedEvidence={visionDerivedMap}
      />

      {objective.legacyCardSectionId ? (
        <DetailsExpander
          projectId={projectId}
          legacyCardSectionId={objective.legacyCardSectionId}
        />
      ) : (
        <div className={css.placeholderStack}>
          <div className={css.placeholderSection}>
            <p className={css.placeholderEyebrow}>Reference</p>
            <p className={css.placeholderBody}>
              No legacy module card linked to this objective.
            </p>
          </div>
        </div>
      )}

      <LaunchActButton
        projectId={projectId}
        objective={objective}
        status={status}
      />

      {showConfirmModal && (
        <CyclicalReviewModal
          objective={objective}
          onDismiss={() => setShowConfirmModal(false)}
        />
      )}
    </section>
  );
}
