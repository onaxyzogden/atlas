import { useState, lazy, Suspense } from 'react';
import type { ShowcaseMapProps } from './ShowcaseMap';

// Click-to-explore gate: the live MapLibre map loads on demand so the showcase
// first paint ships only static webp thumbnails, not the ~234 kB map renderer.
// `ShowcaseMap` lives in its own async `showcase-map` chunk (see vite.config
// manualChunks); importing it dynamically here keeps maplibre-gl out of the
// showcase entry's eager closure.
const ShowcaseMap = lazy(() => import('./ShowcaseMap').then((m) => ({ default: m.ShowcaseMap })));

export function MapThumbnail({ sceneId, alt, mapProps }: { sceneId: string; alt: string; mapProps: ShowcaseMapProps }) {
  // Intentionally one-way: re-collapsing would yank the map out from under
  // a scrolling reader. The thumbnail is a hydration gate, not a toggle.
  const [live, setLive] = useState(false);
  if (live)
    return (
      <div style={{ width: '100%', minHeight: 480 }}>
        <Suspense
          fallback={
            <div style={{ minHeight: 480, display: 'grid', placeItems: 'center', color: '#555' }}>
              Loading map…
            </div>
          }
        >
          <ShowcaseMap {...mapProps} interactive />
        </Suspense>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => setLive(true)}
      aria-label={alt}
      style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', width: '100%' }}
    >
      <picture>
        <source srcSet={`/showcase/scenes/${sceneId}@2x.webp`} media="(min-resolution: 2dppx)" />
        <img src={`/showcase/scenes/${sceneId}.webp`} alt={alt} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </picture>
      <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#555' }}>Click to explore the map →</span>
    </button>
  );
}
