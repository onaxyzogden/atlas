import React from 'react';
import styles from './EmptyState.module.css';

/* -------------------------------------------------------------------------- */
/*  EmptyState — OGDEN Atlas Design System                                    */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  const classNames = [styles.emptyState, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
