/**
 * MachineryInventoryCard — equipment inventory editor for the Plan stage
 * Machinery module.
 *
 * Each item captures the dimensions and fuel type the Access-fit and
 * Housing & fuel cards need to cross-reference against drawn paths and
 * structures. Pure CRUD over machineryInventoryStore; no spatial work.
 */

import { useState } from 'react';
import {
  useMachineryInventoryStore,
  newMachineryId,
  type MachineryItem,
  type MachineryKind,
  type MachineryFrequency,
  type MachineryFuelType,
} from '../../../../store/machineryInventoryStore.js';
import css from './MachineryInventoryCard.module.css';

const EMPTY: MachineryItem[] = [];

const KINDS: MachineryKind[] = [
  'tractor',
  'implement',
  'mower',
  'hand-tool',
  'other',
];

const FREQUENCIES: MachineryFrequency[] = [
  'daily',
  'weekly',
  'seasonal',
  'standby',
];

const FUEL_TYPES: MachineryFuelType[] = [
  'diesel',
  'petrol',
  'electric',
  'human-powered',
  'other',
];

interface Props {
  projectId: string;
}

function emptyDraft(): MachineryItem {
  return {
    id: newMachineryId(),
    name: '',
    kind: 'tractor',
    purpose: '',
    frequency: 'weekly',
    fuelType: 'diesel',
  };
}

export default function MachineryInventoryCard({ projectId }: Props) {
  const items = useMachineryInventoryStore(
    (s) => s.byProject[projectId] ?? EMPTY,
  );
  const add = useMachineryInventoryStore((s) => s.add);
  const update = useMachineryInventoryStore((s) => s.update);
  const remove = useMachineryInventoryStore((s) => s.remove);

  const [draft, setDraft] = useState<MachineryItem>(() => emptyDraft());

  const canSubmit = draft.name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    add(projectId, { ...draft, id: newMachineryId() });
    setDraft(emptyDraft());
  };

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Machinery inventory</h2>
        <span className={css.cardHint}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className={css.intro}>
        Declare every tractor, implement, mower, and hand tool the design will
        rely on. Width and turn radius drive the Access-fit cross-checks; fuel
        type drives the Housing &amp; fuel card&apos;s station-coverage map.
      </p>

      <form className={css.form} onSubmit={handleSubmit}>
        <label className={css.field}>
          <span>Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. John Deere 1025R"
          />
        </label>
        <label className={css.field}>
          <span>Kind</span>
          <select
            value={draft.kind}
            onChange={(e) =>
              setDraft((d) => ({ ...d, kind: e.target.value as MachineryKind }))
            }
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className={css.field}>
          <span>Purpose</span>
          <input
            type="text"
            value={draft.purpose}
            onChange={(e) =>
              setDraft((d) => ({ ...d, purpose: e.target.value }))
            }
            placeholder="primary till + bucket work"
          />
        </label>
        <label className={css.field}>
          <span>Frequency</span>
          <select
            value={draft.frequency}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                frequency: e.target.value as MachineryFrequency,
              }))
            }
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className={css.field}>
          <span>Width (m)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={draft.requiredWidthM ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                requiredWidthM:
                  e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
          />
        </label>
        <label className={css.field}>
          <span>Turn radius (m)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={draft.requiredTurnRadiusM ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                requiredTurnRadiusM:
                  e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
          />
        </label>
        <label className={css.field}>
          <span>Fuel</span>
          <select
            value={draft.fuelType}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                fuelType: e.target.value as MachineryFuelType,
              }))
            }
          >
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={css.submit} disabled={!canSubmit}>
          Add item
        </button>
      </form>

      {items.length === 0 ? (
        <div className={css.empty}>
          No machinery declared yet. Add the primary tractor first, then the
          implements that ride on it.
        </div>
      ) : (
        <ul className={css.list}>
          {items.map((it) => (
            <li key={it.id} className={css.item}>
              <div className={css.itemMain}>
                <strong>{it.name}</strong>
                <span className={css.kindChip}>{it.kind}</span>
                <span className={css.freq}>{it.frequency}</span>
              </div>
              <div className={css.itemMeta}>
                {it.purpose ? <em>{it.purpose}</em> : null}
                {it.requiredWidthM !== undefined ? (
                  <span>{it.requiredWidthM.toFixed(1)} m wide</span>
                ) : null}
                {it.requiredTurnRadiusM !== undefined ? (
                  <span>{it.requiredTurnRadiusM.toFixed(1)} m radius</span>
                ) : null}
                <span>{it.fuelType}</span>
              </div>
              <div className={css.itemActions}>
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) =>
                    update(projectId, it.id, { name: e.target.value })
                  }
                  className={css.renameInput}
                  aria-label="Rename"
                />
                <button
                  type="button"
                  className={css.removeBtn}
                  onClick={() => remove(projectId, it.id)}
                  aria-label={`Remove ${it.name}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
