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
  Container,
  Disc,
  Droplet,
  FolderOpen,
  Recycle,
  Route,
  Sprout,
  Square,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import {
  useMapToolStore,
  type MapToolId,
} from '../observe/components/measure/useMapToolStore.js';
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

/** Modules with map-first draw tools. Others fall back to "Open module". */
const TOOL_GROUPS: Partial<Record<PlanModule, ToolItem[]>> = {
  'water-management': [
    { id: 'catchment', label: 'Catchment', Icon: Droplet,   toolId: 'plan.water-management.catchment' },
    { id: 'storage',   label: 'Storage',   Icon: Container, toolId: 'plan.water-management.storage' },
    { id: 'swale',     label: 'Swale',     Icon: Waves,     toolId: 'plan.water-management.swale' },
    { id: 'sink',      label: 'Sink',      Icon: Disc,      toolId: 'plan.water-management.sink' },
  ],
  'zone-circulation': [
    { id: 'zone', label: 'Zone', Icon: Square, toolId: 'plan.zone-circulation.zone' },
    { id: 'path', label: 'Path', Icon: Route,  toolId: 'plan.zone-circulation.path' },
  ],
  'plant-systems': [
    { id: 'crop-area', label: 'Crop area', Icon: Sprout, toolId: 'plan.plant-systems.crop-area' },
  ],
  'soil-fertility': [
    { id: 'fertility-unit', label: 'Fertility unit', Icon: Recycle, toolId: 'plan.soil-fertility.fertility-unit' },
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
                {items.map((it) => {
                  const isToolActive = activeTool === it.toolId;
                  const disabled = !projectId;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={css.toolItem}
                      data-active={isToolActive ? 'true' : 'false'}
                      disabled={disabled}
                      aria-pressed={isToolActive}
                      title={
                        disabled
                          ? `${it.label} — open a project to use`
                          : it.label
                      }
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
            ) : (
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
                title={`Open ${headerLabel} module`}
              >
                <FolderOpen size={14} strokeWidth={1.6} />
                <span>Open module</span>
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
