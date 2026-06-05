/**
 * PlanTools — left tools rail for the Plan stage (Current Land view).
 *
 * Map-first: Modules 2 (Water Management) and 3 (Zone & Circulation) expose
 * draw tools that drop features onto the parcel; an inline floating popover
 * captures the 2-4 essential fields. Slide-ups are reserved for the full
 * written report cards (right-rail / bottom bar entry).
 *
 * Other modules expose a single "Open module" button as an honest fallback —
 * replaces "Tools coming soon" until they get the same map-first treatment.
 *
 * 2026-05-24 — Stage Compass focus (mirrors Observe / Goal 2): the rail follows
 * the compass's single-objective focus. It renders ONLY the section(s) for the
 * chosen objective (active module); with no objective selected, a quiet prompt
 * links back to the Plan Compass. All section-rendering code is preserved
 * (gated on the active module), not removed.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  Activity,
  Apple,
  ArrowRight,
  Beef,
  Bird,
  CalendarClock,
  CircleDashed,
  Container,
  Disc,
  Droplet,
  Eye,
  Fence,
  Flower2,
  FolderOpen,
  Layers,
  Leaf,
  Link2,
  MapPin,
  Milestone,
  Mountain,
  Recycle,
  Eraser,
  RotateCw,
  Route,
  Scissors,
  Snowflake,
  Sprout,
  Square,
  Store,
  TreeDeciduous,
  TreePine,
  Trees,
  Waves,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  BE_TOOL_ITEMS,
  BE_TOOL_GROUPS,
} from '../_shared/builtEnvironmentTools.js';
import type { BuiltEnvironmentCategory } from '@ogden/shared';
import {
  useMapToolStore,
  type MapToolId,
} from '../observe/components/measure/useMapToolStore.js';
import { useLayeringLensStore } from '../../store/layeringLensStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import * as turf from '@turf/turf';
import { useZoneStore } from '../../store/zoneStore.js';
import { ringSeedGenerator } from './engine/zoneGenerators/index.js';
import type { ZoneGenerator } from './engine/zoneGenerators/types.js';
import {
  parcelPolygon,
  clip,
  type PolyFeature,
} from './engine/zoneGenerators/parcelGeometry.js';
import { toast } from '../../components/Toast.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  PLAN_MODULES,
  PLAN_MODULE_FULL_LABEL,
  type PlanModule,
} from './types.js';
import { BE_CATEGORY_TO_PLAN_MODULE } from './planSectionMap.js';
import { usePlanView } from './PlanViewContext.js';
import CustomModelPalette from './canvas/CustomModelPalette.js';
import css from './PlanTools.module.css';

interface ToolItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  toolId: MapToolId;
}

/**
 * Plan-stage Built Environment tools — driven by the shared registry list
 * in `_shared/builtEnvironmentTools.ts`. Tool ids use the
 * `plan.structures-subsystems.be.<kind>` prefix so PlanDrawHost can
 * dispatch them via a single prefix-match handler. Mirrors Observe's BE
 * rail so a kind added to the shared registry surfaces in both stages
 * automatically.
 */
const PLAN_BE_TOOLS: ToolItem[] = BE_TOOL_ITEMS.map((it) => ({
  id: `be-${it.kind}`,
  label: it.label,
  Icon: it.Icon,
  toolId: `plan.structures-subsystems.be.${it.kind}` as MapToolId,
}));

/** BE tools for one category, converted to Plan rail `ToolItem`s. Mirrors the
 *  per-section conversion in the BE_TOOL_GROUPS render loop below so a BE
 *  category can be folded into a hand-authored module group (see machinery). */
function beCategoryToolItems(category: BuiltEnvironmentCategory): ToolItem[] {
  const group = BE_TOOL_GROUPS.find((g) => g.category === category);
  if (!group) return [];
  return group.items.map((bg) => ({
    id: `be-${bg.kind}`,
    label: bg.label,
    Icon: bg.Icon,
    toolId: `plan.structures-subsystems.be.${bg.kind}` as MapToolId,
  }));
}

