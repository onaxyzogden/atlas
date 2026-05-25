/**
 * PlanMapSidebar — the Plan Command Centre's left control rail. Mirrors
 * `ObserveMapSidebar`: brand + module-filter readout, real map-layer toggles
 * (Plan data, design elements, site boundary), the shared base-map switcher, a
 * collapse affordance, the live status line, and the forward call-to-action into
 * the Act stage.
 *
 * Only real controls live here — the Plan Command Centre map carries the Plan
 * data overlays + the Vision design elements, both scoped to the active module.
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
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  active: PlanModule | null;
  onClearModule: () => void;
  showData: boolean;
  onToggleData: (next: boolean) => void;
  showDesign: boolean;
  onToggleDesign: (next: boolean) => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  ready: boolean;
  onGoAct: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function PlanMapSidebar({
  active,
  onClearModule,
  showData,
  onToggleData,
  showDesign,
  onToggleDesign,
  showBoundary,
  onToggleBoundary,
  ready,
  onGoAct,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

  if (collapsed) {
    return (
      <aside className={`${css.sidebar} ${css.sidebarCollapsed}`} aria-label="Plan controls">
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
    <aside className={css.sidebar} aria-label="Plan controls">
      <div className={css.brand}>
        <p className={css.brandName}>Plan</p>
        <p className={css.brandBlurb}>
          Design the land and weigh the decisions across every Plan module.
        </p>
        <a
          className={css.brandLink}
          href="https://docs.ogden.ag/plan"
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
                style={{ background: PLAN_MODULE_DOT[active] }}
              />
              <span className={css.filterChipLabel}>
                {PLAN_MODULE_LABEL[active]}
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
          Plan data
        </label>
        <label className={css.layerRow}>
          <input
            type="checkbox"
            checked={showDesign}
            onChange={(e) => onToggleDesign(e.target.checked)}
          />
          Design elements
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
        <button type="button" className={css.primaryBtn} onClick={onGoAct}>
          {ready ? 'Go to Act' : 'Preview Act'}{' '}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <span className={css.statusLine}>
          <span className={css.statusDot} />
          {ready ? 'All modules verified' : 'Planning in progress'}
        </span>
        <button type="button" className={css.collapseBtn} onClick={onToggleCollapsed}>
          <ChevronLeft size={14} strokeWidth={2} /> Collapse
        </button>
      </div>
    </aside>
  );
}
