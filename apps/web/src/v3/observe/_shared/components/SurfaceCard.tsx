import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './SurfaceCard.module.css';

interface SurfaceCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

export function SurfaceCard({
  as: Element = 'section',
  className = '',
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <Element className={`${styles.card} ${className}`} {...props}>
      {children}
    </Element>
  );
}
