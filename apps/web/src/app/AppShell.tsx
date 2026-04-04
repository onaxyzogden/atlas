/**
 * AppShell — persistent header + layout wrapper.
 * Uses design system tokens via CSS modules.
 */

import { type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import CommandPalette from '../components/CommandPalette.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useUIStore } from '../store/uiStore.js';
import { useAuthStore } from '../store/authStore.js';
import { Button } from '../components/ui/Button.js';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === '/';
  const isProjectPage = pathname.startsWith('/project/');
  const { colorScheme, setColorScheme } = useUIStore();
  const { token, user, logout } = useAuthStore();
  const openPalette = useUIStore((s) => s.openCommandPalette);

  useKeyboardShortcuts();

  return (
    <div className={styles.shell}>
      {!isProjectPage && <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>OGDEN</span>
          <span className={styles.logoSub}>Land Design Atlas</span>
        </Link>

        <div className={styles.spacer} />

        {/* Search / Command Palette trigger */}
        <button
          onClick={openPalette}
          aria-label="Search or open command palette"
          className={styles.searchTrigger}
        >
          <span className={styles.searchPlaceholder}>Search...</span>
          <kbd className={styles.searchKbd}>Ctrl+K</kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : colorScheme === 'light' ? 'system' : 'dark')}
          title={`Theme: ${colorScheme}`}
          aria-label={`Toggle theme, currently ${colorScheme}`}
          className={styles.iconButton}
        >
          {colorScheme === 'dark' ? (
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={8} cy={8} r={3.5} />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" />
            </svg>
          ) : colorScheme === 'light' ? (
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9.5A6 6 0 016.5 2 6 6 0 1014 9.5z" />
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={8} cy={8} r={5} />
              <path d="M8 3v10" />
              <path d="M8 3a5 5 0 010 10" fill="currentColor" fillOpacity={0.3} />
            </svg>
          )}
        </button>

        {/* Auth: show user email or Sign In link */}
        {token ? (
          <button
            onClick={logout}
            title={`Signed in as ${user?.email ?? ''} — click to sign out`}
            className={styles.authButton}
          >
            {user?.displayName ?? user?.email?.split('@')[0] ?? 'Account'}
          </button>
        ) : (
          <Link to="/login" className={styles.signInLink}>
            Sign In
          </Link>
        )}

        {/* New Project button */}
        {pathname !== '/new' && (
          <Link to="/new" className={styles.newProjectLink}>
            <Button variant="primary" size="sm">New Project</Button>
          </Link>
        )}

        {/* Back to Projects */}
        {!isHome && pathname !== '/new' && (
          <Link to="/" aria-label="Back to all projects" className={styles.backLink}>
            All Projects
          </Link>
        )}
      </header>}

      <main className={styles.main}>
        {children}
      </main>

      <CommandPalette />
    </div>
  );
}
