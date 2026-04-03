/**
 * LoginPage — sign in or create an account.
 *
 * Standalone page (no AppShell header) so it looks clean and focused.
 * After a successful auth, navigates to '/' or the ?redirect= param.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import styles from './LoginPage.module.css';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const { login, register, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear stale auth errors when leaving the page
  useEffect(() => {
    return () => { clearError(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (next: Mode) => {
    clearError();
    setMode(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || undefined);
      }
      // Success — navigate to requested page or home
      const dest = search.redirect ?? '/';
      navigate({ to: dest as '/' });
    } catch {
      // Error is already in the store — just re-enable the form
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        {/* Mode toggle */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'login' ? styles.tabActive : styles.tab}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'register' ? styles.tabActive : styles.tab}
            onClick={() => switchMode('register')}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="displayName">
                Name <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                className={styles.input}
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={100}
              />
            </div>
          )}

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

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : 1}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading
              ? mode === 'login' ? 'Signing in…' : 'Creating account…'
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <p className={styles.hint}>
          {mode === 'login' ? (
            <>No account?{' '}
              <button type="button" className={styles.hintLink} onClick={() => switchMode('register')}>
                Create one
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" className={styles.hintLink} onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>

        <p className={styles.localNote}>
          The app also works fully offline — your projects are always saved locally.
        </p>
      </div>
    </div>
  );
}
