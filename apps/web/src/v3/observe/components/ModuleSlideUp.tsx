/**
 * ModuleSlideUp — bottom-anchored sheet that hosts per-module Observe pages.
 *
 * Each module exports a `ModulePanel` ({ Dashboard, details }) per
 * `../modules/types.ts`. The slide-up renders Dashboard by default and
 * exposes `useDetailNav()` so any descendant can push/pop a detail key
 * without changing the URL. A back chip appears in the header when a
 * detail is active.
 *
 * Affordances modeled on DiagnoseCategoryDrawer:
 *   - ESC closes (or pops a detail if one is active)
 *   - backdrop click closes
 *   - close button autofocused on open
 *
 * The sheet root carries `.observe-port` so that the ported OLOS stylesheet
 * (observe-port.css) cascades to module page bodies without leaking globally.
 */

import {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type LazyExoticComponent,
} from 'react';
import { ChevronLeft } from 'lucide-react';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../types.js';
import type { DetailNavApi, ModulePanel } from '../modules/types.js';
import '../styles/observe-port.css';
import css from './ModuleSlideUp.module.css';

const MODULE_PANELS: Record<ObserveModule, LazyExoticComponent<() => JSX.Element>> = {
  'human-context':        lazy(() => import('../modules/HumanContextPanel.js').then(toModuleHost)),
  'macroclimate-hazards': lazy(() => import('../modules/MacroclimateHazardsPanel.js').then(toModuleHost)),
  topography:             lazy(() => import('../modules/TopographyPanel.js').then(toModuleHost)),
  'earth-water-ecology':  lazy(() => import('../modules/EarthWaterEcologyPanel.js').then(toModuleHost)),
  'sectors-zones':        lazy(() => import('../modules/SectorsZonesPanel.js').then(toModuleHost)),
  'swot-synthesis':       lazy(() => import('../modules/SwotSynthesisPanel.js').then(toModuleHost)),
};

// Each module file's default export is a ModulePanel object. lazy() expects a
// `{ default: Component }` module. We wrap the panel into a thin host that
// reads detail nav from context and renders Dashboard or details[current].
function toModuleHost(mod: { default: ModulePanel }): { default: () => JSX.Element } {
  const panel = mod.default;
  const Host = () => {
    const nav = useContext(DetailNavContext);
    const current = nav?.current ?? null;
    if (current && panel.details[current]) {
      const Detail = panel.details[current]!;
      return <Detail />;
    }
    const { Dashboard } = panel;
    return <Dashboard />;
  };
  return { default: Host };
}

const DetailNavContext = createContext<DetailNavApi | null>(null);

/** Used by module dashboards/details to push or pop the detail stack. */
export function useDetailNav(): DetailNavApi {
  const ctx = useContext(DetailNavContext);
  if (!ctx) {
    throw new Error('useDetailNav must be used inside ModuleSlideUp');
  }
  return ctx;
}

interface Props {
  module: ObserveModule | null;
  open: boolean;
  onClose: () => void;
}

export default function ModuleSlideUp({ module, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  // Reset detail stack whenever the active module changes or sheet closes.
  useEffect(() => {
    if (!open) setDetail(null);
  }, [open]);
  useEffect(() => {
    setDetail(null);
  }, [module]);

  const detailNav = useMemo<DetailNavApi>(
    () => ({
      current: detail,
      push: (key: string) => setDetail(key),
      pop: () => setDetail(null),
    }),
    [detail],
  );

  const handleEscape = useCallback(() => {
    if (detail) setDetail(null);
    else onClose();
  }, [detail, onClose]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleEscape]);

  if (!open || !module) return null;
  const Panel = MODULE_PANELS[module];
  const label = OBSERVE_MODULE_LABEL[module];

  return (
    <div className={css.scrim} role="presentation" onClick={onClose}>
      <aside
        className={`${css.sheet} observe-port`}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} module`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <div className={css.titleBlock}>
            {detail ? (
              <button
                type="button"
                className={css.back}
                onClick={() => setDetail(null)}
                aria-label={`Back to ${label} dashboard`}
              >
                <ChevronLeft size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ) : (
              <span className={css.eyebrow}>Observe · module</span>
            )}
            <h2 className={css.title}>{detail ? formatDetailLabel(detail) : label}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={css.close}
            onClick={onClose}
            aria-label="Close module"
          >
            ×
          </button>
        </header>
        <div className={css.body}>
          <DetailNavContext.Provider value={detailNav}>
            <Suspense fallback={<p className={css.loading}>Loading module…</p>}>
              <Panel />
            </Suspense>
          </DetailNavContext.Provider>
        </div>
      </aside>
    </div>
  );
}

function formatDetailLabel(key: string): string {
  return key
    .split(/[-_]/)
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : ''))
    .join(' ');
}
