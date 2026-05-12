import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './ActionCard.module.css';

interface ActionCardProps {
  className?: string;
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  art?: ReactNode;
  action?: boolean;
}

export function ActionCard({
  className = '',
  icon,
  title,
  body,
  art,
  action,
}: ActionCardProps) {
  return (
    <button className={`${styles.card} ${className}`} type="button">
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.copy}>
        <strong>{title}</strong>
        {body ? <span>{body}</span> : null}
      </span>
      {art}
      {action ? <ArrowRight className={styles.arrow} /> : null}
    </button>
  );
}
