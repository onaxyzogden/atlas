/**
 * DesignToolRail — right-edge floating tool column for the Vision-Layout canvas.
 *
 * Wires:
 *   - Select / Pan: a tool-mode toggle. Select mode arms a map click handler
 *     that queries the `design-el-*` layers for the topmost feature under the
 *     cursor and stores its id; Duplicate then operates on that selection.
 *   - Draw (Pencil): reflects the palette's `activeKind`. When a draw is
 *     armed, clicking the pencil disarms via `onDisarmDraw`.
 *   - Duplicate: clones the selected element via the design-elements store,
 *     offset by a small lng/lat delta so the clone is visible.
 *   - Zoom +/-: MapLibre `zoomIn` / `zoomOut`.
 *   - Layers: opens a small popover toggling the visibility of the
 *     `design-el-*` map layers (polygons / lines / points / labels).
 *   - Export: opens a popover that captures the live map and POSTs one of the
 *     four sheet PDFs (Master Plan / Base Map / Zone Map / Planting Plan) via
 *     `useMapSheetExport`. Mutually exclusive with the Layers popover.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Copy,
  FileDown,
  Hand,
  Layers,
  Loader2,
  MousePointer2,
  Pencil,
  Plus,
  Minus,
} from 'lucide-react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import {
  addDesignElement,
  useDesignElementsForProject,
} from '../../../store/builtEnvironmentSelectors.js';
import type { DesignElement } from '../../../store/designElementsStore.js';
import { usePlanSelectionStore } from '../../../store/planSelectionStore.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';
import { useMapSheetExport } from '../useMapSheetExport.js';
import { NOT_SYNCED_EXPORT_TITLE } from '../../../hooks/useServerProjectId.js';
import { SHEET_EXPORTS, SHEET_LABEL } from '../MapSheetExportControl.js';
import { DEMO_OFFLINE_ENABLED } from '../../../app/demoSession.js';
import css from './DesignToolRail.module.css';

export type ToolMode = 'pan' | 'select';

interface Props {
  map: MaplibreMap;
  /** Active draw kind from the palette; pencil button highlights when set. */
  activeKind: string | null;
  /** Project id — used by Duplicate to clone into the right collection. */
  projectId: string;
  /** Optional callback to disarm an active palette draw tool. */
  onDisarmDraw?: () => void;
  /** Selected design element id — owned by VisionLayoutCanvas so the
   *  DesignElementLayers feature-state highlight can read the same value. */
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  /** Tool mode (pan/select) — lifted to VisionLayoutCanvas so the
   *  centralized useMapCursor effect can read the same value. */
  mode: ToolMode;
  setMode: Dispatch<SetStateAction<ToolMode>>;
}

const DESIGN_QUERY_LAYERS = [
  'design-el-poly-fill',
  'design-el-line',
  'design-el-point',
];

const VISIBILITY_LAYERS: Array<{ key: string; label: string; ids: string[] }> = [
  { key: 'poly',   label: 'Polygons', ids: ['design-el-poly-fill', 'design-el-poly-line'] },
  { key: 'line',   label: 'Lines',    ids: ['design-el-line'] },
  { key: 'point',  label: 'Points',   ids: ['design-el-point'] },
  { key: 'label',  label: 'Labels',   ids: ['design-el-label'] },
];

const DUPLICATE_OFFSET_DEG = 0.00015; // ~15 m in lat — small visual nudge

function offsetGeometry(
  g: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon,
  d: number,
): GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon {
  if (g.type === 'Point') {
    const [lng, lat] = g.coordinates;
    return { ...g, coordinates: [lng! + d, lat! + d] };
  }
  if (g.type === 'LineString') {
    return {
      ...g,
      coordinates: g.coordinates.map(([lng, lat]) => [lng! + d, lat! + d]),
    };
  }
  return {
    ...g,
    coordinates: g.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lng! + d, lat! + d]),
    ),
  };
}

