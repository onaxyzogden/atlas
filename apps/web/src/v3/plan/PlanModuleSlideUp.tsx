/**
 * PlanModuleSlideUp — Plan-stage wrapper over the shared ModuleSlideUp.
 *
 * Owns only the lazy plan-card imports + the renderCard switch keyed by
 * sectionId. All chrome (scrim, sheet, grouped tabs, focus trap) lives in
 * `_shared/moduleNav/ModuleSlideUp.tsx`.
 *
 * Plan cards are lazy-loaded to keep the initial bundle tight.
 */

import { Component, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ModuleSlideUp } from '../_shared/moduleNav/index.js';
import {
  getAllowOrphanOutputs,
  type LocalProject,
} from '../../store/projectStore.js';
import { useRelationshipsStore } from '../../store/relationshipsStore.js';
import { useAllPlacedEntities } from '../../lib/relationships/useAllPlacedEntities.js';
import {
  orphanOutputs,
  type PlacedEntity,
} from '@ogden/shared/relationships';
import type { PlanModule } from './types.js';
import { MODULE_CARDS, PLAN_MODULE_FULL_LABEL } from './types.js';
import PlanViewBadge from './PlanViewBadge.js';

// All 18 plan cards lazy-loaded.
const GoalTreeTab             = lazy(() => import('./cards/goal-compass/GoalTreeTab.js'));
const SiteProfileTab          = lazy(() => import('./cards/goal-compass/SiteProfileTab.js'));
const GeneratedPlanTab        = lazy(() => import('./cards/goal-compass/GeneratedPlanTab.js'));
const DevelopPlanTab          = lazy(() => import('./cards/goal-compass/DevelopPlanTab.js'));
const CriteriaForecastTab     = lazy(() => import('./cards/goal-compass/CriteriaForecastTab.js'));
const PermanenceScalesCard    = lazy(() => import('../../features/plan/PermanenceScalesCard.js'));
// Dynamic Layering (Module 1) — additive ladder added per Permaculture Scholar
// verdict 2026-05-07.
const PermanenceLadderCard    = lazy(() => import('./cards/dynamic-layering/PermanenceLadderCard.js'));
const EnterprisesCard         = lazy(() => import('./cards/dynamic-layering/EnterprisesCard.js'));
const WaterCatchmentsCard     = lazy(() => import('./cards/water-management/WaterCatchmentsCard.js'));
const WaterStorageCard        = lazy(() => import('./cards/water-management/WaterStorageCard.js'));
const WaterNetworkCard        = lazy(() => import('./cards/water-management/WaterNetworkCard.js'));
const WaterRouterCard         = lazy(() => import('./cards/water-management/WaterRouterCard.js'));
const ZoneLevelLayer          = lazy(() => import('../../features/plan/ZoneLevelLayer.js'));
const PathFrequencyEditor     = lazy(() => import('../../features/plan/PathFrequencyEditor.js'));
const ZoneCirculationOverviewCard = lazy(() => import('./cards/zone-circulation/ZoneCirculationOverviewCard.js'));
const SectorOverlayCard           = lazy(() => import('./cards/zone-circulation/SectorOverlayCard.js'));
const SocialNodesCard             = lazy(() => import('./cards/zone-circulation/SocialNodesCard.js'));
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
const RegenerationPlanCard        = lazy(() => import('../../features/livestock/RegenerationPlanCard.js'));
const SlaughterThroughputCard = lazy(() => import('../../features/agribusiness/SlaughterThroughputCard.js'));
const ColdChainCoverageCard   = lazy(() => import('../../features/agribusiness/ColdChainCoverageCard.js'));
const MarketDistributionCard  = lazy(() => import('../../features/agribusiness/MarketDistributionCard.js'));
const PlantDatabaseSiteMatchCard = lazy(() => import('./cards/plant-systems/PlantDatabaseSiteMatchCard.js'));
const GuildSpatialBuilderCard    = lazy(() => import('./cards/plant-systems/GuildSpatialBuilderCard.js'));
const CanopySuccessionCard       = lazy(() => import('./cards/plant-systems/CanopySuccessionCard.js'));
const PlantEstablishmentSequenceCard = lazy(() => import('./cards/plant-systems/PlantEstablishmentSequenceCard.js'));
const EdgeConnectivityCard          = lazy(() => import('./cards/plant-systems/EdgeConnectivityCard.js'));
const TemporalCoherenceCard         = lazy(() => import('./cards/plant-systems/TemporalCoherenceCard.js'));
const AnnualPlantingCalendarCard    = lazy(() => import('./cards/plant-systems/AnnualPlantingCalendarCard.js'));
const GuildIntegrityCard            = lazy(() => import('./cards/plant-systems/GuildIntegrityCard.js'));
const SuccessionPathCard            = lazy(() => import('./cards/plant-systems/SuccessionPathCard.js'));
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
const MaintenanceScheduleCard = lazy(() => import('./cards/phasing-budgeting/MaintenanceScheduleCard.js'));
const EquipmentReplacementScheduleCard = lazy(() => import('./cards/phasing-budgeting/EquipmentReplacementScheduleCard.js'));
const MaterialSubstitutionsCard = lazy(() => import('./cards/phasing-budgeting/MaterialSubstitutionsCard.js'));
const HolmgrenChecklistCard   = lazy(() => import('../../features/plan/HolmgrenChecklistCard.js'));
const ThreeEthicsRollupCard   = lazy(() => import('./cards/principle-verification/ThreeEthicsRollupCard.js'));
const PrincipleCoverageMatrixCard = lazy(() => import('./cards/principle-verification/PrincipleCoverageMatrixCard.js'));
const NeedsYieldsAuditCard       = lazy(() => import('./cards/principle-verification/NeedsYieldsAuditCard.js'));
const StructuresOverviewCard     = lazy(() => import('./cards/structures-subsystems/StructuresOverviewCard.js'));
const SubsystemsOverviewCard     = lazy(() => import('./cards/structures-subsystems/SubsystemsOverviewCard.js'));
const RegenerationMonitorCard    = lazy(() => import('../../features/plan/RegenerationMonitorCard.js'));
const HabitatAllocationCard      = lazy(() => import('../../features/plan/HabitatAllocationCard.js'));
const BiodiversityMonitorCard    = lazy(() => import('../../features/plan/BiodiversityMonitorCard.js'));

