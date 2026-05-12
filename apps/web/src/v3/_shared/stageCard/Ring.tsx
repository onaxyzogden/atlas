import type { CSSProperties } from 'react';
import styles from './observeExtras.module.css';

export default function Ring({ value }: { value: number }) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={styles.ring} style={style}>
      <span>{value}%</span>
    </div>
  );
}
