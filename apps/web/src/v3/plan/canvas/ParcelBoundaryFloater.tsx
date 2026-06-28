/**
 * ParcelBoundaryFloater — click-to-edit affordance for the parcel boundary on
 * the Plan canvas (invocation "a"). When the steward clicks the painted parcel
 * boundary (DiagnoseMap's `diagnose-parcel-boundary-fill` / `-line` layers), a
 * small pill bar appears offering the full wizard-parity edit scope:
 *
 *   - Reshape → arm the boundary tool with the existing ring; BoundaryTool picks
 *     `direct_select`, so the vertices become draggable.
 *   - Redraw  → clear the ring FIRST, then arm; BoundaryTool sees no `existing`
 *     and opens in `draw_polygon` for a fresh outline. (BoundaryTool snapshots
 *     `existing` at mount, so the clear must precede the arm — React batches both
 *     store writes into one render, so the tool re-mounts fresh in `draw_polygon`.)
 *   - Import  → KML / KMZ / GeoJSON via the same `parseGeoFile` path the creation
 *     wizard and Observe use; the parsed FeatureCollection is persisted verbatim.
 *   - Clear   → drop the boundary. This is the ONLY "clear-to-null" path —
 *     BoundaryTool itself deliberately never emits null.
 *
 * It portals into the shared bottom-center floater stack (same root as
 * PlanSelectionFloater) and dismisses on Esc, on a click away from the boundary,
 * or once an edit tool is armed. The whole component is inert under the
 * project-global plan seal (`planReadOnly`) and while the boundary tool is
 * already armed (`activeTool === 'boundary'`), so it can never double-fire
 * mid-edit. Persistence + acreage are the caller's concern (handleBoundaryChanged
 * in PlanTierShell), mirroring how the canvas stays store-agnostic.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Square, Upload, Trash2, X } from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { getFloaterStackRoot } from '../../observe/components/floaterStackRoot.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { parseGeoFile } from '../../../lib/geoParsers.js';
import css from '../../observe/components/SelectionFloater.module.css';

// Must match DiagnoseMap's boundary layer ids (the paint target we attach to).
const BOUNDARY_FILL_LAYER = 'diagnose-parcel-boundary-fill';
const BOUNDARY_LINE_LAYER = 'diagnose-parcel-boundary-line';

interface Props {
  map: MaplibreMap;
  /** The painted boundary, or null. Drives the Reshape/Clear enablement. */
  boundary: GeoJSON.Polygon | null;
  /** Persist hook: a FeatureCollection to save, or null to clear. */
  onBoundaryChanged: (fc: GeoJSON.FeatureCollection | null) => void;
  /** Project-global plan seal — inert when sealed. */
  planReadOnly?: boolean;
}

