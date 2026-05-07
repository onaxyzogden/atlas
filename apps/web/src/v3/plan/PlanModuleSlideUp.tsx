/**
 * PlanModuleSlideUp — bottom sheet for Plan stage module detail.
 *
 * When a module is active, renders the corresponding plan card(s) inside a
 * slide-up sheet. Modules with multiple sub-cards (e.g. Water Management)
 * show a tab row at the top. Each plan card receives the LocalProject and
 * a no-op onSwitchToMap (the map is already visible in the background).
 *
 * Plan cards are lazy-loaded to keep the initial bundle tight.
 * ESC and backdrop-click close the sheet.
 */

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { PlanModule } from './types.js';
import { MODULE_CARDS, PLAN_MODULE_FULL_LABEL } from './types.js';
import css from './PlanModuleSlideUp.module.css';

// All 16 plan cards lazy-loaded.
const PermanenceScalesCard    = lazy(() => import('../../features/plan/PermanenceScalesCard.js'));
// Dynamic Layering (Module 1) — additive ladder added per Permaculture Scholar
// verdict 2026-05-07. Atlas's PermanenceScalesCard is preserved (it has the
// store-wired 9-rank rollup the Scholar said was orthodox); the new card adds
// the spatial/relational layer they said was missing — proportional bars +
// ordering-violation warnings keyed off Yeomans/Keyline prerequisites.
const PermanenceLadderCard    = lazy(() => import('./cards/dynamic-layering/PermanenceLadderCard.js'));
// Water Management (Module 2) — fresh build per Permaculture Scholar verdict
// 2026-05-07. Atlas's RunoffCalculatorCard / SwaleDrainTool / StorageInfraTool
// remain at apps/web/src/features/plan/ as legacy and are still wired into
// V3PlanPage + DashboardRouter; the iteration ADR tracks consolidation as
// a follow-up.
const WaterCatchmentsCard     = lazy(() => import('./cards/water-management/WaterCatchmentsCard.js'));
const WaterStorageCard        = lazy(() => import('./cards/water-management/WaterStorageCard.js'));
const WaterNetworkCard        = lazy(() => import('./cards/water-management/WaterNetworkCard.js'));
const ZoneLevelLayer          = lazy(() => import('../../features/plan/ZoneLevelLayer.js'));
const PathFrequencyEditor     = lazy(() => import('../../features/plan/PathFrequencyEditor.js'));
// Zone & Circulation (Module 3) — spatial overview added per Permaculture
// Scholar verdict 2026-05-07. Atlas's Z0–Z5 list editor + path frequency
// editor are KEPT (Scholar ruled the Z0–Z5 ladder permaculturally orthodox)
// but augmented with a spatial mini-map + Z1/Z2 intersection validation,
// because a list-only view is "entirely insufficient." Paddock rotation
// from OGDEN is intentionally excluded — it belongs in a future
// Subdivision/Livestock module per Yeomans Scale of Permanence.
const ZoneCirculationOverviewCard = lazy(() => import('./cards/zone-circulation/ZoneCirculationOverviewCard.js'));
// Zones (Module 3) — sector overlay card added per Permaculture Scholar
// follow-up 2026-05-07. Mollison ch.3 + OSU PDC pair zones (radial from the
// home centre) with sectors (radial from outside): wind, fire, view, noise.
// This card surfaces wind from the climate layer + downslope from the
// elevation layer, with editable fire/view/noise compass pickers.
const SectorOverlayCard           = lazy(() => import('./cards/zone-circulation/SectorOverlayCard.js'));
// Plant Systems (Module 4) — fresh build per Permaculture Scholar verdict
// 2026-05-07. Atlas's PlantDatabaseCard / GuildBuilderCard /
// CanopySimulatorCard remain at apps/web/src/features/plan/ as legacy and
// are still wired into V3PlanPage + DashboardRouter; the iteration ADR
// tracks consolidation as a follow-up.
const PlantDatabaseSiteMatchCard = lazy(() => import('./cards/plant-systems/PlantDatabaseSiteMatchCard.js'));
const GuildSpatialBuilderCard    = lazy(() => import('./cards/plant-systems/GuildSpatialBuilderCard.js'));
const CanopySuccessionCard       = lazy(() => import('./cards/plant-systems/CanopySuccessionCard.js'));
const SoilFertilityDesignerCard = lazy(() => import('../../features/plan/SoilFertilityDesignerCard.js'));
const WasteVectorTool         = lazy(() => import('../../features/plan/WasteVectorTool.js'));
// Soil Fertility (Module 5) — additive cards added per Permaculture Scholar
// verdict 2026-05-07. Atlas's SoilFertilityDesignerCard + WasteVectorTool kept
// as the entry tabs (Scholar said the closed-loop vector model is correct).
// What was missing: a baseline (jar test → texture triangle → limiting
// factors) and a graph visualisation with orphan-fertility detection
// (Holmgren P6 Produce No Waste enforcement).
const ClosedLoopGraphCard     = lazy(() => import('./cards/soil-fertility/ClosedLoopGraphCard.js'));
const SoilBaselineCard        = lazy(() => import('./cards/soil-fertility/SoilBaselineCard.js'));
const SoilResourcesCard       = lazy(() => import('./cards/soil-fertility/SoilResourcesCard.js'));
const TransectVerticalEditorCard = lazy(() => import('../../features/plan/TransectVerticalEditorCard.js'));
// Cross-section & Solar (Module 6) — additive section-annotations card added
// per Permaculture Scholar verdict 2026-05-07. Atlas's TransectVerticalEditorCard
// (vertical pins + solstice overlay) is preserved; the new card adds the four
// orthodox bracket overlays the Scholar called out as missing — microclimate,
// succession, slope, sector-response.
const SectionAnnotationsCard  = lazy(() => import('./cards/cross-section/SectionAnnotationsCard.js'));
const PhasingMatrixCard       = lazy(() => import('../../features/plan/PhasingMatrixCard.js'));
const SeasonalTaskCard        = lazy(() => import('../../features/plan/SeasonalTaskCard.js'));
const LaborBudgetSummaryCard  = lazy(() => import('../../features/plan/LaborBudgetSummaryCard.js'));
// Phasing & Budgeting (Module 7) — additive Scale-of-Permanence matrix added
// per Permaculture Scholar verdict 2026-05-07. Atlas's three legacy phasing
// cards remain orthodox; the new card pivots BuildPhase.tasks into a Yeomans
// Keyline (Earthworks/Water/Structures/Vegetation) × phase grid and surfaces
// sequencing-violation warnings (later layers populated before prerequisite
// earlier layers exist in the same phase).
const PhasingScaleMatrixCard  = lazy(() => import('./cards/phasing-budgeting/PhasingScaleMatrixCard.js'));
const CumulativeInvestmentCard = lazy(() => import('./cards/phasing-budgeting/CumulativeInvestmentCard.js'));
const HolmgrenChecklistCard   = lazy(() => import('../../features/plan/HolmgrenChecklistCard.js'));
// Principle Verification (Module 8) — three-Ethics rollup added per Permaculture
// Scholar verdict 2026-05-07. Atlas's HolmgrenChecklistCard remains the
// principle-by-principle reflection surface (orthodox per OSU PDC final
// portfolio); this additive card rolls those checks up to the umbrella
// 3 Ethics (Earth Care / People Care / Fair Share).
const ThreeEthicsRollupCard   = lazy(() => import('./cards/principle-verification/ThreeEthicsRollupCard.js'));
const PrincipleCoverageMatrixCard = lazy(() => import('./cards/principle-verification/PrincipleCoverageMatrixCard.js'));

