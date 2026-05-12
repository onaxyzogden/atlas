import { useState, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './ChipList.module.css';

export type ChipItem =
  | string
  | {
      label: string;
      tone?: 'green' | 'gold' | 'orange';
      icon?: LucideIcon;
    };

interface ChipListProps {
  items: ChipItem[];
  className?: string;
  removable?: boolean;
  onRemove?: (index: number) => void;
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
    <div className={`${styles.list} ${className}`}>
      {items.map((item, idx) => {
        const label = chipLabel(item);
        const tone = typeof item === 'string' ? undefined : item.tone;
        const Icon = typeof item === 'string' ? undefined : item.icon;
        const key = `${label}-${idx}`;
        const toneClass = tone ? styles[tone] : '';
        return (
          <span className={`${styles.chip} ${toneClass}`} key={key}>
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
          <form onSubmit={commit} className={styles.addForm}>
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
            className={`${styles.chip} ${styles.chipAdd}`}
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
