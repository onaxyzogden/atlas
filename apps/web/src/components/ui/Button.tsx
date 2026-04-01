import React, { forwardRef } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`${styles.spinner} ${className ?? ''}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="3"
      fill="none"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
      loading ? styles.loading : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && <LoadingSpinner />}
        {!loading && iconLeft && (
          <span className={styles.iconLeft}>{iconLeft}</span>
        )}
        {children && <span className={styles.label}>{children}</span>}
        {!loading && iconRight && (
          <span className={styles.iconRight}>{iconRight}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