/** Modules with map-first draw tools. Others fall back to "Open module". */
const TOOL_GROUPS: Partial<Record<PlanModule, ToolItem[]>> = {
  'hydrology': [
    { id: 'catchment', label: 'Catchment', Icon: Droplet,   toolId: 'plan.water-management.catchment' },
    { id: 'storage',   label: 'Storage',   Icon: Container, toolId: 'plan.water-management.storage' },
    { id: 'swale',     label: 'Swale',     Icon: Waves,     toolId: 'plan.water-management.swale' },
    { id: 'sink',      label: 'Sink',      Icon: Disc,      toolId: 'plan.water-management.sink' },
    // 2026-05-11 — Yeomans water kind ported from elementCatalog; persists
    // to designElementsStore via PlanDesignElementHost.
    { id: 'spring',    label: 'Spring',    Icon: Flower2,   toolId: 'plan.water-management.spring' },
    // 2026-05-14 — Berm relocated from the Earthworks BE category (dropped).
    // Uses the BE toolId so the existing BE draw pipeline still handles it.
    { id: 'be-berm',   label: 'Berm',      Icon: Mountain,  toolId: 'plan.structures-subsystems.be.berm' as MapToolId },
  ],
  'access-circulation': [
    { id: 'zone',        label: 'Zone',        Icon: Square,        toolId: 'plan.zone-circulation.zone' },
    { id: 'path',        label: 'Path',        Icon: Route,         toolId: 'plan.zone-circulation.path' },
    { id: 'buffer-ring', label: 'Buffer ring', Icon: CircleDashed,  toolId: 'plan.zone-circulation.buffer-ring' },
    // 2026-05-11 — Access kinds ported from elementCatalog (vehicle road,
    // bridge crossing). Route through designElementsStore.
    { id: 'road',        label: 'Road',        Icon: Milestone,     toolId: 'plan.zone-circulation.road' },
    { id: 'bridge',      label: 'Bridge',      Icon: Link2,         toolId: 'plan.zone-circulation.bridge' },
  ],
  // 2026-05-22 — Single Machinery group. Turnaround is the only machinery kind
  // with Plan-only draw semantics (toolId plan.machinery.turnaround); the BE
  // machinery kinds (machinery-shed / fuel-station / equipment-yard) are folded
  // in here so the rail shows one Machinery card. The BE machinery category
  // card is suppressed in the BE_TOOL_GROUPS render loop below.
  // built-infrastructure collapses structures-subsystems (PLAN_BE_TOOLS) +
  // machinery (turnaround). PLAN_BE_TOOLS already includes the BE machinery
  // category, so prepend only the Plan-only turnaround draw kind here.
  'built-infrastructure': [
    { id: 'turnaround', label: 'Turnaround', Icon: RotateCw, toolId: 'plan.machinery.turnaround' },
    ...PLAN_BE_TOOLS,
  ],
  'animals-livestock': [
    { id: 'paddock',    label: 'Paddock',    Icon: Square, toolId: 'plan.livestock.paddock' },
    // 2026-05-10 Farm-Scholar (Newman) ADR — fence-line linear tool for
    // strip / mob grazing wire that the polygon Paddock tool cannot model.
    { id: 'fence-line', label: 'Fence line', Icon: Fence,  toolId: 'plan.livestock.fence-line' },
    // 2026-05-12 — Plan-stage in-card create flow for `ScheduledLivestockMove`
    // (paddock or livestock-capable structure destination). Mirrors the
    // Act-stage move tool but persists to scheduledLivestockMoveStore.
    { id: 'schedule-move', label: 'Schedule move', Icon: CalendarClock, toolId: 'plan.livestock.schedule-move' },
    // 2026-05-10 Product Chain (sub-module) — Newman's post-farm-gate
    // value chain folded into Livestock: slaughter → cold chain → market.
    { id: 'slaughter-point', label: 'Slaughter',  Icon: Beef,      toolId: 'plan.livestock.slaughter-point' },
    { id: 'cold-chain-unit', label: 'Cold chain', Icon: Snowflake, toolId: 'plan.livestock.cold-chain-unit' },
    { id: 'market-node',     label: 'Market',     Icon: Store,     toolId: 'plan.livestock.market-node' },
  ],
  'plants-food': [
    { id: 'crop-area',    label: 'Crop area',    Icon: Sprout,        toolId: 'plan.plant-systems.crop-area' },
    { id: 'guild',        label: 'Guild',        Icon: TreeDeciduous, toolId: 'plan.plant-systems.guild' },
    // 2026-05-11 — Yeomans grazing kinds ported from the Vision-canvas
    // DesignElementPalette so PlanTools is the single rail across all
    // four Plan views. Polygon draws persist to designElementsStore and
    // surface acreage labels via DesignElementLayers.
    { id: 'orchard',      label: 'Orchard',      Icon: TreeDeciduous, toolId: 'plan.plant-systems.orchard' },
    { id: 'silvopasture', label: 'Silvopasture', Icon: Trees,         toolId: 'plan.plant-systems.silvopasture' },
    { id: 'pasture-mix',  label: 'Pasture mix',  Icon: Wheat,         toolId: 'plan.plant-systems.pasture-mix' },
    // 2026-05-11 — Vegetation kinds ported from elementCatalog (oak / pine /
    // apple / shrub / hedgerow). Point + line draws via designElementsStore.
    { id: 'oak-tree',     label: 'Oak tree',     Icon: TreeDeciduous, toolId: 'plan.plant-systems.oak-tree' },
    { id: 'pine-tree',    label: 'Pine tree',    Icon: TreePine,      toolId: 'plan.plant-systems.pine-tree' },
    { id: 'apple-tree',   label: 'Apple tree',   Icon: Apple,         toolId: 'plan.plant-systems.apple-tree' },
    { id: 'shrub',        label: 'Shrub',        Icon: Leaf,          toolId: 'plan.plant-systems.shrub' },
    { id: 'hedgerow',     label: 'Hedgerow',     Icon: Trees,         toolId: 'plan.plant-systems.hedgerow' },
    // 2026-05-14 — Raised bed relocated from the Earthworks BE category
    // (dropped). Uses the BE toolId so the existing draw pipeline still
    // handles it.
    { id: 'be-raised-bed', label: 'Raised bed',  Icon: Square,        toolId: 'plan.structures-subsystems.be.raised-bed' as MapToolId },
  ],
  'soil': [
    { id: 'fertility-unit',  label: 'Fertility unit',  Icon: Recycle,    toolId: 'plan.soil-fertility.fertility-unit' },
    { id: 'flow-connector',  label: 'Flow connector',  Icon: ArrowRight, toolId: 'plan.soil-fertility.flow-connector' },
  ],
  // 2026-05-21 — Habitat Allocation (A2). The 7 habitat-feature kinds
  // unify with the design-element pipeline so B5 audit math can read them
  // directly. hedgerow / shrub / pond / wildlife pond reuse their
  // plant-systems / water-management entries above (shared catalog kind).
  'ecology': [
    { id: 'owl-box',         label: 'Owl box',         Icon: Bird,           toolId: 'plan.habitat-allocation.owl-box' },
    { id: 'raptor-perch',    label: 'Raptor perch',    Icon: Eye,            toolId: 'plan.habitat-allocation.raptor-perch' },
    { id: 'nest-box',        label: 'Nest box',        Icon: Bird,           toolId: 'plan.habitat-allocation.nest-box' },
    { id: 'brush-pile',      label: 'Brush pile',      Icon: Sprout,         toolId: 'plan.habitat-allocation.brush-pile' },
    { id: 'snag',            label: 'Standing snag',   Icon: TreeDeciduous,  toolId: 'plan.habitat-allocation.snag' },
    { id: 'insectary-strip', label: 'Insectary strip', Icon: Flower2,        toolId: 'plan.habitat-allocation.insectary-strip' },
    { id: 'wetland-edge',    label: 'Wetland edge',    Icon: Waves,          toolId: 'plan.habitat-allocation.wetland-edge' },
  ],
  'risk-compliance': [
    { id: 'note',     label: 'Note',     Icon: MapPin,   toolId: 'plan.principle-verification.note' },
    { id: 'transect', label: 'Transect', Icon: Activity, toolId: 'plan.principle-verification.transect' },
  ],
};

