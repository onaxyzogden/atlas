import React from 'react';
import styles from './Skeleton.module.css';

/* -------------------------------------------------------------------------- */
/*  Skeleton — OGDEN Atlas Design System                                      */
/* -------------------------------------------------------------------------- */

export interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  variant = 'text',
  count = 1,
  className,
}) => {
  const classNames = [
    styles.skeleton,
    styles[variant],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={classNames}
      style={{
        width: variant === 'circular' ? height : width,
        height,
      }}
      aria-hidden="true"
    />
  ));

  if (count === 1) return items[0]!;

  return (
    <div className={styles.stack} role="presentation" aria-label="Loading">
      {items}
    </div>
  );
};

Skeleton.displayName = 'Skeleton';