function renderPlanCard(
  sectionId: string,
  project: LocalProject,
  onSwitchModule?: (mod: PlanModule) => void,
  onClose?: () => void,
) {
  const noop = () => {};
  const closeSlideUp = onClose ?? noop;
  switch (sectionId) {
    case 'plan-goal-tree':           return <GoalTreeTab project={project} onSwitchToMap={noop} />;
    case 'plan-site-profile':        return <SiteProfileTab project={project} onSwitchToMap={noop} />;
    case 'plan-proposal':            return <GeneratedPlanTab project={project} onSwitchToMap={noop} />;
    case 'plan-develop-plan':        return <DevelopPlanTab project={project} onSwitchModule={onSwitchModule ?? noop} />;
    case 'plan-criteria-forecast':   return <CriteriaForecastTab project={project} onSwitchToMap={noop} />;
    case 'plan-permanence-scales':   return <PermanenceScalesCard project={project} onSwitchToMap={noop} />;
    case 'plan-permanence-ladder':   return <PermanenceLadderCard project={project} onSwitchToMap={noop} onSwitchModule={onSwitchModule} />;
    case 'plan-enterprises':         return <EnterprisesCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-catchments':    return <WaterCatchmentsCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-storage':       return <WaterStorageCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-network':       return <WaterNetworkCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-router':        return <WaterRouterCard project={project} onSwitchToMap={noop} />;
    case 'plan-zone-level':          return <ZoneLevelLayer project={project} onSwitchToMap={noop} />;
    case 'plan-path-frequency':      return <PathFrequencyEditor project={project} onSwitchToMap={noop} />;
    case 'plan-zone-overview':       return <ZoneCirculationOverviewCard project={project} onSwitchToMap={noop} />;
    case 'plan-sector-overlay':      return <SectorOverlayCard project={project} onSwitchToMap={noop} />;
    case 'plan-social-nodes':        return <SocialNodesCard project={project} onSwitchToMap={noop} />;
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
    case 'plan-livestock-regeneration':     return <RegenerationPlanCard projectId={project.id} />;
    case 'plan-product-slaughter-throughput': return <SlaughterThroughputCard projectId={project.id} />;
    case 'plan-product-coldchain-coverage':   return <ColdChainCoverageCard projectId={project.id} />;
    case 'plan-product-market-distribution':  return <MarketDistributionCard projectId={project.id} />;
    case 'plan-plant-database':      return <PlantDatabaseSiteMatchCard project={project} onSwitchToMap={noop} />;
    case 'plan-guild-builder':       return <GuildSpatialBuilderCard project={project} onSwitchToMap={noop} />;
    case 'plan-canopy-simulator':    return <CanopySuccessionCard project={project} onSwitchToMap={noop} />;
    case 'plan-plant-establishment-sequence': return <PlantEstablishmentSequenceCard project={project} onSwitchToMap={noop} />;
    case 'plan-edge-connectivity':   return <EdgeConnectivityCard project={project} onSwitchToMap={noop} />;
    case 'plan-temporal-coherence':  return <TemporalCoherenceCard project={project} onSwitchToMap={noop} />;
    case 'plan-planting-schedule':   return <AnnualPlantingCalendarCard project={project} onSwitchToMap={noop} />;
    case 'plan-guild-integrity':     return <GuildIntegrityCard project={project} onSwitchToMap={noop} />;
    case 'plan-succession-path':     return <SuccessionPathCard project={project} onSwitchToMap={noop} />;
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
    case 'plan-maintenance-schedule': return <MaintenanceScheduleCard project={project} onSwitchToMap={noop} />;
    case 'plan-equipment-replacement': return <EquipmentReplacementScheduleCard projectId={project.id} />;
    case 'plan-material-substitutions': return <MaterialSubstitutionsCard project={project} onSwitchToMap={noop} />;
    case 'plan-holmgren-checklist':  return <HolmgrenChecklistCard project={project} onSwitchToMap={noop} />;
    case 'plan-three-ethics-rollup': return <ThreeEthicsRollupCard project={project} onSwitchToMap={noop} />;
    case 'plan-principle-coverage-matrix': return <PrincipleCoverageMatrixCard project={project} onSwitchToMap={noop} />;
    case 'plan-needs-yields':        return (
      <OrphanProbeBoundary>
        <NeedsYieldsAuditCard project={project} onSwitchToMap={closeSlideUp} />
      </OrphanProbeBoundary>
    );
    case 'plan-structures-overview': return <StructuresOverviewCard projectId={project.id} />;
    case 'plan-subsystems-overview': return <SubsystemsOverviewCard projectId={project.id} />;
    case 'plan-regeneration-monitor': return <RegenerationMonitorCard project={project} onSwitchToMap={noop} />;
    case 'plan-habitat-allocation': return <HabitatAllocationCard project={project} onSwitchToMap={noop} />;
    case 'plan-biodiversity-monitor': return <BiodiversityMonitorCard project={project} onSwitchToMap={noop} />;
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
  /** Rendered at the top of the sheet (above the module header) — the in-sheet ModuleBar. */
  topBar?: ReactNode;
}

export default function PlanModuleSlideUp({ module, open, onClose, project, onSwitchModule, topBar }: Props) {
  const cards = module ? MODULE_CARDS[module] : [];
  const label = module ? PLAN_MODULE_FULL_LABEL[module] : '';

  // Rec #1 closeout (2026-05-13): confirm-on-close intercept for the
  // Needs & Yields audit. Only fires when the principle-verification
  // module is the active surface, the project has not opted out via
  // allowOrphanOutputs, and at least one declared output is unrouted.
  // Hooks are isolated in <OrphanCountProbe/> so the unrelated /plan
  // load path doesn't pay the cost (or risk a crash) on every render.
  const allowOrphans = getAllowOrphanOutputs(project);
  const [orphanCount, setOrphanCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClose = useCallback(() => {
    if (orphanCount > 0) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [orphanCount, onClose]);
  const closeAnyway = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  const renderCard = useCallback(
    (sectionId: string) => renderPlanCard(sectionId, project, onSwitchModule, handleClose),
    [project, onSwitchModule, handleClose],
  );

  const shouldProbe = open && module === 'principle-verification' && !allowOrphans;
  return (
    <>
      {shouldProbe ? (
        <OrphanProbeBoundary>
          <OrphanCountProbe projectId={project.id} onChange={setOrphanCount} />
        </OrphanProbeBoundary>
      ) : null}
      <ModuleSlideUp
        open={open && module !== null}
        onClose={handleClose}
        eyebrow="Plan · module"
        label={label}
        cards={cards}
        renderCard={renderCard}
        ariaLabel={module ? `${label} — plan tools` : undefined}
        headerExtra={module ? <PlanViewBadge module={module} /> : null}
        topBar={topBar}
      />
      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unresolved orphan outputs"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 380,
              padding: 18,
              borderRadius: 10,
              background: '#1a1714',
              border: '1px solid rgba(212,182,99,0.45)',
              color: 'rgba(232,220,200,0.95)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'rgba(245,225,170,0.95)',
              }}
            >
              {orphanCount} unrouted output{orphanCount === 1 ? '' : 's'}
            </h2>
            <p style={{ margin: '10px 0 18px', fontSize: 12, lineHeight: 1.5 }}>
              The Needs &amp; Yields audit shows resources still going to
              waste. Close this panel anyway, or stay and route them
              through the audit card?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  padding: '7px 14px',
                  border: '1px solid rgba(212,182,99,0.6)',
                  borderRadius: 999,
                  background: 'rgba(212,182,99,0.18)',
                  color: 'rgba(245,225,170,0.95)',
                  font: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Stay in audit
              </button>
              <button
                type="button"
                onClick={closeAnyway}
                style={{
                  padding: '7px 14px',
                  border: '1px solid rgba(232,220,200,0.25)',
                  borderRadius: 999,
                  background: 'transparent',
                  color: 'rgba(232,220,200,0.85)',
                  font: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Close anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// Probe child: hooks live here so they only run when the Needs & Yields
// surface is actually open (and the project hasn't opted out of the
// orphan-output gate). Keeps the unrelated /plan load path free of the
// useAllPlacedEntities / orphanOutputs cost — and avoids tripping a
// crash for projects whose entity stores are not fully hydrated.
function OrphanCountProbe({
  projectId,
  onChange,
}: {
  projectId: string;
  onChange: (n: number) => void;
}) {
  const placed = useAllPlacedEntities();
  // Subscribe to the dict, not a derived `?? []`, so the selector
  // doesn't return a fresh array reference every render. Returning a
  // new `[]` each call trips React's useSyncExternalStore stability
  // check and infinite-loops the probe.
  const edgesByProject = useRelationshipsStore((s) => s.edgesByProject);
  const edges = useMemo(
    () => edgesByProject[projectId] ?? [],
    [edgesByProject, projectId],
  );
  const count = useMemo(() => {
    try {
      const safePlaced = Array.isArray(placed) ? placed : [];
      const safeEdges = Array.isArray(edges) ? edges : [];
      const entities: PlacedEntity[] = safePlaced.map((p) => ({ id: p.id, type: p.type }));
      const result = orphanOutputs(entities, safeEdges);
      return Array.isArray(result) ? result.length : 0;
    } catch {
      return 0;
    }
  }, [placed, edges]);
  useEffect(() => { onChange(count); }, [count, onChange]);
  useEffect(() => () => onChange(0), [onChange]);
  return null;
}

// Local boundary so an unhydrated entity store (e.g. MTC fallback project
// without paddock/structure data) can't take the whole canvas down with
// it. The orphan-output gate quietly degrades to "0 unrouted" — the
// audit card itself still surfaces accurate counts when its own data is
// available.
class OrphanProbeBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; msg: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false, msg: '' };
  }
  static getDerivedStateFromError(error: Error): { failed: boolean; msg: string } {
    return { failed: true, msg: error.message };
  }
  override componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.warn('[OrphanProbeBoundary] swallowed:', error.message, info.componentStack?.slice(0, 600));
    try {
      const log = JSON.parse(sessionStorage.getItem('__opbLog') || '[]');
      log.push({ msg: error.message, stack: (error.stack || '').slice(0, 2500) });
      sessionStorage.setItem('__opbLog', JSON.stringify(log.slice(-5)));
    } catch {}
  }
  override render() {
    if (this.state.failed) {
      return (
        <div
          data-orphan-probe-error
          style={{ padding: 12, fontSize: 11, color: 'rgba(232,180,150,0.85)' }}
        >
          Needs &amp; Yields audit failed to load: {this.state.msg}
        </div>
      );
    }
    return this.props.children;
  }
}
