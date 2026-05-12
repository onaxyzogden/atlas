/**
 * ModuleBar — shared bottom-tray tile row for Plan / Act / Observe stages.
 *
 * Click semantics (identical across all three stages):
 *   inactive tile           → onSelectModule(mod)
 *   active + slide-up shut  → onOpenSlideUp()
 *   active + slide-up open  → onCloseSlideUp()
 *
 * Tile chrome (rounded border, gold active state, label) is shared.
 * The indicator above the label is a render-prop: by default a passive
 * `.tileBar` placeholder is rendered; Observe overrides this to render
 * its task-status `.cardProgress` subsegments.
 */

import type { CSSProperties, ReactNode } from 'react';
import css from './ModuleBar.module.css';

export interface ModuleBarProps<TModule extends string> {
  /** Stable list of modules to render in tile order. */
  modules: ReadonlyArray<TModule>;
  /** Human label for each module shown under the indicator. */
  labelFor: (module: TModule) => string;
  /** Active module, or null when no module is selected. */
  activeModule: TModule | null;
  /** Whether the slide-up sheet is currently open. */
  slideUpOpen: boolean;
  /** URL-driven module selection — called on inactive-tile click. */
  onSelectModule: (module: TModule) => void;
  /** Open the slide-up — called when clicking the already-active tile. */
  onOpenSlideUp: () => void;
  /** Close the slide-up — called when clicking the already-active tile. */
  onCloseSlideUp: () => void;
  /** Aria-label for the toolbar wrapping the tiles. */
  toolbarLabel: string;
  /** Number of grid columns at default width (>900px). */
  columns: number;
  /** Optional narrow-width column count (≤900px). Defaults to `columns`. */
  narrowColumns?: number;
  /** Optional indicator slot — defaults to a passive `.tileBar` placeholder. */
  renderTileIndicator?: (module: TModule, isActive: boolean) => ReactNode;
  /** Optional onClick hook fired before the open/close/select callback. */
  onTileInteraction?: (
    module: TModule,
    event: 'tile_open' | 'tile_close' | 'tile_select',
  ) => void;
}

export default function ModuleBar<TModule extends string>({
  modules,
  labelFor,
  activeModule,
  slideUpOpen,
  onSelectModule,
  onOpenSlideUp,
  onCloseSlideUp,
  toolbarLabel,
  columns,
  narrowColumns,
  renderTileIndicator,
  onTileInteraction,
}: ModuleBarProps<TModule>) {
  const handleTileClick = (mod: TModule) => {
    if (mod === activeModule) {
      if (slideUpOpen) {
        onTileInteraction?.(mod, 'tile_close');
        onCloseSlideUp();
      } else {
        onTileInteraction?.(mod, 'tile_open');
        onOpenSlideUp();
      }
      return;
    }
    onTileInteraction?.(mod, 'tile_select');
    onSelectModule(mod);
  };

  // CSS custom properties drive the grid column count without per-stage CSS.
  const tilesStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    ['--module-bar-cols-narrow' as string]: narrowColumns ?? columns,
  } as CSSProperties;

  return (
    <div className={css.rail}>
      <div
        className={css.tiles}
        role="toolbar"
        aria-label={toolbarLabel}
        style={tilesStyle}
      >
        {modules.map((mod) => {
          const isActive = activeModule === mod;
          return (
            <button
              key={mod}
              type="button"
              aria-pressed={isActive}
              className={`${css.tile} ${isActive ? css.tileActive : ''}`}
              onClick={() => handleTileClick(mod)}
            >
              {renderTileIndicator ? (
                renderTileIndicator(mod, isActive)
              ) : (
                <div className={css.tileBar} aria-hidden="true" />
              )}
              <span className={css.tileLabel}>{labelFor(mod)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
