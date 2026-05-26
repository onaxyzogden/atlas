/**
 * PlanToActHandoff — convert an approved PlanDecisionRecord into an
 * ActHandoffPackage + one seeded draft ActTask, both written to their
 * respective stores. Enabled only when the Plan record's approvalStatus is
 * in APPROVED_PLAN_STATUSES.
 *
 * Once emitted, surfaces the created package id and a deep link to the
 * paired Act workspace. Re-emitting from the same approved decision is
 * allowed (one package per click) so the steward can recover from a bad
 * package edit by spawning a fresh one.
 */

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  APPROVED_PLAN_STATUSES,
  STATUS_LABELS,
  getObjective,
  type Objective,
  type PlanApprovalStatus,
  type PlanDecisionRecord,
} from '@ogden/shared';
import {
  useActHandoffPackageStore,
  useActTaskStore,
  usePlanDecisionRecordStore,
} from '../../../store/olos/index.js';
import css from './HandoffSection.module.css';

interface Props {
  projectId: string;
  objective: Objective;
}

export default function PlanToActHandoff({ projectId, objective }: Props) {
  const planRecord = usePlanDecisionRecordStore((s) =>
    s.getRecord(projectId, objective.id),
  );

  const actObjective = useMemo(
    () => getObjective('act', objective.domain),
    [objective.domain],
  );

  const handoffByProject = useActHandoffPackageStore((s) => s.byProject);
  const createPackage = useActHandoffPackageStore((s) => s.createPackage);

  const taskByProject = useActTaskStore((s) => s.byProject);
  const createTask = useActTaskStore((s) => s.createTask);

  const packagesForDecision = useMemo(() => {
    if (!planRecord) return [];
    return Object.values(handoffByProject[projectId] ?? {}).filter(
      (p) => p.planDecisionRecordId === planRecord.id,
    );
  }, [handoffByProject, projectId, planRecord]);

  const tasksForPackage = useMemo(() => {
    const pkgIds = new Set(packagesForDecision.map((p) => p.id));
    return Object.values(taskByProject[projectId] ?? {}).filter((t) =>
      pkgIds.has(t.handoffPackageId),
    );
  }, [taskByProject, projectId, packagesForDecision]);

  const approved =
    !!planRecord &&
    APPROVED_PLAN_STATUSES.includes(
      planRecord.approvalStatus as PlanApprovalStatus,
    );

  const onEmit = () => {
    if (!planRecord || !actObjective || !approved) return;
    const pkg = createPackage(projectId, {
      planDecisionRecordId: planRecord.id,
      workScope: planRecord.selectedOption.label,
      prerequisites: [...planRecord.dependencies],
      sequence: [],
      materials: [],
      successCriteria: [],
      verificationRequirements: [],
      monitoringRequirements: [],
    });
    createTask(projectId, {
      objectiveId: actObjective.id,
      handoffPackageId: pkg.id,
      title: planRecord.selectedOption.label || 'Untitled Act task',
      description: planRecord.rationale,
      priority: 'normal',
      status: 'ready',
    });
  };

  if (!actObjective) {
    return (
      <p className={css.note}>
        No paired Act objective for this domain — handoff is unavailable.
      </p>
    );
  }

  return (
    <div className={css.wrap}>
      <PacketPreview decision={planRecord} approved={approved} />
      <div className={css.actions}>
        <button
          type="button"
          className={css.btnPrimary}
          onClick={onEmit}
          disabled={!approved}
        >
          Emit Act handoff package
        </button>
        {packagesForDecision.length > 0 ? (
          <span className={`${css.chip} ${css.chipOk}`}>
            {packagesForDecision.length}{' '}
            {packagesForDecision.length === 1 ? 'package' : 'packages'} ·{' '}
            {tasksForPackage.length} tasks
          </span>
        ) : null}
        <Link
          to="/v3/project/$projectId/olos/$stage/$domain"
          params={{
            projectId,
            stage: 'act',
            domain: actObjective.domain,
          }}
          className={css.linkBtn}
        >
          Open Act → {actObjective.title}
        </Link>
      </div>
      <p className={css.note}>
        Only Approved-for-Act and Conditionally-Approved decisions can emit a
        handoff. Plan decides; Act executes.
      </p>
    </div>
  );
}

function PacketPreview({
  decision,
  approved,
}: {
  decision: PlanDecisionRecord | undefined;
  approved: boolean;
}) {
  if (!decision) {
    return (
      <div className={css.packet}>
        <span className={css.packetTitle}>Act handoff packet</span>
        <p className={css.packetEmpty}>
          Make a decision and set an approval status to enable the handoff.
        </p>
      </div>
    );
  }
  return (
    <div className={css.packet}>
      <span className={css.packetTitle}>
        Act handoff packet {approved ? '· ready' : '· blocked'}
      </span>
      <Row
        label="Status"
        value={STATUS_LABELS[decision.approvalStatus] ?? decision.approvalStatus}
      />
      <Row label="Selected" value={decision.selectedOption.label} />
      <Row label="Rationale" value={decision.rationale || '—'} />
      <Row
        label="Constraints"
        value={
          decision.constraints.length ? decision.constraints.join(', ') : '—'
        }
      />
      <Row
        label="Dependencies"
        value={
          decision.dependencies.length
            ? decision.dependencies.join(', ')
            : '—'
        }
      />
      <Row
        label="Risk flags"
        value={`${decision.riskFlags.length} flagged`}
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
