/**
 * ThresholdReviewPhase -- Phase 1 (Review) of Threshold 1. A READING surface,
 * no decisions: the eleven survey objectives re-organised into the six evidence
 * strands (each with a derived coverage summary + an optional steward
 * stance/note), followed by a read-only recap of the declared intent the steward
 * will classify in Phase 2.
 *
 * Completion is a single steward signal -- "I have read the evidence" -- which
 * sets `phase1Ready` and advances the surface to Direction. There is no gate on
 * survey completion here (the threshold route itself only opens once all eleven
 * are complete), so this is purely a comprehension checkpoint.
 */

import { useRealityCheckStore } from '../../../store/realityCheckStore.js';
import {
  deriveStrandEvidence,
  INTENT_TYPE_META,
  REALITY_CHECK_COPY,
  type StrandEvidence,
  type StrandFinding,
  type StrandStance,
  type StrandSurveyEvidence,
} from './realityCheckModel.js';
import type {
  IntentElement,
  IntentElementType,
} from './intentElements.js';
import styles from './RealityCheck.module.css';

const STANCE_OPTIONS: ReadonlyArray<{ value: StrandStance; label: string }> = [
  { value: 'confirmed', label: 'Confirms intent' },
  { value: 'mixed', label: 'Mixed signal' },
  { value: 'challenging', label: 'Challenges intent' },
];

const INTENT_TYPE_ORDER: readonly IntentElementType[] = [
  'non-negotiable',
  'committed',
  'aspirational',
];

export interface ThresholdReviewPhaseProps {
  projectId: string;
  elements: readonly IntentElement[];
  perSurvey: Readonly<Record<string, StrandSurveyEvidence>>;
  strandFindings: Readonly<Record<string, StrandFinding>>;
}

export default function ThresholdReviewPhase({
  projectId,
  elements,
  perSurvey,
  strandFindings,
}: ThresholdReviewPhaseProps) {
  const setStrandFinding = useRealityCheckStore((s) => s.setStrandFinding);
  const setPhase1Ready = useRealityCheckStore((s) => s.setPhase1Ready);
  const strands = deriveStrandEvidence(perSurvey, strandFindings);

  return (
    <div data-testid="threshold-review">
      <div className={styles.phaseIntro}>
        <h2 className={styles.phaseHeading}>{REALITY_CHECK_COPY.phase1.heading}</h2>
        <p className={styles.phaseBlurb}>{REALITY_CHECK_COPY.phase1.blurb}</p>
      </div>

      <div className={styles.strandGrid}>
        {strands.map((strand) => (
          <EvidenceStrandCard
            key={strand.strand.id}
            projectId={projectId}
            evidence={strand}
            onSetFinding={setStrandFinding}
          />
        ))}
      </div>

      <IntentRecap elements={elements} />

      <div className={styles.proceedRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          data-testid="threshold-proceed"
          onClick={() => setPhase1Ready(projectId, true)}
        >
          {REALITY_CHECK_COPY.phase1.proceedLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EvidenceStrandCard({
  projectId,
  evidence,
  onSetFinding,
}: {
  projectId: string;
  evidence: StrandEvidence;
  onSetFinding: (
    projectId: string,
    strandId: string,
    finding: StrandFinding,
  ) => void;
}) {
  const { strand, surveys, summary, stance, note } = evidence;

  const toggleStance = (next: StrandStance) =>
    onSetFinding(projectId, strand.id, {
      // Re-clicking the active stance clears it; the store drops empty findings.
      stance: stance === next ? undefined : next,
      note,
    });

  const setNote = (value: string) =>
    onSetFinding(projectId, strand.id, { stance, note: value });

  return (
    <section
      className={styles.strandCard}
      data-testid="evidence-strand"
      data-strand={strand.id}
    >
      <div className={styles.strandHead}>
        <span className={styles.strandLabel}>{strand.label}</span>
        <span className={styles.strandSummary}>{summary}</span>
      </div>
      <p className={styles.strandBlurb}>{strand.blurb}</p>

      {surveys.length > 0 && (
        <ul className={styles.strandSurveys}>
          {surveys.map((survey) => (
            <li
              key={survey.objectiveId}
              className={styles.strandSurvey}
              data-complete={survey.complete || undefined}
            >
              <span className={styles.surveyDot} aria-hidden="true">
                {survey.complete ? '✓' : <span className={styles.surveyDotPending} />}
              </span>
              {survey.label}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.strandStance} role="group" aria-label={`${strand.label} stance`}>
        {STANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={styles.stanceBtn}
            aria-pressed={stance === opt.value}
            onClick={() => toggleStance(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        className={styles.noteField}
        placeholder="Optional: what this strand says about your intent…"
        aria-label={`${strand.label} note`}
        value={note ?? ''}
        onChange={(e) => setNote(e.target.value)}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

function IntentRecap({ elements }: { elements: readonly IntentElement[] }) {
  return (
    <div className={styles.intentRecap} data-testid="intent-recap">
      <h3 className={styles.intentRecapTitle}>What you declared</h3>
      <p className={styles.intentRecapHint}>
        Each of these is classified against the evidence in the next phase. This
        is a recap only -- nothing here is decided yet.
      </p>
      {elements.length === 0 ? (
        <p className={styles.emptyIntent}>
          No declared intent elements were found in your Stratum 1 captures. Go back
          to the Stratum 1 declaration and state your intent before continuing — the
          Direction phase has nothing to classify until you do. You may still
          proceed; it will simply start empty.
        </p>
      ) : (
        INTENT_TYPE_ORDER.map((type) => {
          const group = elements.filter((e) => e.type === type);
          if (group.length === 0) return null;
          return (
            <div key={type} className={styles.intentRecapGroup}>
              <span className={styles.intentRecapGroupLabel}>
                {INTENT_TYPE_META[type].label}
              </span>
              <ul className={styles.intentRecapList}>
                {group.map((el) => (
                  <li key={el.id} className={styles.intentRecapItem}>
                    {el.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
