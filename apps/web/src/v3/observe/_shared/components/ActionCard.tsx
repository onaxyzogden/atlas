import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

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
    <button className={`action-card ${className}`} type="button">
      {icon ? <span className="action-icon">{icon}</span> : null}
      <span className="action-copy">
        <strong>{title}</strong>
        {body ? <span>{body}</span> : null}
      </span>
      {art}
      {action ? <ArrowRight className="action-arrow" /> : null}
    </button>
  );
}