/**
 * Zone-generator actions surfaced in the Zone & Circulation rail section.
 * Unlike `ToolItem`s these don't arm a draw mode — they run a pure
 * `ZoneGenerator` synchronously and `addZone` the result, so seeding is
 * reachable from the map (not only the Goal Compass Proposal bar). Adding
 * a generator (parcel-fill, template, …) is a one-line entry here.
 */
interface ZoneGeneratorAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  generator: ZoneGenerator;
  /**
   * When set, the button arms this map tool (steward picks a point first)
   * instead of running the generator synchronously. The tool builds the
   * context and runs the generator on click-complete.
   */
  armToolId?: MapToolId;
}

const ZONE_GENERATOR_ACTIONS: ZoneGeneratorAction[] = [
  {
    id: 'ring-seed',
    label: 'Seed zones from rings',
    Icon: Sprout,
    generator: ringSeedGenerator,
    armToolId: 'plan.zone-circulation.zone-seed-anchor',
  },
];

interface Props {
  activeModule: PlanModule | null;
  /**
   * The reconciled picked-section id (owned by `PlanLayout`, shared with the
   * mini rail). Non-null → exactly that section lights; null → fall back to
   * whole-family module-equality highlight.
   */
  effectiveSectionId: string | null;
  /** Module-only selection (the "Open module" fallback button). */
  onSelectModule: (mod: PlanModule | null) => void;
  /** Section selection — narrows / toggles the cross-rail highlight. */
  onSelectSection: (mod: PlanModule, sectionId: string) => void;
  onOpenSlideUp?: () => void;
}

