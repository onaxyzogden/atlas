import { useEffect, useState } from 'react';

/**
 * Returns an ISO timestamp that refreshes on a fixed interval so
 * derived "current time" computations re-render when the clock
 * crosses a threshold, not only when upstream data changes.
 */
export function useNow(intervalMs: number = 60_000): string {
  const [now, setNow] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date().toISOString());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
