/**
 * PlanModuleSlideUp — Plan-stage wrapper over the shared ModuleSlideUp.
 *
 * Owns only the lazy plan-card imports + the renderCard switch keyed by
 * sectionId. All chrome (scrim, sheet, grouped tabs, focus trap) lives in
 * `_shared/moduleNav/ModuleSlideUp.tsx`.
 *
 * Plan cards are lazy-loaded to keep the initial bundle tight.
 */

import { lazy, useCallback } from 'react';
import { ModuleSlideUp } from '../_shared/moduleNav/index.js';
import type { LocalProject } from '../../store/projectStore.js';
import type { PlanModule } from './types.js';
import { MODULE_CARDS, PLAN_MODULE_FULL_LABEL } from './types.js';
import PlanViewBadge from './PlanViewBadge.js';

// All 16 plan cards lazy-loaded.
const PermanenceScalesCard    = lazy(() => import('../../features/plan/PermanenceScalesCard.js'));
// Dynamic Layering (Module 1) — additive ladder added per Permaculture Scholar
// verdict 2026-05-07.
const PermanenceLadderCard    = lazy(() => import('./cards/dynamic-layering/PermanenceLadderCard.js'));
const EnterprisesCard         = lazy(() => import('./cards/dynamic-layering/EnterprisesCard.js'));
const WaterCatchmentsCard     = lazy(() => import('./cards/water-management/WaterCatchmentsCard.js'));
const WaterStorageCard        = lazy(() => import('./cards/water-management/WaterStorageCard.js'));
const WaterNetworkCard        = lazy(() => import('./cards/water-management/WaterNetworkCard.js'));
const ZoneLevelLayer          = lazy(() => import('../../features/plan/ZoneLevelLayer.js'));
const PathFrequencyEditor     = lazy(() => import('../../features/plan/PathFrequencyEditor.js'));
const ZoneCirculationOverviewCard = lazy(() => import('./cards/zone-circulation/ZoneCirculationOverviewCard.js'));
const SectorOverlayCard           = lazy(() => import('./cards/zone-circulation/SectorOverlayCard.js'));
const MachineryInventoryCard      = lazy(() => import('./cards/machinery/MachineryInventoryCard.js'));
const MachineryAccessFitCard      = lazy(() => import('./cards/machinery/MachineryAccessFitCard.js'));
const MachineryHousingFuelCard    = lazy(() => import('./cards/machinery/MachineryHousingFuelCard.js'));
const LivestockLandFitCard        = lazy(() => import('../../features/livestock/LivestockLandFitCard.js'));
const MultiSpeciesPlannerCard     = lazy(() => import('../../features/livestock/MultiSpeciesPlannerCard.js'));
const PaddockCellDesignCard       = lazy(() => import('../../features/livestock/PaddockCellDesignCard.js'));
const FencingLayoutCard           = lazy(() => import('../../features/livestock/FencingLayoutCard.js'));
const AnimalTractorZonesCard      = lazy(() => import('../../features/livestock/AnimalTractorZonesCard.js'));
const LivestockWelfarePhasingCard = lazy(() => import('../../features/livestock/LivestockWelfarePhasingCard.js'));
const BiosecurityBufferCard       = lazy(() => import('../../features/livestock/BiosecurityBufferCard.js'));
const SlaughterThroughputCard = lazy(() => import('../../features/agribusiness/SlaughterThroughputCard.js'));
const ColdChainCoverageCard   = lazy(() => import('../../features/agribusiness/ColdChainCoverageCard.js'));
const MarketDistributionCard  = lazy(() => import('../../features/agribusiness/MarketDistributionCard.js'));
const PlantDatabaseSiteMatchCard = lazy(() => import('./cards/plant-systems/PlantDatabaseSiteMatchCard.js'));
const GuildSpatialBuilderCard    = lazy(() => import('./cards/plant-systems/GuildSpatialBuilderCard.js'));
const CanopySuccessionCard       = lazy(() => import('./cards/plant-systems/CanopySuccessionCard.js'));
const PlantEstablishmentSequenceCard = lazy(() => import('./cards/plant-systems/PlantEstablishmentSequenceCard.js'));
const EdgeConnectivityCard          = lazy(() => import('./cards/plant-systems/EdgeConnectivityCard.js'));
const SoilFertilityDesignerCard = lazy(() => import('../../features/plan/SoilFertilityDesignerCard.js'));
const WasteVectorTool         = lazy(() => import('../../features/plan/WasteVectorTool.js'));
const ClosedLoopGraphCard     = lazy(() => import('./cards/soil-fertility/ClosedLoopGraphCard.js'));
const SoilBaselineCard        = lazy(() => import('./cards/soil-fertility/SoilBaselineCard.js'));
const SoilResourcesCard       = lazy(() => import('./cards/soil-fertility/SoilResourcesCard.js'));
const SoilBuildingPlanCard    = lazy(() => import('./cards/soil-fertility/SoilBuildingPlanCard.js'));
const FertilityColocationCard = lazy(() => import('./cards/soil-fertility/FertilityColocationCard.js'));
const TransectVerticalEditorCard = lazy(() => import('../../features/plan/TransectVerticalEditorCard.js'));
const SectionAnnotationsCard  = lazy(() => import('./cards/cross-section/SectionAnnotationsCard.js'));
const PhasingMatrixCard       = lazy(() => import('../../features/plan/PhasingMatrixCard.js'));
const SeasonalTaskCard        = lazy(() => import('../../features/plan/SeasonalTaskCard.js'));
const LaborBudgetSummaryCard  = lazy(() => import('../../features/plan/LaborBudgetSummaryCard.js'));
const PhasingScaleMatrixCard  = lazy(() => import('./cards/phasing-budgeting/PhasingScaleMatrixCard.js'));
const CumulativeInvestmentCard = lazy(() => import('./cards/phasing-budgeting/CumulativeInvestmentCard.js'));
const EquipmentReplacementScheduleCard = lazy(() => import('./cards/phasing-budgeting/EquipmentReplacementScheduleCard.js'));
const HolmgrenChecklistCard   = lazy(() => import('../../features/plan/HolmgrenChecklistCard.js'));
const ThreeEthicsRollupCard   = lazy(() => import('./cards/principle-verification/ThreeEthicsRollupCard.js'));
const PrincipleCoverageMatrixCard = lazy(() => import('./cards/principle-verification/PrincipleCoverageMatrixCard.js'));

