/**
 * VerifyEmailPage — public landing for the emailed verification link
 * (`/verify-email?token=…`).
 *
 * Confirms the token on mount. On success the auth store mints a fresh
 * session (the user is now signed in + verified), so we route to /home.
 * A bad/expired/used token surfaces an in-page error and a path back to
 * sign-in — it returns 400 INVALID_TOKEN, never 401, so it cannot trip the
 * global session-expiry logout.
 *
 * Standalone page (no AppShell), reusing LoginPage's centered-card styles.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import styles from './LoginPage.module.css';

type Status = 'confirming' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const { confirmVerification, error, clearError } = useAuthStore();

  const [status, setStatus] = useState<Status>(search.token ? 'confirming' : 'no-token');
  // Guard against double-confirm under React 18 StrictMode's dev double-invoke.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!search.token) {
      setStatus('no-token');
      return;
    }

    confirmVerification(search.token)
      .then(() => {
        setStatus('success');
        // Brief pause so the success state is visible before the redirect.
        setTimeout(() => navigate({ to: '/home' }), 1200);
      })
      .catch(() => {
        setStatus('error');
      });

    return () => { clearError(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        {status === 'confirming' && (
          <p className={styles.hint} style={{ marginTop: 0 }}>
            Confirming your email…
          </p>
        )}

        {status === 'success' && (
          <>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              Your email is verified. Taking you to your projects…
            </p>
          </>
        )}

        {status === 'no-token' && (
          <>
            <div className={styles.error} role="alert">
              This verification link is missing its token. Please open the link
              from your email exactly as sent.
            </div>
            <p className={styles.hint}>
              <button
                type="button"
                className={styles.hintLink}
                onClick={() => navigate({ to: '/login', search: { redirect: '/home' } as never })}
              >
                Back to sign in
              </button>
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.error} role="alert">
              {error ?? 'This verification link is invalid or has expired.'}
            </div>
            <p className={styles.hint}>
              Sign in and request a fresh verification email from your account.{' '}
              <button
                type="button"
                className={styles.hintLink}
                onClick={() => navigate({ to: '/login', search: { redirect: '/home' } as never })}
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
