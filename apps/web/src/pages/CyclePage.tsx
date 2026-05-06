/**
 * CyclePage — top-level Cycle surface.
 * Renders a 3-segment Observe / Plan / Act wheel with CYCLE in the center.
 */

import CycleWheel from '../components/CycleWheel/index.js';
import styles from './CyclePage.module.css';

export default function CyclePage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Cycle</h1>
        <p className={styles.subtitle}>Observe → Plan → Act</p>
        <CycleWheel className={styles.wheel} />
      </div>
    </div>
  );
}
