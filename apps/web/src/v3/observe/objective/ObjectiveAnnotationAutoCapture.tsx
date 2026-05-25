/**
 * CaptureAnnotationAutoCapture — headless bridge that turns a real feature
 * placement into a need's `annotation` evidence. Mounted only while an
 * observation need is focused. It listens to the `placementSignalStore` pulse
 * fired by `createWithDefaults` on every Observe annotation draw; when a feature
 * is placed with one of the focused need's `requiredTools` and the need still
 * has an unsatisfied `annotation` evidence spec, it records one captured item
 * (linking the new annotation id) against that spec.
 *
 * The manual "Mark captured" button in `ObjectiveEvidenceCapture` remains as a
 * fallback for tools that don't route through `createWithDefaults`.
 *
 * Renders no DOM.
 */

import { useEffect, useRef } from 'react';
import { usePlacementSignalStore } from '../../../store/placementSignalStore.js';
import { useObservationNeedStore } from '../../../store/fieldObjectiveStore.js';
import { useMapToolStore } from '../components/measure/useMapToolStore.js';
import { firstUnsatisfiedAnnotationSpec } from '../../objectives/fieldObjective.js';
import type { ObservationNeedView } from '../../objectives/useFieldObjectives.js';

interface Props {
  projectId: string;
  view: ObservationNeedView;
}

export default function CaptureAnnotationAutoCapture({
  projectId,
  view,
}: Props) {
  const seq = usePlacementSignalStore((s) => s.seq);
  const objective = view.objective;
  // Dedupe: process each placement pulse exactly once even under StrictMode's
  // double-invoke or unrelated re-renders. Seeded to the current seq so a
  // placement that happened before this component mounted is never replayed.
  const handledSeq = useRef(seq);

  useEffect(() => {
    if (seq === handledSeq.current) return;
    handledSeq.current = seq;

    const { activeTool } = useMapToolStore.getState();
    if (!activeTool || !objective.requiredTools.includes(activeTool)) return;

    // Read the live run so back-to-back placements see prior captures and the
    // spec's `min` is respected rather than over-counting against a stale view.
    const run = useObservationNeedStore.getState().getRun(projectId, objective.id);
    const spec = firstUnsatisfiedAnnotationSpec(objective, run);
    if (!spec) return;

    const { lastId } = usePlacementSignalStore.getState();
    useObservationNeedStore.getState().addEvidence(projectId, objective.id, {
      specId: spec.id,
      kind: 'annotation',
      value: lastId ?? '',
    });
  }, [seq, projectId, objective]);

  return null;
}
