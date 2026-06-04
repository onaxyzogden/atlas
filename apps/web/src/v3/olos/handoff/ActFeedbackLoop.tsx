/**
 * ActFeedbackLoop - the Act->upstream return path. Lists the tasks attached to
 * the current Act objective, lets an owner/designer assign each task to a
 * project member, and lets the steward raise an EscalationRecord routed back to
 * Observe / Plan / Risk / Monitoring.
 *
 * Assignment is the cross-user substrate (2026-05-29): the assignee picker
 * writes ActTask.assigneeId and pushes it to the olos_act_tasks API addressed
 * by the project's serverId, so the assignee sees the task on any device. The
 * picker only renders for synced projects (serverId present) and editors (roles
 * that satisfy owner/designer, mirroring the API PATCH gate); local-only /
 * offline projects render the plain task list.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  EscalationSeverity,
  EscalationTriggerKind,
  STATUS_LABELS,
  Stage,
  roleSatisfies,
  type Objective,
} from '@ogden/shared';
import {
  useActTaskStore,
  useEscalationRecordStore,
} from '../../../store/olos/index.js';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useActTaskSync } from '../../../hooks/useActTaskSync.js';
import { isOlosFormalProofEnabled } from '../../../config/olosFlags.js';
import TaskProofPanel from './TaskProofPanel';
import css from './HandoffSection.module.css';

interface Props {
  projectId: string;
  objective: Objective;
  serverId?: string;
}

const STAGE_OPTIONS = Stage.options;
const TRIGGER_OPTIONS = EscalationTriggerKind.options;
const SEVERITY_OPTIONS = EscalationSeverity.options;

export default function ActFeedbackLoop({
  projectId,
  objective,
  serverId,
}: Props) {
  const taskByProject = useActTaskStore((s) => s.byProject);
  const assign = useActTaskStore((s) => s.assign);
  const pushOne = useActTaskStore((s) => s.pushOne);
  const getTask = useActTaskStore((s) => s.getTask);
  const escalationByProject = useEscalationRecordStore((s) => s.byProject);
  const createEscalation = useEscalationRecordStore((s) => s.createEscalation);

  const members = useMemberStore((s) => s.members);
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Pull this project's tasks on mount so assignments made elsewhere are
  // visible. No-op for local-only projects.
  useActTaskSync(projectId, serverId);

  // Load the member roster for the assignee picker on synced projects.
  useEffect(() => {
    if (serverId && members.length === 0) void fetchMembers(serverId);
  }, [serverId, members.length, fetchMembers]);

  const tasks = useMemo(
    () =>
      Object.values(taskByProject[projectId] ?? {}).filter(
        (t) => t.objectiveId === objective.id,
      ),
    [taskByProject, projectId, objective.id],
  );
  const escalations = useMemo(
    () =>
      Object.values(escalationByProject[projectId] ?? {}).filter(
        (e) => e.objectiveId === objective.id,
      ),
    [escalationByProject, projectId, objective.id],
  );

  const myRole = useMemo(
    () => members.find((m) => m.userId === currentUserId)?.role,
    [members, currentUserId],
  );
  // Mirrors the API PATCH gate requireRole('owner','designer'): show the picker
  // only to roles that satisfy either, and only on synced projects.
  const canAssign =
    !!serverId &&
    !!myRole &&
    (roleSatisfies(myRole, 'owner') || roleSatisfies(myRole, 'designer'));

  // Formal OLOS proof/verification surface is flag-gated (off by default); the
  // lightweight ObserveDataPoint completion path stays live until the
  // multi-session replacement migration. See
  // wiki/decisions/2026-06-04-olos-proof-verification-fork.md.
  const formalProofEnabled = isOlosFormalProofEnabled();

  const onAssign = (taskId: string, userId: string) => {
    if (!serverId) return;
    const existing = getTask(projectId, taskId);
    if (!existing) return;
    // Preserve the existing roleId: assign() wipes roleId when passed undefined.
    assign(projectId, taskId, userId || undefined, existing.roleId);
    const updated = getTask(projectId, taskId);
    if (updated) void pushOne(updated, serverId);
  };

  const [showForm, setShowForm] = useState(false);
  const [trigger, setTrigger] = useState<typeof TRIGGER_OPTIONS[number]>(
    'new-condition',
  );
  const [severity, setSeverity] = useState<typeof SEVERITY_OPTIONS[number]>(
    'medium',
  );
  const [routedTo, setRoutedTo] = useState<typeof STAGE_OPTIONS[number]>(
    'observe',
  );
  const [note, setNote] = useState('');

  const onRaise = () => {
    if (!trigger || !routedTo) return;
    createEscalation(projectId, {
      objectiveId: objective.id,
      triggerKind: trigger,
      triggerNote: note,
      severity,
      routedToStage: routedTo,
      routedToDomain: objective.domain,
      requestedAction: '',
      status: 'open',
    });
    setNote('');
    setShowForm(false);
  };

  return (
    <div className={css.wrap}>
      <div className={css.packet}>
        <span className={css.packetTitle}>Act tasks for this objective</span>
        {tasks.length === 0 ? (
          <p className={css.packetEmpty}>
            No tasks yet — emit a Plan handoff from the matching Plan
            objective to seed the first task.
          </p>
        ) : (
          <ul className={css.tasksList}>
            {tasks.map((t) => {
              const assignee = members.find((m) => m.userId === t.assigneeId);
              return (
                <li key={t.id}>
                  <span>{t.title}</span>
                  <span className={css.taskStatus}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  {canAssign ? (
                    <select
                      className={css.formSelect}
                      aria-label={`Assign ${t.title}`}
                      value={t.assigneeId ?? ''}
                      onChange={(e) => onAssign(t.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.displayName ?? m.email}
                        </option>
                      ))}
                    </select>
                  ) : t.assigneeId ? (
                    <span className={css.taskStatus}>
                      {assignee?.displayName ?? assignee?.email ?? 'Assigned'}
                    </span>
                  ) : null}
                  {formalProofEnabled ? (
                    <TaskProofPanel
                      projectId={projectId}
                      task={t}
                      serverId={serverId}
                      members={members}
                      currentUserId={currentUserId}
                      myRole={myRole}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={css.actions}>
        <button
          type="button"
          className={css.btnGhost}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel escalation' : 'Raise escalation'}
        </button>
        {escalations.length > 0 ? (
          <span className={css.chip}>
            {escalations.length} raised from this objective
          </span>
        ) : null}
      </div>

      {showForm ? (
        <div className={css.form}>
          <div className={css.formRow}>
            <label htmlFor="esc-trigger">Trigger</label>
            <select
              id="esc-trigger"
              className={css.formSelect}
              value={trigger}
              onChange={(e) =>
                setTrigger(e.target.value as typeof TRIGGER_OPTIONS[number])
              }
            >
              {TRIGGER_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-severity">Severity</label>
            <select
              id="esc-severity"
              className={css.formSelect}
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as typeof SEVERITY_OPTIONS[number])
              }
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-route">Route to</label>
            <select
              id="esc-route"
              className={css.formSelect}
              value={routedTo}
              onChange={(e) =>
                setRoutedTo(e.target.value as typeof STAGE_OPTIONS[number])
              }
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={css.formRow}>
            <label htmlFor="esc-note">Note</label>
            <input
              id="esc-note"
              className={css.formInput}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed / what needs upstream attention?"
            />
          </div>
          <div className={css.actions}>
            <button type="button" className={css.btnPrimary} onClick={onRaise}>
              Raise escalation
            </button>
          </div>
        </div>
      ) : null}

      <p className={css.note}>
        Escalations feed back to Observe / Plan / Risk / Monitoring so the owning
        Stage can re-observe, redesign, or close the signal.
      </p>
    </div>
  );
}
