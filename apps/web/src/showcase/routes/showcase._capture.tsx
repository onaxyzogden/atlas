import { useEffect, useState } from 'react';
import { ShowcaseMap } from '../components/ShowcaseMap.js';
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot.js';
import type { SceneId } from '../data/sceneManifest.js';

// Dev-only capture route — mounted at /showcase/three-streams/_capture and
// guarded by import.meta.env.DEV. The Playwright snapshot script
// (scripts/snapshot-scene-images.ts) navigates Chromium here per scene to
// produce the .webp thumbnails consumed by <MapThumbnail>.
//
// The route renders a full-bleed <ShowcaseMap> with no chrome, no
// scrollytelling, no CTA, no attribution footer — the screenshot target is
// the [data-testid="showcase-map"] element exclusively.

type MapState = {
  activeLayers: string[];
  view: { center: [number, number]; zoom: number };
  // `features` is part of the MDX frontmatter shape but at capture time we
  // do not surface designed features (all 8 shared scenes have features:[]).
  features: never[];
};

// Canonical map states for the 8 shared scenes. Kept in lockstep with the
// frontmatter blocks in apps/web/src/showcase/scenes/_shared/*.mdx — if a
// scene's frontmatter mapState changes, update this map too.
const SHARED_SCENE_MAP_STATES: Record<string, MapState> = {
  hero:               { activeLayers: [],                       view: { center: [-79.91, 43.56], zoom: 13 }, features: [] },
  'y0-baseline':      { activeLayers: ['soils', 'land_cover'],  view: { center: [-79.91, 43.56], zoom: 14 }, features: [] },
  'y1-water-cover':   { activeLayers: ['watershed'],            view: { center: [-79.91, 43.56], zoom: 14 }, features: [] },
  'y2-current':       { activeLayers: ['soils', 'watershed'],   view: { center: [-79.91, 43.56], zoom: 14 }, features: [] },
  'y5-projected':     { activeLayers: ['land_cover', 'watershed'], view: { center: [-79.91, 43.56], zoom: 14 }, features: [] },
  'y8-projected':     { activeLayers: ['land_cover', 'watershed'], view: { center: [-79.91, 43.56], zoom: 14 }, features: [] },
  methodology:        { activeLayers: [],                       view: { center: [-79.91, 43.56], zoom: 13 }, features: [] },
  cta:                { activeLayers: [],                       view: { center: [-79.91, 43.56], zoom: 13 }, features: [] },
};

function readSceneFromQuery(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('scene');
}

export function ShowcaseCapturePage() {
  // Dev-only — render a 404-equivalent in any non-dev build so this route
  // never lands as a real user surface even if the route tree ships.
  if (!import.meta.env.DEV) {
    return (
      <div style={{ padding: 48 }}>
        <h2>Not found</h2>
        <p>This route is only available in development.</p>
      </div>
    );
  }

  const sceneId = readSceneFromQuery() as SceneId | null;
  const [snap, setSnap] = useState<ShowcaseSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((s) => { if (!cancelled) setSnap(s); })
      .catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, []);

  if (!sceneId) {
    return <div style={{ padding: 48 }}>Missing ?scene= query param.</div>;
  }
  const mapState = SHARED_SCENE_MAP_STATES[sceneId];
  if (!mapState) {
    return <div style={{ padding: 48 }}>Unknown scene id: {sceneId}</div>;
  }
  if (error) {
    return <div style={{ padding: 48 }}>Failed to load snapshot: {error}</div>;
  }
  if (!snap) {
    return <div style={{ padding: 48 }}>Loading snapshot…</div>;
  }

  // Full-bleed, no chrome. The [data-testid="showcase-map"] inside
  // <ShowcaseMap> is the screenshot target — make it fill the viewport so
  // the captured WebP is a clean map frame.
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ShowcaseMap
        boundary={snap.project.parcel_boundary}
        layers={snap.layers}
        features={snap.designFeatures}
        activeLayerIds={mapState.activeLayers}
        initialView={mapState.view}
        interactive={false}
      />
    </div>
  );
}

export default ShowcaseCapturePage;