export default function PlanTools({
  activeModule,
  effectiveSectionId,
  onSelectModule,
  onSelectSection,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const navigate = useNavigate();
  const view = usePlanView();

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const lensEnabled = useLayeringLensStore((s) => s.enabled);
  const lensMode = useLayeringLensStore((s) => s.mode);
  const setLensEnabled = useLayeringLensStore((s) => s.set);
  const setLensMode = useLayeringLensStore((s) => s.setMode);
  const projects = useProjectStore((s) => s.projects);
  const zones = useZoneStore((s) => s.zones);
  const addZone = useZoneStore((s) => s.addZone);
  const updateZone = useZoneStore((s) => s.updateZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);
  const clearSeededZones = useZoneStore((s) => s.clearSeededZones);

  const project = projectId
    ? projects.find((p) => p.id === projectId)
    : undefined;
  const seededZones = projectId
    ? zones.filter(
        (z) => z.projectId === projectId && z.seedProvenance === 'ring-seed',
      )
    : [];
  const hasSeeded = seededZones.length > 0;
  const hasParcel = !!project?.parcelBoundaryGeojson;

  const runZoneGeneratorAction = (action: ZoneGeneratorAction) => {
    if (!projectId) return;
    // Steward-picked-point generators arm a map tool; the tool builds the
    // context (with anchorPoint) and runs the generator on click.
    if (action.armToolId) {
      setActiveTool(action.armToolId);
      return;
    }
    const ctx = {
      projectId,
      parcelBoundary: project?.parcelBoundaryGeojson ?? null,
      existingZones: zones,
    };
    const avail = action.generator.canRun(ctx);
    if (!avail.ok) {
      toast.warning(avail.reason ?? 'Cannot seed zones yet.');
      return;
    }
    const seeded = action.generator.generate(ctx);
    seeded.forEach(addZone);
    if (seeded.length === 0) {
      toast.info(
        'No zones seeded — the parcel may already be fully ring-seeded.',
      );
    } else {
      toast.success(
        `Seeded ${seeded.length} draft zone(s) from the Mollison rings. ` +
          'Adjust or dismiss them like any drawn zone.',
      );
    }
  };

  const clearSeeded = () => {
    if (!projectId) return;
    const removed = clearSeededZones(projectId);
    if (removed === 0) {
      toast.info('No seeded zones to clear.');
    } else {
      toast.success(`Cleared ${removed} seeded zone(s).`);
    }
  };

  const trimSeededToParcel = () => {
    if (!projectId) return;
    const parcel = parcelPolygon(project?.parcelBoundaryGeojson ?? null);
    if (!parcel) {
      toast.warning('Draw the parcel boundary first to trim against it.');
      return;
    }
    let trimmed = 0;
    let dropped = 0;
    for (const z of seededZones) {
      const zoneFeature = turf.feature(z.geometry) as PolyFeature;
      const clipped = clip(zoneFeature, parcel);
      if (!clipped) {
        deleteZone(z.id);
        dropped += 1;
        continue;
      }
      updateZone(z.id, {
        geometry: clipped.geometry,
        areaM2: turf.area(clipped),
      });
      trimmed += 1;
    }
    if (trimmed === 0 && dropped === 0) {
      toast.info('No seeded zones to trim.');
    } else {
      toast.success(
        `Trimmed ${trimmed} seeded zone(s) to the parcel` +
          (dropped > 0 ? `; removed ${dropped} fully outside.` : '.'),
      );
    }
  };

  const toolboxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!activeModule) return;
    const root = toolboxRef.current;
    if (!root) return;
    const section = root.querySelector<HTMLElement>(
      `[data-module="${activeModule}"]`,
    );
    if (!section) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeModule]);

  const onToolClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    toolId: MapToolId,
  ) => {
    e.stopPropagation();
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  // 2026-05-24 — Stage Compass focus (mirrors Observe / Goal 2): with no
  // objective selected, show a quiet prompt back to the Plan compass instead
  // of every module's tool palette. The view-scoped CustomModelPalette still
  // renders in Vision / Terrain authoring so that flow is unaffected.
  if (activeModule === null) {
    return (
      <div
        ref={toolboxRef}
        className={css.toolbox}
        data-has-active="false"
      >
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below, or open the Plan Compass to
            choose your next objective.
          </p>
          {params.projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/plan',
                  params: { projectId: params.projectId! },
                })
              }
            >
              Open Plan Compass
            </button>
          )}
        </div>
        {(view === 'vision' || view === 'terrain3d') && <CustomModelPalette />}
      </div>
    );
  }

  return (
    <div
      ref={toolboxRef}
      className={css.toolbox}
      data-has-active={activeModule !== null ? 'true' : 'false'}
    >
      {PLAN_MODULES.map((mod) => {
        // 2026-05-14 — BE flatten: the parent `structures-subsystems`
        // module no longer renders as a rail section; its kinds surface
        // as 9 per-category sections appended after this loop. The
        // module slide-up is still reachable via the bottom-rail tile.
        if (mod === 'built-infrastructure') return null;
        // 2026-05-24 — Stage Compass focus: only the chosen objective's section
        // renders. `activeModule` is non-null here (empty state returned
        // above), so this yields exactly one non-BE section.
        if (mod !== activeModule) return null;
        const items = TOOL_GROUPS[mod];
        const isActive =
          effectiveSectionId !== null
            ? effectiveSectionId === mod
            : activeModule === mod;
        const headerLabel = PLAN_MODULE_FULL_LABEL[mod];
        const sectionClassName = [
          css.group,
          isActive ? css.groupActive : '',
          projectId ? css.groupClickable : '',
        ]
          .filter(Boolean)
          .join(' ');

        const sectionInteractionProps = projectId
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isActive,
              title: isActive
                ? `Deselect ${headerLabel}`
                : `Switch to ${headerLabel}`,
              onClick: () => onSelectSection(mod, mod),
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSection(mod, mod);
                }
              },
            }
          : {};

        return (
          <section
            key={mod}
            className={sectionClassName}
            data-module={mod}
            {...sectionInteractionProps}
          >
            <header className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>{headerLabel}</span>
            </header>
            {items ? (
              <div className={css.itemGrid}>
                {items.map((it) =>
                  renderPlanToolButton(it, {
                    activeTool,
                    projectId,
                    onToolClick,
                  }),
                )}
              </div>
            ) : mod === 'access-circulation' ? (
              <div className={css.lensRow}>
                {(['yeomans', 'enterprise'] as const).map((m) => {
                  const isOn = lensEnabled && lensMode === m;
                  const label = m === 'yeomans' ? 'Yeomans' : 'Enterprise';
                  const longLabel = m === 'yeomans'
                    ? (isOn
                      ? 'Yeomans lens · ON — click to disable'
                      : 'Recolour features by Yeomans rank')
                    : (isOn
                      ? 'Enterprise lens · ON — click to disable'
                      : 'Recolour features by enterprise tag');
                  return (
                    <DelayedTooltip key={m} label={longLabel} position="top">
                      <button
                        type="button"
                        className={css.openModuleBtn}
                        disabled={!projectId}
                        aria-pressed={isOn}
                        data-active={isOn ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!projectId) return;
                          if (isOn) {
                            setLensEnabled(false);
                          } else {
                            setLensMode(m);
                            setLensEnabled(true);
                          }
                        }}
                      >
                        <Layers size={14} strokeWidth={1.6} />
                        <span>{isOn ? `${label} · ON` : label}</span>
                      </button>
                    </DelayedTooltip>
                  );
                })}
              </div>
            ) : (
              <DelayedTooltip
                label={`Open ${headerLabel} module`}
                position="top"
              >
                <button
                  type="button"
                  className={css.openModuleBtn}
                  disabled={!projectId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!projectId) return;
                    onSelectModule(mod);
                    onOpenSlideUp?.();
                  }}
                >
                  <FolderOpen size={14} strokeWidth={1.6} />
                  <span>Open module</span>
                </button>
              </DelayedTooltip>
            )}
            {mod === 'access-circulation' ? (
              <div className={css.itemGrid}>
                {ZONE_GENERATOR_ACTIONS.map((a) => (
                  <DelayedTooltip
                    key={a.id}
                    label={
                      projectId
                        ? a.label
                        : `${a.label} — open a project to use`
                    }
                    position="top"
                  >
                    <button
                      type="button"
                      className={css.toolItem}
                      disabled={!projectId}
                      onClick={(e) => {
                        e.stopPropagation();
                        runZoneGeneratorAction(a);
                      }}
                    >
                      <span className={css.toolGlyph} aria-hidden="true">
                        <a.Icon size={16} strokeWidth={1.6} />
                      </span>
                      <span className={css.toolLabel}>{a.label}</span>
                    </button>
                  </DelayedTooltip>
                ))}
                <DelayedTooltip
                  label={
                    !projectId
                      ? 'Trim seeded zones to parcel — open a project to use'
                      : !hasParcel
                        ? 'Trim seeded zones to parcel — draw the parcel boundary first'
                        : !hasSeeded
                          ? 'Trim seeded zones to parcel — nothing seeded yet'
                          : 'Trim seeded zones to parcel'
                  }
                  position="top"
                >
                  <button
                    type="button"
                    className={css.toolItem}
                    disabled={!projectId || !hasParcel || !hasSeeded}
                    onClick={(e) => {
                      e.stopPropagation();
                      trimSeededToParcel();
                    }}
                  >
                    <span className={css.toolGlyph} aria-hidden="true">
                      <Scissors size={16} strokeWidth={1.6} />
                    </span>
                    <span className={css.toolLabel}>
                      Trim seeded to parcel
                    </span>
                  </button>
                </DelayedTooltip>
                <DelayedTooltip
                  label={
                    !projectId
                      ? 'Clear seeded zones — open a project to use'
                      : !hasSeeded
                        ? 'Clear seeded zones — nothing seeded yet'
                        : 'Clear all seeded zones'
                  }
                  position="top"
                >
                  <button
                    type="button"
                    className={css.toolItem}
                    disabled={!projectId || !hasSeeded}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSeeded();
                    }}
                  >
                    <span className={css.toolGlyph} aria-hidden="true">
                      <Eraser size={16} strokeWidth={1.6} />
                    </span>
                    <span className={css.toolLabel}>Clear seeded zones</span>
                  </button>
                </DelayedTooltip>
              </div>
            ) : null}
          </section>
        );
      })}
      {/* 2026-05-14 — Per-`BuiltEnvironmentCategory` top-level rail
       *  sections. Each routes click-to-activate to a relevant
       *  pre-existing Plan module (`BE_CATEGORY_TO_PLAN_MODULE`); tool
       *  buttons still dispatch `plan.structures-subsystems.be.<kind>`
       *  toolIds so the BE pipeline is unchanged. */}
      {BE_TOOL_GROUPS.map((group) => {
        if (group.items.length === 0) return null;
        // 2026-05-14 — Vegetation BE kinds (Oak/Pine/Apple/Shrub/Hedgerow)
        // already surface in the `plant-systems` rail section as plant
        // tools; the BE category card is redundant in Plan.
        if (group.category === 'vegetation') return null;
        // 2026-05-22 — Machinery BE kinds (Shed/Fuel/Equipment Yard) are folded
        // into the single module-level Machinery group above; skip the duplicate
        // BE category card here.
        if (group.category === 'machinery') return null;
        // 2026-05-14 — Earthworks BE section dropped. Berm and Raised bed
        // now appear inline in Water Management / Plant Systems above;
        // Terrace is appended to the Amenities group below.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_PLAN_MODULE[group.category];
        // 2026-05-24 — Stage Compass focus: only BE categories belonging to the
        // chosen objective render (all remaining categories route to
        // structures-subsystems / Built Environment).
        if (routed !== activeModule) return null;
        const sectionId = `be-${group.category}`;
        const isActive =
          effectiveSectionId !== null
            ? effectiveSectionId === sectionId
            : activeModule === routed;
        const sectionClassName = [
          css.group,
          isActive ? css.groupActive : '',
          projectId ? css.groupClickable : '',
        ]
          .filter(Boolean)
          .join(' ');
        const sectionInteractionProps = projectId
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isActive,
              title: isActive
                ? `Deselect ${PLAN_MODULE_FULL_LABEL[routed]}`
                : `Switch to ${PLAN_MODULE_FULL_LABEL[routed]}`,
              onClick: () => onSelectSection(routed, sectionId),
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSection(routed, sectionId);
                }
              },
            }
          : {};
        const sourceItems =
          group.category === 'amenity'
            ? [
                ...group.items,
                // 2026-05-14 — Terrace relocated from Earthworks BE category.
                ...BE_TOOL_ITEMS.filter((i) => i.kind === 'terrace'),
              ]
            : group.items;
        const groupItems: ToolItem[] = sourceItems.map((bg) => ({
          id: `be-${bg.kind}`,
          label: bg.label,
          Icon: bg.Icon,
          toolId: `plan.structures-subsystems.be.${bg.kind}` as MapToolId,
        }));
        // C4 — the typed utility-point tool (utilityStore) lives alongside the
        // BE utility kinds. Appended after the BE map so it keeps its non-BE
        // toolId (routed via PlanDrawHost switch, not the be.* prefix branch).
        // Offers the 11 utility types with no BE equivalent; the 4 overlapping
        // kinds (well/septic/tank/solar) are authored via the be.* tools.
        if (group.category === 'utility') {
          groupItems.push({
            id: 'plan-utility-point',
            label: 'Utility point',
            Icon: Zap,
            toolId: 'plan.structures-subsystems.utility-point' as MapToolId,
          });
        }
        return (
          <section
            key={`be-${group.category}`}
            className={sectionClassName}
            data-module={routed}
            data-be-category={group.category}
            {...sectionInteractionProps}
          >
            <header className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>{group.label}</span>
            </header>
            <div className={css.itemGrid}>
              {groupItems.map((it) =>
                renderPlanToolButton(it, {
                  activeTool,
                  projectId,
                  onToolClick,
                }),
              )}
            </div>
          </section>
        );
      })}
      {(view === 'vision' || view === 'terrain3d') && <CustomModelPalette />}
    </div>
  );
}

/** Renders a single Plan-rail tool button. Extracted so the BE sub-card
 *  sub-grid in `structures-subsystems` reuses the same disabled / tooltip /
 *  active-state logic as the flat case. */
function renderPlanToolButton(
  it: ToolItem,
  ctx: {
    activeTool: MapToolId | null;
    projectId: string | null;
    onToolClick: (
      e: React.MouseEvent<HTMLButtonElement>,
      toolId: MapToolId,
    ) => void;
  },
) {
  const { activeTool, projectId, onToolClick } = ctx;
  const isToolActive = activeTool === it.toolId;
  const disabled = !projectId;
  return (
    <DelayedTooltip
      key={it.id}
      label={
        disabled ? `${it.label} — open a project to use` : it.label
      }
      position="top"
    >
      <button
        type="button"
        className={css.toolItem}
        data-active={isToolActive ? 'true' : 'false'}
        disabled={disabled}
        aria-pressed={isToolActive}
        onClick={(e) => onToolClick(e, it.toolId)}
      >
        <span className={css.toolGlyph} aria-hidden="true">
          <it.Icon size={16} strokeWidth={1.6} />
        </span>
        <span className={css.toolLabel}>{it.label}</span>
      </button>
    </DelayedTooltip>
  );
}