function renderPlanCard(
  sectionId: string,
  project: LocalProject,
  onSwitchModule?: (mod: PlanModule) => void,
) {
  const noop = () => {};
  switch (sectionId) {
    case 'plan-permanence-scales':   return <PermanenceScalesCard project={project} onSwitchToMap={noop} />;
    case 'plan-permanence-ladder':   return <PermanenceLadderCard project={project} onSwitchToMap={noop} onSwitchModule={onSwitchModule} />;
    case 'plan-enterprises':         return <EnterprisesCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-catchments':    return <WaterCatchmentsCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-storage':       return <WaterStorageCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-network':       return <WaterNetworkCard project={project} onSwitchToMap={noop} />;
    case 'plan-zone-level':          return <ZoneLevelLayer project={project} onSwitchToMap={noop} />;
    case 'plan-path-frequency':      return <PathFrequencyEditor project={project} onSwitchToMap={noop} />;
    case 'plan-zone-overview':       return <ZoneCirculationOverviewCard project={project} onSwitchToMap={noop} />;
    case 'plan-sector-overlay':      return <SectorOverlayCard project={project} onSwitchToMap={noop} />;
    case 'plan-machinery-inventory':        return <MachineryInventoryCard projectId={project.id} />;
    case 'plan-machinery-access-fit':       return <MachineryAccessFitCard projectId={project.id} />;
    case 'plan-machinery-housing-fuel':     return <MachineryHousingFuelCard projectId={project.id} />;
    case 'plan-livestock-land-fit':         return <LivestockLandFitCard projectId={project.id} />;
    case 'plan-livestock-species-mix':      return <MultiSpeciesPlannerCard projectId={project.id} />;
    case 'plan-livestock-paddock-cells':    return <PaddockCellDesignCard projectId={project.id} />;
    case 'plan-livestock-fencing':          return <FencingLayoutCard projectId={project.id} />;
    case 'plan-livestock-tractor-zones':    return <AnimalTractorZonesCard projectId={project.id} />;
    case 'plan-livestock-welfare-phasing':  return <LivestockWelfarePhasingCard projectId={project.id} />;
    case 'plan-livestock-buffers':          return <BiosecurityBufferCard projectId={project.id} />;
    case 'plan-product-slaughter-throughput': return <SlaughterThroughputCard projectId={project.id} />;
    case 'plan-product-coldchain-coverage':   return <ColdChainCoverageCard projectId={project.id} />;
    case 'plan-product-market-distribution':  return <MarketDistributionCard projectId={project.id} />;
    case 'plan-plant-database':      return <PlantDatabaseSiteMatchCard project={project} onSwitchToMap={noop} />;
    case 'plan-guild-builder':       return <GuildSpatialBuilderCard project={project} onSwitchToMap={noop} />;
    case 'plan-canopy-simulator':    return <CanopySuccessionCard project={project} onSwitchToMap={noop} />;
    case 'plan-plant-establishment-sequence': return <PlantEstablishmentSequenceCard project={project} onSwitchToMap={noop} />;
    case 'plan-edge-connectivity':   return <EdgeConnectivityCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-fertility':      return <SoilFertilityDesignerCard project={project} onSwitchToMap={noop} />;
    case 'plan-waste-vectors':       return <WasteVectorTool project={project} onSwitchToMap={noop} />;
    case 'plan-closed-loop-graph':   return <ClosedLoopGraphCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-baseline':       return <SoilBaselineCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-resources':      return <SoilResourcesCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-building-plan':  return <SoilBuildingPlanCard project={project} onSwitchToMap={noop} />;
    case 'plan-fertility-colocation': return <FertilityColocationCard project={project} onSwitchToMap={noop} />;
    case 'plan-transect-vertical':
    case 'plan-solar-overlay':       return <TransectVerticalEditorCard project={project} onSwitchToMap={noop} />;
    case 'plan-section-annotations': return <SectionAnnotationsCard project={project} onSwitchToMap={noop} />;
    case 'plan-phasing-matrix':      return <PhasingMatrixCard project={project} onSwitchToMap={noop} />;
    case 'plan-seasonal-tasks':      return <SeasonalTaskCard project={project} onSwitchToMap={noop} />;
    case 'plan-labor-budget':        return <LaborBudgetSummaryCard project={project} onSwitchToMap={noop} />;
    case 'plan-phasing-scale-matrix': return <PhasingScaleMatrixCard project={project} onSwitchToMap={noop} />;
    case 'plan-cumulative-investment': return <CumulativeInvestmentCard project={project} onSwitchToMap={noop} />;
    case 'plan-equipment-replacement': return <EquipmentReplacementScheduleCard projectId={project.id} />;
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
  const cards = module ? MODULE_CARDS[module] : [];
  const label = module ? PLAN_MODULE_FULL_LABEL[module] : '';

  const renderCard = useCallback(
    (sectionId: string) => renderPlanCard(sectionId, project, onSwitchModule),
    [project, onSwitchModule],
  );

  return (
    <ModuleSlideUp
      open={open && module !== null}
      onClose={onClose}
      eyebrow="Plan · module"
      label={label}
      cards={cards}
      renderCard={renderCard}
      ariaLabel={module ? `${label} — plan tools` : undefined}
      headerExtra={module ? <PlanViewBadge module={module} /> : null}
    />
  );
}
