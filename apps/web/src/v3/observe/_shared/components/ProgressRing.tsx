import type { CSSProperties } from 'react';

interface ProgressRingProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  label,
  className = 'progress-ring',
}: ProgressRingProps) {
  const style = { '--progress': `${value}%` } as CSSProperties;
  return (
    <div className={className} style={style}>
      <span>{label ?? `${value}%`}</span>
    </div>
  );
}