function renderCard(
  sectionId: string,
  project: LocalProject,
  onSwitchModule?: (mod: PlanModule) => void,
) {
  const noop = () => {};
  switch (sectionId) {
    case 'plan-permanence-scales':   return <PermanenceScalesCard project={project} onSwitchToMap={noop} />;
    case 'plan-permanence-ladder':   return <PermanenceLadderCard project={project} onSwitchToMap={noop} onSwitchModule={onSwitchModule} />;
    case 'plan-water-catchments':    return <WaterCatchmentsCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-storage':       return <WaterStorageCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-network':       return <WaterNetworkCard project={project} onSwitchToMap={noop} />;
    case 'plan-zone-level':          return <ZoneLevelLayer project={project} onSwitchToMap={noop} />;
    case 'plan-path-frequency':      return <PathFrequencyEditor project={project} onSwitchToMap={noop} />;
    case 'plan-zone-overview':       return <ZoneCirculationOverviewCard project={project} onSwitchToMap={noop} />;
    case 'plan-sector-overlay':      return <SectorOverlayCard project={project} onSwitchToMap={noop} />;
    case 'plan-plant-database':      return <PlantDatabaseSiteMatchCard project={project} onSwitchToMap={noop} />;
    case 'plan-guild-builder':       return <GuildSpatialBuilderCard project={project} onSwitchToMap={noop} />;
    case 'plan-canopy-simulator':    return <CanopySuccessionCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-fertility':      return <SoilFertilityDesignerCard project={project} onSwitchToMap={noop} />;
    case 'plan-waste-vectors':       return <WasteVectorTool project={project} onSwitchToMap={noop} />;
    case 'plan-closed-loop-graph':   return <ClosedLoopGraphCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-baseline':       return <SoilBaselineCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-resources':      return <SoilResourcesCard project={project} onSwitchToMap={noop} />;
    case 'plan-transect-vertical':
    case 'plan-solar-overlay':       return <TransectVerticalEditorCard project={project} onSwitchToMap={noop} />;
    case 'plan-section-annotations': return <SectionAnnotationsCard project={project} onSwitchToMap={noop} />;
    case 'plan-phasing-matrix':      return <PhasingMatrixCard project={project} onSwitchToMap={noop} />;
    case 'plan-seasonal-tasks':      return <SeasonalTaskCard project={project} onSwitchToMap={noop} />;
    case 'plan-labor-budget':        return <LaborBudgetSummaryCard project={project} onSwitchToMap={noop} />;
    case 'plan-phasing-scale-matrix': return <PhasingScaleMatrixCard project={project} onSwitchToMap={noop} />;
    case 'plan-cumulative-investment': return <CumulativeInvestmentCard project={project} onSwitchToMap={noop} />;
    case 'plan-holmgren-checklist':  return <HolmgrenChecklistCard project={project} onSwitchToMap={noop} />;
    case 'plan-three-ethics-rollup': return <ThreeEthicsRollupCard project={project} onSwitchToMap={noop} />;
    case 'plan-principle-coverage-matrix': return <PrincipleCoverageMatrixCard project={project} onSwitchToMap={noop} />;
    default: return null;
  }
}

