/**
 * ThresholdDirectionPhase -- Phase 2 (Direction) of Threshold 1. The decisional
 * surface: each declared intent element is classified against the assembled
 * evidence using the exact, type-gated vocabulary
 * (feasible / conditional / deferred / released). When every element carries a
 * classification, a bounded Planning Direction Statement is composed (and stays
 * steward-editable) and approved -- the approval that arms the soft Mode-4 gate.
 *
 * AMANAH: `detectCsaLikeText` raises a NON-BLOCKING advisory beside any field
 * (intent text, condition, note, gap) that resembles advance-sale / subscription
 * / CSA / yield-share framing, naming the permitted capital channels. It never
 * blocks a classification, an annotation, or the approval, and never censors the
 * steward's text.
 */

import { useState } from 'react';
import { Check, Flag, Lock } from 'lucide-react';
import {
  useRealityCheckStore,
  type ProjectRealityCheck,
} from '../../../store/realityCheckStore.js';
import {
  composePlanningDirection,
  CSA_ADVISORY_COPY,
  DEFAULT_CONFIGURATION_LABEL,
  detectCsaLikeText,
  INTENT_TYPE_META,
  phase2Complete,
  REALITY_CHECK_COPY,
  releaseNeedsConfirm,
  statusOptionsForType,
  STATUS_META,
  type ElementClassification,
  type RealityCheckStatus,
} from './realityCheckModel.js';
import type {
  IntentElement,
  IntentElementType,
} from './intentElements.js';
import styles from './RealityCheck.module.css';

/**
 * Releasing a `committed` element needs the spec's "project can proceed without
 * it" confirm; releasing a `non-negotiable` is graver still ("the project itself
 * must be reconsidered"). Aspirational releases freely. The model owns the
 * committed rule; the surface adds the existential non-negotiable confirm.
 */
function needsReleaseConfirm(type: IntentElementType): boolean {
  return releaseNeedsConfirm(type) || type === 'non-negotiable';
}

function releaseConfirmText(type: IntentElementType): string {
  return type === 'non-negotiable'
    ? 'This was declared non-negotiable. Releasing it means the project itself must be reconsidered against what the land can support. Confirm you have weighed that.'
    : 'This was a committed element. Confirm the project can proceed without it before releasing it from the plan.';
}

export interface ThresholdDirectionPhaseProps {
  projectId: string;
  projectName: string;
  elements: readonly IntentElement[];
  record: ProjectRealityCheck;
}

