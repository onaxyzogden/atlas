/**
 * ObserveTools — left-rail tool palette for the Observe stage.
 *
 * Always renders the full set of tools across all six modules so contributors
 * can drop annotations without first switching the active module. The active
 * module's section is highlighted; everything else is visible but quieter.
 *
 * Each button toggles a flat `MapToolId` ("observe.<module>.<tool>") on the
 * shared `useMapToolStore`; only one tool can be active at a time across all
 * map families (measure tools clear when an observe tool is picked, and vice
 * versa). The actual draw lifecycle is mounted by `ObserveDrawHost`.
 *
 * Permaculture-zone is gated on a placed homestead: Mollison's Zone 0 is the
 * home, so concentric rings have nothing to anchor on without one.
 */

import { useEffect, useRef } from 'react';
import { useEffectiveHomestead } from '../hooks/useEffectiveHomestead.js';
import { useObserveTelemetry } from '../../../lib/observeInteractionLog.js';
import { useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  Bird,
  Eye,
  Fence,
  Flame,
  MapPin,
  Mountain,
  PenLine,
  Pencil,
  Shield,
  ShieldAlert,
  MousePointer,
  Skull,
  Snowflake,
  Sprout,
  Star,
  Sun,
  Sunrise,
  Target,
  TestTube,
  Tornado,
  Users,
  Volume2,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import {
  BE_TOOL_ITEMS,
  BE_TOOL_GROUPS,
} from '../../_shared/builtEnvironmentTools.js';
import type { BuiltEnvironmentCategory } from '@ogden/shared';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';
import {
  useMapToolStore,
  type MapToolId,
} from '../components/measure/useMapToolStore.js';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveTools.module.css';

interface ObserveToolsProps {
  activeModule: ObserveModule | null;
  /**
   * Optional handler to switch the active OBSERVE module from the toolbar.
   * When provided, each section becomes a button that navigates to its
   * module — mirroring the bottom `ObserveModuleBar`. Clicking the already-
   * active section deselects (passes `null` to clear the URL module).
   */
  onSelectModule?: (module: ObserveModule | null) => void;
}

interface ToolItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** Optional short id-suffix; defaults to `id`. */
  toolId: MapToolId;
}

/**
 * Built Environment rail items — driven by the shared registry list in
 * `_shared/builtEnvironmentTools.ts`. Bespoke per-kind tool wiring lives
 * in `ObserveDrawHost` (BuildingTool, WellTool, …) and is dispatched by
 * the `observe.built-environment.<kind>` toolId — the rail itself is just
 * the registry list. Mirrors `PlanTools` so adding a kind to the shared
 * registry surfaces it in both stages automatically.
 */
const BE_TOOLS: ToolItem[] = BE_TOOL_ITEMS.map((it) => ({
  id: it.kind,
  label: it.label,
  Icon: it.Icon,
  toolId: `observe.built-environment.${it.kind}` as MapToolId,
}));

/**
 * 2026-05-14 — BE flatten. Each `BuiltEnvironmentCategory` surfaces as its
 * own top-level rail section; clicking it activates the routed Observe
 * module below. Observe has fewer modules than Plan, so most categories
 * fall back to `built-environment`; vegetation / earthworks / zone-markers
 * route to ecology / topography / sectors-zones respectively.
 */
const BE_CATEGORY_TO_OBSERVE_MODULE: Record<
  BuiltEnvironmentCategory,
  ObserveModule
> = {
  building: 'built-environment',
  agricultural: 'built-environment',
  utility: 'built-environment',
  infrastructure: 'built-environment',
  machinery: 'built-environment',
  amenity: 'built-environment',
  vegetation: 'earth-water-ecology',
  earthworks: 'topography',
  'zone-marker': 'sectors-zones',
};

