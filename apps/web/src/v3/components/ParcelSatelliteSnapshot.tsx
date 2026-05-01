/**
 * ParcelSatelliteSnapshot — Phase 5.3 closure.
 *
 * Replaces the ◊ glyph placeholder in DiagnosePage's StageHero aside slot
 * with a static satellite tile centred on the parcel + an SVG outline of
 * the boundary polygon overlaid on top. Uses the MapTiler Static Maps API
 * (server-side rendering — no maplibregl instance, no draw tools, no
 * stores; cheap to mount inside a hero card).
 *
 * Falls back to the existing ◊ glyph when:
 *   - No `VITE_MAPTILER_KEY` is configured (or the user hasn't pasted one);
 *   - The project has no parcel boundary polygon (legacy mock projects).
 */

import { useMemo } from "react";
import { maptilerKey } from "../../lib/maplibre.js";
import css from "./ParcelSatelliteSnapshot.module.css";

interface Props {
  boundary?: GeoJSON.Polygon;
  caption?: string;
  /** Pixel dimensions sent to MapTiler. Default 320×240 fits the hero aside. */
  width?: number;
  height?: number;
}

/** Polygon centroid via the simple bbox-mid approach — adequate for centring
 *  a fixed-size satellite tile on a small parcel. */
function bboxOf(ring: number[][]): { lng: number; lat: number; spanLng: number; spanLat: number } {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const pt of ring) {
    const lng = pt[0] ?? 0;
    const lat = pt[1] ?? 0;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2,
    spanLng: maxLng - minLng,
    spanLat: maxLat - minLat,
  };
}

/** Pick a satellite zoom level that fits the parcel into roughly 70% of the
 *  tile width. The MapTiler static endpoint uses standard web-mercator zooms;
 *  this is a coarse mapping that prefers slight over-zoom for small parcels. */
function chooseZoom(spanDeg: number, widthPx: number): number {
  if (spanDeg <= 0) return 16;
  // Approx: at zoom z, the world is 256 * 2^z px wide → 360deg / world = deg/px.
  // We want spanDeg to occupy ~0.7 * widthPx, so:
  //   spanDeg / (360 / (256 * 2^z)) ≈ 0.7 * widthPx
  //   2^z ≈ 0.7 * widthPx * 360 / (256 * spanDeg)
  const target = (0.7 * widthPx * 360) / (256 * spanDeg);
  const z = Math.log2(target);
  return Math.max(8, Math.min(18, Math.round(z)));
}

/** Project lng/lat → SVG (0..1) coords inside the static tile, given the
 *  tile's centre + zoom + dimensions. Web-mercator forward projection. */
function projectToTile(
  lng: number,
  lat: number,
  centreLng: number,
  centreLat: number,
  zoom: number,
  widthPx: number,
  heightPx: number,
): { x: number; y: number } {
  const worldSize = 256 * Math.pow(2, zoom);
  const project = (lo: number, la: number) => {
    const x = ((lo + 180) / 360) * worldSize;
    const sinLat = Math.sin((la * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
    return { x, y };
  };
  const c = project(centreLng, centreLat);
  const p = project(lng, lat);
  return {
    x: widthPx / 2 + (p.x - c.x),
    y: heightPx / 2 + (p.y - c.y),
  };
}

export default function ParcelSatelliteSnapshot({
  boundary,
  caption,
  width = 320,
  height = 240,
}: Props) {
  const ring = boundary?.coordinates?.[0];
  const hasBoundary = !!ring && ring.length >= 4;
  const hasKey = !!maptilerKey;

  const tile = useMemo(() => {
    if (!hasBoundary || !hasKey) return null;
    const bb = bboxOf(ring as number[][]);
    const zoom = chooseZoom(Math.max(bb.spanLng, bb.spanLat), width);
    const url = `https://api.maptiler.com/maps/satellite/static/${bb.lng},${bb.lat},${zoom}/${width}x${height}.png?key=${maptilerKey}`;
    const points = (ring as number[][]).map((pt) =>
      projectToTile(pt[0] ?? 0, pt[1] ?? 0, bb.lng, bb.lat, zoom, width, height),
    );
    return { url, points };
  }, [hasBoundary, hasKey, ring, width, height]);

  if (!tile) {
    // Fallback: same minimal glyph the previous placeholder used.
    return (
      <div className={css.parcel} aria-hidden={!caption}>
        <div className={css.parcelArtFallback}>
          <span className={css.parcelGlyph}>◊</span>
        </div>
        {caption && <span className={css.parcelCaption}>{caption}</span>}
      </div>
    );
  }

  const polylinePoints = tile.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <figure className={css.parcel}>
      <div className={css.parcelArt} style={{ width, height }}>
        <img
          src={tile.url}
          width={width}
          height={height}
          alt={caption ? `Satellite view: ${caption}` : "Parcel satellite view"}
          loading="lazy"
          className={css.tile}
        />
        <svg
          className={css.outline}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          aria-hidden="true"
        >
          <polygon
            points={polylinePoints}
            fill="rgba(220, 168, 124, 0.18)"
            stroke="rgb(220, 168, 124)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {caption && <figcaption className={css.parcelCaption}>{caption}</figcaption>}
    </figure>
  );
}
