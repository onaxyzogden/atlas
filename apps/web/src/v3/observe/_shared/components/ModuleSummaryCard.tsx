import type { ReactNode } from 'react';
import { CroppedArt } from './CroppedArt.js';
import styles from './ModuleSummaryCard.module.css';

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
  const pillTone = tone === 'gold' ? styles.gold : '';
  return (
    <article className={`${styles.card} ${className}`}>
      <header>
        <h3>
          <span>{number}</span>
          {title}
        </h3>
        <b className={`${styles.pill} ${pillTone}`}>{status}</b>
      </header>
      <div className={styles.body}>
        {children}
        {mediaSrc ? (
          <CroppedArt className={styles.media} src={mediaSrc} />
        ) : null}
      </div>
      {footer ? <footer>{footer}</footer> : null}
    </article>
  );
}
