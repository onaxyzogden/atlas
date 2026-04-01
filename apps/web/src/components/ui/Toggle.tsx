import React from 'react';
import styles from './Toggle.module.css';

/* -------------------------------------------------------------------------- */
/*  Toggle — OGDEN Atlas Design System                                        */
/* -------------------------------------------------------------------------- */

type ToggleSize = 'sm' | 'md';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
  label?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className,
}) => {
  const wrapperClasses = [styles.wrapper, className ?? '']
    .filter(Boolean)
    .join(' ');

  const trackClasses = [
    styles.track,
    styles[size],
    checked ? styles.checked : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={trackClasses}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );

  if (label) {
    return (
      <label className={wrapperClasses}>
        {toggle}
        <span className={styles.label}>{label}</span>
      </label>
    );
  }

  return toggle;
};

Toggle.displayName = 'Toggle';
