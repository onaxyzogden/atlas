/**
 * CollapsibleSection — small shared shell for View B's grouped sections.
 *
 * Each spec §4.2 section (Active, Ready to Start, Blocked + Diverged,
 * Completed Today) renders as: titled header + optional count + chevron
 * + body. The four wrappers below differ only in default-open state and
 * the body shape (grouped-by-objective vs flat list).
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import css from './CollapsibleSection.module.css';

interface Props {
  title: string;
  count: number;
  defaultOpen?: boolean;
  tone?: 'default' | 'amber' | 'muted';
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  tone = 'default',
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={css.section} data-tone={tone}>
      <button
        type="button"
        className={css.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        )}
        <span className={css.title}>{title}</span>
        <span className={css.count}>{count}</span>
      </button>
      {open && <div className={css.body}>{children}</div>}
    </section>
  );
}
