/**
 * DesignToolRail — right-edge floating tool column for the Vision-Layout canvas.
 *
 * Mirrors the visual grammar of the reference image: Select, Pan, a Draw
 * indicator that reflects the palette's active element, Duplicate, Zoom +/-,
 * Layers. v1 wires only the zoom controls to MapLibre; the rest are visual
 * placeholders that surface state already owned elsewhere (palette → activeKind).
 */

import {
  Copy,
  Hand,
  Layers,
  MousePointer2,
  Pencil,
  Plus,
  Minus,
} from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import css from './DesignToolRail.module.css';

interface Props {
  map: MaplibreMap;
  /** Active draw kind from the palette; pencil button highlights when set. */
  activeKind: string | null;
}

export default function DesignToolRail({ map, activeKind }: Props) {
  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  return (
    <div className={css.rail} role="toolbar" aria-label="Design tools">
      <button type="button" className={css.btn} disabled title="Select (coming soon)" aria-label="Select">
        <MousePointer2 size={15} strokeWidth={1.75} />
      </button>
      <button type="button" className={css.btn} disabled title="Pan (coming soon)" aria-label="Pan">
        <Hand size={15} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={css.btn}
        data-active={activeKind !== null}
        disabled
        title={activeKind ? `Drawing: ${activeKind}` : 'Pick an element from the palette to draw'}
        aria-label="Draw"
      >
        <Pencil size={15} strokeWidth={1.75} />
      </button>
      <button type="button" className={css.btn} disabled title="Duplicate (coming soon)" aria-label="Duplicate">
        <Copy size={15} strokeWidth={1.75} />
      </button>
      <div className={css.divider} aria-hidden="true" />
      <button type="button" className={css.btn} onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
        <Plus size={15} strokeWidth={1.75} />
      </button>
      <button type="button" className={css.btn} onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
        <Minus size={15} strokeWidth={1.75} />
      </button>
      <div className={css.divider} aria-hidden="true" />
      <button type="button" className={css.btn} disabled title="Layers (coming soon)" aria-label="Layers">
        <Layers size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}
