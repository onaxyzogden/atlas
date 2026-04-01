/**
 * Safe localStorage wrapper — handles quota exceeded, unavailable storage,
 * and corrupted JSON gracefully.
 */

export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[OGDEN] Failed to read localStorage key "${key}", using fallback`);
    return fallback;
  }
}

export function safeSetItem(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.name === 'QuotaExceededError')) {
      console.warn('[OGDEN] localStorage quota exceeded. Attempting cleanup...');
      // Try to free space by removing old version snapshots
      try {
        const versionsRaw = localStorage.getItem('ogden-versions');
        if (versionsRaw) {
          const versions = JSON.parse(versionsRaw);
          if (versions?.state?.snapshots?.length > 5) {
            // Keep only last 5 snapshots
            versions.state.snapshots = versions.state.snapshots.slice(-5);
            localStorage.setItem('ogden-versions', JSON.stringify(versions));
            // Retry the original write
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          }
        }
      } catch { /* cleanup failed */ }

      console.error('[OGDEN] localStorage is full. Data may not be saved.');
    }
    return false;
  }
}

/**
 * Get approximate localStorage usage in bytes.
 */
export function getStorageUsage(): { used: number; label: string } {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key)?.length ?? 0) * 2; // UTF-16
      }
    }
  } catch { /* ok */ }

  if (total > 1024 * 1024) return { used: total, label: `${(total / (1024 * 1024)).toFixed(1)} MB` };
  if (total > 1024) return { used: total, label: `${(total / 1024).toFixed(0)} KB` };
  return { used: total, label: `${total} B` };
}

/**
 * Check if localStorage is available at all.
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__ogden_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
