import type { CSSProperties } from 'react';
import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  label,
  className,
}: ProgressRingProps) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={`${styles.ring} ${className ?? ''}`} style={style}>
      <span>{label ?? `${value}%`}</span>
    </div>
  );
}
