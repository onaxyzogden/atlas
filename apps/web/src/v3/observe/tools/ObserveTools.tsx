/**
 * ObserveTools — left-rail tool palette for the Observe stage.
 *
 * 2026-05-24 — Stage Compass focus (mirrors Goal 2's right-rail change): the
 * rail follows the compass's single-objective focus. It renders ONLY the tool
 * section(s) belonging to the chosen objective (active module) — so the steward
 * sees just the tools needed to complete it, not every module's palette. With
 * no objective selected, a quiet prompt links back to the Stage Compass. All
 * section-rendering code is preserved (gated on the active module), not removed.
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
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  Bird,
  Eye,
  Fence,
  Flag,
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
  Spline,
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
  Wheat,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import {
  BE_TOOL_ITEMS,
  BE_TOOL_GROUPS,
} from '../../_shared/builtEnvironmentTools.js';
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
import { BE_CATEGORY_TO_OBSERVE_MODULE } from '../observeSectionMap.js';
import css from './ObserveTools.module.css';

interface ObserveToolsProps {
  activeModule: ObserveModule | null;
  /**
   * The reconciled picked-section id (owned by `ObserveLayout`, shared with
   * the mini rail). Non-null → exactly that section lights; null → fall back
   * to whole-family module-equality highlight.
   */
  effectiveSectionId: string | null;
  /**
   * Optional handler to narrow / toggle the cross-rail section highlight.
   * When provided, each section becomes a button: clicking an inactive
   * section narrows to it (and navigates to its module); clicking the sole-
   * active section deselects. Section ids reuse each section's React `key`
   * (`mod`, `be-from-map`, or `be-<category>`).
   */
  onSelectSection?: (module: ObserveModule, sectionId: string) => void;
  /**
   * Objective Focus Mode: when provided, the rail shows ONLY these tools (and
   * hides any section left with no allowed tools). Lets a launched objective
   * narrow the palette to exactly the tools its field work needs. Omitted in
   * normal module browsing, where the active module's full palette shows.
   */
  restrictToTools?: MapToolId[];
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

