/**
 * useFocusTrap — confine keyboard focus within a panel while it's active.
 *
 * Extracted from `Modal.tsx` so the same primitive can power any modal-shell
 * component (Modal, SlideUpPanel, PlanModuleSlideUp). Active dialogs MUST trap
 * Tab/Shift+Tab so screen-reader and keyboard-only users don't accidentally
 * focus elements behind a backdrop they can't see.
 *
 * Behavior when `active`:
 *   - Records the previously-focused element on activation; restores on cleanup.
 *   - Focuses the first focusable element inside the panel on the next animation
 *     frame (after layout). Falls back to the panel itself (set tabIndex={-1}).
 *   - Intercepts Tab/Shift+Tab to wrap focus inside the panel.
 *   - Calls `onEscape` when the user presses Escape, if provided.
 *   - Locks `document.body.style.overflow = 'hidden'` to prevent background
 *     scroll. Restored on cleanup.
 *
 * NON-modal chrome (e.g. RailPanelShell) must NOT use this — users need to
 * tab out to the map and other surrounding UI.
 */

import { useCallback, useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface UseFocusTrapOptions {
  /** Called when Escape is pressed inside the trapped panel. */
  onEscape?: () => void;
  /** Lock body scroll while active. Defaults to `true`. */
  lockBodyScroll?: boolean;
}

export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: UseFocusTrapOptions = {},
) {
  const { onEscape, lockBodyScroll = true } = options;

  const getFocusableElements = useCallback(() => {
    if (!panelRef.current) return [] as HTMLElement[];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
  }, [panelRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onEscape, getFocusableElements],
  );

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKeyDown);

    const raf = requestAnimationFrame(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0]?.focus();
      } else {
        panelRef.current?.focus();
      }
    });

    let originalOverflow: string | undefined;
    if (lockBodyScroll) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      if (lockBodyScroll && originalOverflow !== undefined) {
        document.body.style.overflow = originalOverflow;
      }
      previousFocus?.focus?.();
    };
  }, [active, handleKeyDown, getFocusableElements, lockBodyScroll, panelRef]);
}
