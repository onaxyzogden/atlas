/**
 * SessionExpiredBanner — global sticky banner shown when the JWT expires.
 *
 * Subscribes to `useSessionExpiredStore.isExpired`. Mounted once in
 * `main.tsx` as a sibling of `RouterProvider`. "Sign in again" preserves
 * the current path as `?return=<path>` so the user lands back where they
 * were after re-auth.
 */

import { useSessionExpiredStore } from '../store/sessionExpiredStore.js';
import styles from './SessionExpiredBanner.module.css';

export default function SessionExpiredBanner() {
  const isExpired = useSessionExpiredStore((s) => s.isExpired);
  const dismiss = useSessionExpiredStore((s) => s.dismiss);

  if (!isExpired) return null;

  const returnPath =
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/';
  const href = `/login?return=${encodeURIComponent(returnPath)}`;

  return (
    <div className={styles.banner} role="alert" data-testid="session-expired-banner">
      <span className={styles.text}>
        <strong>Session expired.</strong> Your sign-in is no longer valid.
      </span>
      <a className={styles.signIn} href={href} onClick={() => dismiss()}>
        Sign in again
      </a>
      <button type="button" className={styles.dismiss} onClick={() => dismiss()}>
        Dismiss
      </button>
    </div>
  );
}
