/**
 * waitForTarget -- poll the DOM for a tour anchor after a route change, then
 * resolve with its bounding rect. Resolves `null` on timeout so the controller
 * can degrade a missing/unmounted anchor to a centred callout rather than
 * wedging the tour.
 *
 * Polling (setTimeout) rather than a MutationObserver keeps it dead-simple and
 * deterministic under vitest fake timers (waitForTarget.test.ts advances the
 * clock to drive both the appearance and timeout paths). The default 4s budget
 * comfortably covers a route transition + lazy mount of the heaviest stage
 * surface in the offline demo.
 */

export function waitForTarget(
  selector: string,
  timeoutMs = 4000,
  pollMs = 60,
): Promise<DOMRect | null> {
  return new Promise<DOMRect | null>((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    // Date.now() (not performance.now) so vitest's fake timers, which advance
    // Date alongside setTimeout, drive the deadline correctly in tests.
    const deadline = Date.now() + timeoutMs;

    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve((el as HTMLElement).getBoundingClientRect());
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      setTimeout(tick, pollMs);
    };

    tick();
  });
}
