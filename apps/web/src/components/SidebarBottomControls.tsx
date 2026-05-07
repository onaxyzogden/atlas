/**
 * SidebarBottomControls — shared bottom-of-rail controls used by both
 * `IconSidebar` (Map tab) and `DashboardSidebar` (Dashboard tab).
 *
 * Project page chrome audit (2026-04-25): the New Project button,
 * Settings button, and user-account row previously lived only inside
 * `IconSidebar`. After the rail-panel refactor that removed the global
 * AppShell header from `/project/*` pages, the Dashboard tab was left
 * without any way to create a new project, open settings, or see who
 * was signed in. Factoring these into a shared component restores
 * symmetry between the two sidebars.
 *
 * Settings semantics are caller-defined (each sidebar owns a different
 * "active" notion — `IconSidebar` toggles a panel view, `DashboardSidebar`
 * routes to a `dashboard-settings` section), so this component stays
 * dumb and exposes `settingsActive` + `onSettingsClick` props rather
 * than reaching into a store.
 */

import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import { DelayedTooltip } from './ui/DelayedTooltip.js';
import s from './SidebarBottomControls.module.css';

export interface SidebarBottomControlsProps {
  /** When true, labels are hidden and tooltips are enabled (Map-rail
   *  collapsed mode). DashboardSidebar passes `false` since it has
   *  no collapsed state. */
  collapsed?: boolean;
  settingsActive: boolean;
  onSettingsClick: () => void;
}

export default function SidebarBottomControls({
  collapsed = false,
  settingsActive,
  onSettingsClick,
}: SidebarBottomControlsProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // `strict: false` keeps this safe outside project routes (returns {}).
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId;

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User Account';
  const displayInitial = (displayName[0] ?? 'U').toUpperCase();

  return (
    <>
      {projectId && (
        <DelayedTooltip label="Open in OBSERVE (v3)" position="right" disabled={!collapsed}>
          <Link
            to="/v3/project/$projectId/observe"
            params={{ projectId }}
            className={s.bottomBtn}
            aria-label="Open in OBSERVE (v3)"
            style={{ textDecoration: 'none' }}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5" />
              <path d="M7 4v6M4 7h6" />
            </svg>
            {!collapsed && (
              <span className={s.bottomBtnLabel}>
                OPEN IN OBSERVE
                <span
                  style={{
                    marginLeft: 6,
                    padding: '1px 4px',
                    fontSize: '0.65em',
                    border: '1px solid currentColor',
                    borderRadius: 3,
                    opacity: 0.7,
                  }}
                >
                  v3
                </span>
              </span>
            )}
          </Link>
        </DelayedTooltip>
      )}

      <div className={s.bottomSection}>
        <DelayedTooltip label="New Project" position="right" disabled={!collapsed}>
          <button
            type="button"
            className={s.bottomBtn}
            onClick={() => navigate({ to: '/new' })}
            aria-label="New Project"
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="1" x2="7" y2="13" />
              <line x1="1" y1="7" x2="13" y2="7" />
            </svg>
            {!collapsed && <span className={s.bottomBtnLabel}>NEW PROJECT</span>}
          </button>
        </DelayedTooltip>

        <DelayedTooltip label="Settings" position="right" disabled={!collapsed}>
          <button
            type="button"
            className={`${s.bottomBtn} ${settingsActive ? s.bottomBtnActive : ''}`}
            onClick={onSettingsClick}
            aria-label="Settings"
            aria-pressed={settingsActive}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="2" />
              <path d="M7 1.5L7.9 3.2L9.9 2.4L9.5 4.5L11.5 5.1L10.2 6.7L11.5 8.3L9.5 8.9L9.9 11L7.9 10.2L7 11.9L6.1 10.2L4.1 11L4.5 8.9L2.5 8.3L3.8 6.7L2.5 5.1L4.5 4.5L4.1 2.4L6.1 3.2L7 1.5Z" />
            </svg>
            {!collapsed && <span className={s.bottomBtnLabel}>SETTINGS</span>}
          </button>
        </DelayedTooltip>
      </div>

      <div className={s.userRow} title={displayName}>
        <div className={s.userAvatar}>{displayInitial}</div>
        {!collapsed && (
          <div className={s.userInfo}>
            <span className={s.userName}>{displayName}</span>
            <span className={s.userSub}>View Profile</span>
          </div>
        )}
      </div>
    </>
  );
}
