/**
 * ForgotPasswordPage — public surface that requests a password-reset link
 * (`/forgot-password`).
 *
 * The server replies generically whether or not the address exists
 * (anti-enumeration), so on any non-error response we show the SAME
 * "if an account exists…" confirmation. Standalone page reusing LoginPage's
 * centered-card styles.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import styles from './LoginPage.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    return () => { clearError(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      // Error is in the store — only a transport/network failure lands here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        {sent ? (
          <>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              If an account exists for <strong>{email}</strong>, we've sent a
              password-reset link. It's valid for one hour — check your inbox.
            </p>
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
        ) : (
          <>
            <p className={styles.localNote} style={{ marginTop: 0, marginBottom: 16 }}>
              Enter your email and we'll send you a link to set a new password.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className={styles.hint}>
              Remembered it?{' '}
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