const TOOL_GROUPS: Record<ObserveModule, ToolItem[]> = {
  'human-context': [
    { id: 'neighbour-pin',   label: 'Neighbour pin',       Icon: MapPin,   toolId: 'observe.human-context.neighbour-pin' },
    { id: 'steward',         label: 'Steward / household', Icon: Users,    toolId: 'observe.human-context.steward' },
    { id: 'access-road',     label: 'Access road',         Icon: Pencil,   toolId: 'observe.human-context.access-road' },
  ],
  'built-environment': BE_TOOLS,
  'macroclimate-hazards': [
    { id: 'frost-pocket',    label: 'Frost pocket',        Icon: Snowflake, toolId: 'observe.macroclimate-hazards.frost-pocket' },
    { id: 'hazard-zone',     label: 'Hazard zone',         Icon: AlertTriangle, toolId: 'observe.macroclimate-hazards.hazard-zone' },
  ],
  topography: [
    { id: 'contour-line',    label: 'Contour line',        Icon: PenLine,  toolId: 'observe.topography.contour-line' },
    { id: 'high-point',      label: 'High point',          Icon: Mountain, toolId: 'observe.topography.high-point' },
    { id: 'drainage-line',   label: 'Drainage line',       Icon: Waves,    toolId: 'observe.topography.drainage-line' },
  ],
  'earth-water-ecology': [
    { id: 'watercourse',     label: 'Watercourse',         Icon: Waves,    toolId: 'observe.earth-water-ecology.watercourse' },
    { id: 'soil-sample',     label: 'Soil sample',         Icon: TestTube, toolId: 'observe.earth-water-ecology.soil-sample' },
    { id: 'ecology-zone',    label: 'Ecology zone',        Icon: Sprout,   toolId: 'observe.earth-water-ecology.ecology-zone' },
    { id: 'pasture',         label: 'Pasture / paddock',   Icon: Fence,    toolId: 'observe.earth-water-ecology.pasture' },
    // 2026-05-14 — Berm and Raised bed relocated from the Earthworks BE
    // category (dropped). Use BE toolIds so the existing BE draw pipeline
    // still handles persistence.
    { id: 'be-berm',         label: 'Berm',                Icon: Mountain, toolId: 'observe.built-environment.berm' as MapToolId },
    { id: 'be-raised-bed',   label: 'Raised bed',          Icon: Sprout,   toolId: 'observe.built-environment.raised-bed' as MapToolId },
  ],
  'sectors-zones': [
    { id: 'sun-summer',      label: 'Sun (summer)',        Icon: Sun,      toolId: 'observe.sectors-zones.sun-summer' },
    { id: 'sun-winter',      label: 'Sun (winter)',        Icon: Sunrise,  toolId: 'observe.sectors-zones.sun-winter' },
    { id: 'wind-prevailing', label: 'Wind (prevailing)',   Icon: Wind,     toolId: 'observe.sectors-zones.wind-prevailing' },
    { id: 'wind-storm',      label: 'Wind (storm)',        Icon: Tornado,  toolId: 'observe.sectors-zones.wind-storm' },
    { id: 'fire',            label: 'Fire approach',       Icon: Flame,    toolId: 'observe.sectors-zones.fire' },
    { id: 'noise',           label: 'Noise',               Icon: Volume2,  toolId: 'observe.sectors-zones.noise' },
    { id: 'wildlife',        label: 'Wildlife corridor',   Icon: Bird,     toolId: 'observe.sectors-zones.wildlife' },
    { id: 'view',            label: 'View',                Icon: Eye,      toolId: 'observe.sectors-zones.view' },
    { id: 'permaculture',    label: 'Permaculture zone',   Icon: Target,   toolId: 'observe.sectors-zones.permaculture' },
  ],
  'swot-synthesis': [
    { id: 'strength',        label: 'Strength (S)',        Icon: Shield,      toolId: 'observe.swot-synthesis.strength' },
    { id: 'weakness',        label: 'Weakness (W)',        Icon: ShieldAlert, toolId: 'observe.swot-synthesis.weakness' },
    { id: 'opportunity',     label: 'Opportunity (O)',     Icon: Star,        toolId: 'observe.swot-synthesis.opportunity' },
    { id: 'threat',          label: 'Threat (T)',          Icon: Skull,       toolId: 'observe.swot-synthesis.threat' },
  ],
};

