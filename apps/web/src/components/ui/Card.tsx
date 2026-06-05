import React, { forwardRef } from 'react';
import { BentoBox } from './BentoBox';

/* -------------------------------------------------------------------------- */
/*  Card — DEPRECATED forwarding wrapper                                      */
/*                                                                            */
/*  Card is now a thin wrapper that forwards to <BentoBox>, the canonical     */
/*  surface primitive for OLOS/Atlas. Files stay on disk per the              */
/*  no-deletion covenant ([[feedback-no-deletion]]); existing imports keep    */
/*  compiling. New code should import { BentoBox } from 'components/ui'.      */
/*                                                                            */
/*  Variant mapping:                                                          */
/*    variant="default"  → <BentoBox outer="default">  (with shadow)          */
/*    variant="outlined" → <BentoBox outer="flat">     (no shadow)            */
/*    variant="elevated" → <BentoBox outer="elevated"> (bumped shadow)        */
/*                                                                            */
/*  Padding scale (none | sm | md | lg) maps 1:1 to BentoBox.                 */
/*                                                                            */
/*  The `interactive` flag — which made a Card click/keyboard-triggerable —   */
/*  is preserved here on the wrapper (role="button", tabIndex, Enter/Space    */
/*  handlers) because BentoBox itself is presentation-only.                   */
/*                                                                            */
/*  See: atlas/wiki/decisions/2026-05-27-atlas-bento-box-canonical-surface.md */
/* -------------------------------------------------------------------------- */

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const variantToOuter: Record<CardVariant, 'default' | 'flat' | 'elevated'> = {
  default: 'default',
  outlined: 'flat',
  elevated: 'elevated',
};

/* --- Card (root) ---------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
}

/**
 * @deprecated Use `BentoBox` from `components/ui` instead. Card forwards
 * to BentoBox for back-compat; new code should import BentoBox directly.
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'md', interactive = false, onClick, children, ...rest },
    ref,
  ) => {
    const interactiveProps = interactive
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick,
          onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          },
        }
      : { onClick };

    return (
      <BentoBox
        ref={ref}
        outer={variantToOuter[variant]}
        padding={padding}
        {...interactiveProps}
        {...rest}
      >
        {children}
      </BentoBox>
    );
  },
);
CardRoot.displayName = 'Card';

/* --- Card.Header / Body / Footer (forwarded slots) ------------------------ */

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

/** @deprecated Use `BentoBox.Header` instead. */
const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>((props, ref) => (
  <BentoBox.Header ref={ref} {...props} />
));
CardHeader.displayName = 'Card.Header';

/** @deprecated Use `BentoBox.Body` instead. */
const CardBody = forwardRef<HTMLDivElement, CardSectionProps>((props, ref) => (
  <BentoBox.Body ref={ref} {...props} />
));
CardBody.displayName = 'Card.Body';

/** @deprecated Use `BentoBox.Footer` instead. */
const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>((props, ref) => (
  <BentoBox.Footer ref={ref} {...props} />
));
CardFooter.displayName = 'Card.Footer';

/* --- Compound export ------------------------------------------------------ */

/**
 * @deprecated Use `BentoBox` from `components/ui` instead. This compound
 * export is preserved for back-compat per the no-deletion covenant.
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
