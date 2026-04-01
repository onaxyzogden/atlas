import React from 'react';
import styles from './Spinner.module.css';

/* -------------------------------------------------------------------------- */
/*  Spinner — OGDEN Atlas Design System                                      */
/* -------------------------------------------------------------------------- */

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'var(--color-primary, #7d6140)',
  className,
}) => {
  const px = sizeMap[size];
  const strokeWidth = size === 'sm' ? 3 : size === 'xl' ? 4 : 3.5;
  const radius = 10;
  const circumference = 2 * Math.PI * radius;

  const classNames = [styles.spinner, className ?? ''].filter(Boolean).join(' ');

  return (
    <svg
      className={classNames}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
    >
      {/* Background track */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke={color}
        strokeOpacity="0.2"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Animated arc */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
        fill="none"
      />
    </svg>
  );
};

Spinner.displayName = 'Spinner';
