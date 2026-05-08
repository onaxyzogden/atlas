import type { ElementType, HTMLAttributes, ReactNode } from 'react';

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
    <Element className={`surface-card ${className}`} {...props}>
      {children}
    </Element>
  );
}
