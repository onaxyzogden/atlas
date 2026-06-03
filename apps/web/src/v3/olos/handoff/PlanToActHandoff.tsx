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
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import {
  useClosedLoopValidation,
} from '../../../features/plan/useClosedLoopValidation.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { buildLoopActPayload } from '../../../features/plan/closedLoop/loopHandoffContract.js';
import css from './HandoffSection.module.css';

/**
 * Observe domain of the soil-fertility / closed-loop (waste-vector) objective.
 * For this domain only, the handoff package is enriched with the loop payload
 * (materials / monitoring / sequence) built from the project's MaterialFlow
 * design; every other domain keeps today's empty arrays. Slice A4.
 */
const CLOSED_LOOP_DOMAIN = 'soil';

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

  // Closed-loop enrichment inputs (Slice A4). Read unconditionally (Rules of
  // Hooks); only consumed inside onEmit for the soil / closed-loop domain.
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const allInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const loopFlows = useMemo(
    () => allFlows.filter((f) => f.projectId === projectId),
    [allFlows, projectId],
  );
  const loopInfra = useMemo(
    () => allInfra.filter((i) => i.projectId === projectId),
    [allInfra, projectId],
  );
  // useClosedLoopValidation reads only `.id` off the project, so a minimal stub
  // is safe and keeps the hook call unconditional regardless of project load.
  const loopValidation = useClosedLoopValidation({
    id: projectId,
  } as LocalProject);

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
    // Closed-loop enrichment: only the soil / closed-loop domain maps the
    // project's MaterialFlow design onto the handoff package. Every other
    // domain keeps today's empty arrays (single handoff path, additive).
    const loop =
      objective.domain === CLOSED_LOOP_DOMAIN
        ? buildLoopActPayload(
            { id: projectId },
            loopFlows,
            loopInfra,
            loopValidation,
          ).payload
        : null;
    const pkg = createPackage(projectId, {
      planDecisionRecordId: planRecord.id,
      workScope: loop?.workScope ?? planRecord.selectedOption.label,
      prerequisites: [...planRecord.dependencies],
      sequence: loop?.sequence ?? [],
      materials: loop?.materials ?? [],
      successCriteria: loop?.successCriteria ?? [],
      verificationRequirements: [],
      monitoringRequirements: loop?.monitoringRequirements ?? [],
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
