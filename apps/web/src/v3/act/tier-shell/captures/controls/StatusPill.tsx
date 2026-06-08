import * as React from 'react';
import styles from './StatusPill.module.css';

export type StatusPillTone =
  | 'neutral'
  | 'act'
  | 'success'
  | 'warn'
  | 'error'
  | 'info';

export interface StatusPillProps {
  label: string;
  tone?: StatusPillTone;
  className?: string;
}

/**
 * StatusPill -- a small rounded status badge. Tone drives the tint via a
 * data-tone attribute; default tone is `neutral`.
 */
export function StatusPill({
  label,
  tone = 'neutral',
  className,
}: StatusPillProps): React.JSX.Element {
  const cls = className ? `${styles.pill} ${className}` : styles.pill;
  return (
    <span className={cls} data-tone={tone}>
      {label}
    </span>
  );
}
