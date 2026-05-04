/**
 * LeftToolSpine — slim vertical rail of icon-only map analysis tools.
 *
 * Layout strategy: per UX Scholar consultation (2026-04-23),
 * distribute floating map tools by intent — this spine carries the
 * "Analysis / Action" group (Cross-section, Viewshed, Measure) plus the
 * "Content" group (Historical imagery, OSM overlays). View-context
 * controls (2D/2.5D/3D, Split, Basemap) live separately in the
 * top-right cluster.
 *
 * Children are the compact variants of the existing tool components —
 * no logic is duplicated here; the spine is purely layout chrome.
 * Global `spine-btn` styles are declared once in
 * `apps/web/src/index.css` so every tool's trigger matches without
 * needing to import CSS modules.
 */

import { lazy, Suspense, type ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { mapZIndex } from '../../lib/tokens.js';

const CrossSectionTool = lazy(() => import('./CrossSectionTool.js'));
const HistoricalImageryControl = lazy(() => import('./HistoricalImageryControl.js'));
const MeasureTools = lazy(() => import('./MeasureTools.js'));

interface LeftToolSpineProps {
  projectId: string;
  map: maplibregl.Map | null;
  draw: MapboxDraw | null;
  boundaryGeojson?: GeoJSON.FeatureCollection | null | undefined;
  /** Render prop slots for components whose Lazy() wrapper already lives
   *  in MapView. Passing them as children avoids double-lazy-loading and
   *  keeps Suspense boundaries stable. */
  viewshedSlot: ReactNode;
  microclimateSlot: ReactNode;
  sectorOverlaySlot: ReactNode;
  windbreakSlot: ReactNode;
  restorationSlot: ReactNode;
  mulchCovercropSlot: ReactNode;
  agroforestrySlot: ReactNode;
  pollinatorOpportunitySlot: ReactNode;
  biodiversityCorridorSlot: ReactNode;
  pollinatorHabitatStateSlot: ReactNode;
  osmSlot: ReactNode;
  relationshipsSlot: ReactNode;
}

/** Horizontal separator line used inside the spine between tool groups. */
function SpineSeparator() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 1,
        width: 24,
        margin: '4px auto',
        background: 'rgba(196, 180, 154, 0.18)',
      }}
    />
  );
}

export default function LeftToolSpine({
  projectId,
  map,
  draw,
  boundaryGeojson,
  viewshedSlot,
  microclimateSlot,
  sectorOverlaySlot,
  windbreakSlot,
  restorationSlot,
  mulchCovercropSlot,
  agroforestrySlot,
  pollinatorOpportunitySlot,
  biodiversityCorridorSlot,
  pollinatorHabitatStateSlot,
  osmSlot,
  relationshipsSlot,
}: LeftToolSpineProps) {
  return (
    <div
      className="left-tool-spine"
      style={{
        position: 'absolute',
        top: 132,
        left: 12,
        zIndex: mapZIndex.spine,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 4,
        background: 'var(--color-chrome-bg-translucent)',
        borderRadius: 10,
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--color-elevation-highlight)',
        boxShadow: 'inset 0 1px 0 var(--color-elevation-highlight)',
        pointerEvents: 'auto',
        width: 48,
      }}
    >
      {/* Analysis / Action group */}
      <Suspense fallback={null}>
        <CrossSectionTool projectId={projectId} map={map} draw={draw} compact />
      </Suspense>
      {viewshedSlot}
      {microclimateSlot}
      {sectorOverlaySlot}
      {windbreakSlot}
      {restorationSlot}
      {mulchCovercropSlot}
      {agroforestrySlot}
      {pollinatorOpportunitySlot}
      {biodiversityCorridorSlot}
      {pollinatorHabitatStateSlot}
      {relationshipsSlot}
      <Suspense fallback={null}>
        <MeasureTools projectId={projectId} map={map} draw={draw} compact />
      </Suspense>

      <SpineSeparator />

      {/* Content / Layers group */}
      <Suspense fallback={null}>
        <HistoricalImageryControl map={map} boundaryGeojson={boundaryGeojson} compact />
      </Suspense>
      {osmSlot}
    </div>
  );
}
