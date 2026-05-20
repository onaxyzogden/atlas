/**
 * §16 RotationScheduleCard — forward-looking paddock rotation timeline.
 *
 * Reads paddocks for the project, derives a per-paddock recovery status and
 * suggested action via livestockAnalysis, then projects the next 8 weeks of
 * expected moves grouped by grazingCellGroup. The dashboard already computes
 * `computeRotationSchedule(paddocks)` but never renders it — this card is the
 * missing surface that turns the analysis into an actionable schedule view.
 *
 * Pure presentation: no shared-package math, no new entities, no map overlay.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLivestockStore, type Paddock, type LivestockSpecies } from '../../store/livestockStore.js';
import {
  useLivestockMoveLogStore,
  eventsByPaddock,
  exitsFromPaddock,
  structureDestEvents,
  destStructureId,
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  type LivestockMoveEvent,
  type LivestockMoveDirection,
} from '../../store/livestockMoveLogStore.js';
import {
  nextUnfulfilledPlan,
  structureDestPlans,
  type ScheduledLivestockMove,
} from '../../store/scheduledLivestockMoveStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import type { WorkItem } from '@ogden/shared';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { startScheduledLivestockMove } from '../../v3/act/ActStructurePopover.actions.js';
import {
  computeRecoveryStatus,
  computeRotationSchedule,
  type RecoveryStatus,
  type RotationEntry,
} from './livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import css from './RotationScheduleCard.module.css';

interface RotationScheduleCardProps {
  projectId: string;
}

interface UpcomingMove {
  paddockId: string;
  paddockName: string;
  group: string;
  species: string[];
  daysUntilReady: number;
  targetDate: Date;
  status: RecoveryStatus['status'];
  action: RotationEntry['suggestedAction'];
  /** Species recovery requirement for this paddock — used for rest-period variance. */
  requiredDays: number;
}

const ACTION_LABEL: Record<RotationEntry['suggestedAction'], string> = {
  move_in: 'Move in',
  continue: 'Continue grazing',
  rest: 'Resting',
};

const STATUS_LABEL: Record<RecoveryStatus['status'], string> = {
  active: 'Active',
  resting: 'Resting',
  ready: 'Ready',
  overdue: 'Overdue',
};

const DIRECTION_LABEL: Record<LivestockMoveDirection, string> = {
  move_in: 'Move in',
  move_out: 'Move out',
  rotate_through: 'Rotate through',
};

function formatLoggedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Compute the days between two ISO dates (date-only). Returns a non-negative
 * integer when `later >= earlier`, or a negative number when reversed.
 */
