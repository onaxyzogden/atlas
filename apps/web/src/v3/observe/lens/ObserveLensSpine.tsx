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

import type { UniversalDomain } from '@ogden/shared';
import ViewFocusToggle from '../../roles/ViewFocusToggle.js';
import type { ViewFocusMode } from '../../../store/uiStore.js';
import { useLensData } from './lensData/LensDataContext.js';
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
  /**
   * Operational Role Layer scope (additive). When present + non-empty, lenses
   * that touch one of the viewer's in-focus domains get a gold ring and out-of-
   * focus lenses mute slightly -- the all-domains overview keeps every lens (the
   * lighter dashboard treatment: ring, never collapse). Absent/empty ⇒ all
   * lenses render exactly as before.
   */
  scopedDomains?: ReadonlySet<UniversalDomain>;
  /** Render the My-focus / Full-view toggle as the leading spine control. */
  showFocusToggle?: boolean;
  focusMode?: ViewFocusMode;
  onFocusModeChange?: (mode: ViewFocusMode) => void;
}

export default function ObserveLensSpine({
  activeLens,
  onSelectLens,
  projectTitle,
  projectType,
  scopedDomains,
  showFocusToggle = false,
  focusMode,
  onFocusModeChange,
}: Props) {
  const { lenses: LENSES, freshness: FRESHNESS } = useLensData();
  const allActive = activeLens === 'all';
  // Scope engaged only with a non-empty domain set; otherwise every lens reads
  // as in-focus and the ring/mute rules below stay inert.
  const scoped = scopedDomains !== undefined && scopedDomains.size > 0;
  const lensInScope = (domains: readonly UniversalDomain[]) =>
    !scoped || domains.some((d) => scopedDomains.has(d));
  const inFocusLensCount = scoped
    ? LENSES.filter((lens) => lensInScope(lens.domains)).length
    : undefined;
  return (
    <div className={css.spineRow}>
      {/* Project identity tile -- static, sticky-pinned, NOT a tab. */}
      <div className={css.projectTile}>
        <span className={css.projectTileTitle}>{projectTitle}</span>
        <span className={css.projectTileTypes}>{projectType}</span>
      </div>
      {showFocusToggle && focusMode && onFocusModeChange && (
        <div className={css.focusToggleSlot}>
          <ViewFocusToggle
            focusMode={focusMode}
            onChange={onFocusModeChange}
            inFocusCount={inFocusLensCount}
            totalCount={scoped ? LENSES.length : undefined}
          />
        </div>
      )}
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
          const inScope = lensInScope(lens.domains);
          return (
            <button
              key={lens.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${css.tier} ${scoped && inScope ? css.tierInFocus : ''}`}
              data-active={isActive}
              data-scope={scoped ? (inScope ? 'in' : 'out') : undefined}
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
