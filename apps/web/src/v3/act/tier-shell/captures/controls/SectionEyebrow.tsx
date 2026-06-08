import * as React from 'react';
import styles from './SectionEyebrow.module.css';

export interface SectionEyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SectionEyebrow -- the small uppercase, letter-spaced heading that sits above
 * a capture section. Pure presentational atom.
 */
export function SectionEyebrow({
  children,
  className,
}: SectionEyebrowProps): React.JSX.Element {
  const cls = className ? `${styles.eyebrow} ${className}` : styles.eyebrow;
  return <div className={cls}>{children}</div>;
}
