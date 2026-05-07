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
  TestTube,
  Target,
  Users,
  Waves,
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
    { id: 'sun-wind-wedge',  label: 'Sun/wind wedge',      Icon: Sun,      toolId: 'observe.sectors-zones.sun-wind-wedge' },
    { id: 'permaculture',    label: 'Permaculture zone',   Icon: Target,   toolId: 'observe.sectors-zones.permaculture' },
  ],
  'swot-synthesis': [
    { id: 'strength',        label: 'Strength (S)',        Icon: Shield,      toolId: 'observe.swot-synthesis.strength' },
    { id: 'weakness',        label: 'Weakness (W)',        Icon: ShieldAlert, toolId: 'observe.swot-synthesis.weakness' },
    { id: 'opportunity',     label: 'Opportunity (O)',     Icon: Star,        toolId: 'observe.swot-synthesis.opportunity' },
    { id: 'threat',          label: 'Threat (T)',          Icon: Skull,       toolId: 'observe.swot-synthesis.threat' },
  ],
};

export default function ObserveTools({ activeModule }: ObserveToolsProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const homestead = useHomesteadStore((s) =>
    projectId ? s.byProject[projectId] : undefined,
  );
  const homesteadPlaced = Boolean(homestead);

  const onToolClick = (toolId: MapToolId) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  return (
    <aside className={css.toolbox} aria-label="Observe tools">
      {OBSERVE_MODULES.map((mod) => {
        const items = TOOL_GROUPS[mod];
        const isActive = mod === activeModule;
        return (
          <section
            key={mod}
            className={`${css.group} ${isActive ? css.groupActive : ''}`}
            data-module={mod}
          >
            <header className={css.groupHeader}>
              <span className={css.dot} aria-hidden="true" />
              <span className={css.groupLabel}>{OBSERVE_MODULE_LABEL[mod]}</span>
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
                    onClick={() => onToolClick(it.toolId)}
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
