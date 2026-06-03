// ObserveLensSpine.tsx -- lens-tab spine for the Observe module-bar lens.
//
// Horizontal spine that sits ABOVE StageShell (which has no top slot),
// mirroring act/tier-shell/ActTierSpine: a sticky project identity tile + a
// scrollable tablist. Here the tabs are the observational lenses (plus a
// leading "All" tab) and selecting one filters the map / intelligence / strip.
// This replaces the rich horizontal DomainsView card strip as the lens
// selector; DomainsView stays defined-but-unused (no-deletion).

import { FRESHNESS, LENSES } from './mockData.js';
import css from './ObserveLensSpine.module.css';

interface Props {
  /** Active lens id, or 'all' for no filter. */
  activeLens: string;
  /** Select a lens (or 'all'). Re-selecting the active lens resets to 'all'. */
  onSelectLens: (id: string) => void;
  /** Project name shown in the leading identity tile. */
  projectTitle: string;
}

export default function ObserveLensSpine({
  activeLens,
  onSelectLens,
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
        {/* "All" tab -- clears the lens filter. */}
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
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
