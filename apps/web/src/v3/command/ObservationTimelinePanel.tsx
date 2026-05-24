/**
 * ObservationTimelinePanel — the doc's "observation timeline": a reverse-chron
 * feed of activity across the stage's objectives. Built from the run store —
 * each captured evidence item and each status change surfaces as an event —
 * so the steward sees what has happened lately without opening each objective.
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
import type { EvidenceKind } from '../objectives/fieldObjective.js';
import type { FieldObjectiveView } from '../objectives/useFieldObjectives.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  views: FieldObjectiveView[];
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

function buildEvents(views: FieldObjectiveView[]): TimelineEvent[] {
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
    if (run.status === 'complete' && run.updatedAt) {
      events.push({
        id: `${objective.id}-complete`,
        at: run.updatedAt,
        Icon: CheckCircle2,
        text: `Objective completed · ${OBSERVE_MODULE_LABEL[objective.module]}`,
        objectiveTitle: objective.title,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

function formatWhen(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ObservationTimelinePanel({ views }: Props) {
  const events = buildEvents(views);

  return (
    <section className={css.panel} aria-label="Observation timeline">
      <p className="eyebrow">Observation timeline</p>
      {events.length === 0 ? (
        <p className={css.emptyNote}>
          No observations recorded yet. Launch an objective to begin field work.
        </p>
      ) : (
        <ul className={css.timelineList}>
          {events.map((e) => (
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
      )}
    </section>
  );
}
