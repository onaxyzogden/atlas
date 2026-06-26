import { useEffect, useState, lazy, Suspense } from 'react';

// ShowcaseMap is loaded dynamically so its maplibre-gl import doesn't pull the
// map renderer into the showcase entry's eager closure. This dev-only capture
// route only mounts it under import.meta.env.DEV. Lives in the async
// `showcase-map` chunk (see vite.config manualChunks).
const ShowcaseMap = lazy(() => import('../components/ShowcaseMap.js').then((m) => ({ default: m.ShowcaseMap })));
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot.js';
import type { SceneId } from '../data/sceneManifest.js';
import { getSharedSceneMapState } from '../data/sharedSceneFrontmatter.js';

// Dev-only capture route — mounted at /showcase/three-streams/_capture and
// guarded by import.meta.env.DEV. The Playwright snapshot script
// (scripts/snapshot-scene-images.ts) navigates Chromium here per scene to
// produce the .webp thumbnails consumed by <MapThumbnail>.
//
// The route renders a full-bleed <ShowcaseMap> with no chrome, no
// scrollytelling, no CTA, no attribution footer — the screenshot target is
// the [data-testid="showcase-map"] element exclusively.
//
// Map state is sourced directly from each scene's MDX frontmatter via
// `getSharedSceneMapState` — there is no parallel literal here. The
// single source of truth lives in apps/web/src/showcase/scenes/_shared/*.mdx.

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
  const mapState = getSharedSceneMapState(sceneId);
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
      <Suspense fallback={<div style={{ padding: 48 }}>Loading map…</div>}>
        <ShowcaseMap
          boundary={snap.project.parcel_boundary}
          layers={snap.layers}
          features={snap.designFeatures}
          activeLayerIds={mapState.activeLayers}
          initialView={mapState.view}
          interactive={false}
        />
      </Suspense>
    </div>
  );
}

export default ShowcaseCapturePage;
