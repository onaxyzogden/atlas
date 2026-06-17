/**
 * RealityCheckGateBanner -- the SOFT Mode-4 gate (Stage D). A display-only,
 * derived banner mounted at the top of every Mode-4 (Strata 4-7) objective
 * detail in the Plan shell. It NEVER blocks navigation and NEVER edits any
 * prerequisite: it is purely a standing reminder + a downstream register.
 *
 *   - On a Mode-4 stratum, NOT yet approved -> an amber reminder that Mode 4
 *     proceeds from an approved Planning Direction, with a shortcut to
 *     Threshold 1. Navigation is NOT blocked -- the steward may work here.
 *   - On a Mode-4 stratum, approved -> a calm "in effect" confirmation plus the
 *     display-only registers: the Conditional design-requirements Mode 4 must
 *     satisfy, the Deferred long-term intentions, and the Released elements with
 *     their notes. All read from the store; none gate.
 *   - Off a Mode-4 stratum -> renders nothing (non-Design surfaces unaffected).
 *
 * Plan-only: mounted at the PlanTierShell objective-detail call-site, so the Act
 * stage and the shared `ObjectiveDetailPanel` are untouched. Mirrors the
 * `TrueNorthAdvisoryBanner` soft-gate precedent (derived; never blocks) but
 * renders inline in the rail rather than floating, since it is part of the
 * objective's detail content.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useNavigate } from '@tanstack/react-router';
import { Compass, Flag } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import {
  groupClassifications,
  MODE4_GATE_COPY,
  realityCheckGateState,
} from './realityCheckModel.js';
import { useRealityCheckData } from './useRealityCheckData.js';
import styles from './RealityCheck.module.css';

/** The single Threshold-1 id (matches the global `THRESHOLDS` marker). */
const THRESHOLD_ID = 'threshold-1';

export interface RealityCheckGateBannerProps {
  projectId: string;
  /** The stratum the selected objective belongs to (gates Mode-4 only). */
  stratumId: string | null | undefined;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

export default function RealityCheckGateBanner({
  projectId,
  stratumId,
  objectives,
  objectiveStatuses,
}: RealityCheckGateBannerProps) {
  const navigate = useNavigate();
  const record = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );
  const { elements } = useRealityCheckData(
    projectId,
    objectives,
    objectiveStatuses,
  );

  const gate = realityCheckGateState(stratumId, record.approvedAt);

  // Off a Mode-4 stratum the gate is silent -- Reception surfaces unaffected.
  if (!gate.mode4) return null;

  const openThreshold = () => {
    void navigate({
      to: '/v3/project/$projectId/plan/threshold/$thresholdId',
      params: { projectId, thresholdId: THRESHOLD_ID },
    });
  };

  // ----- Pending: the amber "approve Threshold 1 first" reminder -------------
  if (gate.pending) {
    const copy = MODE4_GATE_COPY.pending;
    return (
      <div
        className={`${styles.gate} ${styles.gatePending}`}
        data-testid="reality-check-gate"
        data-state="pending"
        role="status"
      >
        <div className={styles.gateHead}>
          <Flag size={15} aria-hidden="true" className={styles.gateIcon} />
          <span className={styles.gatePill}>{copy.pill}</span>
        </div>
        <p className={styles.gateTitle}>{copy.title}</p>
        <p className={styles.gateBody}>{copy.body}</p>
        <button
          type="button"
          className={styles.gateAction}
          data-testid="gate-open-threshold"
          onClick={openThreshold}
        >
          {copy.action}
        </button>
      </div>
    );
  }

  // ----- Approved: the display-only direction registers ----------------------
  const copy = MODE4_GATE_COPY.approved;
  const groups = groupClassifications(elements, record.classifications);

  return (
    <div
      className={`${styles.gate} ${styles.gateApproved}`}
      data-testid="reality-check-gate"
      data-state="approved"
      role="note"
    >
      <div className={styles.gateHead}>
        <Compass size={15} aria-hidden="true" className={styles.gateIcon} />
        <span className={styles.gatePill}>{copy.pill}</span>
      </div>
      <p className={styles.gateTitle}>{copy.title}</p>
      <p className={styles.gateBody}>{copy.body}</p>

      {/* Conditional -- the design requirements Mode 4 must satisfy. Always
          shown (even empty) so the gate reads as a complete register. */}
      <div className={styles.gateRegister} data-testid="gate-conditional">
        <p className={styles.gateRegisterLabel}>{copy.conditionalLabel}</p>
        {groups.conditional.length === 0 ? (
          <p className={styles.gateRegisterEmpty}>{copy.emptyConditional}</p>
        ) : (
          <ul className={styles.gateRegisterList}>
            {groups.conditional.map(({ element, classification }) => (
              <li key={element.id} className={styles.gateRegisterItem}>
                <span className={styles.gateRegisterText}>{element.text}</span>
                {classification.condition ? (
                  <span className={styles.gateRegisterCond}>
                    {classification.condition}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Deferred -- retained long-term, out of this cycle. Shown only when
          non-empty (it does not constrain current design). */}
      {groups.deferred.length > 0 ? (
        <div className={styles.gateRegister} data-testid="gate-deferred">
          <p className={styles.gateRegisterLabel}>{copy.deferredLabel}</p>
          <ul className={styles.gateRegisterList}>
            {groups.deferred.map(({ element }) => (
              <li key={element.id} className={styles.gateRegisterItem}>
                <span className={styles.gateRegisterText}>{element.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Released -- archived with the steward's note. Shown only when
          non-empty. */}
      {groups.released.length > 0 ? (
        <div className={styles.gateRegister} data-testid="gate-released">
          <p className={styles.gateRegisterLabel}>{copy.releasedLabel}</p>
          <ul className={styles.gateRegisterList}>
            {groups.released.map(({ element, classification }) => (
              <li key={element.id} className={styles.gateRegisterItem}>
                <span className={styles.gateRegisterText}>{element.text}</span>
                {classification.note ? (
                  <span className={styles.gateRegisterCond}>
                    {classification.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.gateActionGhost}
        data-testid="gate-open-threshold"
        onClick={openThreshold}
      >
        {copy.action}
      </button>
    </div>
  );
}
