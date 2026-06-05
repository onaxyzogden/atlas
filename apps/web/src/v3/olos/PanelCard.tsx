/**
 * PanelCard — generic bento surface for OLOS workspace sections.
 *
 * Wraps arbitrary children in the platform's standard surface: cards live
 * on `--color-surface` with a hairline `--color-border` and `--radius-lg`
 * corners. An optional title + trailing meta slot renders a section header
 * inside the card; omit `title` to render a header-less card (used for the
 * Objective overview card which has its own crumb + title layout).
 *
 * This is the OLOS twin of MetricCard. Same tokens, different content
 * shape (free-form children vs. metric-specific value/unit/status pill).
 */

import type { ReactNode } from 'react';
import css from './PanelCard.module.css';

export interface PanelCardProps {
  /** Section title rendered in the card header. Optional — omit for free-form cards. */
  title?: string;
  /** Right-aligned meta in the card header (e.g. progress count). */
  meta?: ReactNode;
  /** Accessible label override; defaults to `title`. */
  ariaLabel?: string;
  children: ReactNode;
}

export default function PanelCard({
  title,
  meta,
  ariaLabel,
  children,
}: PanelCardProps) {
  return (
    <section
      className={css.card}
      aria-label={ariaLabel ?? title ?? undefined}
    >
      {(title || meta) && (
        <header className={css.header}>
          {title ? <h2 className={css.title}>{title}</h2> : <span />}
          {meta ? <span className={css.meta}>{meta}</span> : null}
        </header>
      )}
      {children}
    </section>
  );
}
