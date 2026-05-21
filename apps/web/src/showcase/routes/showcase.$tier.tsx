import { Navigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

// Body overflow override — see ShowcasePage; showcase pages scroll the
// document while authed app shell pages do not. Class is removed on unmount.
import { AttributionFooter } from '../components/AttributionFooter.js';
import { ContactCTA } from '../components/ContactCTA.js';
import { SceneEngine } from '../components/SceneEngine.js';
import { SCENE_COMPONENTS } from '../data/sceneComponents.js';
import { scenesForTier, type Tier } from '../data/sceneManifest.js';
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot.js';

const VALID: Tier[] = ['dreaming', 'transitioning', 'stewarding'];

// Per-tier scrollytelling page — public, outside AppShell. Validates the
// `$tier` param (invalid → redirect to /showcase/three-streams). Loads the
// pre-built snapshot once on mount, then walks scenesForTier(tier) and
// renders each MDX module from the static SCENE_COMPONENTS map. Wraps the
// stack in <SceneEngine tier=...> so the scrollama observer attaches.
export function ShowcaseTierPage() {
  const { tier } = useParams({ from: '/showcase/three-streams/$tier' });
  const [snap, setSnap] = useState<ShowcaseSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot().then((s) => {
      if (!cancelled) setSnap(s);
    }).catch(() => {
      // Snapshot fetch failed — leave snap null so the loading state shows.
      // A future Task could surface a friendlier error UI.
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.classList.add('showcase-scroll');
    return () => { document.body.classList.remove('showcase-scroll'); };
  }, []);

  if (!VALID.includes(tier as Tier)) {
    return <Navigate to="/showcase/three-streams" />;
  }
  if (!snap) {
    return <div style={{ padding: 48 }}>Loading…</div>;
  }

  const typedTier = tier as Tier;
  const ids = scenesForTier(typedTier);

  return (
    <main>
      <SceneEngine tier={typedTier}>
        {ids.map((id) => {
          const SceneComponent = SCENE_COMPONENTS[id];
          if (!SceneComponent) return null;
          return (
            <section key={id} data-scene-id={id}>
              <SceneComponent snapshot={snap} tier={typedTier} />
            </section>
          );
        })}
      </SceneEngine>
      <ContactCTA tier={typedTier} />
      <AttributionFooter />
    </main>
  );
}

export default ShowcaseTierPage;
