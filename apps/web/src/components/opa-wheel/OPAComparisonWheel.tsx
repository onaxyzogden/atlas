import { MaqasidComparisonWheel } from '@ogden/ui-components';
import { MemoryRouter } from 'react-router-dom';
import { Eye, Lightbulb, Hammer } from 'lucide-react';
import type { LocalProject } from '../../store/projectStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useSwotStore } from '../../store/swotStore.js';
import { useSoilSampleStore } from '../../store/soilSampleStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useHarvestLogStore } from '../../store/harvestLogStore.js';
import { useMaintenanceStore } from '../../store/maintenanceStore.js';
import {
  STAGE3_META,
  STAGE3_ORDER,
  type Stage3Key,
} from '../../features/navigation/taxonomy.js';
import { computeStageProgress } from './stageProgress.js';
import styles from './OPAComparisonWheel.module.css';

interface OPAComparisonWheelProps {
  project: LocalProject;
  levelColor?: string;
}

const STAGE_ICONS: Record<Stage3Key, typeof Eye> = {
  observe: Eye,
  plan: Lightbulb,
  act: Hammer,
};

/**
 * OPAComparisonWheel — the dashboard's Observe → Plan → Act radial.
 *
 * Renders @ogden/ui-components' MaqasidComparisonWheel populated from real
 * project state. Per-stage `current` percentages come from
 * `computeStageProgress` (sibling helper) which walks DASHBOARD_ITEMS and
 * checks each item against the small `itemHasData` predicate built below.
 *
 * The predicate intentionally only knows about a high-leverage subset of
 * items per stage — touching every store would be invasive and most stores
 * already correlate well with their stage. Items not in the predicate map
 * count as not-yet-populated, which surfaces them as the next "what's next"
 * pointer for that stage. New items added to the taxonomy with a `stage3`
 * tag are picked up automatically.
 *
 * Hover state is wired via the package's internal `useWheelHoverStore`
 * (re-exported at apps/web/src/store/wheelHoverStore.ts) — no extra prop
 * needed here.
 *
 * The wheel internally calls react-router-dom's useNavigate; the host app
 * uses @tanstack/react-router and has no react-router-dom Router context,
 * so we wrap it in a MemoryRouter to satisfy the hook without affecting
 * host navigation.
 */
export default function OPAComparisonWheel({
  project,
  levelColor = '#8b7355',
}: OPAComparisonWheelProps) {
  const setActiveSection = useUIStore((s) => s.setActiveDashboardSection);
  const setSidebarGrouping = useUIStore((s) => s.setSidebarGrouping);

  // Per-stage presence flags (high-leverage items only — see comment above).
  // Each store keeps a flat array filtered by `projectId`; a stage item is
  // "populated" when that array has at least one entry for this project.
  const swotEntries = useSwotStore((s) => s.swot);
  const soilSamples = useSoilSampleStore((s) => s.samples);
  const hazards = useExternalForcesStore((s) => s.hazards);
  const zones = useZoneStore((s) => s.zones);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paths = usePathStore((s) => s.paths);
  const phases = usePhaseStore((s) => s.phases);
  const harvestEntries = useHarvestLogStore((s) => s.entries);
  const maintenanceTasks = useMaintenanceStore((s) => s.tasks);

  const pid = project.id;
  const has = {
    'observe-hazards-log': hazards.some((h) => h.projectId === pid),
    'observe-soil-tests': soilSamples.some((s) => s.projectId === pid),
    'observe-swot-journal': swotEntries.some((s) => s.projectId === pid),
    'plan-zone-level': zones.some((z) => z.projectId === pid),
    'plan-plant-database': cropAreas.some((c) => c.projectId === pid),
    'plan-runoff-calculator': paths.some((p) => p.projectId === pid),
    'act-build-gantt': phases.some((p) => p.projectId === pid),
    'act-harvest-log': harvestEntries.some((e) => e.projectId === pid),
    'act-maintenance-schedule': maintenanceTasks.some((t) => t.projectId === pid),
  } as Record<string, boolean>;

  const itemHasData = (itemId: string) => has[itemId] ?? false;
  const progress = computeStageProgress(itemHasData);

  const segments = STAGE3_ORDER.map((id) => ({
    id,
    label: STAGE3_META[id].name,
    Icon: STAGE_ICONS[id],
    current: progress[id].current,
    tooltipLabel: 'Next',
  }));

  // The wheel reads `nextActions[segmentId][level]`; "site" mirrors the
  // single-level usage already in place before this change.
  const nextActions = Object.fromEntries(
    STAGE3_ORDER.map((id) => [id, { site: progress[id].nextActionLabel }]),
  );

  const handleSegmentSelect = (segmentId: string) => {
    // Make sure the dashboard sidebar is in stage3 mode so the hub is in
    // the user's line of sight, then jump to the matching hub item.
    setSidebarGrouping('stage3');
    setActiveSection(`dashboard-${segmentId}-hub`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.wheelWrapper}>
        <MemoryRouter>
          <MaqasidComparisonWheel
            centerLabel="WORKFLOW"
            levelColor={levelColor}
            segments={segments}
            nextActions={nextActions}
            showNextCard={true}
            showDiacritics={false}
            onSegmentSelect={handleSegmentSelect}
          />
        </MemoryRouter>
      </div>
    </div>
  );
}
