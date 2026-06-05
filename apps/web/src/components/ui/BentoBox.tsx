import React, { forwardRef } from 'react';
import styles from './BentoBox.module.css';

/* -------------------------------------------------------------------------- */
/*  BentoBox — OLOS/Atlas canonical surface primitive (compound component)    */
/*                                                                            */
/*  Outer `<BentoBox>` is the panel shell (color-mix surface 96%/white +      */
/*  hairline border + soft shadow + --radius-lg). Inner `<BentoBox.Group>`    */
/*  is the recessed inset card. `<BentoBox.Header|Body|Footer>` are slot      */
/*  components kept at Card parity so Card consumers can migrate without      */
/*  losing structure (Phase 3 of the bento canonicalisation plan).            */
/*                                                                            */
/*  See: atlas/wiki/decisions/2026-05-27-atlas-bento-box-canonical-surface.md */
/* -------------------------------------------------------------------------- */

type BentoOuter = 'default' | 'flat' | 'elevated';
type BentoPadding = 'none' | 'sm' | 'md' | 'lg';
type BentoAccent = 'none' | 'gold' | 'sage' | 'warning' | 'danger';

const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

/* --- BentoBox (outer) ----------------------------------------------------- */

export interface BentoBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  outer?: BentoOuter;
  padding?: BentoPadding;
  className?: string;
  children?: React.ReactNode;
}

const BentoBoxRoot = forwardRef<HTMLDivElement, BentoBoxProps>(
  ({ outer = 'default', padding = 'md', className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cx(
        styles.bento,
        styles[`outer-${outer}`],
        styles[`padding-${padding}`],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);
BentoBoxRoot.displayName = 'BentoBox';

/* --- BentoBox.Group (inner) ---------------------------------------------- */

export interface BentoGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: BentoAccent;
  className?: string;
  children?: React.ReactNode;
}

const BentoGroup = forwardRef<HTMLDivElement, BentoGroupProps>(
  ({ accent = 'none', className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cx(
        styles.group,
        accent !== 'none' && styles[`accent-${accent}`],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);
BentoGroup.displayName = 'BentoBox.Group';

/* --- Card-parity slots ---------------------------------------------------- */

export interface BentoSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

const BentoHeader = forwardRef<HTMLDivElement, BentoSectionProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cx(styles.header, className)} {...rest}>
      {children}
    </div>
  ),
);
BentoHeader.displayName = 'BentoBox.Header';

const BentoBody = forwardRef<HTMLDivElement, BentoSectionProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cx(styles.body, className)} {...rest}>
      {children}
    </div>
  ),
);
BentoBody.displayName = 'BentoBox.Body';

const BentoFooter = forwardRef<HTMLDivElement, BentoSectionProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cx(styles.footer, className)} {...rest}>
      {children}
    </div>
  ),
);
BentoFooter.displayName = 'BentoBox.Footer';

/* --- Compound export ------------------------------------------------------ */

export const BentoBox = Object.assign(BentoBoxRoot, {
  Group: BentoGroup,
  Header: BentoHeader,
  Body: BentoBody,
  Footer: BentoFooter,
});
