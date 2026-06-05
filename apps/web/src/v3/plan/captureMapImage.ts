/**
 * captureMapImage — grab the current MapLibre canvas as a PNG data URL for
 * the master-plan / map-sheet PDF exports.
 *
 * Requires the map to be initialised with `preserveDrawingBuffer: true`
 * (set on DesignMap and the v2 useMaplibre hook), otherwise the WebGL
 * backbuffer is cleared before `toDataURL` runs and yields a blank image.
 *
 * Capture is taken inside a forced render frame so the latest tiles +
 * overlay layers are guaranteed present in the drawing buffer.
 */

import type { maplibregl } from "../../lib/maplibre.js";

export interface CaptureMapImageResult {
  /** PNG data URL — matches the shared `MapSheetImage.dataUrl` field. */
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

export interface CaptureMapImageOptions {
  /** Downscale so the longest edge is at most this many pixels. */
  maxEdgePx?: number;
  /** Output MIME type. PNG keeps crisp vector overlays; JPEG is smaller. */
  mimeType?: "image/png" | "image/jpeg";
  /** JPEG quality (0–1), ignored for PNG. */
  quality?: number;
}

/** Force a render then read the WebGL buffer once the map next goes idle. */
function nextRenderedCanvas(map: maplibregl.Map): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    map.once("idle", () => resolve(map.getCanvas()));
    map.triggerRepaint();
  });
}

function downscale(
  source: HTMLCanvasElement,
  maxEdgePx: number,
  mimeType: string,
  quality: number,
): { dataUrl: string; widthPx: number; heightPx: number } {
  const { width, height } = source;
  const longest = Math.max(width, height);
  if (longest <= maxEdgePx) {
    return { dataUrl: source.toDataURL(mimeType, quality), widthPx: width, heightPx: height };
  }
  const scale = maxEdgePx / longest;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) {
    return { dataUrl: source.toDataURL(mimeType, quality), widthPx: width, heightPx: height };
  }
  ctx.drawImage(source, 0, 0, w, h);
  return { dataUrl: off.toDataURL(mimeType, quality), widthPx: w, heightPx: h };
}

export async function captureMapImage(
  map: maplibregl.Map,
  options: CaptureMapImageOptions = {},
): Promise<CaptureMapImageResult> {
  const { maxEdgePx = 2400, mimeType = "image/png", quality = 0.92 } = options;
  const canvas = await nextRenderedCanvas(map);
  const { dataUrl, widthPx, heightPx } = downscale(canvas, maxEdgePx, mimeType, quality);
  return { dataUrl, widthPx, heightPx };
}
