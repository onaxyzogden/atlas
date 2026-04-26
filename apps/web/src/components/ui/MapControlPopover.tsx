import React from 'react';

/* --------------------------------------------------------------------------
 * MapControlPopover — IA & Panel Conventions §5 (deferred P2, landed 2026-04-24)
 *
 * Shared glass chrome for map-resident floating controls. Retires the inline
 * style duplication that had accumulated across GaezOverlay, SoilOverlay,
 * TerrainControls, HistoricalImageryControl, and OsmVectorOverlay.
 *
 * Two variants:
 *   - 'panel'    : main controls anchored top-right of .mapArea, warm-gold
 *                  border, radius 10, padding 12 (6/10 when collapsed).
 *                  Consumers supply their own collapse header as children.
 *   - 'dropdown' : menu popover anchored to a trigger, lighter border,
 *                  radius 8, padding 10. Caller owns position via `style`.
 *
 * Caller owns positioning + zIndex via the `style` prop — the primitive only
 * provides chrome. Any inline `style` property wins over the defaults.
 * -------------------------------------------------------------------------- */

export type MapControlPopoverVariant = 'panel' | 'dropdown';

export interface MapControlPopoverProps {
  /** Chrome variant. Default `'panel'`. */
  variant?: MapControlPopoverVariant;
  /** Panel-only: compact padding when the consumer collapses its content. */
  collapsed?: boolean;
  /** Position, zIndex, width overrides. Spread after chrome defaults — caller wins. */
  style?: React.CSSProperties;
  className?: string;
  role?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

const PANEL_BORDER = '1px solid rgba(125, 97, 64, 0.4)';
const DROPDOWN_BORDER = '1px solid rgba(196, 180, 154, 0.25)';

export function MapControlPopover({
  variant = 'panel',
  collapsed = false,
  style,
  className,
  role,
  'aria-label': ariaLabel,
  children,
}: MapControlPopoverProps) {
  const chrome: React.CSSProperties =
    variant === 'panel'
      ? {
          background: 'var(--color-chrome-bg-translucent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: PANEL_BORDER,
          borderRadius: 10,
          padding: collapsed ? '6px 10px' : 12,
          color: 'var(--color-text, #e9decb)',
          pointerEvents: 'auto',
        }
      : {
          background: 'var(--color-chrome-bg-translucent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: DROPDOWN_BORDER,
          borderRadius: 8,
          padding: 10,
          color: 'var(--color-text, #e9decb)',
          pointerEvents: 'auto',
        };

  return (
    <div
      className={className}
      role={role}
      aria-label={ariaLabel}
      style={{ ...chrome, ...style }}
    >
      {children}
    </div>
  );
}

export default MapControlPopover;
