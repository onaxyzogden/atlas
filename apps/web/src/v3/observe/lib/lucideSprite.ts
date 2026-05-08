/**
 * lucideSprite — registers Lucide icons as MapLibre sprite images for
 * OBSERVE point annotations. Renders each icon to an SVG string via
 * `renderToStaticMarkup`, wraps it in a circular backdrop, then loads as a
 * raster image via `map.addImage`. Idempotent: re-registering over an
 * existing image is a no-op (per `map.hasImage` guard).
 *
 * Image keys (used as `icon-image` in symbol layers):
 *   observe-neighbourPin
 *   observe-household
 *   observe-highPoint
 *   observe-soilSample
 *   observe-swotTag-S | observe-swotTag-W | observe-swotTag-O | observe-swotTag-T
 *
 * Must be re-run after every `style.load` because basemap swaps wipe the
 * sprite registry. `ObserveAnnotationLayers` wires this into its style.load
 * handler and into `styleimagemissing` as a defensive fallback.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Home,
  Mountain,
  TestTube2,
  User,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';

interface SpriteSpec {
  /** Image key used as `icon-image` in the symbol layer. */
  id: string;
  Icon: LucideIcon;
  /** Circular backdrop fill colour. */
  bg: string;
  /** Icon stroke colour. */
  fg: string;
}

const SPRITE_PX = 40; // final raster footprint
const ICON_PX = 22;   // Lucide icon drawn at 22px inside the 40px disc
const PIXEL_RATIO = 2; // halves logical render size for retina sharpness

const SPECS: SpriteSpec[] = [
  { id: 'observe-neighbourPin', Icon: User, bg: '#c4a265', fg: '#1a1208' },
  { id: 'observe-household', Icon: Home, bg: '#c4a265', fg: '#1a1208' },
  { id: 'observe-highPoint', Icon: Mountain, bg: '#8a6a3f', fg: '#ffffff' },
  { id: 'observe-soilSample', Icon: TestTube2, bg: '#6a5a4a', fg: '#ffffff' },
  { id: 'observe-swotTag-S', Icon: Tag, bg: '#4a8a5a', fg: '#ffffff' },
  { id: 'observe-swotTag-W', Icon: Tag, bg: '#a85a3f', fg: '#ffffff' },
  { id: 'observe-swotTag-O', Icon: Tag, bg: '#3a8aa8', fg: '#ffffff' },
  { id: 'observe-swotTag-T', Icon: Tag, bg: '#7c5a8a', fg: '#ffffff' },
];

function buildSvgString(spec: SpriteSpec): string {
  // Lucide icons render as `<svg ...><path .../>...</svg>`. We render with
  // the colour/stroke we want, then embed inside the backdrop SVG.
  const inner = renderToStaticMarkup(
    createElement(spec.Icon, {
      size: ICON_PX,
      stroke: spec.fg,
      strokeWidth: 2.25,
      fill: 'none',
    } as Record<string, unknown>),
  );
  const half = SPRITE_PX / 2;
  const offset = (SPRITE_PX - ICON_PX) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SPRITE_PX}" height="${SPRITE_PX}" viewBox="0 0 ${SPRITE_PX} ${SPRITE_PX}">` +
    `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="${spec.bg}" stroke="#0a0e22" stroke-width="1.5"/>` +
    `<g transform="translate(${offset},${offset})">${inner}</g>` +
    `</svg>`
  );
}

/** Encode an SVG string as a base64 data URL. SVG content here is ASCII-safe. */
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

async function loadOne(map: MaplibreMap, spec: SpriteSpec): Promise<void> {
  if (map.hasImage(spec.id)) return;
  const url = svgToDataUrl(buildSvgString(spec));
  const img = new Image(SPRITE_PX, SPRITE_PX);
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  // Guard against a parallel registration finishing first.
  if (map.hasImage(spec.id)) return;
  map.addImage(spec.id, img, { pixelRatio: PIXEL_RATIO });
}

/** Register every OBSERVE icon. Safe to call multiple times. */
export async function registerObserveIcons(map: MaplibreMap): Promise<void> {
  await Promise.all(SPECS.map((s) => loadOne(map, s)));
}

/** Diagnostic: lists the image keys this module registers. */
export function listObserveIconIds(): string[] {
  return SPECS.map((s) => s.id);
}

/** Re-create just one icon if the map asks for it (fired via
 *  `styleimagemissing`). Returns true if the id was one we own. */
export async function tryRegisterMissingObserveIcon(
  map: MaplibreMap,
  id: string,
): Promise<boolean> {
  const spec = SPECS.find((s) => s.id === id);
  if (!spec) return false;
  await loadOne(map, spec);
  return true;
}
