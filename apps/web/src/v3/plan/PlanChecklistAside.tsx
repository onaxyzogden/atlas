/**
 * PlanChecklistAside — right-rail Permaculture-Scholar guidance for Plan.
 *
 * 9 module guidance cards grounded in permaculture design methodology.
 * Cards delegate to the shared `<GuidanceCard>`; this file owns the Plan
 * guidance copy and the per-module dot palette. Inactive cards select the
 * module; the active card toggles the slide-up. Active card auto-scrolls
 * into view; How bullets are individually checkable with strikethrough on
 * completion (persisted via planHowChecksStore).
 */

import { useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { usePlanHowChecksStore } from '../../store/planHowChecksStore.js';
import { useAutoScrollToActiveModule } from '../_shared/hooks/useAutoScrollToActiveModule.js';
import {
  GuidanceCard,
  type GuidanceCardData,
} from '../_shared/components/GuidanceCard.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL, type PlanModule } from './types.js';
import PlanProjectTypeCard from './PlanProjectTypeCard.js';
import { useModuleProjectTypeReferences } from './hooks/useModuleProjectTypeReferences.js';
import { PLAN_MODULE_DOT } from './data/planModulePalette.js';
import css from './PlanChecklistAside.module.css';

const EMPTY_CHECKS: readonly number[] = [];

const PLAN_MODULE_GUIDANCE: Record<PlanModule, GuidanceCardData> = {
  'dynamic-layering': {
    why: 'Yeomans\' nine ranks decide order: Climate → Landform → Water → Access → Structures → Subsystems → Soil → Vegetation → Fauna. Per Permaculture Scholar (2026-05-07): collapsing Access + Structures is a Keyline violation; visualising ordering and warning when prerequisites are skipped is what the module must do (Mollison ch.5; Holmgren P8 Integrate rather than segregate).',
    how: [
      'Open Permanence scales for the rank-by-rank rollup of element counts.',
      'Open Permanence ladder to see proportional bars + any ordering warnings.',
      'Resolve violations top-down: design the missing higher-rank layer before adding more elements below it.',
    ],
  },
  'water-management': {
    why: 'Water design is a directed graph: catchments shed → storage retains → swales spread → sinks absorb. Per Permaculture Scholar (2026-05-07): every node must declare an overflow target so excess flows along the topographic slope rather than disappearing off-site (Mollison, Designers\' Manual ch.7; Holmgren P2: Catch and store energy).',
    how: [
      'List catchments first — roofs, paved areas, pasture — with surface coefficients.',
      'Add storage and swale nodes; pick an overflow target for every one.',
      'Open Network & balance to see total yield, retained volume, and orphans.',
    ],
  },
  'zone-circulation': {
    why: 'Zones are a frequency-of-visit ladder (Z0 home → Z5 wilderness), not land-use categories. Per Permaculture Scholar (2026-05-07): a steward must be able to *see* whether daily / weekly paths actually intersect their high-maintenance Z1 / Z2 elements (Mollison, Designers\' Manual; Yeomans Scale of Permanence — subdivision and livestock come later).',
    how: [
      'Tag each drawn zone with its Z-level in the Zone level layer tab.',
      'Tag each drawn path with daily / weekly / occasional / rare in the Path frequency tab.',
      'Open Overview & validation to verify high-frequency paths reach Z1 / Z2.',
    ],
  },
  'structures-subsystems': {
    why: 'Structures (Yeomans rank 5) and their subsystems (rank 6: power, water, sanitation) are placed *after* climate, landform, water, and access are settled — locking dwellings before water lines and roads forces expensive retrofits (Yeomans, Water for Every Farm; Mollison, Designers\' Manual ch.13). Cabin, yurt, earthship, greenhouse, prayer space, and utility infrastructure all sit on this rank pair.',
    how: [
      'Confirm Water and Zone & Circulation are settled before placing dwellings.',
      'Drop a Structure point on the parcel; pick its type, phase, and rotation.',
      'Group utility subsystems (well, water tank, solar array, pump house, compost station) near the structures they feed.',
    ],
  },
  livestock: {
    why: 'Subdivision and livestock sit at rank 7 of Yeomans\' Scale of Permanence — fence lines and animal cells are designed *after* climate, landform, water, access, and structures are settled, because they consume the slowest-to-change layers (Mollison, Designers\' Manual ch.8; Yeomans, Water for Every Farm). Locking in cell shapes before water and access exist forces expensive re-fencing later.',
    how: [
      'Confirm water lines and access tracks exist on the design before drawing paddock cells.',
      'Size cells to the herd / flock\'s daily grazing demand and target rest period.',
      'Site shelters and water points so each cell has both within reasonable walking distance.',
    ],
  },
  'plant-systems': {
    why: 'Tree placement follows the patterns of water flow and access (Mollison, Designers\' Manual ch.10; OSU PDC, Tree Influence on Watershed). Pick species against site context, place guilds on the parcel where water and access already lead, then track the 30-year succession arc.',
    how: [
      'Use the site-match score to filter species against the project\'s hardiness band.',
      'Place each guild centroid on the parcel diagram in line with water flow and zones.',
      'Step through the succession scenarios (Year 1 / 5 / 10 / 20 / 30+) to check light by layer.',
    ],
  },
  'soil-fertility': {
    why: 'Per Permaculture Scholar (2026-05-07): soil fertility is the "digestive system" of the design and must be diagnosed before it is amended. OSU PDC mandates jar-test, percolation, and pH as the bare-minimum baseline; Holmgren P6 (Produce no waste) requires that every fertility unit have both a feedstock source and a destination.',
    how: [
      'Open Soil baseline first: enter jar-test %, percolation, and pH to surface limiting factors.',
      'Add fertility infrastructure (composters, hugelkultur beds, worm bins) on the designer tab.',
      'Wire waste vectors between zones, structures, crops, and fertility units.',
      'Open Closed-loop graph to verify no fertility unit is orphaned (no flows attached).',
    ],
  },
  'cross-section-solar': {
    why: 'The vertical transect reveals competition for light between layers and checks solar access for passive heating, solar panels, and photosynthesis (Mollison, Designer\'s Manual ch.4).',
    how: [
      'Draw a cross-section along the primary sun-facing slope.',
      'Enable the Solar Overlay to confirm winter sun angles are unobstructed.',
      'Adjust canopy heights in the Plant Systems module to resolve shading conflicts.',
    ],
  },
  'phasing-budgeting': {
    why: 'Design from patterns to details (Holmgren P7): phasing matches implementation scale to available labour, capital, and ecological readiness — avoiding overwhelm.',
    how: [
      'Sequence earthworks and water systems before planting phases.',
      'Assign seasonal task windows to match climate rhythms.',
      'Use the Labor & Budget rollup to stress-test each phase against capacity.',
    ],
  },
  'principle-verification': {
    why: 'Apply self-regulation and accept feedback (Holmgren P4): checking the design against all 12 Holmgren principles catches blind spots before implementation begins.',
    how: [
      'Work through the Holmgren checklist with the full design in front of you.',
      'Flag any principle scoring less than 3 for a design review.',
      'Document the rationale for each score as a project record.',
    ],
  },
};

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (module: PlanModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function PlanGuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectModule,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: PlanModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectModule: (module: PlanModule | null) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const checkedList = usePlanHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = usePlanHowChecksStore((s) => s.toggle);

  const refSummary = useModuleProjectTypeReferences(module, projectId);
  const showChip = refSummary.openGaps > 0;
  const chipTitle = showChip
    ? `${refSummary.openGaps} of ${refSummary.referencedBy} ticked project-type item${
        refSummary.referencedBy === 1 ? '' : 's'
      } reference ${PLAN_MODULE_LABEL[module]} but the expected how-checks or map artifacts here are still missing.`
    : '';

  return (
    <GuidanceCard
      moduleKey={module}
      label={PLAN_MODULE_LABEL[module]}
      dotColor={PLAN_MODULE_DOT[module]}
      active={active}
      slideUpOpen={slideUpOpen}
      guidance={PLAN_MODULE_GUIDANCE[module]}
      checkedList={checkedList}
      onToggle={(i) => projectId && toggle(projectId, module, i)}
      onSelect={() => onSelectModule(module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
      headerExtras={
        showChip ? (
          <span
            className={css.refChip}
            title={chipTitle}
            aria-label={chipTitle}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            ↗ {refSummary.openGaps} ref{refSummary.openGaps === 1 ? '' : 's'}
          </span>
        ) : null
      }
    />
  );
}

export default function PlanChecklistAside({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const asideRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  return (
    <div
      ref={asideRef}
      className={css.checklistBox}
      data-has-active={activeModule !== null ? 'true' : 'false'}
    >
      <PlanProjectTypeCard
        onSelectModule={onSelectModule}
        onOpenSlideUp={onOpenSlideUp}
      />
      {PLAN_MODULES.map((mod) => (
        <PlanGuidanceCard
          key={mod}
          module={mod}
          active={activeModule === mod}
          projectId={projectId}
          slideUpOpen={slideUpOpen}
          onSelectModule={onSelectModule}
          onOpenSlideUp={onOpenSlideUp}
          onCloseSlideUp={onCloseSlideUp}
        />
      ))}
    </div>
  );
}
