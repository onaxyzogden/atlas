/**
 * AppShell — persistent header + layout wrapper.
 * Uses design system tokens via CSS modules.
 */

import { type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import CommandPalette from '../components/CommandPalette.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import useGlobalAnnotationUndo from '../v3/observe/hooks/useGlobalAnnotationUndo.js';
import { useUIStore } from '../store/uiStore.js';
import { useAuthStore } from '../store/authStore.js';
import { DEMO_MODE_ENABLED, isDemoUser } from './demoSession.js';
import HeaderStageSpine from '../v3/HeaderStageSpine.js';
import HeaderStageSearch from '../v3/HeaderStageSearch.js';
import V3LevelNavBridge from '../v3/V3LevelNavBridge.js';
import ProofSyncIndicator from '../components/ProofSyncIndicator.js';
import ApiReachabilityStatus from '../components/ApiReachabilityStatus.js';
import OfflineBanner from '../components/OfflineBanner.js';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isProjectPage = pathname.startsWith('/project/');
  const { colorScheme, setColorScheme } = useUIStore();
  const { token, user, logout } = useAuthStore();

  useKeyboardShortcuts();
  useGlobalAnnotationUndo();

  return (
    <V3LevelNavBridge>
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Global offline / sync banner — visible only when there's something to
          report (dropped > conflict > offline > syncing > pending). */}
      <OfflineBanner />

      {!isProjectPage && <header className={styles.header}>
        <Link to="/v3/portfolio" className={styles.logo}>
          <span className={styles.logoMark}>OGDEN</span>
          <span className={styles.logoSub}>Land OS</span>
        </Link>

        <div className={styles.headerCenter}>
          <HeaderStageSpine />
        </div>

        {/* Stage search — locates objectives / tools / domains within the
            currently selected stage (renders only on observe/plan/act). */}
        <HeaderStageSearch />

        {/* Sync status (relocated from the Act in-page rails to global header) */}
        <ProofSyncIndicator />

        {/* API reachability — non-blocking status chip (replaces the former
            fixed full-width banner that occluded the header/toolbar). Visible
            only on a problem; self-heal runs globally via ApiReachabilityWatcher. */}
        <ApiReachabilityStatus />

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

        {/* Auth: in demo mode a "Demo mode" badge + Sign in link (signals the
            product is not "ready" and gives the team a path to real login —
            signing in overwrites the throwaway token); otherwise the usual
            account/sign-out button or Sign In link. */}
        {DEMO_MODE_ENABLED && isDemoUser(user) ? (
          <>
            <span className={styles.demoBadge} title="You are exploring a demo session">
              Demo mode
            </span>
            <Link to="/login" className={styles.signInLink}>
              Sign in
            </Link>
          </>
        ) : token ? (
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

      </header>}

      <main id="main-content" className={styles.main}>
        {children}
      </main>

      <CommandPalette />
    </div>
    </V3LevelNavBridge>
  );
}
