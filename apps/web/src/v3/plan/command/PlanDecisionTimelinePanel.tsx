/**
 * PlanDecisionTimelinePanel — the Plan Command Centre's right-rail #1: a
 * reverse-chron feed of decision activity across the stage. Mirrors
 * `ObservationTimelinePanel` (Observe) — one event per decision, grouped into
 * calendar-day buckets, so the steward sees what was decided lately without
 * opening each one.
 */

import {
  CheckCircle2,
  FileEdit,
  History,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  type PlanDecision,
  type PlanDecisionStatus,
  PLAN_DECISION_STATUS_LABEL,
} from '../decisions/planDecision.js';
import { PLAN_REVIEW_DECISION_LABEL } from '../impact/planImpactFlag.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  decisions: PlanDecision[];
  heading?: string;
  emptyNote?: string;
}

interface TimelineEvent {
  id: string;
  at: string;
  Icon: LucideIcon;
  text: string;
  title: string;
}

const STATUS_ICON: Record<PlanDecisionStatus, LucideIcon> = {
  draft: FileEdit,
  accepted: CheckCircle2,
  superseded: History,
  rejected: XCircle,
};

function buildEvents(decisions: PlanDecision[]): TimelineEvent[] {
  const events = decisions.map((d) => ({
    id: d.id,
    at: d.decidedAt ?? d.updatedAt ?? d.createdAt,
    Icon: STATUS_ICON[d.status],
    text: `${PLAN_REVIEW_DECISION_LABEL[d.verb]} · ${PLAN_DECISION_STATUS_LABEL[d.status]}`,
    title: d.headline.trim() || 'Untitled decision',
  }));
  return events.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}

function formatWhen(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Calendar-day bucket label: Today / Yesterday / "May 23". */
function dayLabel(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const now = new Date();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Group already-sorted (desc) events into contiguous calendar-day buckets. */
function groupByDay(
  events: TimelineEvent[],
): { label: string; events: TimelineEvent[] }[] {
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  for (const e of events) {
    const label = dayLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(e);
    else groups.push({ label, events: [e] });
  }
  return groups;
}

export default function PlanDecisionTimelinePanel({
  decisions,
  heading = 'Decision timeline',
  emptyNote = 'No decisions recorded yet. Open a decision to weigh the options.',
}: Props) {
  const events = buildEvents(decisions);
  const groups = groupByDay(events);

  return (
    <section className={css.panel} aria-label={heading}>
      <p className="eyebrow">{heading}</p>
      {events.length === 0 ? (
        <p className={css.emptyNote}>{emptyNote}</p>
      ) : (
        <div className={css.timelineList}>
          {groups.map((group) => (
            <div key={group.label} className={css.timelineGroup}>
              <p className={css.timelineGroupLabel}>{group.label}</p>
              <ul className={css.timelineList} style={{ maxHeight: 'none' }}>
                {group.events.map((e) => (
                  <li key={e.id} className={css.timelineRow}>
                    <span className={css.timelineIcon}>
                      <e.Icon size={15} strokeWidth={2} />
                    </span>
                    <span className={css.timelineBody}>
                      <span className={css.timelineText}>{e.text}</span>
                      <span className={css.timelineSub}>
                        {e.title}
                        {formatWhen(e.at) ? ` · ${formatWhen(e.at)}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
