import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import PlanHub from '../../features/plan/PlanHub.js';

// Lazy-load all 16 plan cards — mirrors DashboardRouter cases 1:1.
const PermanenceScalesCard   = lazy(() => import('../../features/plan/PermanenceScalesCard.js'));
const RunoffCalculatorCard   = lazy(() => import('../../features/plan/RunoffCalculatorCard.js'));
const SwaleDrainTool         = lazy(() => import('../../features/plan/SwaleDrainTool.js'));
const StorageInfraTool       = lazy(() => import('../../features/plan/StorageInfraTool.js'));
const ZoneLevelLayer         = lazy(() => import('../../features/plan/ZoneLevelLayer.js'));
const PathFrequencyEditor    = lazy(() => import('../../features/plan/PathFrequencyEditor.js'));
const PlantDatabaseCard      = lazy(() => import('../../features/plan/PlantDatabaseCard.js'));
const GuildBuilderCard       = lazy(() => import('../../features/plan/GuildBuilderCard.js'));
const CanopySimulatorCard    = lazy(() => import('../../features/plan/CanopySimulatorCard.js'));
const SoilFertilityDesignerCard = lazy(() => import('../../features/plan/SoilFertilityDesignerCard.js'));
const WasteVectorTool        = lazy(() => import('../../features/plan/WasteVectorTool.js'));
const TransectVerticalEditorCard = lazy(() => import('../../features/plan/TransectVerticalEditorCard.js'));
const PhasingMatrixCard      = lazy(() => import('../../features/plan/PhasingMatrixCard.js'));
const SeasonalTaskCard       = lazy(() => import('../../features/plan/SeasonalTaskCard.js'));
const LaborBudgetSummaryCard = lazy(() => import('../../features/plan/LaborBudgetSummaryCard.js'));
const HolmgrenChecklistCard  = lazy(() => import('../../features/plan/HolmgrenChecklistCard.js'));
const RegenerationMonitorCard = lazy(() => import('../../features/plan/RegenerationMonitorCard.js'));

const FALLBACK_PROJECT: LocalProject = {
  id: 'mtc',
  name: 'Moontrance Creek',
  description: null,
  status: 'active',
  projectType: null,
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: false,
  createdAt: '',
  updatedAt: '',
  parcelBoundaryGeojson: null,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
};

export default function V3PlanPage() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const projects = useProjectStore((s) => s.projects);
  const project: LocalProject = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? FALLBACK_PROJECT,
    [projects, id],
  );

  const setSection = useUIStore((s) => s.setActiveDashboardSection);
  const section = useUIStore((s) => s.activeDashboardSection);

  useEffect(() => {
    setSection('dashboard-plan-hub');
  }, [setSection]);

  const noop = () => {};

  if (section?.startsWith('plan-')) {
    const card = renderPlanCard(section, project, noop);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setSection('dashboard-plan-hub')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
            }}
          >
            ← Back to Plan Hub
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Suspense fallback={null}>{card}</Suspense>
        </div>
      </div>
    );
  }

  return <PlanHub project={project} onSwitchToMap={noop} />;
}

function renderPlanCard(
  section: string,
  project: LocalProject,
  onSwitchToMap: () => void,
) {
  switch (section) {
    case 'plan-permanence-scales':
      return <PermanenceScalesCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-runoff-calculator':
      return <RunoffCalculatorCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-swale-drain':
      return <SwaleDrainTool project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-storage-infra':
      return <StorageInfraTool project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-zone-level':
      return <ZoneLevelLayer project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-path-frequency':
      return <PathFrequencyEditor project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-plant-database':
      return <PlantDatabaseCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-guild-builder':
      return <GuildBuilderCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-canopy-simulator':
      return <CanopySimulatorCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-soil-fertility':
      return <SoilFertilityDesignerCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-waste-vectors':
      return <WasteVectorTool project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-transect-vertical':
    case 'plan-solar-overlay':
      return <TransectVerticalEditorCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-phasing-matrix':
      return <PhasingMatrixCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-seasonal-tasks':
      return <SeasonalTaskCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-labor-budget':
      return <LaborBudgetSummaryCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-holmgren-checklist':
      return <HolmgrenChecklistCard project={project} onSwitchToMap={onSwitchToMap} />;
    case 'plan-regeneration-monitor':
      return <RegenerationMonitorCard project={project} onSwitchToMap={onSwitchToMap} />;
    default:
      return null;
  }
}
