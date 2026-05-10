/**
 * Drag-time undo coalescing for zundo-wrapped Plan stores.
 *
 * Problem: each `mousemove` in a drag fires `updateXxx({ geometry })`,
 * which zundo's `temporal()` middleware records as a separate undo
 * entry. A single drag = 30-60 undo presses to reverse.
 *
 * Solution: rewind-resume-replay. At drag start, pause `temporal`. On
 * mouseup: silently restore the pre-drag state (still paused, no
 * recording), resume, then apply the final state — that single
 * recorded `set` lands as ONE undo entry covering the whole drag.
 */

interface TemporalAccess {
  temporal: {
    getState(): {
      pause(): void;
      resume(): void;
      isTracking: boolean;
    };
  };
}

export interface DragUndoWindow {
  /** Pause temporal recording. Idempotent. Call once threshold crosses. */
  start(): void;
  /**
   * Replace the head past-state's diff with a single drag entry.
   * Calls `applyOrig` while paused (silent restore), resumes, then
   * `applyFinal` (recorded). If `start` was never called (drag was a
   * click), just runs `applyFinal` so callers don't need a branch.
   */
  commit(applyOrig: () => void, applyFinal: () => void): void;
  /** Abort: resume without recording. Use if drag is cancelled. */
  cancel(): void;
}

export function beginDragUndoWindow(store: TemporalAccess): DragUndoWindow {
  let started = false;
  return {
    start() {
      if (started) return;
      store.temporal.getState().pause();
      started = true;
    },
    commit(applyOrig, applyFinal) {
      if (!started) {
        applyFinal();
        return;
      }
      applyOrig();
      store.temporal.getState().resume();
      applyFinal();
    },
    cancel() {
      if (!started) return;
      store.temporal.getState().resume();
    },
  };
}
