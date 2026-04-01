/**
 * AppShell — persistent header + layout wrapper.
 * Uses design system tokens via CSS modules.
 */

import { type ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import CommandPalette from '../components/CommandPalette.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useUIStore } from '../store/uiStore.js';
import { Button } from '../components/ui/Button.js';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const isHome = router.state.location.pathname === '/';
  const { colorScheme, setColorScheme } = useUIStore();
  const openPalette = useUIStore((s) => s.openCommandPalette);

  useKeyboardShortcuts();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
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

        {/* New Project button */}
        {router.state.location.pathname !== '/new' && (
          <Link to="/new" className={styles.newProjectLink}>
            <Button variant="primary" size="sm">New Project</Button>
          </Link>
        )}

        {/* Back to Projects */}
        {!isHome && router.state.location.pathname !== '/new' && (
          <Link to="/" aria-label="Back to all projects" className={styles.backLink}>
            All Projects
          </Link>
        )}
      </header>

      <main className={styles.main}>
        {children}
      </main>

      <CommandPalette />
    </div>
  );
}