export default function ObserveTools({
  activeModule,
  onSelectModule,
}: ObserveToolsProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  // Match ObserveLayout's projectId normalisation (`params.projectId ?? 'mtc'`)
  // so the homestead selector here reads from the same partitioned-key slot
  // ObserveLayout writes to. Previously this was `?? null`, which meant the
  // tools rail read `byProject[null]` (undefined) while the Place-homestead
  // control wrote under `'mtc'` — the gate never flipped.
  const projectId = params.projectId ?? 'mtc';

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  // Effective anchor reads the explicit homestead first, then falls back
  // to a single-residence centroid per ADR
  // wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md (Option C).
  const { point: effectivePoint, source: effectiveSource } =
    useEffectiveHomestead(projectId);
  const homesteadPlaced = effectivePoint !== null;

  // Telemetry: emit homestead_gate_flip whenever the resolved (placed,
  // source) pair changes so we can measure how often the derivation
  // lands the gate without an explicit Place. Local-only v1 — flushes
  // via console.debug in dev; backend wiring is a one-line swap later.
  const recordObserve = useObserveTelemetry({ projectId });
  const lastGateRef = useRef<{ placed: boolean; source: typeof effectiveSource } | null>(null);
  useEffect(() => {
    const prev = lastGateRef.current;
    const next = { placed: homesteadPlaced, source: effectiveSource };
    if (!prev || prev.placed !== next.placed || prev.source !== next.source) {
      recordObserve({
        module: 'sectors-zones',
        eventType: 'homestead_gate_flip',
        payload: { placed: next.placed, source: next.source },
      });
      lastGateRef.current = next;
    }
  }, [homesteadPlaced, effectiveSource, recordObserve]);

  // Auto-scroll the active module's section into the rail's viewport on
  // activeModule change. `block: 'nearest'` no-ops when the section is already
  // visible — no jitter on already-visible picks. Honors reduced-motion.
  const toolboxRef = useRef<HTMLElement | null>(null);
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
    // Tool clicks must not bubble to the section's module-select handler —
    // picking a draw tool should activate that tool only, not also navigate
    // away from the steward's current module context.
    e.stopPropagation();
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const canSelectModules = Boolean(onSelectModule);

  return (
    <aside
      ref={toolboxRef}
      className={css.toolbox}
      data-has-active={activeModule !== null}
      aria-label="Observe tools"
    >
      {OBSERVE_MODULES.map((mod) => {
        // 2026-05-14 — BE flatten: the parent `built-environment` module
        // is no longer rendered as a rail section; its kinds surface as
        // 9 per-category sections appended after this loop. Slide-up is
        // still reachable via the bottom-rail tile.
        if (mod === 'built-environment') return null;
        const items = TOOL_GROUPS[mod];
        const isActive = mod === activeModule;
        const headerLabel = OBSERVE_MODULE_LABEL[mod];
        // Active sections also act as a button — clicking the active group
        // deselects (mirrors the bottom rail's "click active card" behavior
        // when no slide-up is open). Inactive sections navigate to that
        // module. Both paths run through the same onSelectModule.
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectModule) return;
          onSelectModule(isActive ? null : mod);
        };
        const sectionInteractionProps = canSelectModules
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isActive,
              title: isActive
                ? `Deselect ${headerLabel}`
                : `Switch to ${headerLabel}`,
              onClick: onSectionActivate,
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSectionActivate();
                }
              },
            }
          : {};
        const sectionClassName = [
          css.group,
          isActive ? css.groupActive : '',
          canSelectModules ? css.groupClickable : '',
        ]
          .filter(Boolean)
          .join(' ');
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
            <div className={css.itemGrid}>
              {items.map((it) =>
                renderToolButton(it, {
                  activeTool,
                  homesteadPlaced,
                  onToolClick,
                }),
              )}
            </div>
          </section>
        );
      })}
      {/* 2026-05-14 — Adopt-from-map meta-tool, formerly nested inside the
       *  BE module section. Surfaces as its own leading "From map" section
       *  now that BE is flattened — kept routed to `built-environment` so
       *  click-to-activate still opens the parent BE slide-up. */}
      {(() => {
        const routed: ObserveModule = 'built-environment';
        const isActive = routed === activeModule;
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectModule) return;
          onSelectModule(isActive ? null : routed);
        };
        const sectionInteractionProps = canSelectModules
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isActive,
              title: isActive
                ? 'Deselect Built Environment'
                : 'Switch to Built Environment',
              onClick: onSectionActivate,
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSectionActivate();
                }
              },
            }
          : {};
        const sectionClassName = [
          css.group,
          isActive ? css.groupActive : '',
          canSelectModules ? css.groupClickable : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <section
            key="be-from-map"
            className={sectionClassName}
            data-module={routed}
            {...sectionInteractionProps}
          >
            <header className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>From map</span>
            </header>
            <div className={css.itemGrid}>
              {renderToolButton(
                {
                  id: 'adopt-basemap',
                  label: 'Adopt from map',
                  Icon: MousePointer,
                  toolId: 'observe.built-environment.adopt-basemap',
                },
                {
                  activeTool,
                  homesteadPlaced,
                  onToolClick,
                },
              )}
            </div>
          </section>
        );
      })()}
      {/* 2026-05-14 — Per-`BuiltEnvironmentCategory` top-level rail
       *  sections. Each routes click-to-activate to a relevant
       *  pre-existing Observe module (`BE_CATEGORY_TO_OBSERVE_MODULE`);
       *  tool buttons still dispatch `observe.built-environment.<kind>`
       *  toolIds — only the visual grouping is flat. */}
      {BE_TOOL_GROUPS.map((group) => {
        if (group.items.length === 0) return null;
        // 2026-05-14 — Vegetation BE category suppressed in Observe;
        // mature trees / shrubs are captured under the
        // `earth-water-ecology` module's ecology workflow.
        if (group.category === 'vegetation') return null;
        // 2026-05-14 — Earthworks BE section dropped. Berm and Raised bed
        // now appear inline under Earth-Water-Ecology above; Terrace is
        // appended to the Amenities group below.
        if (group.category === 'earthworks') return null;
        const routed = BE_CATEGORY_TO_OBSERVE_MODULE[group.category];
        const isActive = routed === activeModule;
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectModule) return;
          onSelectModule(isActive ? null : routed);
        };
        const sectionInteractionProps = canSelectModules
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isActive,
              title: isActive
                ? `Deselect ${OBSERVE_MODULE_LABEL[routed]}`
                : `Switch to ${OBSERVE_MODULE_LABEL[routed]}`,
              onClick: onSectionActivate,
              onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSectionActivate();
                }
              },
            }
          : {};
        const sectionClassName = [
          css.group,
          isActive ? css.groupActive : '',
          canSelectModules ? css.groupClickable : '',
        ]
          .filter(Boolean)
          .join(' ');
        const sourceItems =
          group.category === 'amenity'
            ? [
                ...group.items,
                // 2026-05-14 — Terrace relocated from Earthworks BE category.
                ...BE_TOOL_ITEMS.filter((i) => i.kind === 'terrace'),
              ]
            : group.items;
        const groupItems: ToolItem[] = sourceItems.map((bg) => ({
          id: bg.kind,
          label: bg.label,
          Icon: bg.Icon,
          toolId: `observe.built-environment.${bg.kind}` as MapToolId,
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
                renderToolButton(it, {
                  activeTool,
                  homesteadPlaced,
                  onToolClick,
                }),
              )}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

/** Renders a single rail tool button. Extracted from the section loop so
 *  the BE sub-card sub-grid can reuse the exact same disabled / tooltip /
 *  active-state logic as the flat case. */
function renderToolButton(
  it: ToolItem,
  ctx: {
    activeTool: MapToolId | null;
    homesteadPlaced: boolean;
    onToolClick: (
      e: React.MouseEvent<HTMLButtonElement>,
      toolId: MapToolId,
    ) => void;
  },
) {
  const { activeTool, homesteadPlaced, onToolClick } = ctx;
  const needsHomestead = it.id === 'permaculture';
  const disabled = needsHomestead && !homesteadPlaced;
  const title =
    needsHomestead && !homesteadPlaced
      ? `${it.label} — place homestead first via the map "Place homestead" control`
      : it.label;
  const isToolActive = activeTool === it.toolId;
  return (
    <DelayedTooltip key={it.id} label={title} position="top">
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
