/**
 * PlanChecklistAside — right-rail Permaculture-Scholar guidance for Plan.
 *
 * 9 module guidance cards grounded in permaculture design methodology.
 * Cards delegate to the shared `<GuidanceCard>`; this file owns the Plan
 * guidance copy and the per-module dot palette. Inactive cards select the
 * module; the active card toggles the slide-up. Active card auto-scrolls
 * into view; How bullets are individually checkable with strikethrough on
 * completion (persisted via planHowChecksStore).
 *
 * 2026-05-24 — Stage Compass focus (mirrors Observe / Goal 2): the rail follows
 * the compass's single-objective focus. It renders ONLY the active objective's
 * card(s); with no objective selected, a quiet prompt links back to the Plan
 * Compass. The context cards (PlanProjectTypeCard, PlacedFeaturesCard) are
 * intentionally omitted in focus mode. All card-rendering code is preserved
 * (gated on the active module), not removed.
 */

import { useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { usePlanHowChecksStore } from '../../store/planHowChecksStore.js';
import { useObjectiveSummaryStore } from '../../store/objectiveSummaryStore.js';
import { useAutoScrollToActiveModule } from '../_shared/hooks/useAutoScrollToActiveModule.js';
import {
  GuidanceCard,
  type GuidanceCardData,
} from '../_shared/components/GuidanceCard.js';
import { progressFromChecks } from '../_shared/objectiveWorkspace/objectiveStatus.js';
import {
  BE_CATEGORY_GUIDANCE,
  BE_CATEGORY_LABEL,
  BE_TOOL_GROUPS,
} from '../_shared/builtEnvironmentTools.js';
import type { BuiltEnvironmentCategory } from '@ogden/shared';
import { PLAN_MODULES, PLAN_MODULE_LABEL, type PlanModule } from './types.js';
import { BE_CATEGORY_TO_PLAN_MODULE } from './planSectionMap.js';
// 2026-05-24 — Stage Compass focus: PlanProjectTypeCard + PlacedFeaturesCard
// context cards are intentionally not rendered in single-objective focus mode
// (mirrors Goal 2's strict Observe view). The components are preserved; this
// consumer simply no longer mounts them.
import { useModuleProjectTypeReferences } from './hooks/useModuleProjectTypeReferences.js';
import { PLAN_MODULE_DOT } from './data/planModulePalette.js';
import css from './PlanChecklistAside.module.css';

const EMPTY_CHECKS: readonly number[] = [];

export const PLAN_MODULE_GUIDANCE: Record<PlanModule, GuidanceCardData> = {
  'goal-compass': {
    why: 'Goal Compass lets the steward declare measurable success criteria and have a deterministic sequencing engine propose a phased, costed, labor-budgeted plan against a curated permaculture intervention catalog (Mollison, Yeomans, Holmgren P1: Observe & interact).',
    how: [
      'Your goal tree and site profile come from Stage 0 (True North) — revisit it there to refine them.',
      'Click Generate to materialise BuildPhase + PhaseTask rows into the shared phase store.',
      'Open Criteria forecast to see projected values at Year 1 / 3 / 5 / 7 / 10 / 20.',
    ],
  },
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
  machinery: {
    why: 'Machinery and access tracks (Yeomans rank 4 — Access) precede structures and livestock because tractor turning radii, harvester widths, and trailer reach dictate where roads, gates, and cells can sit (Yeomans, Water for Every Farm; Mollison, Designers\' Manual ch.5).',
    how: [
      'Inventory the machinery the project will actually run — sizes and turning radii.',
      'Lay out access tracks and gates wide enough for the largest expected vehicle.',
      'Verify each paddock, structure, and field has a reachable access path before locking phases.',
    ],
  },
  livestock: {
    why: 'Subdivision and livestock sit at rank 7 of Yeomans\' Scale of Permanence — fence lines and animal cells are designed *after* climate, landform, water, access, and structures are settled, because they consume the slowest-to-change layers (Mollison, Designers\' Manual ch.8; Yeomans, Water for Every Farm). Locking in cell shapes before water and access exist forces expensive re-fencing later. The Product Chain sub-section extends this onto the post-farm-gate flow (slaughter → cold chain → market) so the herd / flock is designed against the actual off-take it has to feed, not in isolation.',
    how: [
      'Confirm water lines and access tracks exist on the design before drawing paddock cells.',
      'Size cells to the herd / flock\'s daily grazing demand and target rest period.',
      'Site shelters and water points so each cell has both within reasonable walking distance.',
      'In the Product Chain tabs, place slaughter / cold-chain / market nodes so capacity and demand size against bird or carcass volume — not the other way round.',
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
  'regeneration-monitor': {
    why: 'Regeneration is only real if it is measured over time. The Apricot Lane Farms model rests on a peer-reviewed MDPI 9-year longitudinal soil study (Year 0 / 5 / 9 sampling of microbial biomass, soil organic matter, and water-stable aggregates) — without dated, per-zone sampling a steward cannot tell whether the land is actually improving or only appears to be (Holmgren P4: Apply self-regulation and accept feedback).',
    how: [
      'Log dated observation samples per metric and per management zone — soil organic matter %, living cover %, infiltration %, microbial biomass, aggregate stability, bulk density.',
      'Read each metric\'s trajectory against the goal-tree target line and deadline-year marker.',
      'Act on lagging verdicts: where the curve is below trajectory, revisit the upstream water, soil, or plant module before the deadline year.',
    ],
  },
  'habitat-allocation': {
    why: 'Apricot Lane Farms deliberately set aside ~10% of total acreage as undisturbed wildlife habitat and biological corridors — treating native predators (owl boxes, hawk perches) and the wildlife pond as primary biological pest-control tools, not philanthropy. A steward must be able to see whether enough land is actually allocated to habitat before the design is locked, because habitat is a year-zero allocation decision, not a post-production add-on (Holmgren P10: Use and value diversity).',
    how: [
      'Draw conservation, buffer, and water-retention zones on the map — their area is what counts toward the habitat set-aside.',
      'Read the allocation gauge: allocated % vs the goal-tree target line (regen-habitat-pct, default 10%), with the shortfall in hectares when under.',
      'Record the discrete habitat features you commit to — wildlife pond, owl boxes, hawk perches, hedgerow length — so the inventory matches the drawn land.',
    ],
  },
  'biodiversity-monitor': {
    why: 'A habitat set-aside is only working if the ecology actually recovers — native vegetative cover returning, invasive-species pressure falling, and the bird & pollinator community arriving. That recovery must be measured over time, not assumed from the allocation decision (Holmgren P4: Apply self-regulation and accept feedback; P10: Use and value diversity). This module tracks ecological outcomes only — no valuation, credit, or offset framing.',
    how: [
      'Log dated biodiversity samples per management zone — native vegetative cover %, invasive-species pressure %, distinct bird & pollinator species count, beneficial-predator activity index.',
      'Read each metric\'s trajectory against the goal-tree target line and deadline-year marker, on the Year 0 / 5 / 9 monitoring cadence.',
      'Act on lagging native-cover or invasive-pressure curves: where recovery is below trajectory, revisit the habitat allocation and corridor design before the deadline year.',
    ],
  },
};

interface Props {
  activeModule: PlanModule | null;
  /**
   * The reconciled picked-section id (owned by `PlanLayout`, shared with the
   * main rail). Non-null → exactly that card lights; null → fall back to
   * whole-family module-equality highlight.
   */
  effectiveSectionId: string | null;
  /** Module-only selection (kept for `PlanProjectTypeCard`). */
  onSelectModule: (module: PlanModule | null) => void;
  /** Section selection — narrows / toggles the cross-rail highlight. */
  onSelectSection: (module: PlanModule, sectionId: string) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function PlanGuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectSection,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: PlanModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectSection: (module: PlanModule, sectionId: string) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const checkedList = usePlanHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = usePlanHowChecksStore((s) => s.toggle);

  const summaryText = useObjectiveSummaryStore((s) =>
    projectId ? s.getSummary('plan', projectId, module) : '',
  );
  const setSummary = useObjectiveSummaryStore((s) => s.setSummary);

  const guidance = PLAN_MODULE_GUIDANCE[module];
  const progress = progressFromChecks(checkedList, guidance.how.length);

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
      guidance={guidance}
      checkedList={checkedList}
      onToggle={(i) => projectId && toggle(projectId, module, i)}
      onSelect={() => onSelectSection(module, module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
      progress={progress}
      summary={{
        value: summaryText,
        onChange: (text) =>
          projectId && setSummary('plan', projectId, module, text),
        disabled: !projectId,
      }}
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
  effectiveSectionId,
  onSelectModule,
  onSelectSection,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const navigate = useNavigate();

  const asideRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  // 2026-05-24 — Stage Compass focus: with no objective selected, show a quiet
  // prompt back to the Plan Compass instead of the full card menu.
  if (activeModule === null) {
    return (
      <div
        ref={asideRef}
        className={css.checklistBox}
        data-has-active="false"
      >
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below, or open the Plan Compass to
            choose your next objective.
          </p>
          {projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/plan/compass',
                  params: { projectId },
                })
              }
            >
              Open Plan Compass
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={asideRef}
      className={css.checklistBox}
      data-has-active="true"
    >
      {PLAN_MODULES.map((mod) => {
        // 2026-05-14 — BE flatten: parent `structures-subsystems` card
        // is replaced by 9 per-category cards rendered below.
        if (mod === 'structures-subsystems') return null;
        // 2026-05-24 — Stage Compass focus: render only the active objective's
        // card. `activeModule` is non-null here (empty state returned above).
        if (mod !== activeModule) return null;
        const active =
          effectiveSectionId !== null
            ? effectiveSectionId === mod
            : activeModule === mod;
        return (
          <PlanGuidanceCard
            key={mod}
            module={mod}
            active={active}
            projectId={projectId}
            slideUpOpen={slideUpOpen}
            onSelectSection={onSelectSection}
            onOpenSlideUp={onOpenSlideUp}
            onCloseSlideUp={onCloseSlideUp}
          />
        );
      })}
      {BE_TOOL_GROUPS.map((group) => {
        // 2026-05-14 — Vegetation BE kinds already surface under the
        // `plant-systems` rail/guidance section; the BE category card
        // is redundant in Plan.
        if (group.category === 'vegetation') return null;
        // 2026-05-14 — Earthworks BE category dropped from Plan rail;
        // Berm / Raised bed / Terrace surface inside Water Management /
        // Plant Systems / Amenities. No standalone guidance card.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_PLAN_MODULE[group.category];
        // 2026-05-24 — Stage Compass focus: only BE category cards belonging to
        // the active objective render (all route to structures-subsystems).
        if (routed !== activeModule) return null;
        const guidance = BE_CATEGORY_GUIDANCE[group.category];
        const sectionId = `be-${group.category}`;
        const active =
          effectiveSectionId !== null
            ? effectiveSectionId === sectionId
            : activeModule === routed;
        return (
          <GuidanceCard
            key={`be-${group.category}`}
            moduleKey={`be-${group.category}` as `be-${BuiltEnvironmentCategory}`}
            label={BE_CATEGORY_LABEL[group.category]}
            dotColor={PLAN_MODULE_DOT[routed]}
            active={active}
            slideUpOpen={slideUpOpen}
            guidance={guidance}
            checkedList={EMPTY_CHECKS}
            onToggle={() => {
              /* BE category cards share their routed module's how-checks
               * slot — disabling the UI affordance here keeps the parent
               * module the single source of truth. */
            }}
            onSelect={() => onSelectSection(routed, sectionId)}
            onOpenSlideUp={onOpenSlideUp}
            onCloseSlideUp={onCloseSlideUp}
            checksDisabled
          />
        );
      })}
    </div>
  );
}
