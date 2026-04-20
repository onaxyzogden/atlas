/**
 * Minimal debounce helper. No lodash; no third-party deps.
 *
 * Returns a callable that delays invocation of `fn` until `ms` have elapsed
 * since the last call. Exposes a `.cancel()` method so React cleanup effects
 * can drop pending invocations on unmount.
 *
 * Used by Sprint BJ (UX/performance hardening) to coalesce rapid boundary-edit
 * re-triggers of `fetchForProject` in `ProjectPage.tsx`.
 */
export interface DebouncedFn<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): DebouncedFn<A> {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: A) => {
    if (handle !== null) clearTimeout(handle);
    handle = setTimeout(() => {
      handle = null;
      fn(...args);
    }, ms);
  }) as DebouncedFn<A>;
  debounced.cancel = () => {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
  };
  return debounced;
}
