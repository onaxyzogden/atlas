/**
 * Scholar #UX (Phase B / #6) — Sticky mini-score header.
 *
 * Slides in at the top of the Site Intelligence panel's scroll container
 * once the full suitability card scrolls out of view, so the page's
 * "heart" is always one glance away. Visibility is driven by an
 * IntersectionObserver on the suitability card itself (passed in as
 * `targetRef`) rather than a scroll handler, so it stays cheap and
 * jitter-free.
 */

import { memo, useEffect, useState, type MutableRefObject } from 'react';
import { OctagonX } from 'lucide-react';
import { ScoreCircle } from './sections/_shared.js';
import s from './SiteIntelligencePanel.module.css';

interface StickyMiniScoreProps {
  score: number;
  criticalCount: number;
  /** Ref to the element whose visibility toggles the sticky bar — the
   *  main `.suitabilityCard`. Once it scrolls above the viewport, the
   *  mini bar slides in. */
  targetRef: MutableRefObject<HTMLDivElement | null>;
}

export const StickyMiniScore = memo(function StickyMiniScore({
  score,
  criticalCount,
  targetRef,
}: StickyMiniScoreProps) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    // Root = nearest scrolling ancestor (the `.container` panel root).
    // rootMargin pulls the trigger so the bar appears just as the main
    // card's bottom edge passes the top of the viewport rather than
    // waiting for it to leave entirely.
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setHidden(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetRef]);

  return (
    <div
      className={`${s.stickyMini} ${!hidden ? s.stickyMiniVisible : ''}`}
      aria-hidden={hidden}
    >
      <ScoreCircle score={score} size={28} />
      <span className={s.stickyMiniLabel}>
        Overall Suitability &middot; {score}
      </span>
      {criticalCount > 0 && (
        <span className={s.stickyMiniCritical}>
          <OctagonX size={10} strokeWidth={2.25} aria-hidden="true" />
          {criticalCount} critical
        </span>
      )}
    </div>
  );
});
