/**
 * ActStructurePopover — read-only inspector anchored at the click point on
 * a placed Plan-stage structure (barn, greenhouse, well, etc.) when viewed
 * from the Act stage. Pairs with `ActStructureClickHandler` (opens the
 * popover) and a gated `<PlanDataLayers ... editable={false} />` (so the
 * Plan-stage edit form does not also fire).
 *
 * Phase 2: read-only. Shows type icon + label, optional name, phase,
 * rotation, footprint dimensions, category. Action buttons (Log
 * maintenance, Log livestock move, Log harvest) land in Phase 3 when the
 * Act log stores grow a `structureId` link.
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useActStructurePopoverStore } from '../../store/actStructurePopoverStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES } from '../../features/structures/footprints.js';
import { getActionsForType, ACTION_LABELS } from './data/structureActions.js';
import {
  startMaintenanceLog,
  startLivestockMoveLog,
  startHarvestLog,
} from './ActStructurePopover.actions.js';
import css from './ActStructurePopover.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

export default function ActStructurePopover({ map, projectId }: Props) {
  const active = useActStructurePopoverStore((s) => s.active);
  const close = useActStructurePopoverStore((s) => s.close);
  const structures = useStructureStore((s) => s.structures);

  const [screen, setScreen] = useState<{ x: number; y: number; flipped: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const structure = active
    ? structures.find((s) => s.id === active.structureId) ?? null
    : null;

  // Auto-close if the structure was deleted while the popover was open.
  useEffect(() => {
    if (active && !structure) close();
  }, [active, structure, close]);

  // Track anchor → screen coords; re-project on map move/zoom/resize.
  useEffect(() => {
    if (!active) {
      setScreen(null);
      return;
    }
    const POPOVER_WIDTH = 280;
    const recalc = () => {
      const p = map.project(active.anchor);
      const canvasW = map.getCanvas().clientWidth;
      const flipped = p.x + POPOVER_WIDTH + 24 > canvasW;
      setScreen({ x: p.x, y: p.y, flipped });
    };
    recalc();
    map.on('move', recalc);
    map.on('zoom', recalc);
    map.on('resize', recalc);
    return () => {
      map.off('move', recalc);
      map.off('zoom', recalc);
      map.off('resize', recalc);
    };
  }, [active, map]);

  // ESC closes
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  // Click-outside closes
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const node = popoverRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [active, close]);

  if (!active || !structure || !screen) return null;

  const tpl = STRUCTURE_TEMPLATES[structure.type];
  const phase = structure.phase || '—';
  const rotationDeg = Math.round(((structure.rotationDeg % 360) + 360) % 360);
  const dims = `${tpl.widthM} × ${tpl.depthM} m`;
  const showName = structure.name && structure.name !== tpl.label;

  return (
    <div
      ref={popoverRef}
      className={css.popover}
      data-flipped={screen.flipped ? 'true' : 'false'}
      style={{ left: screen.x, top: screen.y }}
      role="dialog"
      aria-label={`${tpl.label} inspector`}
    >
      <div className={css.header}>
        <span className={css.icon} aria-hidden>{tpl.icon}</span>
        <div className={css.headerText}>
          <span className={css.title}>{tpl.label}</span>
          {showName ? <span className={css.subtitle}>{structure.name}</span> : null}
        </div>
      </div>

      <div className={css.metaGrid}>
        <div className={css.metaCell}>
          <span className={css.metaLabel}>Phase</span>
          <span className={css.metaValue}>{phase}</span>
        </div>
        <div className={css.metaCell}>
          <span className={css.metaLabel}>Rotation</span>
          <span className={css.metaValue}>{rotationDeg}°</span>
        </div>
        <div className={css.metaCell}>
          <span className={css.metaLabel}>Footprint</span>
          <span className={css.metaValue}>{dims}</span>
        </div>
        <div className={css.metaCell}>
          <span className={css.metaLabel}>Category</span>
          <span className={css.metaValue}>{tpl.category}</span>
        </div>
      </div>

      <div className={css.note}>
        Read-only — edit in Plan stage.
      </div>

      <div className={css.btnRow}>
        {projectId
          ? getActionsForType(structure.type).map((kind) => (
              <button
                key={kind}
                type="button"
                className={css.secondaryBtn}
                onClick={() => {
                  if (kind === 'maintenance') startMaintenanceLog(structure, projectId);
                  else if (kind === 'livestockMove') startLivestockMoveLog(structure, projectId);
                  else if (kind === 'harvest') startHarvestLog(structure, projectId);
                }}
              >
                {ACTION_LABELS[kind]}
              </button>
            ))
          : null}
        <button type="button" className={css.secondaryBtn} onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}
