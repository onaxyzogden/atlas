import styles from './HeroSiteCard.module.css';

export default function HeroSiteCard() {
  return (
    <div className={styles.card} role="figure" aria-label="Sample parcel site intelligence preview">
      <p className={styles.label}>Site Intelligence</p>
      <p className={styles.address}>Sample Parcel · Cache Valley, UT</p>
      <p className={styles.meta}>142.3 acres · APN 08-033-0019</p>
      <div className={styles.scores}>
        <div className={`${styles.score} ${styles.soil}`}>
          <span className={styles.scoreValue}>82</span>
          <span className={styles.scoreLabel}>Soil</span>
        </div>
        <div className={`${styles.score} ${styles.water}`}>
          <span className={styles.scoreValue}>71</span>
          <span className={styles.scoreLabel}>Water</span>
        </div>
        <div className={`${styles.score} ${styles.climate}`}>
          <span className={styles.scoreValue}>68</span>
          <span className={styles.scoreLabel}>Climate</span>
        </div>
      </div>
    </div>
  );
}
