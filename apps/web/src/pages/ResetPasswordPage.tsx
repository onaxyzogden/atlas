/**
 * ResetPasswordPage — public landing for the emailed reset link
 * (`/reset-password?token=…`).
 *
 * Takes a new password (with confirm) and submits it with the token. There is
 * no auto-login — on success we route to /login with a success note. A
 * bad/expired/used token returns 400 INVALID_TOKEN (never 401), so it surfaces
 * in-page without tripping the global session-expiry logout.
 *
 * Standalone page reusing LoginPage's centered-card styles.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import styles from './LoginPage.module.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const { resetPassword, error, clearError } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => { clearError(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!search.token) {
      setLocalError('This reset link is missing its token. Please open the link from your email exactly as sent.');
      return;
    }
    if (password !== confirm) {
      setLocalError('The two passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(search.token, password);
      // No auto-login — send them to sign in with their new password.
      navigate({ to: '/login', search: { redirect: '/home' } as never });
    } catch {
      // Error is in the store (invalid/expired token, or a network failure).
    } finally {
      setLoading(false);
    }
  };

  const shownError = localError ?? error;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        <p className={styles.localNote} style={{ marginTop: 0, marginBottom: 16 }}>
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              className={styles.input}
              placeholder="Re-enter your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {shownError && (
            <div className={styles.error} role="alert">
              {shownError}
            </div>
          )}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>

        <p className={styles.hint}>
          <button
            type="button"
            className={styles.hintLink}
            onClick={() => navigate({ to: '/login', search: { redirect: '/home' } as never })}
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}
