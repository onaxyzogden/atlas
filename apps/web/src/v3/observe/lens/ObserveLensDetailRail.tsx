// ObserveLensDetailRail.tsx -- horizontal rich-card rail for the Observe lens.
//
// Lives in StageShell's `bottomTray` slot (between-rails mode), under the map
// canvas and between the full-height left/right rails. It holds the rich lens
// cards that used to live in the top spine: icon + freshness dot + title + meta
// + divergence badge + summary, plus a "View all observations" call-to-action
// styled as a separate button. Each card is a single whole-card button --
// clicking a detail-bearing lens opens its DomainDetailSlideUp (via onOpenDetail).
// Filtering (including "All lenses" reset) lives only in the trimmed top
// ObserveLensSpine chips; this rail is detail-only (no "All lenses" card).

import type { ObserveLensId } from '@ogden/shared';
import { useLensData } from './lensData/LensDataContext.js';
import { C } from './tokens.js';
import css from './ObserveLensDetailRail.module.css';

interface Props {
  /** Active lens id, or 'all' -- highlights the matching card. */
  activeLens: string;
  /** Fallback select for a lens with no detail pane (keeps non-detail lenses usable). */
  onSelectLens: (id: string) => void;
  /** Open the domain-detail slide-up for a lens (whole-card click). Threaded to
   *  the dashboard's `setDetailLens`. */
  onOpenDetail: (lensId: ObserveLensId) => void;
}

export default function ObserveLensDetailRail({
  activeLens,
  onSelectLens,
  onOpenDetail,
}: Props) {
  const { lenses: LENSES, freshness: FRESHNESS, domainDetail: DOMAIN_DETAIL } = useLensData();
  return (
    <div className={css.rail} aria-label="Observe lens details">
      {LENSES.map((lens) => {
        const isActive = activeLens === lens.id;
        const fresh = FRESHNESS[lens.freshness];
        const hasDetail = Boolean(DOMAIN_DETAIL[lens.id]);
        return (
          <button
            key={lens.id}
            type="button"
            className={css.card}
            data-active={isActive}
            onClick={() => (hasDetail ? onOpenDetail(lens.id) : onSelectLens(lens.id))}
          >
            <span className={css.cardTop}>
              <span
                className={css.lensIcon}
                style={{ color: lens.color }}
                aria-hidden="true"
              >
                {lens.icon}
              </span>
              {fresh.dot && (
                <span
                  className={css.dot}
                  style={{ background: fresh.color }}
                  title={fresh.label}
                />
              )}
            </span>
            <span className={css.title}>{lens.label}</span>
            <span className={css.meta}>
              {lens.observations} obs
              {lens.lastObserved ? ` · ${lens.lastObserved}` : ''}
            </span>
            {lens.divergence && (
              <span className={css.divergence} style={{ color: C.amber }}>
                {'▲'} Divergence
              </span>
            )}
            {lens.summary && <span className={css.summary}>{lens.summary}</span>}
            {hasDetail && (
              <span className={css.hint} style={{ color: lens.color }}>
                View all observations &rarr;
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
