/**
 * useGlobalAnnotationUndo — global Cmd/Ctrl-Z keybind for the OBSERVE
 * annotation timeline. Mounted once from `ObserveLayout`; attaches a
 * `keydown` listener on `document` and dispatches into the
 * `undoCoordinatorStore`'s cross-store undo/redo timeline.
 *
 *   Cmd-Z         → undo
 *   Cmd-Shift-Z   → redo
 *   Ctrl-Z        → undo (Windows/Linux)
 *   Ctrl-Shift-Z  → redo (Windows/Linux)
 *   Ctrl-Y        → redo (Windows convention)
 *
 * The handler skips when focus is inside an INPUT / TEXTAREA / SELECT or
 * any element with `contenteditable`, so typing in the slide-up form's
 * fields still uses the browser's native undo. The hook returns
 * nothing — its side-effect is the listener subscription.
 */

import { useEffect } from 'react';
import { useUndoCoordinatorStore } from '../../../store/undoCoordinatorStore.js';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export default function useGlobalAnnotationUndo(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when typing in a form field — browser's native undo applies.
      if (isEditableTarget(e.target)) return;

      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;

      const key = e.key.toLowerCase();

      // Cmd-Y or Ctrl-Y → redo (Windows convention).
      if (key === 'y' && !e.shiftKey) {
        e.preventDefault();
        useUndoCoordinatorStore.getState().redo();
        return;
      }

      if (key !== 'z') return;

      e.preventDefault();
      if (e.shiftKey) {
        useUndoCoordinatorStore.getState().redo();
      } else {
        useUndoCoordinatorStore.getState().undo();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
