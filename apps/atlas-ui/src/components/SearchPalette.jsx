import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "../icons.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { screenCatalog } from "../screenCatalog.js";

// Mod+K palette: filters screenCatalog by title/route, navigates on Enter.
// Keyboard: ↑/↓ to move, Enter to open, Esc to close.

export function SearchPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const trapRef = useFocusTrap(open, onClose);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = screenCatalog.map((s) => ({ id: s.id, route: s.route, title: s.title, pageType: s.pageType }));
    if (!q) return items.slice(0, 12);
    return items
      .map((item) => {
        const hay = `${item.title} ${item.route} ${item.pageType ?? ""}`.toLowerCase();
        const idx = hay.indexOf(q);
        return idx === -1 ? null : { item, score: idx };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .slice(0, 12)
      .map((r) => r.item);
  }, [query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  if (!open || typeof document === "undefined") return null;

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) {
        navigate({ to: target.route });
        onClose?.();
      }
    }
  };

  return createPortal(
    <div className="prim-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        className="search-palette"
        onKeyDown={onKey}
      >
        <div className="search-palette__input">
          <Icon.search aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a screen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search screens"
          />
          <kbd>esc</kbd>
        </div>
        <ul className="search-palette__list" role="listbox">
          {results.length === 0 ? (
            <li className="search-palette__empty">No matches.</li>
          ) : results.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`search-palette__item ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => { navigate({ to: item.route }); onClose?.(); }}
              >
                <span className="search-palette__title">{item.title}</span>
                <span className="search-palette__route">{item.route}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
