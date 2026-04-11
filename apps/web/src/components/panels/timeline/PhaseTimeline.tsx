import { useState } from 'react';
import type { BuildPhase } from '../../../store/phaseStore.js';
import type { VisionPhaseNote } from '../../../store/visionStore.js';
import type { PhaseSummary } from './timelineHelpers.js';
import p from '../../../styles/panel.module.css';
import s from '../TimelinePanel.module.css';

interface Props {
  phases: BuildPhase[];
  phaseNotes: VisionPhaseNote[];
  phaseSummaries: Map<string, PhaseSummary>;
  onFilterPhase: (phaseName: string) => void;
}

export default function PhaseTimeline({ phases, phaseNotes, phaseSummaries, onFilterPhase }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(phases[0]?.id ?? null);

  if (phases.length === 0) {
    return <div className={p.empty}>No phases defined. Open Phase settings to add build phases.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {phases.map((phase) => {
        const isExpanded = expandedId === phase.id;
        const summary = phaseSummaries.get(phase.name);
        const note = phaseNotes.find((pn) => pn.label === phase.name || pn.phaseKey === phase.name);

        return (
          <div key={phase.id}>
            <button
              onClick={() => { setExpandedId(isExpanded ? null : phase.id); onFilterPhase(phase.name); }}
              className={`${s.phaseHeader} ${isExpanded ? s.phaseHeaderExpanded : s.phaseHeaderCollapsed}`}
            >
              <div className={s.phaseCircle} style={{ borderColor: phase.color, color: phase.color }}>
                {phase.order}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={s.phaseNameRow}>
                  <span className={s.phaseName}>{phase.name}</span>
                  <span className={s.phaseYears} style={{ color: phase.color }}>{phase.timeframe}</span>
                </div>
                {phase.description && <div className={s.phaseSubtitle}>{phase.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--color-panel-muted)' }}>
                  {summary?.featureCount ?? 0} feature(s) assigned
                </div>
              </div>
              <span className={s.phaseChevron}>{isExpanded ? '\u25BE' : '\u203A'}</span>
            </button>

            {isExpanded && (
              <div className={s.phaseDetail}>
                {note?.notes && (
                  <p className={s.phaseQuote}>&ldquo;{note.notes}&rdquo;</p>
                )}
                {summary && summary.features.length > 0 ? (
                  <>
                    <div className={s.keyFeaturesLabel}>Assigned Features:</div>
                    <ul className={s.featureList}>
                      {summary.features.map((f) => (
                        <li key={f.id} className={s.featureItem}>
                          <span className={s.featureDot} style={{ color: phase.color }}>{'\u25CF'}</span>
                          {f.name} <span style={{ color: 'var(--color-panel-muted)', fontSize: 10 }}>({f.featureType})</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-panel-muted)' }}>No features assigned to this phase yet</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
