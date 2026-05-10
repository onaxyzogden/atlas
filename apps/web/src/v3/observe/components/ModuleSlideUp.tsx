/**
 * ModuleSlideUp — bottom-anchored sheet that hosts per-module Observe pages.
 *
 * Mirrors the Plan/Act slide-up template: a tabs row across the top exposes
 * each page (Dashboard + each Detail) as an independent peer card. There is
 * no Dashboard-as-portal nesting and no back chip — sub-tools sit
 * side-by-side. Single-card modules (Built Environment) hide the tabs row.
 *
 * Pages are lazy-loaded individually keyed by sectionId from
 * `OBSERVE_MODULE_CARDS` (in `../types.ts`).
 *
 * The sheet root retains `observe-port` so that the ported OLOS stylesheet
 * (observe-port.css) cascades to module page bodies without leaking globally.
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  OBSERVE_MODULE_CARDS,
  OBSERVE_MODULE_FULL_LABEL,
  type ObserveModule,
} from '../types.js';
import '../styles/observe-port.css';
import css from './ModuleSlideUp.module.css';

// ── Page lazy imports — Dashboard + each Detail per module ───────────────────
// Human Context
const HumanContextDashboard      = lazy(() => import('../modules/human-context/HumanContextDashboard.js'));
const StewardSurveyDetail        = lazy(() => import('../modules/human-context/StewardSurveyDetail.js'));
const IndigenousRegionalContextDetail = lazy(() => import('../modules/human-context/IndigenousRegionalContextDetail.js'));
const VisionDetail               = lazy(() => import('../modules/human-context/VisionDetail.js'));
// Built Environment
const BuiltEnvironmentDashboard  = lazy(() => import('../modules/built-environment/BuiltEnvironmentDashboard.js'));
// Macroclimate & Hazards
const MacroclimateDashboard      = lazy(() => import('../modules/macroclimate-hazards/MacroclimateDashboard.js'));
const SolarClimateDetail         = lazy(() => import('../modules/macroclimate-hazards/SolarClimateDetail.js'));
const HazardsLogDetail           = lazy(() => import('../modules/macroclimate-hazards/HazardsLogDetail.js'));
// Topography
const TopographyDashboard        = lazy(() => import('../modules/topography/TopographyDashboard.js'));
const TerrainDetail              = lazy(() => import('../modules/topography/TerrainDetail.js'));
const CartographicDetail         = lazy(() => import('../modules/topography/CartographicDetail.js'));
const CrossSectionDetail         = lazy(() => import('../modules/topography/CrossSectionDetail.js'));
// Earth, Water & Ecology
const EarthWaterEcologyDashboard = lazy(() => import('../modules/earth-water-ecology/EarthWaterEcologyDashboard.js'));
const HydrologyDetail            = lazy(() => import('../modules/earth-water-ecology/HydrologyDetail.js'));
const EcologicalDetail           = lazy(() => import('../modules/earth-water-ecology/EcologicalDetail.js'));
const JarPercRoofDetail          = lazy(() => import('../modules/earth-water-ecology/JarPercRoofDetail.js'));
// Sectors & Zones
const SectorsDashboard           = lazy(() => import('../modules/sectors-zones/SectorsDashboard.js'));
const SectorCompassDetail        = lazy(() => import('../modules/sectors-zones/SectorCompassDetail.js'));
// SWOT Synthesis
const SwotDashboard              = lazy(() => import('../modules/swot-synthesis/SwotDashboard.js'));
const SwotJournal                = lazy(() => import('../modules/swot-synthesis/SwotJournal.js'));
const SwotDiagnosisReport        = lazy(() => import('../modules/swot-synthesis/SwotDiagnosisReport.js'));

function renderCard(sectionId: string): JSX.Element | null {
  switch (sectionId) {
    // Human Context
    case 'observe-human-context-dashboard':            return <HumanContextDashboard />;
    case 'observe-human-context-steward-survey':       return <StewardSurveyDetail />;
    case 'observe-human-context-indigenous-regional':  return <IndigenousRegionalContextDetail />;
    case 'observe-human-context-vision':               return <VisionDetail />;
    // Built Environment
    case 'observe-built-environment-dashboard':        return <BuiltEnvironmentDashboard />;
    // Macroclimate & Hazards
    case 'observe-macroclimate-hazards-dashboard':     return <MacroclimateDashboard />;
    case 'observe-macroclimate-hazards-solar-climate': return <SolarClimateDetail />;
    case 'observe-macroclimate-hazards-log':           return <HazardsLogDetail />;
    // Topography
    case 'observe-topography-dashboard':               return <TopographyDashboard />;
    case 'observe-topography-terrain':                 return <TerrainDetail />;
    case 'observe-topography-cartographic':            return <CartographicDetail />;
    case 'observe-topography-cross-section':           return <CrossSectionDetail />;
    // Earth, Water & Ecology
    case 'observe-earth-water-ecology-dashboard':      return <EarthWaterEcologyDashboard />;
    case 'observe-earth-water-ecology-hydrology':      return <HydrologyDetail />;
    case 'observe-earth-water-ecology-ecological':     return <EcologicalDetail />;
    case 'observe-earth-water-ecology-jar-perc-roof':  return <JarPercRoofDetail />;
    // Sectors & Zones (Cartographic reused from topography/)
    case 'observe-sectors-zones-dashboard':            return <SectorsDashboard />;
    case 'observe-sectors-zones-sector-compass':       return <SectorCompassDetail />;
    case 'observe-sectors-zones-cartographic':         return <CartographicDetail />;
    // SWOT Synthesis
    case 'observe-swot-synthesis-dashboard':           return <SwotDashboard />;
    case 'observe-swot-synthesis-journal':             return <SwotJournal />;
    case 'observe-swot-synthesis-diagnosis-report':    return <SwotDiagnosisReport />;
    default: return null;
  }
}

interface Props {
  module: ObserveModule | null;
  open: boolean;
  onClose: () => void;
}

export default function ModuleSlideUp({ module, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  useEffect(() => {
    if (module) {
      const cards = OBSERVE_MODULE_CARDS[module];
      setActiveSectionId(cards[0]?.sectionId ?? null);
    }
  }, [module]);
  useEffect(() => {
    if (!open) return;
    const cards = module ? OBSERVE_MODULE_CARDS[module] : [];
    setActiveSectionId(cards[0]?.sectionId ?? null);
  }, [open, module]);

  const handleEscape = useCallback(() => {
    onClose();
  }, [onClose]);

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

  const cards = OBSERVE_MODULE_CARDS[module];
  const currentId = activeSectionId ?? cards[0]?.sectionId ?? null;
  const label = OBSERVE_MODULE_FULL_LABEL[module];
  const hasMultiple = cards.length > 1;

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
            <span className={css.eyebrow}>Observe · module</span>
            <h2 className={css.title}>{label}</h2>
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

        {hasMultiple && (
          <nav className={css.tabs} aria-label="Module sub-tools">
            {cards.map(({ label: tabLabel, sectionId }) => (
              <button
                key={sectionId}
                type="button"
                className={`${css.tab} ${sectionId === currentId ? css.tabActive : ''}`}
                onClick={() => setActiveSectionId(sectionId)}
              >
                {tabLabel}
              </button>
            ))}
          </nav>
        )}

        <div className={css.body}>
          <Suspense fallback={<p className={css.loading}>Loading…</p>}>
            {currentId ? renderCard(currentId) : null}
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
