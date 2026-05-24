/**
 * FitGatePage — Stage 0 verdict surface (the True North compass center opens
 * here). Mirrors ObserveCommandCentrePage: a quiet "locked" state until every
 * segment is answered, then the verdict.
 *
 * The gate is ADVISORY (steward-sovereign). Even a Reject verdict keeps the
 * "Proceed to Observe anyway" action live — the engine surfaces severity; the
 * steward decides. No hard auto-block, mirroring the livestock-gate precedent.
 */

import { useParams, useNavigate } from '@tanstack/react-router';
import { Telescope, ArrowRight, Lock, Compass } from 'lucide-react';
import { useFitGate } from '../useFitGate.js';
import FitGateSeverity from './FitGateSeverity.js';
import css from './FitGatePage.module.css';

export default function FitGatePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();

  const { result, ready, stagePct, hasGis } = useFitGate(projectId);

  const backToTrueNorth = () =>
    navigate({
      to: '/v3/project/$projectId/true-north',
      params: { projectId },
    });
  const goObserve = () =>
    navigate({ to: '/v3/project/$projectId/compass', params: { projectId } });

  if (!ready) {
    return (
      <div className={css.lockedPage}>
        <div className={css.lockedCard}>
          <span className={css.lockedIcon}>
            <Lock size={26} strokeWidth={1.75} />
          </span>
          <h1 className={css.lockedTitle}>Fit Gate locked</h1>
          <p className={css.lockedBody}>
            Answer every True North segment to compute your Fit Gate verdict.
            You&apos;re at {stagePct}% across the 8 segments.
          </p>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={backToTrueNorth}
          >
            <Compass size={16} strokeWidth={2} /> Back to True North
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerMain}>
          <p className="eyebrow">Stage 0 · Fit Gate</p>
          <h1 className={css.title}>Fit Gate verdict</h1>
          <p className={css.subtitle}>
            A deterministic read of your goal against this property&apos;s legal,
            financial, access, ecological, human, and land-suitability signals.
            {hasGis
              ? ' Land-suitability scores are folded in from your site data.'
              : ' Add site data to fold in computed land-suitability scores.'}{' '}
            This is advisory — you decide whether to proceed.
          </p>
        </div>
        <button type="button" className={css.ghostBtn} onClick={backToTrueNorth}>
          <Compass size={16} strokeWidth={2} /> True North
        </button>
      </header>

      <div className={css.sections}>
        <FitGateSeverity result={result} />

        <section className={css.proceed} aria-label="Proceed to Observe">
          <div className={css.proceedMain}>
            <p className="eyebrow">Steward&apos;s call</p>
            <p className={css.proceedBody}>
              The Fit Gate is advisory. Whatever the verdict, the decision is
              yours — proceed to Observe to start mapping, or revisit your True
              North answers first.
            </p>
          </div>
          <button type="button" className={css.primaryBtn} onClick={goObserve}>
            <Telescope size={16} strokeWidth={2} /> Proceed to Observe
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </section>
      </div>
    </div>
  );
}
