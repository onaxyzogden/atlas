/**
 * ObserveToPlanHandoff — bind a completed ObservationRecord to the paired
 * Plan Objective (same Domain) as an upstream input.
 *
 * Enabled when the ObservationRecord has a status set. Clicking "Send to
 * Plan" adds the observation's id to the Plan record's
 * `upstreamObservationRecordIds` (creating an empty Plan record if none
 * exists yet). Surfaces a deep link to the Plan workspace once bound.
 */

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  STATUS_LABELS,
  getObjective,
  type ObservationRecord,
  type Objective,
} from '@ogden/shared';
import {
  useObservationRecordStore,
  usePlanDecisionRecordStore,
} from '../../../store/olos/index.js';
import css from './HandoffSection.module.css';

interface Props {
  projectId: string;
  objective: Objective;
}

export default function ObserveToPlanHandoff({ projectId, objective }: Props) {
  const observation = useObservationRecordStore((s) =>
    s.getRecord(projectId, objective.id),
  );

  const planObjective = useMemo(
    () => getObjective('plan', objective.domain),
    [objective.domain],
  );

  const planRecord = usePlanDecisionRecordStore((s) =>
    planObjective ? s.getRecord(projectId, planObjective.id) : undefined,
  );
  const setUpstream = usePlanDecisionRecordStore(
    (s) => s.setUpstreamObservationRecordIds,
  );

  const alreadyBound =
    !!observation &&
    !!planRecord &&
    planRecord.upstreamObservationRecordIds.includes(observation.id);

  const canBind = !!observation && !!planObjective;

  const onBind = () => {
    if (!observation || !planObjective) return;
    const existingIds = planRecord?.upstreamObservationRecordIds ?? [];
    if (existingIds.includes(observation.id)) return;
    setUpstream(projectId, planObjective.id, [
      ...existingIds,
      observation.id,
    ]);
  };

  if (!planObjective) {
    return (
      <p className={css.note}>
        No paired Plan objective for this domain — handoff is unavailable.
      </p>
    );
  }

  return (
    <div className={css.wrap}>
      <PacketPreview observation={observation} />
      <div className={css.actions}>
        <button
          type="button"
          className={css.btnPrimary}
          onClick={onBind}
          disabled={!canBind || alreadyBound}
        >
          {alreadyBound ? 'Bound to Plan' : 'Send to Plan objective'}
        </button>
        {alreadyBound ? (
          <span className={`${css.chip} ${css.chipOk}`}>handoff bound</span>
        ) : null}
        <Link
          to="/v3/project/$projectId/olos/$stage/$domain"
          params={{
            projectId,
            stage: 'plan',
            domain: planObjective.domain,
          }}
          className={css.linkBtn}
        >
          Open Plan → {planObjective.title}
        </Link>
      </div>
      <p className={css.note}>
        Observation packets feed Plan as required inputs. Plan decides; Observe
        documents.
      </p>
    </div>
  );
}

function PacketPreview({
  observation,
}: {
  observation: ObservationRecord | undefined;
}) {
  if (!observation || !observation.status) {
    return (
      <div className={css.packet}>
        <span className={css.packetTitle}>Plan handoff packet</span>
        <p className={css.packetEmpty}>
          Set an observation status to enable the handoff.
        </p>
      </div>
    );
  }
  return (
    <div className={css.packet}>
      <span className={css.packetTitle}>Plan handoff packet</span>
      <Row label="Status" value={STATUS_LABELS[observation.status] ?? observation.status} />
      <Row label="Summary" value={observation.summary || '—'} />
      <Row label="Constraints" value={observation.constraints || '—'} />
      <Row label="Unknowns" value={observation.unknowns || '—'} />
      <Row
        label="Flags"
        value={observation.flags.length ? observation.flags.join(', ') : '—'}
      />
      <Row
        label="Evidence"
        value={`${observation.evidenceRefs.length} attached`}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.packetRow}>
      <span className={css.packetLabel}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
