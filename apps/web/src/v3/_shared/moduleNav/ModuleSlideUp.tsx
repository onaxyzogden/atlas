/**
 * ModuleSlideUp — shared bottom sheet for Plan / Act / Observe stage modules.
 *
 * Stage wrappers (PlanModuleSlideUp, ActModuleSlideUp, observe/ModuleSlideUp)
 * pass an eyebrow string, a label, the per-stage card list (with optional
 * `group` field), and a renderCard slot. Multi-card modules show a tab row;
 * grouped tabs emit a gold uppercase group label when `group !== prevGroup`
 * and carry a faint gold underline (`tabGrouped`). ESC + backdrop close the
 * sheet. Focus is trapped while open via `useFocusTrap`.
 */

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../../../components/ui/useFocusTrap.js';
import css from './ModuleSlideUp.module.css';

export interface ModuleSlideUpCard {
  label: string;
  sectionId: string;
  group?: string;
}

export interface ModuleSlideUpProps {
  /** Whether the sheet is open. Closed sheets render nothing. */
  open: boolean;
  /** Backdrop / ESC / close-button handler. */
  onClose: () => void;
  /** Header eyebrow line (e.g. `Plan · module`). Hidden when blank. */
  eyebrow: string;
  /** Header title (full module label). */
  label: string;
  /** Card list for the active module. Length 0 hides the sheet body tabs. */
  cards: ReadonlyArray<ModuleSlideUpCard>;
  /** Render the active card body keyed by sectionId. */
  renderCard: (sectionId: string) => ReactNode;
  /** Aria-label for the dialog root. */
  ariaLabel?: string;
  /** Extra class added to the sheet root (e.g. `observe-port` cascade). */
  sheetClassName?: string;
  /** Optional node rendered under the title (e.g. Plan view badge chip). */
  headerExtra?: ReactNode;
}

export default function ModuleSlideUp({
  open,
  onClose,
  eyebrow,
  label,
  cards,
  renderCard,
  ariaLabel,
  sheetClassName,
  headerExtra,
}: ModuleSlideUpProps) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    cards[0]?.sectionId ?? null,
  );

  // Reset active card whenever the card list identity changes (module switch)
  // or when the sheet reopens — mirrors prior PlanModuleSlideUp behaviour.
  useEffect(() => {
    setActiveSectionId(cards[0]?.sectionId ?? null);
  }, [cards]);
  useEffect(() => {
    if (!open) return;
    setActiveSectionId(cards[0]?.sectionId ?? null);
  }, [open, cards]);

  useFocusTrap(sheetRef, open, { onEscape: onClose });

  if (!open || cards.length === 0) return null;

  const currentId = activeSectionId ?? cards[0]?.sectionId ?? null;
  const hasMultiple = cards.length > 1;
  const sheetClass = sheetClassName
    ? `${css.sheet} ${sheetClassName}`
    : css.sheet;

  return (
    <div className={css.scrim} role="presentation" onClick={onClose}>
      <aside
        ref={sheetRef}
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? `${label} module`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <div className={css.titleBlock}>
            {eyebrow ? <span className={css.eyebrow}>{eyebrow}</span> : null}
            <h2 className={css.title}>{label}</h2>
            {headerExtra ?? null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={css.close}
            onClick={onClose}
            aria-label="Close module"
          >
            ×
          </button>
        </header>

        {hasMultiple && (
          <nav className={css.tabs} aria-label="Module sub-tools">
            {cards.map(({ label: tabLabel, sectionId, group }, idx) => {
              const prevGroup = idx > 0 ? cards[idx - 1]?.group : undefined;
              const showDivider = group && group !== prevGroup;
              return (
                <span key={sectionId} className={css.tabSlot}>
                  {showDivider ? (
                    <span className={css.tabGroupLabel} aria-hidden="true">
                      {group}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={[
                      css.tab,
                      group ? css.tabGrouped : '',
                      sectionId === currentId ? css.tabActive : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setActiveSectionId(sectionId)}
                  >
                    {tabLabel}
                  </button>
                </span>
              );
            })}
          </nav>
        )}

        <div className={css.body}>
          <Suspense fallback={<p className={css.loading}>Loading…</p>}>
            {currentId ? renderCard(currentId) : null}
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
