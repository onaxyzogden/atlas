import { useState, type FormEvent } from 'react';
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
  /** When provided, clicking the × button on a chip calls this with its index. */
  onRemove?: (index: number) => void;
  /** When provided, an inline "Add" affordance appears at the end of the list. */
  onAdd?: (value: string) => void;
  addPlaceholder?: string;
}

function chipLabel(item: ChipItem): string {
  return typeof item === 'string' ? item : item.label;
}

export function ChipList({
  items,
  className = '',
  removable = false,
  onRemove,
  onAdd,
  addPlaceholder = 'Add…',
}: ChipListProps) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  function commit(e: FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    if (!value || !onAdd) return;
    onAdd(value);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className={`chip-list ${className}`}>
      {items.map((item, idx) => {
        const label = chipLabel(item);
        const tone = typeof item === 'string' ? undefined : item.tone;
        const Icon = typeof item === 'string' ? undefined : item.icon;
        const key = `${label}-${idx}`;
        return (
          <span className={tone ? `chip ${tone}` : 'chip'} key={key}>
            {Icon ? <Icon aria-hidden="true" /> : null}
            {label}
            {removable ? (
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={onRemove ? () => onRemove(idx) : undefined}
              >
                x
              </button>
            ) : null}
          </span>
        );
      })}
      {onAdd ? (
        adding ? (
          <form onSubmit={commit} className="chip-add-form">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
              placeholder={addPlaceholder}
            />
          </form>
        ) : (
          <button
            type="button"
            className="chip chip-add"
            onClick={() => setAdding(true)}
            aria-label={addPlaceholder}
          >
            + Add
          </button>
        )
      ) : null}
    </div>
  );
}
