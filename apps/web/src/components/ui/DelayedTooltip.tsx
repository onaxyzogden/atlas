import React from 'react';
import { Tooltip, type TooltipProps } from './Tooltip';

/* --------------------------------------------------------------------------
 * DelayedTooltip — UX Scholar §6
 * Preset wrapper around <Tooltip> with the "power-user discoverability"
 * delay (800ms). Intended for icon-only controls (IconSidebar phases,
 * LeftToolSpine buttons, map tool chrome) so labels surface on hover without
 * cluttering the default view. Replaces native `title=` usage, which has
 * browser-variable delay and no dark-mode styling.
 *
 * Consumers pass `label` (a string) for simple cases; falls through to
 * Tooltip's richer `content` prop when a node is needed.
 * -------------------------------------------------------------------------- */

export interface DelayedTooltipProps
  extends Omit<TooltipProps, 'content' | 'delay'> {
  label: React.ReactNode;
  delay?: number;
  /** When true, passes children through without wrapping. Useful for
   *  icon-only controls whose label is only needed in a collapsed state. */
  disabled?: boolean;
}

const DEFAULT_DELAY_MS = 800;

export const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  label,
  delay = DEFAULT_DELAY_MS,
  position = 'right',
  disabled = false,
  children,
  className,
}) => {
  if (disabled) return <>{children}</>;
  return (
    <Tooltip
      content={label}
      delay={delay}
      position={position}
      className={className}
    >
      {children}
    </Tooltip>
  );
};

DelayedTooltip.displayName = 'DelayedTooltip';
