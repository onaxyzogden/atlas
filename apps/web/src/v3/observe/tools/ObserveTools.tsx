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

import { useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  Bird,
  Eye,
  Flame,
  MapPin,
  Mountain,
  PenLine,
  Pencil,
  Shield,
  ShieldAlert,
  Skull,
  Snowflake,
  Sprout,
  Star,
  Sun,
  Sunrise,
  TestTube,
  Target,
  Tornado,
  Users,
  Volume2,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useHomesteadStore } from '../../../store/homesteadStore.js';
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

const TOOL_GROUPS: Record<ObserveModule, ToolItem[]> = {
  'human-context': [
    { id: 'neighbour-pin',   label: 'Neighbour pin',       Icon: MapPin,   toolId: 'observe.human-context.neighbour-pin' },
    { id: 'steward',         label: 'Steward / household', Icon: Users,    toolId: 'observe.human-context.steward' },
    { id: 'access-road',     label: 'Access road',         Icon: Pencil,   toolId: 'observe.human-context.access-road' },
  ],
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
  const projectId = params.projectId ?? null;

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const homestead = useHomesteadStore((s) =>
    projectId ? s.byProject[projectId] : undefined,
  );
  const homesteadPlaced = Boolean(homestead);

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

  const canSelectModules = Boolean(onSelectModule && projectId);

  return (
    <aside className={css.toolbox} aria-label="Observe tools">
      {OBSERVE_MODULES.map((mod) => {
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
              {items.map((it) => {
                const needsHomestead = it.id === 'permaculture';
                const disabled =
                  !projectId || (needsHomestead && !homesteadPlaced);
                const title = !projectId
                  ? `${it.label} — open a project to use`
                  : needsHomestead && !homesteadPlaced
                    ? `${it.label} — place homestead first via the map "Place homestead" control`
                    : it.label;
                const isToolActive = activeTool === it.toolId;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={css.toolItem}
                    data-active={isToolActive ? 'true' : 'false'}
                    disabled={disabled}
                    aria-pressed={isToolActive}
                    title={title}
                    onClick={(e) => onToolClick(e, it.toolId)}
                  >
                    <span className={css.toolGlyph} aria-hidden="true">
                      <it.Icon size={16} strokeWidth={1.6} />
                    </span>
                    <span className={css.toolLabel}>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
