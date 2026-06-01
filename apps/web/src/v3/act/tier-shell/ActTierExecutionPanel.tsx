// ActTierExecutionPanel.tsx
//
// Production tier-shell right-rail detail panel: progress + checklist +
// persisted evidence capture for the selected objective. Promoted from the
// (disposable) tier-prototype ActProtoExecutionPanel so production owns its
// own copy.
//
// Evidence is now OBJECTIVE-DRIVEN (each objective declares which proof items
// it requires via getObjectiveEvidence, @ogden/shared) and PERSISTED:
//
//   - Checklist completion  -> planStratumStore.toggleItem (projectId, objectiveId, itemId)
//                             Same store the Plan stage reads; item ids are globally
//                             unique so progress is shared across Act + Plan views.
//   - Photo counts / confirms / notes -> actEvidenceStore (projectId, objectiveId, descriptorId)

import { useMemo, useState } from 'react';
import { Camera, Check, ClipboardCheck, Plus } from 'lucide-react';
import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
  EvidenceDescriptor,
  ObserveDataPoint,
  StandardProtocolTemplate,
  ConfirmationStatus,
} from '@ogden/shared';
import {
  getObjectiveEvidence,
  getPrimaryDomainForObjective,
  resolveSeverityTier,
} from '@ogden/shared';
import {
  usePlanStratumProgressStore,
} from '../../../store/planStratumStore.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import { useProtocolLibrary } from '../../plan/strata/useProtocolLibrary.js';
import { FEEDS_TO_MODULE } from '../data/protocolFeedsMap.js';
import TriggerRecognitionSheet from '../protocols/TriggerRecognitionSheet.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import { resolveAnswerSpec } from '../../strata/resolveAnswerSpec.js';
import AnswerRecap from './AnswerRecap.js';
import {
  useActEvidenceStore,
  EMPTY_CAPTURE,
  type EvidenceCapture,
} from '../../../store/actEvidenceStore.js';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import { useObservationNeedStore } from '../../../store/observationNeedStore.js';
import {
  readNote,
  formatActyTimestamp,
} from '../../observe/dashboard/observationDisplay.js';
import { Modal } from '../../../components/ui/Modal.js';
import RaiseNeedForm from '../../observe/capture/RaiseNeedForm.js';
import {
  buildRaisedNeed,
  type RaiseNeedInput,
} from '../../observation-needs/observationNeed.js';
import { useObservationNeeds } from '../../observation-needs/useObservationNeeds.js';
import type { ObserveModule } from '../../observe/types.js';
import styles from './ActTierExecutionPanel.module.css';

// Stable empty fallback so the completedIds selector never returns a new
// array reference when the project has no progress for this objective yet.
const EMPTY_IDS: readonly string[] = Object.freeze([]);

/**
 * Is one evidence descriptor satisfied by the persisted capture?
 *   photo   -> count reached its target
 *   confirm -> confirmed true
 *   note    -> a note has been saved
 * Pure; reads only the descriptor + capture so it can gate the Record button.
 */
function isEvidenceSatisfied(
  descriptor: EvidenceDescriptor,
  capture: EvidenceCapture,
): boolean {
  if (descriptor.kind === 'photo') {
    return (capture.photos[descriptor.id] ?? 0) >= (descriptor.target ?? 1);
  }
  if (descriptor.kind === 'confirm') {
    return capture.confirms[descriptor.id] === true;
  }
  return capture.notesSaved[descriptor.id] === true;
}

interface Props {
  projectId: string;
  tier: PlanStratum | undefined;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
}

