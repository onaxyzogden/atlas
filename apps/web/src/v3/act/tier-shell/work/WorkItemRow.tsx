/**
 * WorkItemRow — one spine WorkItem in the Act work agenda.
 *
 * Status pill (workDisplayStatus), provenance chip, variance caption for
 * done rows, and the execution actions:
 *   - Mark done  → inline who/date/notes form → `fulfilWithGenericProof`
 *                  (rail-fit inline form in place of a modal).
 *   - Log move   → move-shaped rows (direction-bearing) hand off to the map:
 *                  set workExecutionStore.pending + arm the existing
 *                  `act.livestock.log-move` tool (same path as quick-log).
 *   - Reschedule → inline date → `updateItem` (start+end move together).
 *   - Locate     → transient paddock highlight (ActWorkHighlightLayer).
 *   - Undo       → `unfulfilWorkItem` (proof event deliberately retained).
 */

import { useState } from 'react';
import type { WorkItem } from '@ogden/shared';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import { useWorkExecutionStore } from '../../../../store/workExecutionStore.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import { fulfilWithGenericProof } from '../../../../features/act/fieldProofActions.js';
import {
  varianceLabel,
  workDisplayStatus,
  workDueDate,
  type WorkDisplayStatus,
} from '../../../../features/work/workSelectors.js';
import { useStewardRoster } from '../../../observe/modules/human-context/roster.js';
import { memberStewardOptions } from '../captures/stewardRef.js';
import { StewardPicker } from '../captures/controls/index.js';
import styles from './ActWorkPanel.module.css';

const STATUS_LABEL: Record<WorkDisplayStatus, string> = {
  done: 'done',
  cancelled: 'cancelled',
  'in-progress': 'in progress',
  blocked: 'blocked',
  overdue: 'overdue',
  'due-today': 'due today',
  upcoming: 'upcoming',
};

const SOURCE_LABEL: Record<string, string> = {
  'livestock-plan': 'Plan-generated',
  'community-plan': 'Community plan',
  'rotation-sequence': 'Rotation',
  'scheduled-livestock-move': 'Scheduled move',
};

type ExpandedForm = 'done' | 'reschedule' | null;

interface Props {
  item: WorkItem;
  todayISO: string;
}

