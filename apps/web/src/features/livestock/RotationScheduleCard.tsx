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
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={css.assumption}>
        Schedule projects from each paddock{'\u2019'}s last-updated timestamp against species recovery
        requirements (cattle 30d, sheep 25d, etc.). It does not yet incorporate live forage
        rebound, weather windows, or planned mob splits {'\u2014'} those refinements are P3-planned.
      </div>
    </section>
  );
}
