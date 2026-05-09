/**
 * PlanSelectionFloater — Plan-stage analogue of Observe's SelectionFloater.
 * Renders a pill bar above the bottom rail when at least one Plan feature
 * is selected. Wires three actions:
 *
 *   - Edit vertices (only when exactly one polygon kind is selected) → sets
 *     the `planVertexEditStore.target` so `PlanVertexEditHandler` mounts a
 *     MapboxDraw `direct_select` instance for that feature.
 *   - Delete (any selection size) → removes each selected record from its
 *     namespace store. Each removal lands as a separate undo step.
 *   - Clear (always) → drops the selection. Esc keydown also clears.
 */

import { useEffect } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import {
  usePlanSelectionStore,
  type PlanSelectionItem,
} from '../../store/planSelectionStore.js';
import {
  usePlanVertexEditStore,
  type PlanVertexEditKind,
} from '../../store/planVertexEditStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useUtilityRunStore } from '../../store/utilityRunStore.js';
import { useSetbackStore } from '../../store/setbackStore.js';
import { useFlowConnectorStore } from '../../store/flowConnectorStore.js';
import { useMonitoringTransectStore } from '../../store/monitoringTransectStore.js';
import css from '../observe/components/SelectionFloater.module.css';

const KIND_LABEL: Record<PlanSelectionItem['kind'], string> = {
  guild: 'Guild',
  zone: 'Zone',
  crop: 'Crop area',
  paddock: 'Paddock',
  path: 'Path',
  structure: 'Structure',
  fertility: 'Fertility node',
  water: 'Water node',
  utility: 'Utility run',
  setback: 'Setback ring',
  flow: 'Flow connector',
  transect: 'Monitoring transect',
};

const POLYGON_KINDS: ReadonlySet<PlanSelectionItem['kind']> = new Set([
  'zone',
  'crop',
  'paddock',
  'structure',
]);

function removeOne(item: PlanSelectionItem): void {
  switch (item.kind) {
    case 'zone':
      useZoneStore.getState().deleteZone(item.id);
      return;
    case 'crop':
      useCropStore.getState().deleteCropArea(item.id);
      return;
    case 'paddock':
      useLivestockStore.getState().deletePaddock(item.id);
      return;
    case 'path':
      usePathStore.getState().deletePath(item.id);
      return;
    case 'structure':
      useStructureStore.getState().deleteStructure(item.id);
      return;
    case 'fertility':
      useClosedLoopStore.getState().removeFertilityInfra(item.id);
      return;
    case 'guild':
      usePolycultureStore.getState().removeGuild(item.id);
      return;
    case 'utility':
      useUtilityRunStore.getState().deleteRun(item.id);
      return;
    case 'setback':
      useSetbackStore.getState().deleteRing(item.id);
      return;
    case 'flow':
      useFlowConnectorStore.getState().deleteConnector(item.id);
      return;
    case 'transect':
      useMonitoringTransectStore.getState().deleteTransect(item.id);
      return;
    case 'water':
      // Water nodes have a richer graph (catchment ↔ storage ↔ sink with
      // overflow targeting); deletion routes through the WaterNetworkCard
      // slide-up rather than the floater. Falling through here is
      // intentional — the floater only clears the selection.
      return;
  }
}

export default function PlanSelectionFloater() {
  const items = usePlanSelectionStore((s) => s.items);
  const clear = usePlanSelectionStore((s) => s.clear);
  const setVertexTarget = usePlanVertexEditStore((s) => s.setTarget);

  useEffect(() => {
    if (items.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items.length, clear]);

  if (items.length === 0) return null;

  const single = items.length === 1 ? items[0] : null;
  const vertexEnabled = Boolean(
    single && POLYGON_KINDS.has(single.kind),
  );

  const onEditVertices = () => {
    if (!single) return;
    if (!POLYGON_KINDS.has(single.kind)) return;
    setVertexTarget({
      kind: single.kind as PlanVertexEditKind,
      id: single.id,
    });
  };

  const onDelete = () => {
    const n = items.length;
    const label =
      n === 1 && single
        ? KIND_LABEL[single.kind].toLowerCase()
        : `${n} items`;
    if (!confirm(`Delete ${label}?`)) return;
    for (const item of items) {
      removeOne(item);
    }
    clear();
  };

  const countLabel = single
    ? KIND_LABEL[single.kind]
    : `${items.length} selected`;

  return (
    <div className={css.floater} role="toolbar" aria-label="Plan selection actions">
      <span className={css.count}>{countLabel}</span>
      <div className={css.divider} aria-hidden="true" />
      <button
        type="button"
        className={css.btn}
        onClick={onEditVertices}
        disabled={!vertexEnabled}
        title={
          vertexEnabled
            ? 'Edit polygon vertices'
            : single
              ? 'Vertex edit only available for polygons'
              : 'Select a single polygon to edit its vertices'
        }
      >
        <Pencil aria-hidden="true" />
        <span>Edit vertices</span>
      </button>
      <button
        type="button"
        className={`${css.btn} ${css.btnDanger}`}
        onClick={onDelete}
        title="Delete selected"
      >
        <Trash2 aria-hidden="true" />
        <span>Delete</span>
      </button>
      <div className={css.divider} aria-hidden="true" />
      <button
        type="button"
        className={css.btn}
        onClick={() => clear()}
        title="Clear selection (Esc)"
      >
        <X aria-hidden="true" />
        <span>Clear</span>
      </button>
    </div>
  );
}
