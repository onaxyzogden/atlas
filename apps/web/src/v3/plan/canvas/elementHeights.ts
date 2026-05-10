/**
 * elementHeights — per-kind 3D extrusion registry for Plan-stage design
 * elements. Read by `DesignElementExtrusionLayer` to drive MapLibre
 * `fill-extrusion-height` / `fill-extrusion-base` paint properties.
 *
 * Only kinds present in this registry extrude; everything else stays flat
 * in `DesignElementLayers`. Lines (paths, swales, roads) and intentionally-
 * flat polygons (paddocks, orchards, silvopasture, pasture-mix, turnaround)
 * are excluded.
 *
 * The `mode` field is set to `'extrusion'` for every entry today. It exists
 * so a future GLB asset pipeline can swap individual kinds to authored
 * meshes (`mode: 'glb'`) without changing the layer's call site.
 *
 * Heights are nominal real-world metres. Footprints (for inflating point
 * geometries to small squares) are also metres-on-the-ground; the layer
 * converts to a degrees-delta at render time using a metres-per-degree
 * approximation.
 */

import type { DesignCategory } from './elementCatalog.js';

export type ElementModelMode = 'extrusion' | 'glb';

export interface ElementHeightSpec {
  /** Top of the extrusion in metres. */
  heightM: number;
  /** Base of the extrusion in metres. Negative for sunk features (ponds). */
  baseM?: number;
  /** Side length of the inflated square for point geometries (metres).
   *  Ignored for polygon-geometry kinds. */
  footprintM: number;
  /** Optional colour override; falls back to elementCatalog colour. */
  color?: string;
  /** Asset mode. Always `'extrusion'` today; see file docblock. */
  mode: ElementModelMode;
  /** Bookkeeping only — not used by the layer. */
  category?: DesignCategory;
}

/**
 * Kind → spec. Only kinds in this map participate in extrusion rendering.
 *
 * Numbers are deliberately conservative — small enough that a barn does
 * not look like a skyscraper at typical zooms (z14–z18), large enough to
 * read as 3D when the user pitches the camera.
 */
export const ELEMENT_HEIGHTS: Record<string, ElementHeightSpec> = {
  // ── Structures (point) ────────────────────────────────────────────────
  yurt:             { mode: 'extrusion', heightM: 3.5, footprintM: 6,  category: 'structure' },
  greenhouse:       { mode: 'extrusion', heightM: 3.0, footprintM: 8,  category: 'structure' },
  barn:             { mode: 'extrusion', heightM: 6.0, footprintM: 10, category: 'structure' },
  shed:             { mode: 'extrusion', heightM: 2.5, footprintM: 4,  category: 'structure' },

  // ── Machinery (point + polygon) ──────────────────────────────────────
  'machinery-shed': { mode: 'extrusion', heightM: 4.0, footprintM: 8,  category: 'machinery' },
  'fuel-station':   { mode: 'extrusion', heightM: 3.0, footprintM: 5,  category: 'machinery' },
  // equipment-yard is a polygon: render as a low kerb so it reads as a
  // bounded surface without occluding what the operator drew.
  'equipment-yard': { mode: 'extrusion', heightM: 0.3, footprintM: 0,  category: 'machinery' },

  // ── Water (point + polygon) ──────────────────────────────────────────
  'water-tank':     { mode: 'extrusion', heightM: 3.0, footprintM: 4,  category: 'water' },
  // Pond: sunk below ground. baseM negative + heightM 0 yields a
  // visible depression when pitched.
  pond:             { mode: 'extrusion', heightM: 0,   baseM: -0.8, footprintM: 0, category: 'water' },
  spring:           { mode: 'extrusion', heightM: 0.5, footprintM: 1.5, category: 'water' },

  // ── Amenity (point + polygon) ────────────────────────────────────────
  'prayer-pavilion':{ mode: 'extrusion', heightM: 4.0, footprintM: 7,  category: 'amenity' },
  parking:          { mode: 'extrusion', heightM: 0.2, footprintM: 6,  category: 'amenity' },
  'fire-circle':    { mode: 'extrusion', heightM: 0.4, footprintM: 2,  category: 'amenity' },
  // Compost windrow: rendered as a low pile.
  compost:          { mode: 'extrusion', heightM: 1.0, footprintM: 0,  category: 'amenity' },
};

export function getElementHeightSpec(kind: string): ElementHeightSpec | undefined {
  return ELEMENT_HEIGHTS[kind];
}

export const EXTRUDED_KINDS: ReadonlySet<string> = new Set(Object.keys(ELEMENT_HEIGHTS));
