/**
 * TrueNorthCompassPage — full-screen Stage 0 "define your goal" surface.
 *
 * The steward lands here before Observe: a wheel of the 8 True North segments
 * (Core Vision, Required Functions, Legal/Zoning, Financial, Access/Market,
 * Ecological, Human/Neighbour, Deal Breakers), with an intake panel on the
 * right. "The outer ring readies the stage; the center runs it" — once every
 * segment is answered the wheel center unlocks the Fit Gate verdict. Rendered
 * full-bleed by V3ProjectLayout (the `true-north` path skips LandOsShell).
 *
 * Mirrors `StageCompassPage` for Observe; the difference is that each segment's
 * detail panel is an *intake form* (capture) rather than a checklist (review).
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Telescope, ArrowRight } from 'lucide-react';
import { useTrueNorthData } from './useTrueNorthData.js';
import { useTrueNorthStore } from '../../store/trueNorthStore.js';
import { useSiteProfileStore } from '../../store/siteProfileStore.js';
import TrueNorthCompassWheel from './TrueNorthCompassWheel.js';
import SegmentIntakePanel from './segments/SegmentIntakePanel.js';
import type { TrueNorthSegmentId } from './data/trueNorthTypes.js';
import css from './TrueNorthCompassPage.module.css';

export default function TrueNorthCompassPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();

  const ensureTrueNorth = useTrueNorthStore((s) => s.ensureDefault);
  const ensureSiteProfile = useSiteProfileStore((s) => s.ensureDefault);
  useEffect(() => {
    ensureTrueNorth(projectId);
    ensureSiteProfile(projectId);
  }, [projectId, ensureTrueNorth, ensureSiteProfile]);

  const data = useTrueNorthData(projectId);

  const goFitGate = () =>
    navigate({
      to: '/v3/project/$projectId/true-north/fit-gate',
      params: { projectId },
    });

  // Default selection: first unanswered segment, else the first.
  const defaultSegment = useMemo<TrueNorthSegmentId>(() => {
    const firstIncomplete = data.views.find((v) => !v.progress.complete);
    return (firstIncomplete ?? data.views[0]!).segment.id;
  }, [data.views]);

  const [selected, setSelected] = useState<TrueNorthSegmentId | null>(defaultSegment);
  const selectedView = selected ? (data.byId[selected] ?? null) : null;

  return (
    <div className={css.page}>
      <header className={css.top}>
        <div className={css.topMain}>
          <p className="eyebrow">Stage 0 · Before you observe</p>
          <h1 className={css.heading}>True North</h1>
          <p className={css.sub}>
            Define your goal and non-negotiables, then screen the property — so
            you only map land worth mapping.
          </p>
        </div>
        <div className={css.topMeta}>
          <div className={css.progressBlock}>
            <span className={css.progressPct}>{data.stage.pct}%</span>
            <span className={css.progressLabel}>
              {data.stage.filled} of {data.stage.total} answered
            </span>
          </div>
          <button
            type="button"
            className={css.fitGateBtn}
            data-ready={data.ready ? '' : undefined}
            onClick={goFitGate}
          >
            <Telescope size={15} strokeWidth={2} /> Fit Gate
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className={css.body}>
        <main className={css.center} aria-label="True North compass">
          <div className={css.wheelHost}>
            <TrueNorthCompassWheel
              views={data.views}
              selected={selected}
              onSelect={setSelected}
              ready={data.ready}
              onEnterFitGate={goFitGate}
            />
          </div>
          <p className={css.centerNote}>
            {data.ready
              ? 'All segments answered — open the Fit Gate from the wheel center.'
              : 'Answer every segment to unlock the Fit Gate verdict.'}
          </p>
        </main>

        <SegmentIntakePanel view={selectedView} projectId={projectId} />
      </div>
    </div>
  );
}
