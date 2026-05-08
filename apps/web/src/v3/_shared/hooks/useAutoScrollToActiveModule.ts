/**
 * useAutoScrollToActiveModule — scrolls a checklist-aside container so the
 * card matching the active module is in view.
 *
 * Looks up `[data-module="<key>"]` inside the provided container ref.
 * `block: 'nearest'` no-ops when already visible, so this is safe to fire
 * on every activeModule change. Honors prefers-reduced-motion.
 *
 * Extracted from ObserveChecklistAside so Plan + Act asides can reuse it.
 */

import { useEffect, type RefObject } from 'react';

export function useAutoScrollToActiveModule(
  activeModule: string | null,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!activeModule) return;
    const root = containerRef.current;
    if (!root) return;
    const section = root.querySelector<HTMLElement>(
      `[data-module="${activeModule}"]`,
    );
    if (!section) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeModule, containerRef]);
}
