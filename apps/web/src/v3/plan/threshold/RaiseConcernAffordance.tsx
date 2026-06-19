/**
 * RaiseConcernAffordance -- the Plan-only covenant safety valve for Threshold 3
 * (The Act Mandate). It renders ONLY when this objective is HELD under the
 * mandate (`useObjectivePlanLock`); a non-held objective is untouched. Once Begin
 * Act has armed `planReadOnly`, the committed plan is no longer silently editable
 * -- so to change a held objective the steward RAISES A CONCERN here, which the
 * team governance (Objective 0.2) reviews in the ConcernGovernancePanel.
 *
 * AMANAH (two boundaries): the free-text `observation` / `proposedChange` fields
 * are scanned by `detectCsaLikeText`. (1) UI advisory -- a covenant note surfaces
 * and the submit is disabled while the text trips the guard, so a banned term is
 * never even submitted. (2) Persist boundary -- planConcernsStore.raiseConcern
 * HARD-rejects the same text as a no-op, the last line of defence even if the UI
 * guard is bypassed. Nothing advance-sale / subscription / CSA can reach storage.
 *
 * Plan-only by construction (Act renders a different tree), so the Act stage stays
 * byte-identical. No Observe mount -- Observe is a read-only dashboard.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useObjectivePlanLock } from '../../../store/actMandateStore.js';
import {
  EMPTY_CONCERNS,
  usePlanConcernsStore,
} from '../../../store/planConcernsStore.js';
import { detectCsaLikeText, CSA_ADVISORY_COPY } from './coherenceCheckModel.js';
import { ACT_MANDATE_COPY } from './actMandateModel.js';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import styles from './ActMandate.module.css';

export interface RaiseConcernAffordanceProps {
  projectId: string;
  objectiveId: string;
}

export default function RaiseConcernAffordance({
  projectId,
  objectiveId,
}: RaiseConcernAffordanceProps) {
  // Hooks are called UNCONDITIONALLY (Rules-of-Hooks) before the lock gate.
  const locked = useObjectivePlanLock(projectId, objectiveId);
  const roster = useStewardRoster(projectId);
  const concerns = usePlanConcernsStore(
    (s) => s.byProject[projectId] ?? EMPTY_CONCERNS,
  );
  const raiseConcern = usePlanConcernsStore((s) => s.raiseConcern);

  const [observation, setObservation] = useState('');
  const [proposedChange, setProposedChange] = useState('');
  const [raisedBy, setRaisedBy] = useState('');
  const [justRaised, setJustRaised] = useState(false);

  /** Steward display names from the live 0.2 roster (empty offline). */
  const rosterNames = useMemo(
    () =>
      roster
        .map((e) => e.member.displayName ?? e.member.email)
        .filter((n): n is string => typeof n === 'string' && n.length > 0),
    [roster],
  );
  // Auto-select the first steward; the steward can change it.
  const effectiveRaisedBy = raisedBy || rosterNames[0] || '';

  /** Open (non-terminal) concerns already raised against this objective. */
  const pendingCount = useMemo(
    () =>
      concerns.filter(
        (c) =>
          c.objectiveRef === objectiveId &&
          (c.status === 'raised' || c.status === 'under-review'),
      ).length,
    [concerns, objectiveId],
  );

  // Covenant: advisory (and submit-disable) while the free text trips the guard.
  const csaTripped =
    detectCsaLikeText(observation) || detectCsaLikeText(proposedChange);
  const canRaise = observation.trim().length > 0 && !csaTripped;

  // Held objectives only -- a non-held objective shows no affordance.
  if (!locked) return null;

  const handleRaise = () => {
    if (!canRaise) return;
    raiseConcern(projectId, {
      objectiveRef: objectiveId,
      observation,
      proposedChange,
      raisedBy: effectiveRaisedBy,
    });
    setObservation('');
    setProposedChange('');
    setJustRaised(true);
  };

  return (
    <section
      className={styles.raise}
      data-testid="raise-concern-affordance"
      aria-label={ACT_MANDATE_COPY.concern.heading}
    >
      <p className={styles.raiseHead}>{ACT_MANDATE_COPY.concern.heading}</p>
      <p className={styles.raiseBlurb}>{ACT_MANDATE_COPY.concern.blurb}</p>

      {pendingCount > 0 && (
        <p className={styles.raisePending} data-testid="raise-concern-pending">
          {pendingCount === 1
            ? ACT_MANDATE_COPY.concern.pendingOne
            : `${pendingCount} ${ACT_MANDATE_COPY.concern.pendingManySuffix}`}
        </p>
      )}

      <label className={styles.raiseField}>
        <span className={styles.raiseLabel}>
          {ACT_MANDATE_COPY.concern.observationLabel}
        </span>
        <textarea
          className={styles.raiseTextarea}
          data-testid="raise-concern-observation"
          value={observation}
          placeholder={ACT_MANDATE_COPY.concern.observationPlaceholder}
          onChange={(e) => {
            setObservation(e.target.value);
            setJustRaised(false);
          }}
        />
      </label>

      <label className={styles.raiseField}>
        <span className={styles.raiseLabel}>
          {ACT_MANDATE_COPY.concern.proposedChangeLabel}
        </span>
        <textarea
          className={styles.raiseTextarea}
          data-testid="raise-concern-proposed"
          value={proposedChange}
          placeholder={ACT_MANDATE_COPY.concern.proposedChangePlaceholder}
          onChange={(e) => {
            setProposedChange(e.target.value);
            setJustRaised(false);
          }}
        />
      </label>

      {rosterNames.length > 0 && (
        <label className={styles.raiseField}>
          <span className={styles.raiseLabel}>
            {ACT_MANDATE_COPY.concern.raisedByLabel}
          </span>
          <select
            className={styles.raiseSelect}
            data-testid="raise-concern-raised-by"
            value={effectiveRaisedBy}
            onChange={(e) => setRaisedBy(e.target.value)}
          >
            <option value="">
              {ACT_MANDATE_COPY.concern.raisedByPlaceholder}
            </option>
            {rosterNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {csaTripped && (
        <div
          className={styles.raiseAdvisory}
          data-testid="raise-concern-advisory"
          role="note"
        >
          <p className={styles.raiseAdvisoryTitle}>{CSA_ADVISORY_COPY.title}</p>
          <p className={styles.raiseAdvisoryBody}>{CSA_ADVISORY_COPY.body}</p>
        </div>
      )}

      <div className={styles.raiseActions}>
        <button
          type="button"
          className={styles.raiseSubmit}
          data-testid="raise-concern-submit"
          disabled={!canRaise}
          onClick={handleRaise}
        >
          {ACT_MANDATE_COPY.concern.submit}
        </button>
        {observation.trim().length === 0 && !justRaised && (
          <span className={styles.raisePending}>
            {ACT_MANDATE_COPY.concern.needObservationNote}
          </span>
        )}
        {justRaised && (
          <span className={styles.raiseAck} data-testid="raise-concern-ack">
            <CheckCircle2 size={12} aria-hidden="true" />{' '}
            {ACT_MANDATE_COPY.concern.raisedAck}
          </span>
        )}
      </div>
    </section>
  );
}
