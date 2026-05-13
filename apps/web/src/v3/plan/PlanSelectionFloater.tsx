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
import { Pencil, Trash2, Trees, X } from 'lucide-react';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
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
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useUtilityRunStore } from '../../store/utilityRunStore.js';
import { useSetbackStore } from '../../store/setbackStore.js';
import { useFlowConnectorStore } from '../../store/flowConnectorStore.js';
import { useMonitoringTransectStore } from '../../store/monitoringTransectStore.js';
import {
  getDesignElementsForProject,
  removeDesignElement,
  removeStructure,
} from '../../store/builtEnvironmentSelectors.js';
import * as turf from '@turf/turf';
import { useInlineFormStore } from './draw/inlineFormStore.js';
import { buildPaddockEditSchema } from './layers/inlineEditSchemas.js';
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
  'design-element': 'Design element',
};

const POLYGON_KINDS: ReadonlySet<PlanSelectionItem['kind']> = new Set([
  'zone',
  'crop',
  'paddock',
  'structure',
  // `design-element` is polygon-eligible too, but only when the specific
  // record's geometry is a Polygon — checked dynamically below.
  'design-element',
]);

/** Returns the geometry type for a design-element selection (used to
 *  decide whether Edit-vertices is available). */
function designElementGeometryType(
  projectId: string | undefined,
  id: string,
): GeoJSON.Geometry['type'] | null {
  if (!projectId) return null;
  const list = getDesignElementsForProject(projectId);
  const el = list.find((e) => e.id === id);
  return el?.geometry.type ?? null;
}

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
      removeStructure(item.id);
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
    case 'design-element':
      if (!item.projectId) return;
      removeDesignElement(item.projectId, item.id);
      return;
  }
}

interface Props {
  onOpenGuildBuilder?: () => void;
}

export default function PlanSelectionFloater({ onOpenGuildBuilder }: Props = {}) {
  const items = usePlanSelectionStore((s) => s.items);
  const clear = usePlanSelectionStore((s) => s.clear);
  const setVertexTarget = usePlanVertexEditStore((s) => s.setTarget);

  const single = items.length === 1 ? items[0] : null;
  const guildId = single?.kind === 'guild' ? single.id : null;
  const guild = usePolycultureStore((s) =>
    guildId ? s.guilds.find((g) => g.id === guildId) ?? null : null,
  );

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

  const isPolygonSelection = (item: PlanSelectionItem): boolean => {
    if (!POLYGON_KINDS.has(item.kind)) return false;
    if (item.kind === 'design-element') {
      return designElementGeometryType(item.projectId, item.id) === 'Polygon';
    }
    return true;
  };

  const vertexEnabled = Boolean(single && isPolygonSelection(single));

  const onEditVertices = () => {
    if (!single) return;
    if (!isPolygonSelection(single)) return;
    setVertexTarget({
      kind: single.kind as PlanVertexEditKind,
      id: single.id,
      projectId: single.projectId,
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
    ? single.kind === 'guild' && guild
      ? `${guild.name || 'Guild'} · ${guild.members.length} member${
          guild.members.length === 1 ? '' : 's'
        }`
      : KIND_LABEL[single.kind]
    : `${items.length} selected`;

  const onOpenPaddockEdit = () => {
    if (!single || single.kind !== 'paddock') return;
    const pd = useLivestockStore
      .getState()
      .paddocks.find((p) => p.id === single.id);
    if (!pd) return;
    const centroid = turf.centroid(turf.feature(pd.geometry));
    const [lng, lat] = centroid.geometry.coordinates as [number, number];
    const updatePaddock = useLivestockStore.getState().updatePaddock;
    useInlineFormStore.getState().open({
      ...buildPaddockEditSchema(pd, updatePaddock),
      anchor: [lng, lat],
    });
  };

  return (
    <div className={css.floater} role="toolbar" aria-label="Plan selection actions">
      {single?.kind === 'paddock' ? (
        <button
          type="button"
          className={css.count}
          onClick={onOpenPaddockEdit}
          title="Edit paddock"
          style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
        >
          {countLabel}
        </button>
      ) : (
        <span className={css.count}>{countLabel}</span>
      )}
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip
        label={
          vertexEnabled
            ? 'Edit polygon vertices'
            : single
              ? 'Vertex edit only available for polygons'
              : 'Select a single polygon to edit its vertices'
        }
        position="top"
      >
        <button
          type="button"
          className={css.btn}
          onClick={onEditVertices}
          disabled={!vertexEnabled}
        >
          <Pencil aria-hidden="true" />
          <span>Edit vertices</span>
        </button>
      </DelayedTooltip>
      {single?.kind === 'guild' && onOpenGuildBuilder ? (
        <DelayedTooltip label="Open in Guild Builder" position="top">
          <button
            type="button"
            className={css.btn}
            onClick={onOpenGuildBuilder}
          >
            <Trees aria-hidden="true" />
            <span>Open Guild Builder</span>
          </button>
        </DelayedTooltip>
      ) : null}
      <DelayedTooltip label="Delete selected" position="top">
        <button
          type="button"
          className={`${css.btn} ${css.btnDanger}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          <span>Delete</span>
        </button>
      </DelayedTooltip>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip label="Clear selection (Esc)" position="top">
        <button type="button" className={css.btn} onClick={() => clear()}>
          <X aria-hidden="true" />
          <span>Clear</span>
        </button>
      </DelayedTooltip>
    </div>
  );
}
