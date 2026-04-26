/**
 * LandingPage — public marketing page for Atlas.
 *
 * Rendered at `/` for unauthenticated visitors. Authenticated users are
 * redirected to `/home` by the route's `beforeLoad` guard.
 */

import LandingNav from './sections/LandingNav.js';
import HeroBoxBreak from './sections/HeroBoxBreak.js';
import PillarsBento from './sections/PillarsBento.js';
import PathToExcellenceCTA from './sections/PathToExcellenceCTA.js';
import LandingFooter from './sections/LandingFooter.js';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />
      <main className={styles.main}>
        <HeroBoxBreak />
        <PillarsBento />
        <PathToExcellenceCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
