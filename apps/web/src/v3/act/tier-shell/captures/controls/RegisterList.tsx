import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import styles from './RegisterList.module.css';

export interface RegisterListProps<T> {
  items: readonly T[];
  onChange: (next: T[]) => void;
  renderRow: (
    item: T,
    index: number,
    update: (patch: Partial<T>) => void,
  ) => React.ReactNode;
  /** factory for a new blank row on "Add" */
  makeEmpty: () => T;
  /** default "Add" */
  addLabel?: string;
  /** shown when items.length === 0 */
  emptyHint?: string;
  ariaLabel?: string;
}

/**
 * RegisterList -- controlled, generic add/remove card list with per-row fields.
 * `items` + `onChange` are authoritative. `renderRow` receives a per-row
 * `update(patch)` that merges the patch into that row and emits onChange.
 */
export function RegisterList<T>({
  items,
  onChange,
  renderRow,
  makeEmpty,
  addLabel = 'Add',
  emptyHint,
  ariaLabel,
}: RegisterListProps<T>): React.JSX.Element {
  const updateAt = (index: number, patch: Partial<T>): void => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeAt = (index: number): void => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = (): void => {
    onChange([...items, makeEmpty()]);
  };

  return (
    <div role="group" aria-label={ariaLabel} className={styles.root}>
      {items.length === 0 ? (
        <p className={styles.empty}>{emptyHint}</p>
      ) : (
        <div className={styles.rows}>
          {items.map((item, index) => (
            <div key={index} className={styles.row}>
              {renderRow(item, index, (patch) => updateAt(index, patch))}
              <button
                type="button"
                className={styles.delBtn}
                aria-label="Remove"
                onClick={() => removeAt(index)}
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className={styles.addBtn} onClick={add}>
        <Plus size={14} aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}
