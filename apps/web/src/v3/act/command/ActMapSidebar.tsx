/**
 * ActMapSidebar — the Act Command Centre's left control rail. Mirrors
 * `PlanMapSidebar`: brand + module-filter readout, real map-layer toggles, the
 * shared base-map switcher, a collapse affordance, the live status line, and the
 * forward call-to-action into the Report stage.
 *
 * Act has no design layer, so there are TWO layer toggles (Act execution events
 * + site boundary) rather than Plan's three — the Act Command Centre map carries
 * the Act execution overlays scoped to the active module.
 */

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  BASEMAP_OPTIONS,
  useBasemapStore,
} from '../../observe/components/measure/useMapToolStore.js';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  active: ActModule | null;
  onClearModule: () => void;
  showData: boolean;
  onToggleData: (next: boolean) => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  ready: boolean;
  onGoReport: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ActMapSidebar({
  active,
  onClearModule,
  showData,
  onToggleData,
  showBoundary,
  onToggleBoundary,
  ready,
  onGoReport,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

  if (collapsed) {
    return (
      <aside className={`${css.sidebar} ${css.sidebarCollapsed}`} aria-label="Act controls">
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
    <aside className={css.sidebar} aria-label="Act controls">
      <div className={css.brand}>
        <p className={css.brandName}>Act</p>
        <p className={css.brandBlurb}>
          Run the land and track execution across every Act module.
        </p>
        <a
          className={css.brandLink}
          href="https://docs.ogden.ag/act"
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
                style={{ background: ACT_MODULE_DOT[active] }}
              />
              <span className={css.filterChipLabel}>
                {ACT_MODULE_LABEL[active]}
              </span>
              <button
                type="button"
                className={css.filterChipClose}
                onClick={onClearModule}
                aria-label="Clear module filter"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
            <button type="button" className={css.clearFilterBtn} onClick={onClearModule}>
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
        <label className={css.layerRow}>
          <input
            type="checkbox"
            checked={showData}
            onChange={(e) => onToggleData(e.target.checked)}
          />
          Act execution
        </label>
        <label className={css.layerRow}>
          <input
            type="checkbox"
            checked={showBoundary}
            onChange={(e) => onToggleBoundary(e.target.checked)}
          />
          Site boundary
        </label>
      </section>

      <section className={css.sideSection}>
        <p className={css.sideTitle}>Base map</p>
        <div className={css.basemapGrid}>
          {BASEMAP_OPTIONS.map((opt) => (
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
        <button type="button" className={css.primaryBtn} onClick={onGoReport}>
          {ready ? 'Go to Report' : 'Preview Report'}{' '}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <span className={css.statusLine}>
          <span className={css.statusDot} />
          {ready ? 'All modules verified' : 'Execution in progress'}
        </span>
        <button type="button" className={css.collapseBtn} onClick={onToggleCollapsed}>
          <ChevronLeft size={14} strokeWidth={2} /> Collapse
        </button>
      </div>
    </aside>
  );
}