function daysBetween(earlier: string, later: string): number {
  const a = new Date(earlier).getTime();
  const b = new Date(later).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

interface RestPair {
  entryId: string;
  entryDate: string;
  exitDate: string;
  actualRestDays: number;
  variance: number; // actual − required
}

/**
 * Walk this paddock's events oldest→newest, pairing each entry (`toPaddockId === p.id`)
 * with the most recent prior exit (`fromPaddockId === p.id` *or* legacy paddock-keyed
 * `direction === 'move_out' | 'rotate_through'`). Returns one RestPair per entry that
 * had a recorded prior exit; first-ever entries (no prior exit) are skipped.
 */
function computeRestPairs(
  events: LivestockMoveEvent[], // already filtered to this paddock context (entries + exits)
  paddockId: string,
  requiredDays: number,
): RestPair[] {
  // Sort oldest first.
  const sorted = events.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const pairs: RestPair[] = [];
  let lastExitDate: string | null = null;
  for (const e of sorted) {
    const isExit =
      e.fromPaddockId === paddockId ||
      // Legacy v2 fallback: a paddockId-keyed `move_out` event implicitly
      //  exited that paddock. (v4 migration split every `rotate_through`
      //  into a linked move_out/move_in pair, so the `rotate_through`
      //  branch is no longer needed.)
      ((e.paddockId === paddockId || e.toPaddockId === paddockId) &&
        e.direction === 'move_out');
    const destPid = e.toPaddockId ?? e.paddockId;
    const isEntry = destPid === paddockId && e.direction !== 'move_out';
    if (isEntry && lastExitDate) {
      const actualRestDays = daysBetween(lastExitDate, e.date);
      pairs.push({
        entryId: e.id,
        entryDate: e.date,
        exitDate: lastExitDate,
        actualRestDays,
        variance: actualRestDays - requiredDays,
      });
    }
    if (isExit) {
      lastExitDate = e.date;
    }
  }
  return pairs;
}

function varianceTone(variance: number): 'positive' | 'tolerant' | 'negative' {
  if (variance >= 0) return 'positive';
  if (variance >= -2) return 'tolerant';
  return 'negative';
}

function varianceBadgeText(variance: number): string {
  if (variance > 0) return `+${variance}d rest`;
  if (variance === 0) return 'on time';
  return `${variance}d`;
}

/** Inline quick-log draft — narrower than `LivestockMoveCard`'s Draft because
 *  the destination paddock is implicit (this row). */
interface QuickDraft {
  date: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: string;
  fromPaddockId: string; // '' = no recorded origin
  notes: string;
}

function emptyQuickDraft(species: string[]): QuickDraft {
  const first = (species[0] as LivestockSpecies | undefined) ?? 'sheep';
  return {
    date: new Date().toISOString().slice(0, 10),
    direction: 'move_in',
    species: first,
    headCount: '',
    fromPaddockId: '',
    notes: '',
  };
}

function newMoveId(): string {
  return `lvm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTargetDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function speciesIcons(species: string[]): string {
  return species
    .map((sp) => LIVESTOCK_SPECIES[sp as keyof typeof LIVESTOCK_SPECIES]?.icon ?? sp)
    .join(' ');
}

function projectMoves(paddocks: Paddock[]): UpcomingMove[] {
  const now = Date.now();
  const moves: UpcomingMove[] = [];
  const schedule = computeRotationSchedule(paddocks);
  for (const entry of schedule) {
    const recovery = entry.recovery;
    const daysUntilReady = Math.max(0, recovery.requiredDays - recovery.daysRested);
    const targetDate = new Date(now + daysUntilReady * 86_400_000);
    moves.push({
      paddockId: entry.paddockId,
      paddockName: entry.paddockName,
      group: entry.group,
      species: entry.species,
      daysUntilReady,
      targetDate,
      status: recovery.status,
      action: entry.suggestedAction,
      requiredDays: recovery.requiredDays,
    });
  }
  return moves;
}

/**
 * Reverse of the D0 scheduled-livestock-move migration mapper — projects a
 * spine WorkItem back into the legacy `ScheduledLivestockMove` shape the
 * helpers + render block expect. `fulfilledByEventId` is consumed only for
 * truthiness (`!p.fulfilledByEventId`), so `status:'done'` round-trips it.
 */
function workItemToPlan(w: WorkItem): ScheduledLivestockMove {
  const t = w.target;
  const isStructure = t?.kind === 'structure';
  return {
    id: w.id,
    projectId: w.projectId,
    ...(isStructure
      ? { toStructureId: t?.toId, fromStructureId: t?.fromId }
      : { toPaddockId: t?.toId, fromPaddockId: t?.fromId }),
    plannedDate: w.scheduledEnd ?? '',
    direction: (w.direction ?? 'move_in') as LivestockMoveDirection,
    species: (w.species ?? 'sheep') as LivestockSpecies,
    headCount: w.headCount ?? null,
    who: w.who,
    notes: w.notes,
    fulfilledByEventId: w.status === 'done' ? w.id : undefined,
    createdAt: w.createdAt,
  };
}

/**
 * Mirrors `mapScheduledLivestockMoves` (D0 migration mapper) exactly so a
 * card-authored plan is byte-identical to a migrated one.
 */
function planToWorkItem(m: ScheduledLivestockMove): WorkItem {
  const toId = m.toPaddockId ?? m.toStructureId;
  const fromId = m.fromPaddockId ?? m.fromStructureId;
  const kind = m.toStructureId || m.fromStructureId ? 'structure' : 'paddock';
  return {
    id: m.id,
    projectId: m.projectId,
    source: 'scheduled-livestock-move',
    overridden: true,
    title: `Move ${m.species}${m.headCount != null ? ` (${m.headCount})` : ''}`,
    phaseId: null,
    status: m.fulfilledByEventId ? 'done' : 'todo',
    doneAt: null,
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    scheduledStart: null,
    scheduledEnd: m.plannedDate,
    target: { kind, fromId, toId },
    species: m.species,
    direction: m.direction,
    headCount: m.headCount,
    who: m.who,
    notes: m.notes,
    createdAt: m.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export default function RotationScheduleCard({ projectId }: RotationScheduleCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const allEvents = useLivestockMoveLogStore((s) => s.events);
  const addEvent = useLivestockMoveLogStore((s) => s.addEvent);

  // Spine is authoritative (D0.1). Project scheduled-livestock-move WorkItems
  // back into the legacy ScheduledLivestockMove shape the helpers + render
  // block expect; redirect writes to workItemStore. The actual-move event log
  // is NOT migrated — it stays in livestockMoveLogStore.
  const allWorkItems = useWorkItemStore((s) => s.items);
  const addItem = useWorkItemStore((s) => s.addItem);
  const updateItem = useWorkItemStore((s) => s.updateItem);
  const deleteItem = useWorkItemStore((s) => s.deleteItem);
  const allPlans = useMemo(
    () =>
      allWorkItems
        .filter((w) => w.source === 'scheduled-livestock-move')
        .map(workItemToPlan),
    [allWorkItems],
  );
  const addPlan = (p: ScheduledLivestockMove) => addItem(planToWorkItem(p));
  const removePlan = (id: string) => deleteItem(id);
  const updatePlan = (id: string, patch: Partial<ScheduledLivestockMove>) => {
    const current = allPlans.find((p) => p.id === id);
    if (!current) return;
    updateItem(id, planToWorkItem({ ...current, ...patch }));
  };

  // Inline quick-log form state — single open form at a time. The `mode`
  // discriminant determines which store the form writes to on save.
  // `editingPlanId` is set when the form was opened to edit an existing
  // plan (saves call updatePlan); unset means a new plan/event.
  type FormMode = 'actual' | 'planned';
  const [openForm, setOpenForm] = useState<
    { paddockId: string; mode: FormMode; editingPlanId?: string } | null
  >(null);
  const [draft, setDraft] = useState<QuickDraft>(() => emptyQuickDraft([]));

  // Linked-pair hover grouping: hovering one leg of a rotate pair lights up
  //  both legs. Holds the *partner* id of the row currently hovered, so the
  //  predicate `hoveredLinkedId === ev.id || hoveredLinkedId === ev.linkedEventId`
  //  matches both legs symmetrically.
  const [hoveredLinkedId, setHoveredLinkedId] = useState<string | null>(null);
  function isLinkedHighlight(ev: LivestockMoveEvent): boolean {
    if (!hoveredLinkedId || !ev.linkedEventId) return false;
    return hoveredLinkedId === ev.id || hoveredLinkedId === ev.linkedEventId;
  }

  function openLogForm(m: UpcomingMove) {
    setDraft(emptyQuickDraft(m.species));
    setOpenForm({ paddockId: m.paddockId, mode: 'actual' });
  }
  function openScheduleForm(m: UpcomingMove) {
    setDraft(emptyQuickDraft(m.species));
    setOpenForm({ paddockId: m.paddockId, mode: 'planned' });
  }
  function openEditPlanForm(m: UpcomingMove, plan: ScheduledLivestockMove) {
    setDraft({
      date: plan.plannedDate,
      direction: plan.direction,
      species: plan.species,
      headCount: plan.headCount == null ? '' : String(plan.headCount),
      fromPaddockId: plan.fromPaddockId ?? '',
      notes: plan.notes ?? '',
    });
    setOpenForm({ paddockId: m.paddockId, mode: 'planned', editingPlanId: plan.id });
  }
  function closeForm() {
    setOpenForm(null);
  }
  function saveForm(m: UpcomingMove) {
    if (!draft.date) return;
    const head = draft.headCount.trim() === '' ? null : Number(draft.headCount);
    const headCount = head != null && Number.isFinite(head) ? head : null;
    if (!openForm) return;
    if (openForm.mode === 'actual') {
      const ev: LivestockMoveEvent = {
        id: newMoveId(),
        projectId,
        toPaddockId: m.paddockId,
        date: draft.date,
        direction: draft.direction,
        species: draft.species,
        headCount,
        ...(draft.fromPaddockId ? { fromPaddockId: draft.fromPaddockId } : {}),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      };
      addEvent(ev);
    } else if (openForm.editingPlanId) {
      updatePlan(openForm.editingPlanId, {
        plannedDate: draft.date,
        direction: draft.direction,
        species: draft.species,
        headCount,
        fromPaddockId: draft.fromPaddockId || undefined,
        notes: draft.notes.trim() || undefined,
      });
    } else {
      const plan: ScheduledLivestockMove = {
        id: `slvm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        toPaddockId: m.paddockId,
        plannedDate: draft.date,
        direction: draft.direction,
        species: draft.species,
        headCount,
        ...(draft.fromPaddockId ? { fromPaddockId: draft.fromPaddockId } : {}),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
        createdAt: new Date().toISOString(),
      };
      addPlan(plan);
    }
    setOpenForm(null);
  }

  // Auto-fulfilment: when an unfulfilled plan has a matching actual event
  // (same project + destination + species, date within ±7 days of plannedDate),
  // mark it fulfilled so it stops rendering as "Planned". Runs once on each
  // change to events or plans; first match per plan wins. Handles both
  // paddock-destination plans and structure-destination plans (v2).
  useEffect(() => {
    const FULFIL_WINDOW_DAYS = 7;
    const unfulfilled = allPlans.filter((p) => !p.fulfilledByEventId && p.projectId === projectId);
    for (const plan of unfulfilled) {
      const match = allEvents.find((e) => {
        if (e.projectId !== projectId) return false;
        if (plan.toPaddockId) {
          const destPid = e.toPaddockId ?? e.paddockId;
          if (destPid !== plan.toPaddockId) return false;
        } else if (plan.toStructureId) {
          const destSid = e.toStructureId ?? e.structureId;
          if (destSid !== plan.toStructureId) return false;
        } else {
          return false;
        }
        if (e.species !== plan.species) return false;
        const diff = Math.abs(daysBetween(plan.plannedDate, e.date));
        return diff <= FULFIL_WINDOW_DAYS;
      });
      if (match) {
        // Spine fulfilment: WorkItem → done, and stamp the actual event with
        // the WorkItem it proves complete (D0 proof-of-completion back-link).
        updateItem(plan.id, { status: 'done' });
        useLivestockMoveLogStore
          .getState()
          .updateEvent(match.id, { workItemId: plan.id });
      }
    }
  }, [allEvents, allPlans, projectId, updateItem]);

  const eventsByPaddockId = useMemo(() => {
    const map = new Map<string, LivestockMoveEvent[]>();
    for (const p of paddocks) {
      map.set(p.id, eventsByPaddock(allEvents, projectId, p.id));
    }
    return map;
  }, [allEvents, paddocks, projectId]);
  const exitsByPaddockId = useMemo(() => {
    const map = new Map<string, LivestockMoveEvent[]>();
    for (const p of paddocks) {
      map.set(p.id, exitsFromPaddock(allEvents, projectId, p.id));
    }
    return map;
  }, [allEvents, paddocks, projectId]);
  const structureEvents = useMemo(
    () => structureDestEvents(allEvents, projectId),
    [allEvents, projectId],
  );
  const structurePlans = useMemo(
    () => structureDestPlans(allPlans, projectId),
    [allPlans, projectId],
  );
  const allStructures = useAllStructures();
  const projectStructures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  function structureLabel(id: string): string {
    const s = projectStructures.find((x) => x.id === id);
    if (!s) return '(deleted structure)';
    const tpl = STRUCTURE_TEMPLATES[s.type];
    return `${tpl.icon} ${s.name || tpl.label}`;
  }

  const moves = useMemo(() => projectMoves(paddocks), [paddocks]);

  const grouped = useMemo(() => {
    const map = new Map<string, UpcomingMove[]>();
    for (const m of moves) {
      const list = map.get(m.group) ?? [];
      list.push(m);
      map.set(m.group, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.daysUntilReady - b.daysUntilReady);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'ungrouped') return 1;
      if (b === 'ungrouped') return -1;
      return a.localeCompare(b);
    });
  }, [moves]);

  const summary = useMemo(() => {
    const ready = moves.filter((m) => m.status === 'ready').length;
    const overdue = moves.filter((m) => m.status === 'overdue').length;
    const resting = moves.filter((m) => m.status === 'resting').length;
    const active = moves.filter((m) => m.status === 'active').length;
    const horizonDays = moves.length === 0 ? 0 : Math.min(56, Math.max(7, ...moves.map((m) => m.daysUntilReady)));
    return { ready, overdue, resting, active, horizonDays };
  }, [moves]);

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation Schedule</h3>
            <p className={css.cardHint}>
              Forward-looking move plan grouped by cell. Draw paddocks to populate.
            </p>
          </div>
          <span className={css.modeBadge}>Schedule</span>
        </div>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  // Compute timeline scale (days) — at least 14 days, at most 56
  const timelineDays = Math.max(14, summary.horizonDays);

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Rotation Schedule</h3>
          <p className={css.cardHint}>
            Per-cell move plan over the next {timelineDays} days. Target dates assume the
            current rest clock and species recovery requirements; actual moves shift
            with stocking pressure and forage rebound.
          </p>
        </div>
        <span className={css.modeBadge}>Schedule</span>
      </div>

      {/* Status pills row */}
      <div className={css.statusRow}>
        <div className={`${css.statusPill} ${css.pillReady}`}>
          <span className={css.pillCount}>{summary.ready}</span>
          <span className={css.pillLabel}>Ready</span>
        </div>
        <div className={`${css.statusPill} ${css.pillOverdue}`}>
          <span className={css.pillCount}>{summary.overdue}</span>
          <span className={css.pillLabel}>Overdue</span>
        </div>
        <div className={`${css.statusPill} ${css.pillResting}`}>
          <span className={css.pillCount}>{summary.resting}</span>
          <span className={css.pillLabel}>Resting</span>
        </div>
        <div className={`${css.statusPill} ${css.pillActive}`}>
          <span className={css.pillCount}>{summary.active}</span>
          <span className={css.pillLabel}>Active</span>
        </div>
      </div>

      {/* Per-group timelines */}
      {grouped.map(([groupName, items]) => {
        const groupLabel = groupName === 'ungrouped' ? 'Ungrouped' : groupName;
        return (
          <div key={groupName} className={css.groupBlock}>
            <div className={css.groupHead}>
              <span className={css.groupName}>{groupLabel}</span>
              <span className={css.groupMeta}>
                {items.length} paddock{items.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className={css.rotationList}>
              {items.map((m) => {
                const pctOfTimeline = Math.min(100, Math.round((m.daysUntilReady / timelineDays) * 100));
                const tone =
                  m.status === 'overdue'
                    ? css.barOverdue
                    : m.status === 'ready'
                    ? css.barReady
                    : m.status === 'active'
                    ? css.barActive
                    : css.barResting;
                return (
                  <div key={m.paddockId} className={css.rotationRow}>
                    <div className={css.rowHead}>
                      <div className={css.rowMain}>
                        <span className={css.paddockName}>{m.paddockName}</span>
                        {m.species.length > 0 && (
                          <span className={css.speciesIcons}>{speciesIcons(m.species)}</span>
                        )}
                      </div>
                      <div className={css.rowAction}>
                        <span className={`${css.actionLabel} ${tone}`}>{ACTION_LABEL[m.action]}</span>
                        {openForm?.paddockId === m.paddockId ? (
                          <button
                            type="button"
                            className={css.quickLogButton}
                            onClick={closeForm}
                            aria-label="Close quick-log form"
                          >
                            Cancel
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={css.quickLogButton}
                              onClick={() => openLogForm(m)}
                              aria-label={`Log a move into ${m.paddockName}`}
                            >
                              + Log move
                            </button>
                            <button
                              type="button"
                              className={`${css.quickLogButton} ${css.quickLogButtonSecondary}`}
                              onClick={() => openScheduleForm(m)}
                              aria-label={`Schedule a move into ${m.paddockName}`}
                            >
                              Schedule…
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={css.timelineTrack}>
                      <div
                        className={`${css.timelineBar} ${tone}`}
                        style={{ width: `${pctOfTimeline}%` }}
                      />
                      <div
                        className={css.timelineMarker}
                        style={{ left: `${pctOfTimeline}%` }}
                      />
                    </div>

                    <div className={css.rowFoot}>
                      <span className={css.statusBadge}>{STATUS_LABEL[m.status]}</span>
                      <span className={css.daysNote}>
                        {m.daysUntilReady === 0
                          ? 'Ready now'
                          : `${m.daysUntilReady} day${m.daysUntilReady === 1 ? '' : 's'} \u2014 target ${formatTargetDate(m.targetDate)}`}
                      </span>
                    </div>

                    {(() => {
                      const plan = nextUnfulfilledPlan(allPlans, projectId, m.paddockId, todayIso());
                      if (!plan) return null;
                      const plannedFromToday = daysBetween(todayIso(), plan.plannedDate);
                      const variance = plannedFromToday - m.daysUntilReady;
                      const tone = varianceTone(variance);
                      const toneClass =
                        tone === 'positive'
                          ? css.variancePositive
                          : tone === 'tolerant'
                            ? css.varianceTolerant
                            : css.varianceNegative;
                      return (
                        <div className={css.plannedLine}>
                          <span>
                            <b>Planned</b>
                            {' \u00b7 '}
                            {formatLoggedDate(plan.plannedDate)}
                          </span>
                          <span className={css.plannedActions}>
                            <span className={`${css.varianceBadge} ${toneClass}`}>
                              {varianceBadgeText(variance)}
                            </span>
                            <button
                              type="button"
                              className={css.plannedChip}
                              onClick={() => openEditPlanForm(m, plan)}
                              aria-label={`Edit planned move for ${m.paddockName}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`${css.plannedChip} ${css.plannedChipDismiss}`}
                              onClick={() => removePlan(plan.id)}
                              aria-label={`Dismiss planned move for ${m.paddockName}`}
                              title="Dismiss this plan"
                            >
                              \u2715
                            </button>
                          </span>
                        </div>
                      );
                    })()}

                    {openForm?.paddockId === m.paddockId ? (
                      <div className={css.quickLogForm}>
                        <div className={css.quickLogGrid}>
                          <label className={css.quickLogField}>
                            <span>{openForm.mode === 'planned' ? 'Planned date' : 'Date'}</span>
                            <input
                              type="date"
                              value={draft.date}
                              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                            />
                          </label>
                          <label className={css.quickLogField}>
                            <span>Direction</span>
                            <select
                              value={draft.direction}
                              onChange={(e) =>
                                setDraft({ ...draft, direction: e.target.value as LivestockMoveDirection })
                              }
                            >
                              {DIRECTION_OPTIONS.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className={css.quickLogField}>
                            <span>Species</span>
                            <select
                              value={draft.species}
                              onChange={(e) =>
                                setDraft({ ...draft, species: e.target.value as LivestockSpecies })
                              }
                            >
                              {SPECIES_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className={css.quickLogField}>
                            <span>Head</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={draft.headCount}
                              onChange={(e) => setDraft({ ...draft, headCount: e.target.value })}
                            />
                          </label>
                          <label className={`${css.quickLogField} ${css.quickLogFieldWide}`}>
                            <span>From (optional)</span>
                            <select
                              value={draft.fromPaddockId}
                              onChange={(e) => setDraft({ ...draft, fromPaddockId: e.target.value })}
                            >
                              <option value="">(no recorded origin)</option>
                              {paddocks
                                .filter((p) => p.id !== m.paddockId)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                          </label>
                          <label className={`${css.quickLogField} ${css.quickLogFieldWide}`}>
                            <span>Notes (optional)</span>
                            <input
                              type="text"
                              placeholder="e.g. moved early — pasture lush"
                              value={draft.notes}
                              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                            />
                          </label>
                        </div>
                        <div className={css.quickLogActions}>
                          <button
                            type="button"
                            className={css.quickLogSave}
                            onClick={() => saveForm(m)}
                            disabled={!draft.date}
                          >
                            {openForm.mode === 'planned'
                              ? openForm.editingPlanId
                                ? 'Update plan'
                                : 'Schedule move'
                              : 'Save move'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {(() => {
                      const entries = eventsByPaddockId.get(m.paddockId) ?? [];
                      const exits = exitsByPaddockId.get(m.paddockId) ?? [];
                      // Combine: tag each event as 'in' (destination is this paddock)
                      // or 'out' (origin is this paddock). Skip an exit if the same event
                      // is already in entries (rotate-through within the same paddock).
                      const entryIds = new Set(entries.map((e) => e.id));
                      type Tagged = { ev: LivestockMoveEvent; tag: 'in' | 'out' };
                      const combined: Tagged[] = [
                        ...entries.map((ev) => ({ ev, tag: 'in' as const })),
                        ...exits.filter((e) => !entryIds.has(e.id)).map((ev) => ({ ev, tag: 'out' as const })),
                      ].sort((a, b) => (a.ev.date < b.ev.date ? 1 : a.ev.date > b.ev.date ? -1 : 0));

                      // Plan-vs-actual rest-period variance \u2014 pair each entry with the
                      // most recent prior exit; compute actual rest vs species required.
                      const pairs = computeRestPairs(
                        // Union, dedup by id.
                        Array.from(new Map([...entries, ...exits].map((e) => [e.id, e])).values()),
                        m.paddockId,
                        m.requiredDays,
                      );
                      const pairByEntryId = new Map(pairs.map((p) => [p.entryId, p]));
                      const onSchedule = pairs.filter((p) => p.variance >= 0).length;
                      const avgRest = pairs.length > 0
                        ? Math.round(pairs.reduce((s, p) => s + p.variance, 0) / pairs.length)
                        : 0;
                      const worst = pairs.reduce<RestPair | null>(
                        (acc, p) => (acc == null || p.variance < acc.variance ? p : acc),
                        null,
                      );

                      return (
                        <div className={css.loggedMovesSection}>
                          <div className={css.loggedMovesHeading}>Logged moves</div>
                          {pairs.length > 0 ? (
                            <div className={css.varianceSummary}>
                              <span>
                                <b>{onSchedule} of {pairs.length}</b>{' '}
                                {pairs.length === 1 ? 'entry' : 'entries'} on schedule
                                {' \u00b7 '}avg {avgRest >= 0 ? `+${avgRest}` : avgRest}d vs target
                              </span>
                              {worst && worst.variance < 0 ? (
                                <span className={`${css.varianceBadge} ${css.varianceNegative}`}>
                                  worst {worst.variance}d
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {combined.length === 0 ? (
                            <div className={css.loggedMoveEmpty}>
                              No moves logged for this paddock yet.
                            </div>
                          ) : (
                            combined.map(({ ev, tag }) => {
                              const pair = tag === 'in' ? pairByEntryId.get(ev.id) : undefined;
                              const tone = pair ? varianceTone(pair.variance) : null;
                              const toneClass =
                                tone === 'positive'
                                  ? css.variancePositive
                                  : tone === 'tolerant'
                                    ? css.varianceTolerant
                                    : tone === 'negative'
                                      ? css.varianceNegative
                                      : '';
                              const linkedHi = isLinkedHighlight(ev);
                              return (
                                <div
                                  key={`${ev.id}-${tag}`}
                                  className={`${css.loggedMoveRow} ${linkedHi ? css.linkedPairHighlight : ''}`}
                                  onMouseEnter={
                                    ev.linkedEventId
                                      ? () => setHoveredLinkedId(ev.linkedEventId ?? null)
                                      : undefined
                                  }
                                  onMouseLeave={
                                    ev.linkedEventId ? () => setHoveredLinkedId(null) : undefined
                                  }
                                >
                                  <div className={css.loggedMoveDirection}>
                                    <b>
                                      {ev.linkedEventId ? (
                                        <span
                                          aria-label="Linked rotation"
                                          title="Linked rotation — paired with partner event"
                                          style={{ marginRight: 4 }}
                                        >
                                          {'\u{1F517}'}
                                        </span>
                                      ) : null}
                                      {tag === 'out' ? 'Exit' : DIRECTION_LABEL[ev.direction]}
                                    </b>
                                    <span>
                                      {formatLoggedDate(ev.date)}
                                      {' \u00b7 '}
                                      {ev.species}
                                      {ev.headCount != null
                                        ? ` \u00b7 ${ev.headCount} head`
                                        : ''}
                                      {ev.who ? ` \u00b7 ${ev.who}` : ''}
                                    </span>
                                    {pair ? (
                                      <span className={`${css.varianceBadge} ${toneClass}`}>
                                        {varianceBadgeText(pair.variance)}
                                      </span>
                                    ) : null}
                                  </div>
                                  {ev.notes ? (
                                    <div className={css.loggedMoveMeta}>{ev.notes}</div>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {structureEvents.length > 0 || structurePlans.length > 0 ? (
        <div className={css.groupBlock}>
          <div className={css.groupHead}>
            <span className={css.groupName}>Structure moves</span>
            <span className={css.groupMeta}>
              {structureEvents.length} event{structureEvents.length === 1 ? '' : 's'}
              {structurePlans.length > 0
                ? ` \u00b7 ${structurePlans.length} planned`
                : ''}
            </span>
          </div>
          <div className={css.loggedMovesSection}>
            {structurePlans.map((plan) => {
              const sid = plan.toStructureId;
              return (
                <div key={plan.id} className={`${css.loggedMoveRow} ${css.plannedLine}`}>
                  <div className={css.loggedMoveDirection}>
                    <b>Planned \u00b7 {DIRECTION_LABEL[plan.direction]}</b>
                    <span>
                      {sid ? structureLabel(sid) : '(unknown)'}
                      {' \u00b7 '}
                      {formatLoggedDate(plan.plannedDate)}
                      {' \u00b7 '}
                      {plan.species}
                      {plan.headCount != null ? ` \u00b7 ${plan.headCount} head` : ''}
                      {plan.who ? ` \u00b7 ${plan.who}` : ''}
                    </span>
                  </div>
                  <div className={css.plannedActions}>
                    {sid
                      ? (() => {
                          const structure = projectStructures.find((s) => s.id === sid);
                          if (!structure) return null;
                          return (
                            <button
                              type="button"
                              className={css.plannedChip}
                              onClick={() => startScheduledLivestockMove(structure, projectId, plan.id)}
                              aria-label={`Edit planned move into ${structureLabel(sid)}`}
                            >
                              Edit
                            </button>
                          );
                        })()
                      : null}
                    <button
                      type="button"
                      className={`${css.plannedChip} ${css.plannedChipDismiss}`}
                      onClick={() => removePlan(plan.id)}
                      aria-label={`Dismiss planned move into ${sid ? structureLabel(sid) : 'structure'}`}
                    >
                      \u2715
                    </button>
                  </div>
                  {plan.notes ? <div className={css.loggedMoveMeta}>{plan.notes}</div> : null}
                </div>
              );
            })}
            {structureEvents.map((ev) => {
              const sid = destStructureId(ev);
              const linkedHi = isLinkedHighlight(ev);
              return (
                <div
                  key={ev.id}
                  className={`${css.loggedMoveRow} ${linkedHi ? css.linkedPairHighlight : ''}`}
                  onMouseEnter={
                    ev.linkedEventId
                      ? () => setHoveredLinkedId(ev.linkedEventId ?? null)
                      : undefined
                  }
                  onMouseLeave={
                    ev.linkedEventId ? () => setHoveredLinkedId(null) : undefined
                  }
                >
                  <div className={css.loggedMoveDirection}>
                    <b>
                      {ev.linkedEventId ? (
                        <span
                          aria-label="Linked rotation"
                          title="Linked rotation — paired with partner event"
                          style={{ marginRight: 4 }}
                        >
                          {'\u{1F517}'}
                        </span>
                      ) : null}
                      {DIRECTION_LABEL[ev.direction]}
                    </b>
                    <span>
                      {sid ? structureLabel(sid) : '(unknown)'}
                      {' \u00b7 '}
                      {formatLoggedDate(ev.date)}
                      {' \u00b7 '}
                      {ev.species}
                      {ev.headCount != null ? ` \u00b7 ${ev.headCount} head` : ''}
                      {ev.who ? ` \u00b7 ${ev.who}` : ''}
                    </span>
                  </div>
                  {ev.notes ? <div className={css.loggedMoveMeta}>{ev.notes}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className={css.assumption}>
        Schedule projects from each paddock{'\u2019'}s last-updated timestamp against species recovery
        requirements (cattle 30d, sheep 25d, etc.). It does not yet incorporate live forage
        rebound, weather windows, or planned mob splits {'\u2014'} those refinements are P3-planned.
      </div>
    </section>
  );
}
