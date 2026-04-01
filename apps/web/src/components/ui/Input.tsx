import React, { forwardRef } from 'react';
import styles from './Input.module.css';

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual size of the input. Defaults to 'md' (44px min-height touch target). */
  size?: InputSize;
  /** Displays error styling (red border & ring). */
  error?: boolean;
  /** Icon element rendered inside the input on the left. */
  iconLeft?: React.ReactNode;
  /** Icon element rendered inside the input on the right. */
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error = false,
      disabled = false,
      iconLeft,
      iconRight,
      className,
      ...rest
    },
    ref,
  ) => {
    const wrapperClasses = [
      styles.wrapper,
      styles[size],
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      styles.input,
      styles[size],
      error ? styles.error : '',
      iconLeft ? styles.hasIconLeft : '',
      iconRight ? styles.hasIconRight : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>}
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          aria-invalid={error || undefined}
          {...rest}
        />
        {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
