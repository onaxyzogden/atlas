import type { LucideIcon } from 'lucide-react';

export type ChipItem =
  | string
  | {
      label: string;
      tone?: string;
      icon?: LucideIcon;
    };

interface ChipListProps {
  items: ChipItem[];
  className?: string;
  removable?: boolean;
}

export function ChipList({ items, className = '', removable = false }: ChipListProps) {
  return (
    <div className={`chip-list ${className}`}>
      {items.map((item, idx) => {
        const label = typeof item === 'string' ? item : item.label;
        const tone = typeof item === 'string' ? undefined : item.tone;
        const Icon = typeof item === 'string' ? undefined : item.icon;
        const key = `${label}-${idx}`;
        return (
          <span className={tone ? `chip ${tone}` : 'chip'} key={key}>
            {Icon ? <Icon aria-hidden="true" /> : null}
            {label}
            {removable ? (
              <button type="button" aria-label={`Remove ${label}`}>
                x
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