export default function DesignToolRail({
  map,
  activeKind,
  projectId,
  onDisarmDraw,
  selectedId,
  setSelectedId,
  mode,
  setMode,
}: Props) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const railRef = useRef<HTMLDivElement>(null);

  const elements = useDesignElementsForProject(projectId);
  const setPlanSelection = usePlanSelectionStore((s) => s.set);
  const clearPlanSelection = usePlanSelectionStore((s) => s.clear);

  // Captured-map PDF export — shares the orchestration with the legacy
  // floating MapSheetExportControl via this hook. Open/close lives here so the
  // export popover coordinates with the Layers popover (mutually exclusive).
  const { generatingType, error: exportError, downloadUrl, handleExport, canExport } =
    useMapSheetExport(map, projectId);

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  // ── Select mode: pick design features on click ─────────────────────────
  useEffect(() => {
    if (mode !== 'select') return;
    const onClick = (e: MapMouseEvent) => {
      const layerIds = DESIGN_QUERY_LAYERS.filter((id) => map.getLayer(id));
      if (layerIds.length === 0) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
      const props = feats[0]?.properties as
        | { id?: string; editable?: boolean }
        | undefined;
      const id = props?.id ?? null;
      setSelectedId(id);
      // Mirror the selection into planSelectionStore so the shared
      // PlanSelectionFloater appears with Edit-vertices / Delete actions.
      // Only push when the feature is editable on the active view — a
      // current-origin element rendered on a non-current view is
      // read-only and shouldn't fire the edit floater.
      if (id && props?.editable !== false) {
        setPlanSelection([{ kind: 'design-element', id, projectId }]);
      } else {
        clearPlanSelection();
      }
    };
    map.on('click', onClick);
    return () => {
      try {
        map.off('click', onClick);
      } catch {
        /* map disposed */
      }
    };
  }, [map, mode, setSelectedId, setPlanSelection, clearPlanSelection, projectId]);

  // ── Layers panel: apply visibility to map layers ───────────────────────
  useEffect(() => {
    for (const group of VISIBILITY_LAYERS) {
      const isHidden = hidden[group.key] === true;
      for (const id of group.ids) {
        if (!map.getLayer(id)) continue;
        try {
          map.setLayoutProperty(id, 'visibility', isHidden ? 'none' : 'visible');
        } catch {
          /* layer style not ready yet — re-runs after style.load via parent */
        }
      }
    }
  }, [map, hidden, elements]); // re-run when elements arrive (layers might mount late)

  // ── Click-outside: close the Layers / Export popovers ──────────────────
  useEffect(() => {
    if (!layersOpen && !exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!railRef.current) return;
      if (e.target instanceof Node && railRef.current.contains(e.target)) return;
      setLayersOpen(false);
      setExportOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [layersOpen, exportOpen]);

  // Clear stale selection if the underlying element is gone.
  useEffect(() => {
    if (selectedId && !elements.some((e) => e.id === selectedId)) {
      setSelectedId(null);
    }
  }, [elements, selectedId, setSelectedId]);

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const handlePan = () => {
    setMode('pan');
    setSelectedId(null);
    clearPlanSelection();
  };
  const handleSelect = () => setMode('select');

  const handlePencil = () => {
    if (activeKind && onDisarmDraw) onDisarmDraw();
  };

  const handleDuplicate = useCallback(() => {
    if (!selected) return;
    const newId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addDesignElement(projectId, {
      ...selected,
      id: newId,
      label: selected.label ? `${selected.label} (copy)` : undefined,
      geometry: offsetGeometry(selected.geometry, DUPLICATE_OFFSET_DEG),
      createdAt: new Date().toISOString(),
    });
    setSelectedId(newId);
  }, [selected, projectId]);

  const drawArmed = activeKind !== null;
  const canDuplicate = selected != null;

  return (
    <div
      ref={railRef}
      className={css.rail}
      role="toolbar"
      aria-label="Design tools"
      data-tour="plan-tools"
    >
      <DelayedTooltip
        label={
          mode === 'select'
            ? selected
              ? `Selected: ${selected.label ?? selected.kind}`
              : 'Select — click a design element on the map'
            : 'Select'
        }
        position="left"
      >
        <button
          type="button"
          className={css.btn}
          data-active={mode === 'select'}
          onClick={handleSelect}
          aria-label="Select"
          aria-pressed={mode === 'select'}
        >
          <MousePointer2 size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <DelayedTooltip label="Pan — drag the map" position="left">
        <button
          type="button"
          className={css.btn}
          data-active={mode === 'pan'}
          onClick={handlePan}
          aria-label="Pan"
          aria-pressed={mode === 'pan'}
        >
          <Hand size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <DelayedTooltip
        label={
          drawArmed
            ? `Drawing: ${activeKind} — click to cancel`
            : 'Pick an element from the palette to draw'
        }
        position="left"
      >
        <button
          type="button"
          className={css.btn}
          data-active={drawArmed}
          onClick={handlePencil}
          disabled={!drawArmed}
          aria-label="Draw"
        >
          <Pencil size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <DelayedTooltip
        label={
          canDuplicate
            ? `Duplicate ${selected!.label ?? selected!.kind}`
            : 'Select an element first to duplicate'
        }
        position="left"
      >
        <button
          type="button"
          className={css.btn}
          onClick={handleDuplicate}
          disabled={!canDuplicate}
          aria-label="Duplicate"
        >
          <Copy size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip label="Zoom in" position="left">
        <button type="button" className={css.btn} onClick={zoomIn} aria-label="Zoom in">
          <Plus size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <DelayedTooltip label="Zoom out" position="left">
        <button type="button" className={css.btn} onClick={zoomOut} aria-label="Zoom out">
          <Minus size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip label="Layer visibility" position="left">
        <button
          type="button"
          className={css.btn}
          data-active={layersOpen}
          onClick={() => {
            setLayersOpen((o) => !o);
            setExportOpen(false);
          }}
          aria-label="Layers"
          aria-expanded={layersOpen}
        >
          <Layers size={15} strokeWidth={1.75} />
        </button>
      </DelayedTooltip>

      {layersOpen && (
        <div className={css.popover} role="menu" aria-label="Layer visibility">
          <div className={css.popoverTitle}>Layer visibility</div>
          {VISIBILITY_LAYERS.map((g) => {
            const isHidden = hidden[g.key] === true;
            return (
              <label key={g.key} className={css.popoverRow}>
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={(e) =>
                    setHidden((h) => ({ ...h, [g.key]: !e.target.checked }))
                  }
                />
                <span>{g.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Sheet export POSTs the captured map to the server (api.exports.generate)
          to render the PDF, so it can't work in the offline demo — hide the
          control rather than leave a button that only spins and errors. */}
      {!DEMO_OFFLINE_ENABLED && (
        <>
          <div className={css.divider} aria-hidden="true" />
          <DelayedTooltip
            label={canExport ? "Export sheet" : NOT_SYNCED_EXPORT_TITLE}
            position="left"
          >
            <button
              type="button"
              className={css.btn}
              data-active={exportOpen}
              onClick={() => {
                setExportOpen((o) => !o);
                setLayersOpen(false);
              }}
              disabled={generatingType !== null || !canExport}
              aria-label="Export sheet"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              {generatingType !== null ? (
                <Loader2 size={15} strokeWidth={1.75} className={css.spin} />
              ) : (
                <FileDown size={15} strokeWidth={1.75} />
              )}
            </button>
          </DelayedTooltip>

          {exportOpen && (
            <div className={css.popover} role="menu" aria-label="Export map sheet">
              <div className={css.popoverTitle}>Export sheet</div>
              {SHEET_EXPORTS.map((sheet) => (
                <button
                  key={sheet.type}
                  type="button"
                  role="menuitem"
                  className={css.popoverAction}
                  onClick={() => handleExport(sheet.type)}
                  disabled={generatingType !== null}
                >
                  {sheet.label}
                </button>
              ))}
              {generatingType !== null && (
                <div className={css.popoverStatus}>
                  Exporting {SHEET_LABEL[generatingType]}…
                </div>
              )}
              {exportError && <div className={css.popoverError}>{exportError}</div>}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css.popoverLink}
                >
                  Download PDF
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
