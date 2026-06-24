/**
 * CommandCentreMapSidebar — the stage-agnostic left control rail shared by every
 * Command Centre. Brand + module-filter readout, real map-layer toggles, the
 * shared base-map switcher, a collapse affordance, the live status line, and the
 * forward call-to-action into the next stage.
 *
 * Only real controls live here. The per-stage layer differences (Observe:
 * markers + boundary; Plan: data + design + boundary; Act: data + boundary) are
 * expressed as the injected `layers[]` config so the markup stays single-source.
 * Per-stage wrappers (ObserveMapSidebar / PlanMapSidebar / ActMapSidebar) inject
 * the aria label, brand, label/dot palettes, layer rows, and forward CTA copy.
 *
 * Generic over the stage's module-id union `M`.
 */

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  AVAILABLE_BASEMAP_OPTIONS,
  useBasemapStore,
} from '../../observe/components/measure/useMapToolStore.js';
import css from './CommandCentreShell.module.css';

/** One map-layer toggle row. `count` shows a trailing badge when defined. */
export interface CommandCentreSidebarLayer {
  key: string;
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  count?: number;
}

export interface CommandCentreMapSidebarProps<M extends string> {
  active: M | null;
  onClearModule: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  ready: boolean;
  /** Accessible label for the rail, e.g. "Act controls". */
  ariaLabel: string;
  brand: { name: string; blurb: string; href: string };
  moduleLabel: Record<M, string>;
  moduleDot: Record<M, string>;
  layers: CommandCentreSidebarLayer[];
  /** Next-stage name for the forward CTA, e.g. "Report". */
  nextStageLabel: string;
  /** Status text shown when the stage is not yet complete. */
  inProgressText: string;
  onGoNext: () => void;
}

export default function CommandCentreMapSidebar<M extends string>({
  active,
  onClearModule,
  collapsed,
  onToggleCollapsed,
  ready,
  ariaLabel,
  brand,
  moduleLabel,
  moduleDot,
  layers,
  nextStageLabel,
  inProgressText,
  onGoNext,
}: CommandCentreMapSidebarProps<M>) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

  if (collapsed) {
    return (
      <aside
        className={`${css.sidebar} ${css.sidebarCollapsed}`}
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className={css.expandBtn}
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
          title="Expand"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={css.sidebar} aria-label={ariaLabel}>
      <div className={css.brand}>
        <p className={css.brandName}>{brand.name}</p>
        <p className={css.brandBlurb}>{brand.blurb}</p>
        <a
          className={css.brandLink}
          href={brand.href}
          target="_blank"
          rel="noreferrer"
        >
          How it works <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>

      <section className={css.sideSection}>
        <p className={css.sideTitle}>Module filter</p>
        {active ? (
          <>
            <div className={css.filterChip}>
              <span
                className={css.filterChipDot}
                style={{ background: moduleDot[active] }}
              />
              <span className={css.filterChipLabel}>{moduleLabel[active]}</span>
              <button
                type="button"
                className={css.filterChipClose}
                onClick={onClearModule}
                aria-label="Clear module filter"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              className={css.clearFilterBtn}
              onClick={onClearModule}
            >
              Clear filter
            </button>
          </>
        ) : (
          <p className={css.filterEmpty}>
            Showing all modules. Pick a module tab to focus.
          </p>
        )}
      </section>

      <section className={css.sideSection}>
        <p className={css.sideTitle}>Layers</p>
        {layers.map((layer) => (
          <label key={layer.key} className={css.layerRow}>
            <input
              type="checkbox"
              checked={layer.checked}
              onChange={(e) => layer.onToggle(e.target.checked)}
            />
            {layer.label}
            {layer.count !== undefined && (
              <span className={css.layerCount}>{layer.count}</span>
            )}
          </label>
        ))}
      </section>

      <section className={css.sideSection}>
        <p className={css.sideTitle}>Base map</p>
        <div className={css.basemapGrid}>
          {AVAILABLE_BASEMAP_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${css.basemapBtn} ${basemap === opt.key ? css.basemapBtnActive : ''}`}
              aria-pressed={basemap === opt.key}
              onClick={() => setBasemap(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <div className={css.sideFooter}>
        <button type="button" className={css.primaryBtn} onClick={onGoNext}>
          {ready ? 'Go to' : 'Preview'} {nextStageLabel}{' '}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <span className={css.statusLine}>
          <span className={css.statusDot} />
          {ready ? 'All modules verified' : inProgressText}
        </span>
        <button
          type="button"
          className={css.collapseBtn}
          onClick={onToggleCollapsed}
        >
          <ChevronLeft size={14} strokeWidth={2} /> Collapse
        </button>
      </div>
    </aside>
  );
}
