/**
 * TourCallout -- the coachmark card beside the spotlight: step counter, title,
 * body, a thin progress bar, and Back / Skip / Next. Positioned via the pure
 * computeCalloutPosition helper against the live target rect; centres itself
 * when the target could not be resolved (null rect).
 *
 * It measures its own rendered size (useLayoutEffect) so the placement math can
 * clamp the card fully inside the viewport before the browser paints.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { Rect, Size } from './calloutPosition.js';
import { computeCalloutPosition } from './calloutPosition.js';
import type { TourStep } from './onboardingSteps.js';
import css from './TourCallout.module.css';

interface Props {
  step: TourStep;
  /** 1-based ordinal among spotlight steps. */
  current: number;
  /** Total spotlight steps. */
  total: number;
  targetRect: Rect | null;
  viewport: Size;
  canBack: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

// First-paint estimate, corrected on layout once the real card is measured.
const DEFAULT_SIZE: Size = { width: 320, height: 210 };

export default function TourCallout({
  step,
  current,
  total,
  targetRect,
  viewport,
  canBack,
  onBack,
  onNext,
  onSkip,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.height) {
      setSize((prev) =>
        prev.width === r.width && prev.height === r.height
          ? prev
          : { width: r.width, height: r.height },
      );
    }
  }, [step.id, targetRect, viewport.width, viewport.height]);

  const pos = computeCalloutPosition(targetRect, step.placement ?? 'bottom', viewport, size);

  return (
    <div
      ref={cardRef}
      className={css.callout}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label={step.title}
    >
      <button type="button" className={css.skip} onClick={onSkip} aria-label="Skip tour">
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <p className={css.counter}>
        {current} of {total}
      </p>
      <h3 className={css.title}>{step.title}</h3>
      <p className={css.body}>{step.body}</p>

      <div className={css.progress} aria-hidden="true">
        <span
          className={css.progressFill}
          style={{ width: `${Math.round((current / total) * 100)}%` }}
        />
      </div>

      <div className={css.actions}>
        <button type="button" className={css.ghost} onClick={onBack} disabled={!canBack}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          Back
        </button>
        <div className={css.actionsRight}>
          <button type="button" className={css.skipText} onClick={onSkip}>
            Skip
          </button>
          <button type="button" className={css.primary} onClick={onNext}>
            Next
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
