/**
 * useRealityCheckData -- the runtime wiring layer for Threshold 1. It resolves
 * the LIVE inputs the pure `realityCheckModel` / `intentElements` derivations
 * need, from the same stores the rest of the Plan shell reads:
 *
 *   - intent elements  <- the two Tier-0 captures (`s1-vision-classify`,
 *                          `s1-vision-constraints`) on actEvidenceStore, decoded
 *                          via the capture decoders, with a VisionProfile-derived
 *                          fallback when both captures are empty (Design 3).
 *   - per-survey evidence <- the resolved objective set + the live LOCKING
 *                          statuses, projected onto the 11 survey objective ids.
 *
 * PURE store reads -> pure model calls; this hook performs NO writes (the surface
 * components own the mutations). Kept out of the presentational components so the
 * derivation is independently testable and they stay thin.
 */

import { useMemo } from 'react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { decodeClassify } from '../../act/tier-shell/VisionClassifyCapture.js';
import { decodeConstraints } from '../../act/tier-shell/ConstraintsCapture.js';
import { deriveIntentElements, type IntentElement } from './intentElements.js';
import {
  ALL_SURVEY_OBJECTIVE_IDS,
  type StrandSurveyEvidence,
} from './realityCheckModel.js';

// The two Tier-0 capture form ids whose decoded values seed the intent list.
const CLASSIFY_FORM_ID = 's1-vision-classify';
const CONSTRAINTS_FORM_ID = 's1-vision-constraints';

export interface RealityCheckData {
  /** Typed intent elements Phase 2 classifies (captures-primary, profile fallback). */
  elements: IntentElement[];
  /** Per-survey resolved evidence keyed by objective id (fed to deriveStrandEvidence). */
  perSurvey: Record<string, StrandSurveyEvidence>;
}

/**
 * Resolve the live Threshold-1 inputs for a project. Reactive: re-derives when
 * the captures, the VisionProfile, the objective set, or the statuses change.
 */
export function useRealityCheckData(
  projectId: string,
  objectives: readonly PlanStratumObjective[],
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>,
): RealityCheckData {
  const classifyValue = useActEvidenceStore(
    (s) => s.visionFormData[projectId]?.[CLASSIFY_FORM_ID],
  );
  const constraintsValue = useActEvidenceStore(
    (s) => s.visionFormData[projectId]?.[CONSTRAINTS_FORM_ID],
  );
  // Fallback seed only; the profile object is a stable ref so this selector is
  // referentially safe under Zustand v5.
  const visionProfile = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId || p.serverId === projectId)
        ?.metadata?.visionProfile ?? null,
  );

  const elements = useMemo(
    () =>
      deriveIntentElements({
        classify: classifyValue ? decodeClassify(classifyValue) : null,
        constraints: constraintsValue
          ? decodeConstraints(constraintsValue)
          : null,
        visionProfile,
      }),
    [classifyValue, constraintsValue, visionProfile],
  );

  const perSurvey = useMemo(() => {
    const titleById = new Map(objectives.map((o) => [o.id, o.title]));
    const out: Record<string, StrandSurveyEvidence> = {};
    for (const id of ALL_SURVEY_OBJECTIVE_IDS) {
      out[id] = {
        objectiveId: id,
        label: titleById.get(id) ?? id,
        complete: objectiveStatuses[id] === 'complete',
      };
    }
    return out;
  }, [objectives, objectiveStatuses]);

  return { elements, perSurvey };
}
