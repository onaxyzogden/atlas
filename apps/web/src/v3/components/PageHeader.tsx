/**
 * PageHeader — title + subtitle + optional right-side action slot.
 *
 * Used at the top of pages that don't open with a verdict hero
 * (Discover, Build, Operate, Report).
 */

import type { ReactNode } from "react";
import css from "./PageHeader.module.css";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-side slot (action button, filter chip, etc.). */
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={css.header}>
      <div className={css.body}>
        {eyebrow && <span className={css.eyebrow}>{eyebrow}</span>}
        <h1 className={css.title}>{title}</h1>
        {subtitle && <p className={css.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={css.actions}>{actions}</div>}
    </header>
  );
}
