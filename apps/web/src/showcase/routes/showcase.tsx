import { AttributionFooter } from '../components/AttributionFooter.js';
import HeroScene from '../scenes/_shared/hero.mdx';

// Public showcase hero — outside AppShell, no auth. The hero MDX scene
// imports and renders <TierChooser /> internally, so we don't mount it
// here a second time.
export function ShowcasePage() {
  return (
    <main>
      <HeroScene />
      <AttributionFooter />
    </main>
  );
}

export default ShowcasePage;
