import React, { useState, useRef, useCallback, useId } from 'react';
import styles from './Tooltip.module.css';

/* -------------------------------------------------------------------------- */
/*  Tooltip — OGDEN Atlas Design System                                      */
/* -------------------------------------------------------------------------- */

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 300,
  children,
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  const positionClass = styles[position] ?? styles.top;

  const wrapperClasses = [styles.wrapper, className ?? '']
    .filter(Boolean)
    .join(' ');

  const tooltipClasses = [
    styles.tooltip,
    positionClass,
    visible ? styles.visible : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={wrapperClasses}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, {
        'aria-describedby': visible ? tooltipId : undefined,
      })}
      <span role="tooltip" id={tooltipId} className={tooltipClasses}>
        {content}
      </span>
    </span>
  );
};

Tooltip.displayName = 'Tooltip';