interface Props {
  module: PlanModule | null;
  open: boolean;
  onClose: () => void;
  project: LocalProject;
  /**
   * Optional deep-link callback. When provided, individual cards (e.g.
   * PermanenceLadderCard's ordering-violation warnings) can switch the
   * slide-up to a different module — the parent typically routes via
   * the URL and the slide-up reopens on the new module.
   */
  onSwitchModule?: (mod: PlanModule) => void;
}

export default function PlanModuleSlideUp({ module, open, onClose, project, onSwitchModule }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Active sub-card within the module; reset when module changes.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  useEffect(() => {
    if (module) {
      const cards = MODULE_CARDS[module];
      setActiveSectionId(cards[0]?.sectionId ?? null);
    }
  }, [module]);
  useEffect(() => {
    if (!open) return;
    const cards = module ? MODULE_CARDS[module] : [];
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

  const cards = MODULE_CARDS[module];
  const currentId = activeSectionId ?? cards[0]?.sectionId ?? null;
  const label = PLAN_MODULE_FULL_LABEL[module];
  const hasMultiple = cards.length > 1;

  return (
    <div className={css.scrim} role="presentation" onClick={onClose}>
      <aside
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} — plan tools`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.eyebrow}>Plan · module</span>
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
            {currentId ? renderCard(currentId, project, onSwitchModule) : null}
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
