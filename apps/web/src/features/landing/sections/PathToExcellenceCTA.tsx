import { Link } from '@tanstack/react-router';
import { Button } from '../../../components/ui/Button.js';
import styles from './PathToExcellenceCTA.module.css';

export default function PathToExcellenceCTA() {
  return (
    <section id="cta" className={styles.section} aria-labelledby="cta-heading">
      <div className={styles.inner}>
        <h2 id="cta-heading" className={styles.heading}>
          Start with one parcel.
        </h2>
        <p className={styles.sub}>
          Paste a pin or upload a shapefile. See a full Atlas report in under two minutes.
        </p>
        <Link to="/login">
          <Button variant="primary" size="lg">
            Request access →
          </Button>
        </Link>
        <div className={styles.trust}>
          <span>No credit card</span>
          <span>SOC-2 roadmap</span>
          <span>Your data stays yours</span>
        </div>
      </div>
    </section>
  );
}
