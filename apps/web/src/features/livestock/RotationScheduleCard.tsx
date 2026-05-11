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

import { useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import {
  useLivestockMoveLogStore,
  eventsByPaddock,
  exitsFromPaddock,
  structureDestEvents,
  destStructureId,
  type LivestockMoveEvent,
  type LivestockMoveDirection,
} from '../../store/livestockMoveLogStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
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
      // Legacy v2 fallback: a paddockId-keyed event with direction move_out / rotate_through
      // implicitly exited that paddock.
      ((e.paddockId === paddockId || e.toPaddockId === paddockId) &&
        (e.direction === 'move_out' || e.direction === 'rotate_through'));
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

export default function RotationScheduleCard({ projectId }: RotationScheduleCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const allEvents = useLivestockMoveLogStore((s) => s.events);
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
  const allStructures = useStructureStore((s) => s.structures);
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
                              return (
                                <div key={`${ev.id}-${tag}`} className={css.loggedMoveRow}>
                                  <div className={css.loggedMoveDirection}>
                                    <b>{tag === 'out' ? 'Exit' : DIRECTION_LABEL[ev.direction]}</b>
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

      {structureEvents.length > 0 ? (
        <div className={css.groupBlock}>
          <div className={css.groupHead}>
            <span className={css.groupName}>Structure moves</span>
            <span className={css.groupMeta}>
              {structureEvents.length} event{structureEvents.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className={css.loggedMovesSection}>
            {structureEvents.map((ev) => {
              const sid = destStructureId(ev);
              return (
                <div key={ev.id} className={css.loggedMoveRow}>
                  <div className={css.loggedMoveDirection}>
                    <b>{DIRECTION_LABEL[ev.direction]}</b>
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