export default function WorkItemRow({ item, todayISO }: Props) {
  const [expanded, setExpanded] = useState<ExpandedForm>(null);
  const [who, setWho] = useState(item.who ?? '');
  // Option 1: roster userId behind `who`, stamped when the actor is picked from
  // the steward roster. Work can only be assigned to a joined member (a userId
  // to attribute to), so this is members-only -- pending invites are excluded.
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? '');
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState('');
  const [rescheduleTo, setRescheduleTo] = useState(
    workDueDate(item)?.slice(0, 10) ?? todayISO,
  );

  const memberOptions = memberStewardOptions(useStewardRoster(item.projectId));

  const status = workDisplayStatus(item, todayISO);
  const due = workDueDate(item)?.slice(0, 10) ?? null;
  const variance = varianceLabel(item);
  const isLive = status !== 'done' && status !== 'cancelled';
  const isMoveShaped = item.direction != null;
  const provenance = SOURCE_LABEL[item.source] ?? item.source;
  const provenanceDetail = item.sourceProtocolId ?? item.sourceObjectiveId;

  const handleMarkDone = () => {
    fulfilWithGenericProof(item.id, item.projectId, {
      ...(who.trim() !== '' ? { who: who.trim() } : {}),
      ...(assigneeId !== '' ? { assigneeId } : {}),
      actualEnd: date,
      ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
    });
    setExpanded(null);
  };

  const handleReschedule = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rescheduleTo)) return;
    // Start and end move together: "reschedule to X" means the work is now
    // expected ON that date, collapsing any seasonal window deliberately.
    useWorkItemStore.getState().updateItem(item.id, {
      scheduledStart: rescheduleTo,
      scheduledEnd: rescheduleTo,
    });
    setExpanded(null);
  };

  const handleLogMove = () => {
    useWorkExecutionStore.getState().setPending({
      workItemId: item.id,
      title: item.title,
      ...(item.linkedFeatureId ? { paddockId: item.linkedFeatureId } : {}),
      ...(item.species ? { species: item.species } : {}),
      ...(item.who ? { who: item.who } : {}),
      ...(item.scheduledStart
        ? { date: item.scheduledStart.slice(0, 10) }
        : {}),
    });
    useMapToolStore.getState().setActiveTool('act.livestock.log-move');
  };

  const handleLocate = () => {
    if (item.linkedFeatureId) {
      useWorkExecutionStore.getState().setHighlight(item.linkedFeatureId);
    }
  };

  return (
    <div className={styles.row} data-status={status}>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{item.title}</span>
        <span className={styles.pill} data-status={status}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.chip} title={provenanceDetail ?? undefined}>
          {provenance}
        </span>
        {due && <span>due {due}</span>}
        {item.species && <span>{item.species}</span>}
        {item.who && <span>{item.who}</span>}
        {variance && <span className={styles.variance}>{variance}</span>}
      </div>

      {isLive ? (
        <div className={styles.actions}>
          {isMoveShaped ? (
            <button
              type="button"
              className={styles.actionBtn}
              data-variant="primary"
              onClick={handleLogMove}
            >
              Log this move
            </button>
          ) : (
            <button
              type="button"
              className={styles.actionBtn}
              data-variant="primary"
              onClick={() => setExpanded(expanded === 'done' ? null : 'done')}
            >
              Mark done
            </button>
          )}
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() =>
              setExpanded(expanded === 'reschedule' ? null : 'reschedule')
            }
          >
            Reschedule
          </button>
          {item.linkedFeatureId && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleLocate}
            >
              Locate
            </button>
          )}
        </div>
      ) : (
        status === 'done' && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => useWorkItemStore.getState().unfulfilWorkItem(item.id)}
            >
              Undo
            </button>
          </div>
        )
      )}

      {expanded === 'done' && (
        <div className={styles.inlineForm}>
          {memberOptions.length > 0 && (
            <div className={styles.inlineField}>
              <label htmlFor={`work-done-assignee-${item.id}`}>Assign to</label>
              <StewardPicker
                options={memberOptions}
                value={assigneeId !== '' ? { userId: assigneeId } : null}
                ariaLabel="Assign this work to a steward"
                sentinelLabel="Someone not listed (type name below)"
                onChange={(ref, label) => {
                  if (ref !== null && 'userId' in ref) {
                    setAssigneeId(ref.userId);
                    setWho(label);
                  } else {
                    setAssigneeId('');
                  }
                }}
              />
            </div>
          )}
          <div className={styles.inlineField}>
            <label htmlFor={`work-done-who-${item.id}`}>Who</label>
            <input
              id={`work-done-who-${item.id}`}
              className={styles.input}
              value={who}
              onChange={(e) => {
                setWho(e.target.value);
                // Free-text edit breaks the roster link -- the name no longer
                // necessarily matches the picked member.
                setAssigneeId('');
              }}
              placeholder="optional"
            />
          </div>
          <div className={styles.inlineField}>
            <label htmlFor={`work-done-date-${item.id}`}>Date</label>
            <input
              id={`work-done-date-${item.id}`}
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className={styles.inlineField}>
            <label htmlFor={`work-done-notes-${item.id}`}>Notes</label>
            <input
              id={`work-done-notes-${item.id}`}
              className={styles.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              data-variant="primary"
              onClick={handleMarkDone}
            >
              Save · mark done
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setExpanded(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded === 'reschedule' && (
        <div className={styles.inlineForm}>
          <div className={styles.inlineField}>
            <label htmlFor={`work-resched-${item.id}`}>To</label>
            <input
              id={`work-resched-${item.id}`}
              className={styles.input}
              value={rescheduleTo}
              onChange={(e) => setRescheduleTo(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              data-variant="primary"
              onClick={handleReschedule}
            >
              Move date
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setExpanded(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
