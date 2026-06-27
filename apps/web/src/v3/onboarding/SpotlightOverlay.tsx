/**
 * SpotlightOverlay -- the dimmed scrim with a single rounded cutout over the
 * step's target. One full-viewport SVG: a white mask with a black rounded rect
 * punches the hole, and the dark scrim rect is painted through that mask.
 *
 * The cutout animates between targets via CSS transitions on the SVG2 geometry
 * properties (x/y/width/height) -- smooth in Chromium/WebKit (the demo's
 * targets), a graceful instant snap in Firefox. No framer-motion dependency.
 *
 * With `targetRect === null` (the centred-callout fallback) only the flat scrim
 * renders -- no hole.
 */

import { useId } from 'react';
import type { Rect, Size } from './calloutPosition.js';
import css from './SpotlightOverlay.module.css';

interface Props {
  targetRect: Rect | null;
  viewport: Size;
  /** Breathing room around the target, inside the cutout. */
  padding?: number;
  /** Corner radius of the cutout. */
  radius?: number;
}

export default function SpotlightOverlay({
  targetRect,
  viewport,
  padding = 8,
  radius = 12,
}: Props) {
  // useId can contain ':' which is unsafe in an SVG id / url() reference; strip it.
  const maskId = `spotlight-mask-${useId().replace(/:/g, '')}`;

  const cut = targetRect
    ? {
        x: targetRect.left - padding,
        y: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;

  return (
    <svg
      className={css.overlay}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect x={0} y={0} width={viewport.width} height={viewport.height} fill="white" />
          {cut && (
            <rect
              className={css.cutout}
              x={cut.x}
              y={cut.y}
              width={cut.width}
              height={cut.height}
              rx={radius}
              ry={radius}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        className={css.scrim}
        x={0}
        y={0}
        width={viewport.width}
        height={viewport.height}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
