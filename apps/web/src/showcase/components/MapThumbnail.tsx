import { useState } from 'react';
import { ShowcaseMap, type ShowcaseMapProps } from './ShowcaseMap';

export function MapThumbnail({ sceneId, alt, mapProps }: { sceneId: string; alt: string; mapProps: ShowcaseMapProps }) {
  const [live, setLive] = useState(false);
  if (live) return <div style={{ width: '100%', minHeight: 480 }}><ShowcaseMap {...mapProps} interactive /></div>;
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