export default function ThresholdDirectionPhase({
  projectId,
  projectName,
  elements,
  record,
}: ThresholdDirectionPhaseProps) {
  const setPhase1Ready = useRealityCheckStore((s) => s.setPhase1Ready);
  const setPlanningDirectionText = useRealityCheckStore(
    (s) => s.setPlanningDirectionText,
  );
  const approve = useRealityCheckStore((s) => s.approve);
  const resetApproval = useRealityCheckStore((s) => s.resetApproval);

  const classifications = record.classifications;
  const approved = record.approvedAt != null;
  const complete = phase2Complete(elements, classifications);

  const composed = composePlanningDirection({
    projectName,
    configurationLabel: DEFAULT_CONFIGURATION_LABEL,
    elements,
    classifications,
  });
  const directionText = record.planningDirectionText ?? composed;

  const classifiedCount = elements.filter(
    (e) => classifications[e.id]?.status != null,
  ).length;

  return (
    <div data-testid="threshold-direction">
      <div className={styles.phaseIntro}>
        <h2 className={styles.phaseHeading}>{REALITY_CHECK_COPY.phase2.heading}</h2>
        <p className={styles.phaseBlurb}>{REALITY_CHECK_COPY.phase2.blurb}</p>
      </div>

      {!approved && (
        <button
          type="button"
          className={styles.ghostBtn}
          data-testid="threshold-back"
          onClick={() => setPhase1Ready(projectId, false)}
        >
          ← Back to Review
        </button>
      )}

      <div className={styles.elementList} style={{ marginTop: 16 }}>
        {elements.map((element) => (
          <IntentElementCard
            key={element.id}
            projectId={projectId}
            element={element}
            classification={classifications[element.id]}
            locked={approved}
          />
        ))}
      </div>

      <section className={styles.direction} data-testid="planning-direction-block">
        <div className={styles.directionHead}>
          <h3 className={styles.directionTitle}>Planning Direction Statement</h3>
          {complete && !approved && (
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setPlanningDirectionText(projectId, composed)}
            >
              Regenerate from classifications
            </button>
          )}
        </div>

        {complete ? (
          <>
            <textarea
              className={styles.directionStatement}
              data-testid="planning-direction"
              aria-label="Planning Direction Statement"
              value={directionText}
              readOnly={approved}
              onChange={(e) =>
                setPlanningDirectionText(projectId, e.target.value)
              }
            />
            <div className={styles.directionActions}>
              {approved ? (
                <>
                  <span className={styles.directionLock}>
                    <Lock size={14} aria-hidden="true" />
                    Approved -- this is the mandate for Mode 4 Design
                  </span>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    data-testid="threshold-reopen"
                    onClick={() => resetApproval(projectId)}
                  >
                    Re-open for revision
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  data-testid="threshold-approve"
                  onClick={() => approve(projectId)}
                >
                  <Check size={15} aria-hidden="true" />
                  {REALITY_CHECK_COPY.phase2.approveLabel}
                </button>
              )}
            </div>
          </>
        ) : elements.length === 0 ? (
          <p className={styles.notYet} data-testid="direction-empty">
            No intent elements were declared in Stratum 1, so there is nothing to
            measure against the evidence here. Return to the declaration to
            record the project's intent, then revisit the Reality Check.
          </p>
        ) : (
          <p className={styles.notYet} data-testid="direction-not-ready">
            {classifiedCount} of {elements.length} elements classified. Classify
            every element to compose the Planning Direction Statement.
          </p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function IntentElementCard({
  projectId,
  element,
  classification,
  locked,
}: {
  projectId: string;
  element: IntentElement;
  classification: ElementClassification | undefined;
  locked: boolean;
}) {
  const classifyElement = useRealityCheckStore((s) => s.classifyElement);
  const annotateClassification = useRealityCheckStore(
    (s) => s.annotateClassification,
  );

  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [gapOpen, setGapOpen] = useState<boolean>(
    () => (classification?.gapNote ?? '') !== '',
  );

  const options = statusOptionsForType(element.type);
  const status = classification?.status;
  const typeMeta = INTENT_TYPE_META[element.type];

  const choose = (next: RealityCheckStatus) => {
    if (locked) return;
    if (
      next === 'released' &&
      needsReleaseConfirm(element.type) &&
      status !== 'released'
    ) {
      setConfirmingRelease(true);
      return;
    }
    classifyElement(projectId, element.id, next);
  };

  const confirmRelease = () => {
    classifyElement(projectId, element.id, 'released');
    setConfirmingRelease(false);
  };

  // Amanah: scan every steward-entered field on this card.
  const csaFlagged =
    detectCsaLikeText(element.text) ||
    detectCsaLikeText(classification?.condition) ||
    detectCsaLikeText(classification?.note) ||
    detectCsaLikeText(classification?.gapNote);

  return (
    <article
      className={styles.elementCard}
      data-testid="intent-element"
      data-element-id={element.id}
      data-type={element.type}
      data-status={status ?? undefined}
    >
      <div className={styles.elementHead}>
        <span className={styles.typeBadge} data-type={element.type}>
          {typeMeta.label}
        </span>
        <span className={styles.elementText}>{element.text}</span>
      </div>
      <p className={styles.typeDesc}>{typeMeta.description}</p>

      <div
        className={styles.statusRow}
        role="group"
        aria-label={`Classify: ${element.text}`}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={styles.statusBtn}
            aria-pressed={status === opt}
            disabled={locked}
            onClick={() => choose(opt)}
          >
            <span className={styles.statusBtnLabel}>{STATUS_META[opt].label}</span>
          </button>
        ))}
      </div>

      {confirmingRelease && !locked && (
        <div className={styles.releaseConfirm} data-testid="release-confirm">
          <p className={styles.releaseConfirmText}>
            {releaseConfirmText(element.type)}
          </p>
          <div className={styles.releaseConfirmActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid="release-confirm-yes"
              onClick={confirmRelease}
            >
              Confirm release
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setConfirmingRelease(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status != null && (
        <p className={styles.statusDesc}>{STATUS_META[status].description}</p>
      )}

      {status === 'conditional' && (
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel} htmlFor={`cond-${element.id}`}>
            Condition Mode 4 must satisfy
          </label>
          <textarea
            id={`cond-${element.id}`}
            className={styles.noteField}
            data-testid="condition-field"
            placeholder="Name the condition that lets this element proceed…"
            value={classification?.condition ?? ''}
            readOnly={locked}
            onChange={(e) =>
              annotateClassification(projectId, element.id, {
                condition: e.target.value,
              })
            }
          />
        </div>
      )}

      {status != null && (
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel} htmlFor={`note-${element.id}`}>
            {status === 'released' ? 'Release rationale' : 'Note (optional)'}
          </label>
          <textarea
            id={`note-${element.id}`}
            className={styles.noteField}
            data-testid="note-field"
            placeholder={
              status === 'released'
                ? 'Why is this released? An honest response to what the land said…'
                : 'Any annotation for this classification…'
            }
            value={classification?.note ?? ''}
            readOnly={locked}
            onChange={(e) =>
              annotateClassification(projectId, element.id, {
                note: e.target.value,
              })
            }
          />
        </div>
      )}

      {status != null &&
        (gapOpen ? (
          <div className={styles.fieldBlock}>
            <label className={styles.fieldLabel} htmlFor={`gap-${element.id}`}>
              Gap flagged at the threshold
            </label>
            <textarea
              id={`gap-${element.id}`}
              className={styles.noteField}
              data-testid="gap-note"
              placeholder="A gap between this intent and the evidence, surfaced for design…"
              value={classification?.gapNote ?? ''}
              readOnly={locked}
              onChange={(e) =>
                annotateClassification(projectId, element.id, {
                  gapNote: e.target.value,
                })
              }
            />
          </div>
        ) : (
          !locked && (
            <button
              type="button"
              className={styles.gapToggle}
              data-testid="gap-toggle"
              onClick={() => setGapOpen(true)}
            >
              <Flag size={12} aria-hidden="true" />
              Flag a gap
            </button>
          )
        ))}

      {csaFlagged && (
        <div className={styles.advisory} data-testid="csa-advisory" role="note">
          <p className={styles.advisoryTitle}>{CSA_ADVISORY_COPY.title}</p>
          <p className={styles.advisoryBody}>{CSA_ADVISORY_COPY.body}</p>
        </div>
      )}
    </article>
  );
}
