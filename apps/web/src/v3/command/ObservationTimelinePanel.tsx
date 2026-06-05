/**
 * ObservationTimelinePanel — the doc's "observation timeline": a reverse-chron
 * feed of activity across the stage's observation needs. Built from the run
 * store — each captured evidence item and each recording surfaces as an event —
 * so the steward sees what has happened lately without opening each need.
 */

import {
  Camera,
  CheckCircle2,
  FileText,
  MapPinned,
  Mic,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { OBSERVE_MODULE_LABEL } from '../observe/types.js';
import type { EvidenceKind } from '../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../observation-needs/useObservationNeeds.js';
import css from './shell/CommandCentreShell.module.css';

interface Props {
  views: ObservationNeedView[];
  /** Eyebrow heading. Defaults to the global "Observation timeline". In focus
   *  mode the aside passes a single-need view + contextual copy. */
  heading?: string;
  /** Empty-state text when there are no events for the given views. */
  emptyNote?: string;
}

interface TimelineEvent {
  id: string;
  at: string;
  Icon: LucideIcon;
  text: string;
  objectiveTitle: string;
}

const EVIDENCE_ICON: Record<EvidenceKind, LucideIcon> = {
  photo: Camera,
  note: FileText,
  annotation: MapPinned,
  confirmation: ClipboardCheck,
  audio: Mic,
};

const EVIDENCE_VERB: Record<EvidenceKind, string> = {
  photo: 'Photo captured',
  note: 'Note recorded',
  annotation: 'Annotation placed',
  confirmation: 'Confirmation logged',
  audio: 'Audio recorded',
};

function buildEvents(views: ObservationNeedView[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const { objective, run } of views) {
    for (const [i, ev] of run.evidence.entries()) {
      events.push({
        id: `${objective.id}-ev-${i}`,
        at: ev.capturedAt,
        Icon: EVIDENCE_ICON[ev.kind],
        text: `${EVIDENCE_VERB[ev.kind]} · ${OBSERVE_MODULE_LABEL[objective.module]}`,
        objectiveTitle: objective.title,
      });
    }
    if (
      (run.status === 'recorded' || run.status === 'resolved') &&
      run.updatedAt
    ) {
      events.push({
        id: `${objective.id}-recorded`,
        at: run.updatedAt,
        Icon: CheckCircle2,
        text: `Observation recorded · ${OBSERVE_MODULE_LABEL[objective.module]}`,
        objectiveTitle: objective.title,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

function formatWhen(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
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

export default function ObservationTimelinePanel({
  views,
  heading = 'Observation timeline',
  emptyNote = 'No observations recorded yet. Launch a need to begin field work.',
}: Props) {
  const events = buildEvents(views);
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
                        {e.objectiveTitle}
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
