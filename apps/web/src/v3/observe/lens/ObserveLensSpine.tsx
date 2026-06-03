// ObserveLensSpine.tsx -- minimal lens filter chips for the Observe module-bar.
//
// Horizontal spine that sits ABOVE StageShell (which has no top slot),
// mirroring act/tier-shell/ActTierSpine: a sticky project identity tile + a
// scrollable tablist. Each tab is a COMPACT filter chip (lens icon + freshness
// dot + label) -- selecting one filters the map / intelligence / strip; re-
// selecting the active chip resets to 'all'. The rich per-lens detail (meta,
// divergence, summary) and the slide-up trigger now live in the bottom
// ObserveLensDetailRail; this top bar is filter-only. DomainsView/LensBar stay
// defined-but-unused (no-deletion).

import { FRESHNESS, LENSES } from './mockData.js';
import css from './ObserveLensSpine.module.css';

interface Props {
  /** Active lens id, or 'all' for no filter. */
  activeLens: string;
  /** Select a lens (or 'all'). Re-selecting the active lens resets to 'all'. */
  onSelectLens: (id: string) => void;
  /** Project name shown in the leading identity tile. */
  projectTitle: string;
  /** Project site type(s), shown as the identity tile subtitle (e.g.
   *  "Regen Farm + Silvopasture"). */
  projectType: string;
}

export default function ObserveLensSpine({
  activeLens,
  onSelectLens,
  projectTitle,
  projectType,
}: Props) {
  const allActive = activeLens === 'all';
  return (
    <div className={css.spineRow}>
      {/* Project identity tile -- static, sticky-pinned, NOT a tab. */}
      <div className={css.projectTile}>
        <span className={css.projectTileTitle}>{projectTitle}</span>
        <span className={css.projectTileTypes}>{projectType}</span>
      </div>
      <div className={css.spine} role="tablist" aria-label="Observe lenses">
        {/* "All" chip -- clears the lens filter. */}
        <button
          type="button"
          role="tab"
          aria-selected={allActive}
          className={css.tier}
          data-active={allActive}
          onClick={() => onSelectLens('all')}
        >
          <span className={css.lensIcon} aria-hidden="true">
            &#8853;
          </span>
          <span className={css.tierTitle}>All lenses</span>
        </button>

        {LENSES.map((lens) => {
          const isActive = activeLens === lens.id;
          const fresh = FRESHNESS[lens.freshness];
          return (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={css.tier}
              data-active={isActive}
              onClick={() => onSelectLens(isActive ? 'all' : lens.id)}
            >
              <span
                className={css.lensIcon}
                style={{ color: lens.color }}
                aria-hidden="true"
              >
                {lens.icon}
              </span>
              <span className={css.tierTitle}>{lens.label}</span>
              {fresh.dot && (
                <span
                  className={css.tierDot}
                  style={{ background: fresh.color }}
                  title={fresh.label}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
