/**
 * SelectedObjectivePanel — right-hand detail for the active compass objective.
 *
 * Header (ordinal + label + verified ring), summary, a checklist preview that
 * mirrors the gating state per node, the module pitfall, and the "Open on Map"
 * action that enters the existing Observe map for that module.
 */

import { Check, Lock, Circle, CircleDot, MapPin, AlertTriangle } from 'lucide-react';
import type { ObjectiveView } from './compassTypes.js';
import type { NodeState } from './compassGating.js';
import css from './SelectedObjectivePanel.module.css';

const STATE_ICON: Record<NodeState, typeof Check> = {
  verified: Check,
  'evidence-in': CircleDot,
  open: Circle,
  locked: Lock,
};

const STATE_LABEL: Record<NodeState, string> = {
  verified: 'Verified',
  'evidence-in': 'Evidence in',
  open: 'Ready',
  locked: 'Locked',
};

interface PanelProps {
  view: ObjectiveView | null;
  /** Enter the stage's working map for this objective's module. */
  onOpenMap: (moduleId: string) => void;
}

export default function SelectedObjectivePanel({ view, onOpenMap }: PanelProps) {
  // No objective selected (deselected on the wheel) — quiet prompt rather than
  // a stale detail view.
  if (!view) {
    return (
      <section className={css.panel} aria-label="No objective selected">
        <div className={css.empty}>
          <p className="eyebrow">No objective selected</p>
          <p className={css.emptyHint}>
            Pick an objective on the compass to see its checklist, pitfalls, and
            map entry point.
          </p>
        </div>
      </section>
    );
  }

  const { objective, states, progress } = view;
  const accent = objective.accent;

  const openOnMap = () => onOpenMap(objective.id);

  return (
    <section className={css.panel} aria-label={`${objective.label} detail`}>
      <header className={css.header}>
        <div className={css.headerTop}>
          <span className={css.ordinal} style={{ color: accent }}>
            {String(objective.ordinal).padStart(2, '0')}
          </span>
          <div
            className={`${css.ring} verdict-ring-quiet`}
            style={{ ['--accent' as string]: accent }}
          >
            <span className={css.ringPct}>{progress.pct}%</span>
          </div>
        </div>
        <p className="eyebrow">Selected objective</p>
        <h2 className={css.title}>{objective.label}</h2>
        <p className={css.progressNote}>
          {progress.verified} of {progress.total} steps verified
        </p>
      </header>

      <p className={css.summary}>{objective.summary}</p>

      <div className={css.section}>
        <p className="eyebrow">Checklist</p>
        <ul className={css.checklist}>
          {objective.nodes.map((node) => {
            const state = states[node.index] ?? 'locked';
            const Icon = STATE_ICON[state];
            return (
              <li
                key={node.index}
                className={css.checkItem}
                data-state={state}
              >
                <span
                  className={css.checkIcon}
                  style={
                    state === 'verified' || state === 'evidence-in'
                      ? { color: accent }
                      : undefined
                  }
                >
                  <Icon size={15} strokeWidth={2} />
                </span>
                <span className={css.checkLabel}>{node.label}</span>
                <span className={css.checkState}>{STATE_LABEL[state]}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {objective.pitfall && (
        <div className={css.pitfall}>
          <span className={css.pitfallIcon}>
            <AlertTriangle size={15} strokeWidth={2} />
          </span>
          <div>
            <p className={css.pitfallLabel}>Common pitfall</p>
            <p className={css.pitfallBody}>{objective.pitfall}</p>
          </div>
        </div>
      )}

      <button type="button" className={css.openButton} onClick={openOnMap}>
        <MapPin size={16} strokeWidth={2} />
        Open on Map
      </button>
    </section>
  );
}
