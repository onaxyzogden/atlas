/**
 * DemoBanner — honesty notice for the free, client-only offline demo build.
 *
 * The whole point of the offline demo (FEATURE_DEMO_OFFLINE) is that there is
 * NO backend: every project, drawing, and Observe/Plan/Act record lives in the
 * visitor's own browser (IndexedDB) and nowhere else. The truthful-reporting
 * covenant requires we never imply work is saved to the cloud, so this slim
 * persistent bar states plainly that work is browser-local — and offers a
 * "Reset demo" escape hatch to wipe the local state and start fresh.
 *
 * Renders only in the offline-demo build for the synthetic guest. In every
 * other build (paid Render full-stack, live FEATURE_DEMO_MODE) it returns null
 * and adds nothing to the shell.
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { DEMO_OFFLINE_ENABLED, isDemoUser } from '../app/demoSession.js';
import styles from './DemoBanner.module.css';

/**
 * Best-effort wipe of all client-side demo state, then reload. Clears the
 * localStorage keys the offline session writes (auth token, stable demo user
 * id, and the per-user clone-idempotency flags) and deletes every IndexedDB
 * database we can enumerate. `indexedDB.databases()` is Chromium/WebKit only;
 * where it's unavailable (Firefox) the localStorage clear alone re-mints a
 * fresh guest on reload, and stale project data is simply re-cloned over —
 * acceptable for a throwaway demo. Never throws (reload always runs).
 */
async function resetDemo(): Promise<void> {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key === 'ogden-auth-token' ||
          key === 'demo-user-id' ||
          key.startsWith('demo-cloned-'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    const idb = window.indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>;
    };
    if (typeof idb.databases === 'function') {
      const dbs = await idb.databases();
      await Promise.all(
        dbs
          .map((d) => d.name)
          .filter((n): n is string => Boolean(n))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const req = idb.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
      );
    }
  } catch {
    // Swallow — a partial wipe is fine; the reload below recovers the session.
  } finally {
    window.location.assign('/home');
  }
}

export default function DemoBanner() {
  const user = useAuthStore((s) => s.user);
  const [resetting, setResetting] = useState(false);

  if (!DEMO_OFFLINE_ENABLED || !isDemoUser(user)) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        <svg
          width={14}
          height={14}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx={8} cy={8} r={6.5} />
          <path d="M8 7.25v3.25" />
          <path d="M8 5.25h.01" />
        </svg>
      </span>
      <span>
        You&rsquo;re exploring a free demo &mdash; your work is saved in this
        browser only.
      </span>
      <button
        type="button"
        className={styles.reset}
        disabled={resetting}
        onClick={() => {
          setResetting(true);
          void resetDemo();
        }}
      >
        {resetting ? 'Resetting…' : 'Reset demo'}
      </button>
    </div>
  );
}
