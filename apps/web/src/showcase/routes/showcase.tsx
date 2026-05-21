import { useEffect } from 'react';
import { AttributionFooter } from '../components/AttributionFooter.js';
import HeroScene from '../scenes/_shared/hero.mdx';

// Public showcase hero — outside AppShell, no auth. The hero MDX scene
// imports and renders <TierChooser /> internally, so we don't mount it
// here a second time.
//
// Body overflow override: app/index.css sets `body { overflow: hidden }` to
// lock the authed-app shell at 100vh. Showcase pages are document-scrollable
// (scrollytelling), so we toggle a `showcase-scroll` body class on mount.
// CSS rule lives in app/index.css.
export function ShowcasePage() {
  useEffect(() => {
    document.body.classList.add('showcase-scroll');
    return () => { document.body.classList.remove('showcase-scroll'); };
  }, []);

  return (
    <main>
      <HeroScene />
      <AttributionFooter />
    </main>
  );
}

export default ShowcasePage;
