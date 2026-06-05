/**
 * SegmentIntakePanel — right-hand detail + intake for the active True North
 * segment. Mirrors the Observe compass `SelectedObjectivePanel`: an ordinal +
 * label header with a completeness ring, the segment summary, then the
 * segment's intake form. Dispatches to one of the 8 forms by segment id.
 */

import { Check } from 'lucide-react';
import type { SegmentView } from '../useTrueNorthData.js';
import type { TrueNorthSegmentId } from '../data/trueNorthTypes.js';
import {
  CoreVisionIntake,
  RequiredFunctionsIntake,
  LegalZoningIntake,
  FinancialIntake,
  AccessMarketIntake,
  EcologicalIntake,
  HumanNeighbourIntake,
  DealBreakersIntake,
} from './intakeForms.js';
import css from './SegmentIntakePanel.module.css';

interface PanelProps {
  view: SegmentView | null;
  projectId: string;
}

function renderForm(id: TrueNorthSegmentId, projectId: string) {
  switch (id) {
    case 'core-vision':
      return <CoreVisionIntake projectId={projectId} />;
    case 'required-functions':
      return <RequiredFunctionsIntake projectId={projectId} />;
    case 'legal-zoning':
      return <LegalZoningIntake projectId={projectId} />;
    case 'financial':
      return <FinancialIntake projectId={projectId} />;
    case 'access-market':
      return <AccessMarketIntake projectId={projectId} />;
    case 'ecological':
      return <EcologicalIntake projectId={projectId} />;
    case 'human-neighbour':
      return <HumanNeighbourIntake projectId={projectId} />;
    case 'deal-breakers':
      return <DealBreakersIntake projectId={projectId} />;
  }
}

export default function SegmentIntakePanel({ view, projectId }: PanelProps) {
  if (!view) {
    return (
      <section className={css.panel} aria-label="No segment selected">
        <div className={css.empty}>
          <p className="eyebrow">No segment selected</p>
          <p className={css.emptyHint}>
            Pick a segment on the compass to define that part of your True North.
          </p>
        </div>
      </section>
    );
  }

  const { segment, progress } = view;
  const accent = segment.accent;

  return (
    <section className={css.panel} aria-label={`${segment.label} intake`}>
      <header className={css.header}>
        <div className={css.headerTop}>
          <span className={css.ordinal} style={{ color: accent }}>
            {String(segment.ordinal).padStart(2, '0')}
          </span>
          <div
            className={`${css.ring} verdict-ring-quiet`}
            style={{ ['--accent' as string]: accent }}
            data-complete={progress.complete ? '' : undefined}
          >
            {progress.complete ? (
              <span className={css.ringCheck} style={{ color: accent }}>
                <Check size={16} strokeWidth={2.5} />
              </span>
            ) : (
              <span className={css.ringPct}>{progress.pct}%</span>
            )}
          </div>
        </div>
        <p className="eyebrow">Segment {segment.ordinal} of 8</p>
        <h2 className={css.title}>{segment.label}</h2>
        <p className={css.progressNote}>
          {progress.complete
            ? 'Answered'
            : `${progress.filled} of ${progress.total} answered`}
        </p>
      </header>

      <p className={css.summary}>{segment.summary}</p>

      <div className={css.formHost}>{renderForm(segment.id, projectId)}</div>
    </section>
  );
}
