/**
 * ObserveMapSidebar — the Command Centre's left control rail. Mirrors the map
 * dashboard idiom: brand + module-filter readout, real map-layer toggles
 * (boundary, observation markers), a base-map switcher backed by the shared
 * basemap store, a collapse affordance, the live status line, and the slim
 * Plan-readiness call-to-action re-homed from the old banner.
 *
 * Only real controls live here — there is no fabricated thematic-layer list;
 * the read-only Command Centre map carries exactly two app overlays.
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
} from '../observe/components/measure/useMapToolStore.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import css from './ObserveCommandCentrePage.module.css';

interface Props {
  active: ObserveModule | null;
  onClearModule: () => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  showMarkers: boolean;
  onToggleMarkers: (next: boolean) => void;
  markerCount: number;
  ready: boolean;
  onGoPlan: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ObserveMapSidebar({
  active,
  onClearModule,
  showBoundary,
  onToggleBoundary,
  showMarkers,
  onToggleMarkers,
  markerCount,
  ready,
  onGoPlan,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const basemap = useBasemapStore((s) => s.basemap);
  const setBasemap = useBasemapStore((s) => s.setBasemap);

  if (collapsed) {
    return (
      <aside className={`${css.sidebar} ${css.sidebarCollapsed}`} aria-label="Observe controls">
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
    <aside className={css.sidebar} aria-label="Observe controls">
      <div className={css.brand}>
        <p className={css.brandName}>Observe</p>
        <p className={css.brandBlurb}>
          Capture and update land intelligence across the site.
        </p>
        <a
          className={css.brandLink}
          href="https://docs.ogden.ag/observe"
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
                style={{ background: OBSERVE_MODULE_DOT[active] }}
              />
              <span className={css.filterChipLabel}>
                {OBSERVE_MODULE_LABEL[active]}
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
            checked={showMarkers}
            onChange={(e) => onToggleMarkers(e.target.checked)}
          />
          Observation markers
          <span className={css.layerCount}>{markerCount}</span>
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
        <button type="button" className={css.primaryBtn} onClick={onGoPlan}>
          {ready ? 'Go to Plan' : 'Preview Plan'}{' '}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <span className={css.statusLine}>
          <span className={css.statusDot} />
          {ready ? 'All modules verified' : 'Observation in progress'}
        </span>
        <button type="button" className={css.collapseBtn} onClick={onToggleCollapsed}>
          <ChevronLeft size={14} strokeWidth={2} /> Collapse
        </button>
      </div>
    </aside>
  );
}
