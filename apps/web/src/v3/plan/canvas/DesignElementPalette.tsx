/**
 * DesignElementPalette — left rail for the Vision-Layout canvas.
 *
 * Categorised list of design elements (Yeomans-ordered: water, access,
 * grazing, structures, amenity). Search filter at top. Clicking an element
 * arms it as the active draw kind; clicking again disarms.
 */

import { useMemo, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { DESIGN_CATEGORIES } from './elementCatalog.js';
import css from './DesignElementPalette.module.css';

interface Props {
  /** Currently armed draw kind, or null if none. */
  activeKind: string | null;
  onSelect: (kind: string | null) => void;
}

export default function DesignElementPalette({ activeKind, onSelect }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DESIGN_CATEGORIES;
    return DESIGN_CATEGORIES
      .map((c) => ({
        ...c,
        elements: c.elements.filter((e) =>
          e.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((c) => c.elements.length > 0);
  }, [q]);

  return (
    <div className={css.panel} aria-label="Design elements">
      <div className={css.titleRow}>
        <span className={css.title}>Design Elements</span>
      </div>
      <label className={css.searchRow}>
        <Search size={13} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          className={css.search}
          placeholder="Search elements…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      <div className={css.scroll}>
        {filtered.map((cat) => (
          <section key={cat.key} className={css.section}>
            <h3 className={css.sectionLabel}>{cat.label}</h3>
            <div className={css.tiles}>
              {cat.elements.map((el) => {
                const Icon = el.icon;
                const isActive = activeKind === el.kind;
                return (
                  <button
                    key={el.kind}
                    type="button"
                    className={css.tile}
                    data-active={isActive}
                    onClick={() => onSelect(isActive ? null : el.kind)}
                    title={`${el.label} (${el.geometry})`}
                  >
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span className={css.tileLabel}>{el.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        className={css.uploadBtn}
        disabled
        title="Custom element upload — coming soon"
      >
        <Upload size={14} strokeWidth={1.75} aria-hidden="true" />
        Upload Custom Element
      </button>
    </div>
  );
}
