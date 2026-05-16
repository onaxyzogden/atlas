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
 */

import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  Activity,
  Apple,
  ArrowRight,
  Beef,
  CalendarClock,
  CircleDashed,
  Container,
  Disc,
  Droplet,
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
  RotateCw,
  Route,
  Snowflake,
  Sprout,
  Square,
  Store,
  TreeDeciduous,
  TreePine,
  Trees,
  Waves,
  Wheat,
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
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  PLAN_MODULES,
  PLAN_MODULE_FULL_LABEL,
  type PlanModule,
} from './types.js';
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

/**
 * 2026-05-14 — BE flatten. Each `BuiltEnvironmentCategory` surfaces as its
 * own top-level rail section; clicking it activates the routed Plan
 * module below. Plan has dedicated modules for several BE category
 * concerns (machinery, plant-systems, water-management, zone-circulation),
 * so the mapping is more specific than Observe's.
 */
const BE_CATEGORY_TO_PLAN_MODULE: Record<
  BuiltEnvironmentCategory,
  PlanModule
> = {
  building: 'structures-subsystems',
  agricultural: 'structures-subsystems',
  utility: 'structures-subsystems',
  infrastructure: 'structures-subsystems',
  machinery: 'machinery',
  amenity: 'structures-subsystems',
  vegetation: 'plant-systems',
  earthworks: 'water-management',
};

/** Modules with map-first draw tools. Others fall back to "Open module". */
const TOOL_GROUPS: Partial<Record<PlanModule, ToolItem[]>> = {
  'water-management': [
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
  'zone-circulation': [
    { id: 'zone',        label: 'Zone',        Icon: Square,        toolId: 'plan.zone-circulation.zone' },
    { id: 'path',        label: 'Path',        Icon: Route,         toolId: 'plan.zone-circulation.path' },
    { id: 'buffer-ring', label: 'Buffer ring', Icon: CircleDashed,  toolId: 'plan.zone-circulation.buffer-ring' },
    // 2026-05-11 — Access kinds ported from elementCatalog (vehicle road,
    // bridge crossing). Route through designElementsStore.
    { id: 'road',        label: 'Road',        Icon: Milestone,     toolId: 'plan.zone-circulation.road' },
    { id: 'bridge',      label: 'Bridge',      Icon: Link2,         toolId: 'plan.zone-circulation.bridge' },
  ],
  // 2026-05-11 — Machinery group surfaces from elementCatalog. Turnaround
  // is the only machinery kind not already covered by Built Environment's
  // registry (machinery-shed / equipment-yard / fuel-station live there).
  machinery: [
    { id: 'turnaround', label: 'Turnaround', Icon: RotateCw, toolId: 'plan.machinery.turnaround' },
  ],
  'structures-subsystems': PLAN_BE_TOOLS,
  livestock: [
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
  'plant-systems': [
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
  'soil-fertility': [
    { id: 'fertility-unit',  label: 'Fertility unit',  Icon: Recycle,    toolId: 'plan.soil-fertility.fertility-unit' },
    { id: 'flow-connector',  label: 'Flow connector',  Icon: ArrowRight, toolId: 'plan.soil-fertility.flow-connector' },
  ],
  'principle-verification': [
    { id: 'note',     label: 'Note',     Icon: MapPin,   toolId: 'plan.principle-verification.note' },
    { id: 'transect', label: 'Transect', Icon: Activity, toolId: 'plan.principle-verification.transect' },
  ],
};

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (mod: PlanModule | null) => void;
  onOpenSlideUp?: () => void;
}

export default function PlanTools({
  activeModule,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const lensEnabled = useLayeringLensStore((s) => s.enabled);
  const lensMode = useLayeringLensStore((s) => s.mode);
  const setLensEnabled = useLayeringLensStore((s) => s.set);
  const setLensMode = useLayeringLensStore((s) => s.setMode);

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

  const onSectionActivate = (mod: PlanModule, isActive: boolean) => {
    if (!projectId) return;
    onSelectModule(isActive ? null : mod);
  };

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
        if (mod === 'structures-subsystems') return null;
        const items = TOOL_GROUPS[mod];
        const isActive = activeModule === mod;
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
              onClick: () => onSectionActivate(mod, isActive),
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSectionActivate(mod, isActive);
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
            ) : mod === 'dynamic-layering' ? (
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
        // 2026-05-14 — Earthworks BE section dropped. Berm and Raised bed
        // now appear inline in Water Management / Plant Systems above;
        // Terrace is appended to the Amenities group below.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_PLAN_MODULE[group.category];
        const isActive = activeModule === routed;
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
              onClick: () => onSectionActivate(routed, isActive),
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSectionActivate(routed, isActive);
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