export default function ParcelBoundaryFloater({
  map,
  boundary,
  onBoundaryChanged,
  planReadOnly,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editing = activeTool === 'boundary';

  // Click the painted boundary → open the bar; click away → close. MapLibre fires
  // layer-scoped handlers BEFORE the general map click, so a ref flag lets the
  // general handler tell "hit the boundary" from "clicked elsewhere". A hover
  // pointer-cursor signals the boundary is interactive (re-asserted past any
  // MapCursorHost crosshair by its MutationObserver, so no lasting fight).
  useEffect(() => {
    if (planReadOnly) return;
    let hitThisClick = false;
    const onBoundaryClick = () => {
      hitThisClick = true;
      setOpen(true);
    };
    const onMapClick = () => {
      if (hitThisClick) {
        hitThisClick = false;
        return;
      }
      setOpen(false);
    };
    const onEnter = () => {
      if (useMapToolStore.getState().activeTool === 'boundary') return;
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      if (useMapToolStore.getState().activeTool === 'boundary') return;
      map.getCanvas().style.cursor = '';
    };
    map.on('click', BOUNDARY_FILL_LAYER, onBoundaryClick);
    map.on('click', BOUNDARY_LINE_LAYER, onBoundaryClick);
    map.on('click', onMapClick);
    map.on('mouseenter', BOUNDARY_FILL_LAYER, onEnter);
    map.on('mouseleave', BOUNDARY_FILL_LAYER, onLeave);
    map.on('mouseenter', BOUNDARY_LINE_LAYER, onEnter);
    map.on('mouseleave', BOUNDARY_LINE_LAYER, onLeave);
    return () => {
      map.off('click', BOUNDARY_FILL_LAYER, onBoundaryClick);
      map.off('click', BOUNDARY_LINE_LAYER, onBoundaryClick);
      map.off('click', onMapClick);
      map.off('mouseenter', BOUNDARY_FILL_LAYER, onEnter);
      map.off('mouseleave', BOUNDARY_FILL_LAYER, onLeave);
      map.off('mouseenter', BOUNDARY_LINE_LAYER, onEnter);
      map.off('mouseleave', BOUNDARY_LINE_LAYER, onLeave);
    };
  }, [map, planReadOnly]);

  // Force-close when the seal flips on, an edit tool arms, or the boundary
  // disappears out from under the open bar.
  useEffect(() => {
    if (planReadOnly || editing || !boundary) setOpen(false);
  }, [planReadOnly, editing, boundary]);

  // Esc dismisses (ignored while typing in a field), mirroring PlanSelectionFloater.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImportError(null);
    try {
      const { geojson } = await parseGeoFile(file);
      onBoundaryChanged(geojson);
      setOpen(false);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Could not read that file.',
      );
    }
  };

  const onReshape = () => {
    setActiveTool('boundary'); // existing ring present → direct_select (reshape)
    setOpen(false);
  };
  const onRedraw = () => {
    // Clear first so BoundaryTool mounts with no `existing` → draw_polygon. Both
    // store writes batch into one render, so the tool re-mounts fresh.
    onBoundaryChanged(null);
    setActiveTool('boundary');
    setOpen(false);
  };
  const onClear = () => {
    if (!confirm('Clear the property boundary?')) return;
    onBoundaryChanged(null);
    setOpen(false);
  };

  const stackRoot = getFloaterStackRoot();
  if (planReadOnly || editing || !open || !stackRoot) return null;

  return createPortal(
    <div
      className={css.floater}
      role="toolbar"
      aria-label="Property boundary actions"
      style={{ order: 1 }}
    >
      <span className={css.count}>Property boundary</span>
      {importError ? (
        <>
          <span style={{ color: '#8a3a2a', maxWidth: 220, lineHeight: 1.4 }}>
            {importError}
          </span>
          <button
            type="button"
            className={css.btn}
            onClick={() => setImportError(null)}
          >
            <X aria-hidden="true" />
            <span>Dismiss</span>
          </button>
        </>
      ) : (
        <>
          <div className={css.divider} aria-hidden="true" />
          <DelayedTooltip label="Drag the boundary's vertices" position="top">
            <button
              type="button"
              className={css.btn}
              onClick={onReshape}
              disabled={!boundary}
            >
              <Pencil aria-hidden="true" />
              <span>Reshape</span>
            </button>
          </DelayedTooltip>
          <DelayedTooltip label="Discard and draw a new outline" position="top">
            <button type="button" className={css.btn} onClick={onRedraw}>
              <Square aria-hidden="true" />
              <span>Redraw</span>
            </button>
          </DelayedTooltip>
          <DelayedTooltip label="Import boundary (KML / GeoJSON)" position="top">
            <button
              type="button"
              className={css.btn}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload aria-hidden="true" />
              <span>Import</span>
            </button>
          </DelayedTooltip>
          <DelayedTooltip label="Remove the boundary" position="top">
            <button
              type="button"
              className={`${css.btn} ${css.btnDanger}`}
              onClick={onClear}
              disabled={!boundary}
            >
              <Trash2 aria-hidden="true" />
              <span>Clear</span>
            </button>
          </DelayedTooltip>
          <div className={css.divider} aria-hidden="true" />
          <DelayedTooltip label="Close (Esc)" position="top">
            <button
              type="button"
              className={css.btn}
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
              <span>Close</span>
            </button>
          </DelayedTooltip>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".kml,.kmz,.geojson,.json,application/geo+json"
        onChange={handleImportFile}
        aria-label="Boundary file"
        style={{ display: 'none' }}
      />
    </div>,
    stackRoot,
  );
}