export default function ActTierExecutionPanel({
  projectId,
  tier,
  objective,
  status,
}: Props) {
  // -------------------------------------------------------------------------
  // Checklist -- wired to planStratumStore (shared with Plan stage).
  // -------------------------------------------------------------------------
  // Single source of truth (2026-05-31): completed ids come from effective
  // progress (stored ∪ wizard-derived Stratum-1 completion), so this panel's
  // checklist + "N/M steps" match Plan for a freshly-wizard-completed project.
  // Writes still go straight to planStratumStore via toggleItem below.
  const objectivesArg = useMemo(() => [objective], [objective]);
  const effectiveProgress = useEffectiveChecklistProgress(
    projectId,
    objectivesArg,
  );
  const completedIds = effectiveProgress.byObjective[objective.id] ?? EMPTY_IDS;
  const toggleItem = usePlanStratumProgressStore((s) => s.toggleItem);

  // -------------------------------------------------------------------------
  // Evidence -- wired to actEvidenceStore.
  // -------------------------------------------------------------------------
  const capture = useActEvidenceStore(
    (s) => s.byProject[projectId]?.[objective.id] ?? EMPTY_CAPTURE,
  );
  const addPhoto = useActEvidenceStore((s) => s.addPhoto);
  const setConfirm = useActEvidenceStore((s) => s.setConfirm);
  const updateNote = useActEvidenceStore((s) => s.updateNote);
  const saveNote = useActEvidenceStore((s) => s.saveNote);

  // Observe substrate: completing an objective emits a manual observation.
  const recordDataPoint = useObserveDataPointStore((s) => s.recordDataPoint);

  // Raise-follow-up-need: opens the shared RaiseNeedForm in a modal and creates
  // a tracked ObservationNeed (surfaces in the Observe Command Centre + the
  // domain needs panels). Mirrors the Command Centre's manual-raise path.
  const [raising, setRaising] = useState(false);
  const [raisedTitle, setRaisedTitle] = useState<string | null>(null);
  const createNeed = useObservationNeedStore((s) => s.createNeed);
  const needViews = useObservationNeeds(projectId);

  // -------------------------------------------------------------------------
  // Protocol Trigger Recognition (OLOS slice C3).
  // -------------------------------------------------------------------------
  // Recording an observation on the proof-capture surface is the seam where a
  // relevant standing protocol's trigger is recognised. We derive the project's
  // active protocol library (same source as Plan) and, after a record, surface
  // the Trigger Recognition sheet for the highest-priority ACTIVE RESPOND
  // protocol whose feed maps to this objective's primary Observe domain.
  const metadata = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata,
  );
  const typeRecord = metadata?.projectTypeRecord;
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  const { templates, statusByTemplate, outputs } = useProtocolLibrary(
    projectId,
    primaryTypeId,
    secondaryTypeIds,
  );
  const recordActivation = useProtocolStore((s) => s.recordActivation);
  const markTriggered = useProtocolStore((s) => s.markTriggered);
  const [pendingTrigger, setPendingTrigger] =
    useState<StandardProtocolTemplate | null>(null);

  // Per-objective activity feed. Subscribe to the raw byProject map and
  // useMemo-filter (mirrors useDomainPoints) so the selector never returns a
  // fresh array reference per render. Newest first.
  const pointsByProject = useObserveDataPointStore((s) => s.byProject);
  const objectiveObservations = useMemo(
    () =>
      (pointsByProject[projectId] ?? [])
        .filter((p) => p.sourceObjectiveId === objective.id)
        .slice()
        .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt)),
    [pointsByProject, projectId, objective.id],
  );

  // -------------------------------------------------------------------------
  // Progress derivations.
  // -------------------------------------------------------------------------
  const evidence = useMemo(
    () => getObjectiveEvidence(objective),
    [objective],
  );

  const total = objective.checklist.length;
  const done = useMemo(
    () =>
      objective.checklist.filter((item) => completedIds.includes(item.id))
        .length,
    [objective.checklist, completedIds],
  );
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // Record-observation gate: checklist complete AND every REQUIRED evidence
  // item satisfied AND the objective resolves to a primary Observe domain (so
  // the emitted data point is schema-valid). The progress bar above stays
  // checklist-only -- its sublabel reads "{done}/{total} steps".
  const domainId = useMemo(
    () => getPrimaryDomainForObjective(objective),
    [objective],
  );
  const checklistReady = total > 0 && done === total;
  const evidenceReady = useMemo(
    () =>
      evidence
        .filter((d) => d.required)
        .every((d) => isEvidenceSatisfied(d, capture)),
    [evidence, capture],
  );
  const ready = checklistReady && evidenceReady && domainId !== null;

  // Repeat recordings are allowed: the activity feed below is the persistent
  // history, so the Record button stays armed and a new row is the confirmation
  // (no post-record lock).
  function handleRecord() {
    if (!ready || domainId === null) return;
    const savedNotes = evidence
      .filter((d) => d.kind === 'note' && capture.notesSaved[d.id])
      .map((d) => capture.notes[d.id])
      .filter((text): text is string => Boolean(text))
      .join(' -- ');
    const point: ObserveDataPoint = {
      id: crypto.randomUUID(),
      projectId,
      domainId,
      sourceType: 'manual_observation',
      sourceActionId: null,
      sourceFeedEntryId: null,
      sourceObjectiveId: objective.id,
      // Objective-progress recordings are not scoped to a placed Plan feature.
      sourceFeatureRef: null,
      locationGeometry: null,
      cycleId: 0,
      isSuperseded: false,
      supersededBy: null,
      statusOutput: 'clear',
      measurementValue: savedNotes
        ? { label: objective.title, note: savedNotes }
        : { label: objective.title },
      proofItems: [],
      capturedAt: new Date().toISOString(),
      capturedBy: 'act-tier',
    };
    recordDataPoint(point);

    // After capture, recognise a relevant standing protocol's trigger: the
    // first ACTIVE RESPOND template whose feed maps to this objective's domain.
    const trigger = pickTrigger();
    if (trigger) setPendingTrigger(trigger);
  }

  // Mean center of existing needs (fallback to MTC) -- an Act-tier raise is not
  // tied to a placed map point, same analog as a manual Command-Centre raise.
  const FALLBACK_CENTER: [number, number] = [-78.2, 44.5];
  const meanCenter = (): [number, number] => {
    const cs = needViews.map((v) => v.objective.target.center);
    if (cs.length === 0) return FALLBACK_CENTER;
    return [
      cs.reduce((a, c) => a + c[0], 0) / cs.length,
      cs.reduce((a, c) => a + c[1], 0) / cs.length,
    ];
  };

  const raiseFollowUp = (input: RaiseNeedInput & { module: ObserveModule }) => {
    const need = buildRaisedNeed(input, {
      id: crypto.randomUUID(),
      projectId,
      module: input.module,
      target: { center: meanCenter() },
      origin: 'manual',
    });
    createNeed(projectId, need);
    setRaising(false);
    setRaisedTitle(need.title);
  };

  /**
   * Highest-priority (catalogue-order) ACTIVE, RESPOND-tier template whose
   * `feeds` maps (via FEEDS_TO_MODULE) to this objective's primary Observe
   * domain. Returns null when none is relevant -- the sheet then stays closed.
   */
  function pickTrigger(): StandardProtocolTemplate | null {
    if (domainId === null) return null;
    return (
      templates.find((t) => {
        if (statusByTemplate[t.id] !== 'active') return false;
        if (resolveSeverityTier(t) !== 'respond') return false;
        return t.feeds.some((f) => FEEDS_TO_MODULE[f] === domainId);
      }) ?? null
    );
  }

  /**
   * Resolve the recognised trigger: write an immutable ProtocolActivation
   * (snapshotting the recipe now), and on 'confirmed' also light the existing
   * triggered lifecycle so the legacy Act badge / TriggeredProtocolsPanel react.
   */
  function resolveTrigger(confirmationStatus: ConfirmationStatus) {
    const template = pendingTrigger;
    if (!template) return;
    recordActivation({
      projectId,
      templateId: template.id,
      severityTier: resolveSeverityTier(template),
      confirmationStatus,
      recipeSnapshot: {
        name: template.name,
        condition: template.condition,
        response: template.response,
      },
      triggerContext: 'act_proof_capture',
    });
    if (confirmationStatus === 'confirmed') {
      markTriggered(projectId, template.id);
    }
    setPendingTrigger(null);
  }

  // -------------------------------------------------------------------------
  // Evidence card renderer. Each branch reproduces the exact markup/classes
  // the old hardcoded cards used, so the visual is unchanged for any card
  // that is shown -- only WHICH cards appear is objective-driven, and the
  // state is now persisted rather than ephemeral.
  // -------------------------------------------------------------------------
  function renderEvidenceCard(descriptor: EvidenceDescriptor) {
    const reqMark = descriptor.required ? (
      <span className={styles.req}> *</span>
    ) : null;

    if (descriptor.kind === 'photo') {
      const target = descriptor.target ?? 1;
      const count = capture.photos[descriptor.id] ?? 0;
      return (
        <div className={styles.evCard} key={descriptor.id}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              {descriptor.label}
              {reqMark}
            </span>
            <span className={styles.evCardCount}>
              {count}/{target}
            </span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            onClick={() =>
              addPhoto(projectId, objective.id, descriptor.id, target)
            }
          >
            <Camera size={14} aria-hidden="true" />
            Add photo
          </button>
        </div>
      );
    }

    if (descriptor.kind === 'confirm') {
      const ok = capture.confirms[descriptor.id] ?? false;
      return (
        <div className={styles.evCard} key={descriptor.id}>
          <div className={styles.evCardTop}>
            <span className={styles.evCardTitle}>
              {descriptor.label}
              {reqMark}
            </span>
            <span className={styles.evCardCount}>{ok ? 1 : 0}/1</span>
          </div>
          <button
            type="button"
            className={styles.evBtnFull}
            data-confirmed={ok}
            onClick={() =>
              setConfirm(projectId, objective.id, descriptor.id, true)
            }
          >
            <Check size={14} aria-hidden="true" />
            {ok ? 'Confirmed' : 'Confirm'}
          </button>
        </div>
      );
    }

    // kind === 'note'
    const noteValue = capture.notes[descriptor.id] ?? '';
    const saved = capture.notesSaved[descriptor.id] ?? false;
    return (
      <div className={styles.evCard} key={descriptor.id}>
        <div className={styles.evCardTop}>
          <span className={styles.evCardTitle}>
            {descriptor.label}
            {reqMark}
          </span>
          <span className={styles.evCardCount}>{saved ? 1 : 0}/1</span>
        </div>
        <textarea
          className={styles.noteArea}
          rows={3}
          placeholder={descriptor.label}
          value={noteValue}
          onChange={(event) => {
            updateNote(
              projectId,
              objective.id,
              descriptor.id,
              event.target.value,
            );
          }}
        />
        <div className={styles.evBtnRow}>
          <button
            type="button"
            className={styles.evBtnSmall}
            data-saved={saved}
            disabled={noteValue.trim().length === 0}
            onClick={() =>
              saveNote(projectId, objective.id, descriptor.id)
            }
          >
            {saved ? 'Saved' : 'Save note'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.execPanel}>
      <div className={styles.execHeaderBox}>
        <div className={styles.execHeader}>
          <span className={styles.execEyebrow}>{tier?.title ?? 'Objective'}</span>
          <span className={styles.execTitle}>{objective.title}</span>
          <span className={styles.execStatus} data-status={status}>
            {status}
          </span>
          <p className={styles.execDesc}>{objective.focusedQuestion}</p>
        </div>

        <div className={styles.execProgress}>
          <div className={styles.execBar}>
            <div className={styles.execBarFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.execProgressTop}>
            <span>{pct}% ready</span>
            <span>
              {done}/{total} steps
            </span>
          </div>
        </div>
      </div>

      <div className={styles.execBody}>
      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>Checklist</h4>
        <div className={styles.execChecklist}>
          {objective.checklist.map((item) => {
            // Prefilled read-only recap: when the item carries an answerSpec
            // whose source data is already present (wizard / Vision Builder /
            // team step), show the prior answer in its original control style
            // instead of re-asking. It auto-satisfies via effective progress,
            // so no checkbox is shown; editing happens in Plan via the link.
            if (item.answerSpec && resolveAnswerSpec(metadata, item.answerSpec).isAnswered) {
              return (
                <AnswerRecap
                  key={item.id}
                  projectId={projectId}
                  item={item}
                  metadata={metadata}
                />
              );
            }
            return (
              <label key={item.id} className={styles.execCheckRow}>
                <input
                  type="checkbox"
                  checked={completedIds.includes(item.id)}
                  onChange={() => toggleItem(projectId, objective.id, item.id)}
                />
                <span>
                  {item.label}
                  {!item.optional && <span className={styles.req}> *</span>}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>Evidence</h4>
        {evidence.map(renderEvidenceCard)}
      </section>

      <section className={styles.execSection}>
        <h4 className={styles.execSectionTitle}>This need&apos;s activity</h4>
        {objectiveObservations.length === 0 ? (
          <p className={styles.execEmpty}>No observations recorded.</p>
        ) : (
          <ol className={styles.actyList} aria-label="Recorded observations">
            {objectiveObservations.map((obs) => {
              const note = readNote(obs.measurementValue);
              return (
                <li key={obs.id} className={styles.actyRow}>
                  <span className={styles.actyMeta}>
                    {formatActyTimestamp(obs.capturedAt)} &middot; {obs.capturedBy}
                  </span>
                  {note && <span className={styles.actyNote}>{note}</span>}
                </li>
              );
            })}
          </ol>
        )}
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => setRaising(true)}
        >
          <Plus size={13} aria-hidden="true" />
          Raise follow-up need
        </button>
        {raisedTitle && (
          <p className={styles.raisedConfirm}>
            Raised follow-up need: {raisedTitle}
          </p>
        )}
      </section>

      <button
        type="button"
        className={styles.recordBtn}
        disabled={!ready}
        onClick={handleRecord}
      >
        <ClipboardCheck size={16} aria-hidden="true" />
        Record observation
      </button>
      </div>

      {pendingTrigger && (
        <TriggerRecognitionSheet
          projectId={projectId}
          template={pendingTrigger}
          tier={resolveSeverityTier(pendingTrigger)}
          outputs={outputs}
          onResolve={resolveTrigger}
          onClose={() => setPendingTrigger(null)}
        />
      )}

      <Modal
        open={raising}
        onClose={() => setRaising(false)}
        title="Raise follow-up need"
        size="md"
      >
        <RaiseNeedForm
          showModulePicker
          defaultModule={domainId ?? undefined}
          submitLabel="Raise need"
          onSubmit={raiseFollowUp}
          onCancel={() => setRaising(false)}
        />
      </Modal>
    </div>
  );
}
