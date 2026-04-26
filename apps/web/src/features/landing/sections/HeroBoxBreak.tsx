import { Link } from '@tanstack/react-router';
import { Button } from '../../../components/ui/Button.js';
import HeroMapCanvas from './HeroMapCanvas.js';
import HeroSiteCard from './HeroSiteCard.js';
import styles from './HeroBoxBreak.module.css';

export default function HeroBoxBreak() {
  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Geospatial Land Intelligence</p>
          <h1 id="hero-headline" className={styles.headline}>
            Know the land before you buy it.
          </h1>
          <p className={styles.sub}>
            Atlas reads soil, water, climate, solar, and zoning for any parcel on Earth — in one map. Built for farmers, landowners, CSRA operators, and developers.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/login">
              <Button variant="primary" size="lg">
                Request access →
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg">
                Watch 90-sec demo
              </Button>
            </Link>
          </div>
          <p className={styles.trust}>
            No credit card · SOC-2 roadmap · Your data stays yours
          </p>
        </div>

        <div className={styles.visual}>
          <div className={styles.mapFrame}>
            <HeroMapCanvas />
          </div>
          <div className={styles.siteCard}>
            <HeroSiteCard />
          </div>
          <div className={styles.badge} aria-label="Overall suitability score for regenerative agriculture">
            <span className={styles.badgeValue}>77</span>
            <span className={styles.badgeLabel}>Regen-Ag fit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
