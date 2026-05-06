import type { ReactNode } from 'react';
import { CroppedArt } from './CroppedArt.js';

interface ModuleSummaryCardProps {
  number: string;
  title: string;
  status?: string;
  tone?: 'green' | 'gold';
  children?: ReactNode;
  footer?: ReactNode;
  mediaSrc?: string;
  className?: string;
}

export function ModuleSummaryCard({
  number,
  title,
  status = 'In progress',
  tone = 'green',
  children,
  footer,
  mediaSrc,
  className = '',
}: ModuleSummaryCardProps) {
  return (
    <article className={`dashboard-module-card ${className}`}>
      <header>
        <h3>
          <span>{number}</span>
          {title}
        </h3>
        <b className={`status-pill ${tone}`}>{status}</b>
      </header>
      <div className="dashboard-module-card__body">
        {children}
        {mediaSrc ? (
          <CroppedArt className="dashboard-module-card__media" src={mediaSrc} />
        ) : null}
      </div>
      {footer ? <footer>{footer}</footer> : null}
    </article>
  );
}
