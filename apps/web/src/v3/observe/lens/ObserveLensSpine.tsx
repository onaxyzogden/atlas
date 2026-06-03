// ObserveLensSpine.tsx -- lens-tab spine for the Observe module-bar lens.
//
// Horizontal spine that sits ABOVE StageShell (which has no top slot),
// mirroring act/tier-shell/ActTierSpine: a sticky project identity tile + a
// scrollable tablist. Here the tabs are the observational lenses (plus a
// leading "All" tab) and selecting one filters the map / intelligence / strip.
// This replaces the rich horizontal DomainsView card strip as the lens
// selector; DomainsView stays defined-but-unused (no-deletion).

import type { ObserveLensId } from '@ogden/shared';
import { DOMAIN_DETAIL, FRESHNESS, LENSES } from './mockData.js';
import { C } from './tokens.js';
import css from './ObserveLensSpine.module.css';

interface Props {
  /** Active lens id, or 'all' for no filter. */
  activeLens: string;
  /** Select a lens (or 'all'). Re-selecting the active lens resets to 'all'. */
  onSelectLens: (id: string) => void;
  /** Open the domain-detail slide-up for a lens (the "View all observations"
   *  affordance). Threaded to the dashboard's `setDetailLens`. */
  onOpenDetail: (lensId: ObserveLensId) => void;
  /** Project name shown in the leading identity tile. */
  projectTitle: string;
}

export default function ObserveLensSpine({
  activeLens,
  onSelectLens,
  onOpenDetail,
  projectTitle,
}: Props) {
  const allActive = activeLens === 'all';
  return (
    <div className={css.spineRow}>
      {/* Project identity tile -- static, sticky-pinned, NOT a tab. */}
      <div className={css.projectTile}>
        <span className={css.projectTileTitle}>{projectTitle}</span>
        <span className={css.projectTileTypes}>Observe &middot; Lens</span>
      </div>
      <div className={css.spine} role="tablist" aria-label="Observe lenses">
        {/* "All" tab -- clears the lens filter. No detail/summary affordance. */}
        <div className={css.tierWrap}>
          <button
            type="button"
            role="tab"
            aria-selected={allActive}
            className={css.tier}
            data-active={allActive}
            onClick={() => onSelectLens('all')}
          >
            <span className={css.tierTop}>
              <span className={css.lensIcon} aria-hidden="true">
                &#8853;
              </span>
            </span>
            <span className={css.tierTitle}>All lenses</span>
            <span className={css.tierMeta}>No filter</span>
          </button>
          {/* Invisible clone of the lens tabs' detail button: same class, text
              and width, so it wraps to the identical height at any viewport and
              this tab stays exactly as tall as the lens tabs (no real "View all
              observations" affordance on the All-lenses tab). */}
          <span
            className={css.tierDetail}
            aria-hidden="true"
            style={{
              visibility: 'hidden',
              border: '1px solid transparent',
              borderTop: 'none',
            }}
          >
            View all observations &rarr;
          </span>
        </div>

        {LENSES.map((lens) => {
          const isActive = activeLens === lens.id;
          const fresh = FRESHNESS[lens.freshness];
          const hasDetail = Boolean(DOMAIN_DETAIL[lens.id]);
          const summary =
            lens.summary && lens.summary.length > 70
              ? lens.summary.slice(0, 68) + '…'
              : lens.summary;
          return (
            <div key={lens.id} className={css.tierWrap}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={css.tier}
                data-active={isActive}
                // Square the bottom corners so the detail button below connects
                // to the tab (mirrors the old DomainsView card pairing).
                style={hasDetail ? { borderRadius: '8px 8px 0 0' } : undefined}
                onClick={() => onSelectLens(isActive ? 'all' : lens.id)}
              >
                <span className={css.tierTop}>
                  <span
                    className={css.lensIcon}
                    style={{ color: lens.color }}
                    aria-hidden="true"
                  >
                    {lens.icon}
                  </span>
                  {fresh.dot && (
                    <span
                      className={css.tierDot}
                      style={{ background: fresh.color }}
                      title={fresh.label}
                    />
                  )}
                </span>
                <span className={css.tierTitle}>{lens.label}</span>
                <span className={css.tierMeta}>
                  {lens.observations} obs
                  {lens.lastObserved ? ` · ${lens.lastObserved}` : ''}
                </span>
                {lens.divergence && (
                  <span className={css.tierDivergence} style={{ color: C.amber }}>
                    {'▲'} Divergence
                  </span>
                )}
                {summary && <span className={css.tierSummary}>{summary}</span>}
              </button>
              {hasDetail && (
                <button
                  type="button"
                  className={css.tierDetail}
                  style={{
                    background: lens.color + '0A',
                    border: `1px solid ${lens.color}30`,
                    borderTop: 'none',
                    color: lens.color,
                  }}
                  onClick={() => onOpenDetail(lens.id)}
                >
                  View all observations &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
