import React, { forwardRef } from 'react';
import styles from './Badge.module.css';

/* -------------------------------------------------------------------------- */
/*  Badge — OGDEN Atlas Design System                                         */
/* -------------------------------------------------------------------------- */

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'confidence-high'
  | 'confidence-medium'
  | 'confidence-low'
  | 'phase';

type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const classNames = [
      styles.badge,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classNames} {...rest}>
        {dot && <span className={styles.dot} aria-hidden="true" />}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