const TOOL_GROUPS: Record<ObserveModule, ToolItem[]> = {
  'people-governance': [
    { id: 'neighbour-pin',   label: 'Neighbour pin',       Icon: MapPin,   toolId: 'observe.human-context.neighbour-pin' },
    { id: 'steward',         label: 'Steward / household', Icon: Users,    toolId: 'observe.human-context.steward' },
    { id: 'access-road',     label: 'Access road',         Icon: Pencil,   toolId: 'observe.human-context.access-road' },
  ],
  'built-infrastructure': BE_TOOLS,
  'climate': [
    { id: 'frost-pocket',    label: 'Frost pocket',        Icon: Snowflake, toolId: 'observe.macroclimate-hazards.frost-pocket' },
    { id: 'hazard-zone',     label: 'Hazard zone',         Icon: AlertTriangle, toolId: 'observe.macroclimate-hazards.hazard-zone' },
  ],
  topography: [
    { id: 'contour-line',    label: 'Contour line',        Icon: PenLine,  toolId: 'observe.topography.contour-line' },
    { id: 'high-point',      label: 'High point',          Icon: Mountain, toolId: 'observe.topography.high-point' },
    { id: 'drainage-line',   label: 'Drainage line',       Icon: Waves,    toolId: 'observe.topography.drainage-line' },
    { id: 'erosion-flag',    label: 'Erosion flag',        Icon: Flag,     toolId: 'observe.topography.erosion-flag' },
    { id: 'runoff-path',     label: 'Runoff path',         Icon: Spline,   toolId: 'observe.topography.runoff-path' },
  ],
  'hydrology': [
    { id: 'watercourse',     label: 'Watercourse',         Icon: Waves,    toolId: 'observe.earth-water-ecology.watercourse' },
    { id: 'soil-sample',     label: 'Soil sample',         Icon: TestTube, toolId: 'observe.earth-water-ecology.soil-sample' },
    { id: 'vegetation',      label: 'Vegetation & cover',  Icon: Sprout,   toolId: 'observe.earth-water-ecology.vegetation' },
  ],
  'access-circulation': [
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
  'monitoring-records': [
    { id: 'strength',        label: 'Strength (S)',        Icon: Shield,      toolId: 'observe.swot-synthesis.strength' },
    { id: 'weakness',        label: 'Weakness (W)',        Icon: ShieldAlert, toolId: 'observe.swot-synthesis.weakness' },
    { id: 'opportunity',     label: 'Opportunity (O)',     Icon: Star,        toolId: 'observe.swot-synthesis.opportunity' },
    { id: 'threat',          label: 'Threat (T)',          Icon: Skull,       toolId: 'observe.swot-synthesis.threat' },
  ],
  // Unauthored Observe domains — empty tool lists.
  'vision-intent': [],
  'land-base': [],
  soil: [],
  ecology: [],
  'plants-food': [],
  'animals-livestock': [],
  'energy-resources': [],
  'economics-capacity': [],
  'risk-compliance': [],
};

export default function ObserveTools({
  activeModule,
  effectiveSectionId,
  onSelectSection,
  restrictToTools,
}: ObserveToolsProps) {
  // Objective Focus Mode tool gate. Null set → no restriction (normal browse).
  const restrictSet = restrictToTools ? new Set(restrictToTools) : null;
  const allowTool = (toolId: MapToolId) =>
    restrictSet === null || restrictSet.has(toolId);
  const params = useParams({ strict: false }) as { projectId?: string };
  const navigate = useNavigate();
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
        // Telemetry vocab in observeInteractionLog is pinned to legacy
        // analytics dimension; intentionally not on UniversalDomain.
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

  const canSelectModules = Boolean(onSelectSection);

  // 2026-05-24 — Stage Compass focus: with no objective selected, show a quiet
  // prompt back to the compass instead of every module's tool palette. Mirrors
  // the right-rail ObserveChecklistAside empty state (Goal 2).
  if (activeModule === null) {
    return (
      <aside
        ref={toolboxRef}
        className={css.toolbox}
        data-has-active={false}
        aria-label="Observe tools"
      >
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below to choose your next objective.
          </p>
          {params.projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/observe',
                  params: { projectId: params.projectId! },
                })
              }
            >
              Back to Observe
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Focus mode: render ONLY the section(s) belonging to the chosen objective.
  // Built Environment is one objective surfaced as its "From map" meta-section
  // plus its per-category sections; every other module is a single section.
  const showBuiltEnvironment = activeModule === 'built-infrastructure';

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
        if (mod === 'built-infrastructure') return null;
        // Focus mode: only the chosen objective's section renders. `activeModule`
        // is non-null here (empty state returned above), so this yields exactly
        // one non-BE section.
        if (mod !== activeModule) return null;
        const items = TOOL_GROUPS[mod].filter((it) => allowTool(it.toolId));
        // Focus mode may filter every tool out of this module — hide the
        // empty section rather than render a header with no buttons.
        if (items.length === 0) return null;
        const isActive =
          effectiveSectionId !== null
            ? effectiveSectionId === mod
            : mod === activeModule;
        const headerLabel = OBSERVE_MODULE_LABEL[mod];
        // Active sections also act as a button — clicking the sole-active
        // section deselects (handled in `onSelectSection`'s toggle). Inactive
        // sections narrow the cross-rail highlight to this module. Section id
        // reuses the React `key` (`mod`).
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectSection) return;
          onSelectSection(mod, mod);
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
      {showBuiltEnvironment && (() => {
        const routed: ObserveModule = 'built-infrastructure';
        const sectionId = 'be-from-map';
        const adoptCandidates: ToolItem[] = [
          {
            id: 'adopt-basemap',
            label: 'Adopt from map',
            Icon: MousePointer,
            toolId: 'observe.built-environment.adopt-basemap',
          },
          {
            id: 'adopt-water',
            label: 'Adopt water',
            Icon: Waves,
            toolId: 'observe.earth-water-ecology.adopt-water',
          },
        ];
        const adoptItems = adoptCandidates.filter((it) => allowTool(it.toolId));
        // Focus mode may exclude both adopt meta-tools — hide the section.
        if (adoptItems.length === 0) return null;
        const isActive =
          effectiveSectionId !== null
            ? effectiveSectionId === sectionId
            : routed === activeModule;
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectSection) return;
          onSelectSection(routed, sectionId);
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
              {adoptItems.map((it) =>
                renderToolButton(it, {
                  activeTool,
                  homesteadPlaced,
                  onToolClick,
                }),
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
        // Focus mode: only categories belonging to the chosen objective render.
        // (vegetation→EWE / earthworks→topography already skipped above; the
        // remaining six all route to built-environment.)
        if (routed !== activeModule) return null;
        const sectionId = `be-${group.category}`;
        const isActive =
          effectiveSectionId !== null
            ? effectiveSectionId === sectionId
            : routed === activeModule;
        const onSectionActivate = () => {
          if (!canSelectModules || !onSelectSection) return;
          onSelectSection(routed, sectionId);
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
            : group.category === 'agricultural'
              ? [
                  ...group.items,
                  // 2026-05-21 — Pasture & Conventional crop relocated from
                  // the earth-water-ecology module group. EWE-prefixed
                  // toolIds preserved below so the existing draw + store
                  // pipeline is unchanged; only the rail grouping moves.
                  { kind: 'pasture',           label: 'Pasture / paddock', Icon: Fence },
                  { kind: 'conventional-crop', label: 'Conventional crop', Icon: Wheat },
                  // 2026-05-21 — Berm + Raised bed relocated here from EWE
                  // (originally moved out of the dropped Earthworks BE
                  // section on 2026-05-14). BE toolIds preserved.
                  ...BE_TOOL_ITEMS.filter(
                    (i) => i.kind === 'berm' || i.kind === 'raised-bed',
                  ),
                ]
              : group.items;
        const groupItems: ToolItem[] = sourceItems
          .map((bg) => {
            let toolId: MapToolId;
            if (bg.kind === 'pasture') {
              toolId = 'observe.earth-water-ecology.pasture';
            } else if (bg.kind === 'conventional-crop') {
              toolId = 'observe.earth-water-ecology.conventional-crop';
            } else {
              toolId = `observe.built-environment.${bg.kind}` as MapToolId;
            }
            return { id: bg.kind, label: bg.label, Icon: bg.Icon, toolId };
          })
          .filter((it) => allowTool(it.toolId));
        // Focus mode may filter every kind out of this BE category — hide it.
        if (groupItems.length === 0) return null;
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
