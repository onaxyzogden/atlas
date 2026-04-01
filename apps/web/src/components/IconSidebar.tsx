/**
 * IconSidebar — vertical icon strip on the left edge of the project view.
 * Each icon opens a different right-side panel.
 * Supports expanded mode showing icon + label text.
 * Expand/collapse state persists to localStorage.
 */

import { useState, useRef, useEffect } from 'react';

export type SidebarView =
  | 'layers'
  | 'intelligence'
  | 'hydrology'
  | 'design'
  | 'ai'
  | 'regulatory'
  | 'economic'
  | 'timeline'
  | 'vision'
  | 'moontrance'
  | 'scenarios'
  | 'history'
  | 'collaboration'
  | 'portal'
  | 'templates'
  | 'reporting'
  | 'fieldnotes'
  | 'settings'
  | null;

interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  zoneCount: number;
  structureCount: number;
}

const SIDEBAR_ITEMS: { id: SidebarView; label: string }[] = [
  { id: 'layers',        label: 'Map Layers' },
  { id: 'intelligence',  label: 'Site Intelligence' },
  { id: 'hydrology',     label: 'Hydrology' },
  { id: 'design',        label: 'Design Tools' },
  { id: 'ai',            label: 'AI Atlas' },
  { id: 'regulatory',    label: 'Regulatory' },
  { id: 'economic',      label: 'Economics' },
  { id: 'timeline',      label: 'Timeline' },
  { id: 'vision',        label: 'Vision Layer' },
  { id: 'scenarios',     label: 'Scenarios' },
  { id: 'moontrance',    label: 'OGDEN Identity' },
  { id: 'collaboration', label: 'Educational Atlas' },
  { id: 'portal',        label: 'Public Portal' },
  { id: 'templates',     label: 'Templates' },
  { id: 'reporting',     label: 'Reports & Export' },
  { id: 'fieldnotes',    label: 'Fieldwork' },
  { id: 'history',       label: 'Version History' },
];

const COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 200;

export default function IconSidebar({ activeView, onViewChange }: IconSidebarProps) {
  // Pinned state — persisted, keeps sidebar open permanently
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem('ogden-sidebar-expanded') === 'true'; } catch { return false; }
  });

  // Hover state — temporary expand while mouse is over sidebar
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  const isOpen = pinned || hovered;

  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    try { localStorage.setItem('ogden-sidebar-expanded', String(next)); } catch { /* */ }
  };

  return (
    <div
      onMouseEnter={() => {
        if (!pinned) {
          hoverTimerRef.current = setTimeout(() => setHovered(true), 150);
        }
      }}
      onMouseLeave={() => {
        clearTimeout(hoverTimerRef.current);
        setHovered(false);
      }}
      style={{
        width: isOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOpen ? 'stretch' : 'center',
        paddingTop: 4,
        gap: 2,
        flexShrink: 0,
        zIndex: 6,
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Pin/unpin toggle */}
      <button
        onClick={togglePinned}
        title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
        aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
        style={{
          width: isOpen ? '100%' : 40,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-end' : 'center',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-border)',
          cursor: 'pointer',
          padding: isOpen ? '0 12px' : 0,
          marginBottom: 4,
          alignSelf: 'center',
          color: pinned ? '#c4a265' : 'var(--color-sidebar-icon)',
          transition: 'all 150ms ease',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {pinned ? (
            <>
              <polyline points="10 3 5 8 10 13" />
              <line x1="14" y1="3" x2="14" y2="13" />
            </>
          ) : (
            <>
              <polyline points="6 3 11 8 6 13" />
              <line x1="2" y1="3" x2="2" y2="13" />
            </>
          )}
        </svg>
      </button>

      {/* Main navigation items */}
      {SIDEBAR_ITEMS.map((item) => {
        const isActive = activeView === item.id;
        const iconColor = isActive ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-icon)';

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(isActive ? null : item.id)}
            title={isOpen ? undefined : item.label}
            aria-label={item.label}
            style={{
              width: isOpen ? '100%' : 40,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: isOpen ? 'flex-start' : 'center',
              gap: isOpen ? 10 : 0,
              paddingLeft: isOpen ? 12 : 0,
              paddingRight: isOpen ? 8 : 0,
              background: isActive ? 'rgba(125, 97, 64, 0.25)' : 'transparent',
              border: 'none',
              borderLeft: isActive ? '2px solid #c4a265' : '2px solid transparent',
              borderRadius: '0 8px 8px 0',
              cursor: 'pointer',
              color: iconColor,
              transition: 'all 150ms ease',
              position: 'relative',
              alignSelf: isOpen ? undefined : 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
              <SidebarIcon id={item.id!} color={iconColor} />
            </span>
            {isOpen && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: iconColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: isOpen ? 1 : 0,
                  transition: 'opacity 150ms ease',
                  fontFamily: 'inherit',
                }}
              >
                {item.label}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Settings gear at bottom */}
      <button
        onClick={() => onViewChange(activeView === 'settings' ? null : 'settings')}
        title={isOpen ? undefined : 'Settings'}
        aria-label="Settings"
        style={{
          width: isOpen ? '100%' : 40,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: isOpen ? 10 : 0,
          paddingLeft: isOpen ? 12 : 0,
          background: activeView === 'settings' ? 'rgba(125, 97, 64, 0.25)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          padding: 0,
          paddingInlineStart: isOpen ? 12 : 0,
          marginBottom: 8,
          alignSelf: isOpen ? undefined : 'center',
          color: activeView === 'settings' ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-icon)',
          transition: 'all 150ms ease',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
          <SidebarIcon id="settings" color={activeView === 'settings' ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-icon)'} />
        </span>
        {isOpen && (
          <span
            style={{
              fontSize: 12,
              fontWeight: activeView === 'settings' ? 600 : 400,
              color: activeView === 'settings' ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-icon)',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            Settings
          </span>
        )}
      </button>
    </div>
  );
}

function SidebarIcon({ id, color }: { id: string; color: string }) {
  const s = 20; // viewBox size
  const sw = 1.8; // stroke width
  const props = { width: s, height: s, viewBox: `0 0 ${s} ${s}`, fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (id) {
    case 'layers':
      return (<svg {...props}><path d="M10 3L17 7.5L10 12L3 7.5L10 3Z" /><path d="M3 10L10 14.5L17 10" /><path d="M3 12.5L10 17L17 12.5" /></svg>);
    case 'intelligence':
      return (<svg {...props}><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="19" /><line x1="1" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="19" y2="10" /></svg>);
    case 'hydrology':
      return (<svg {...props}><path d="M10 2C10 2 4 9 4 13C4 16.3 6.7 19 10 19C13.3 19 16 16.3 16 13C16 9 10 2 10 2Z" /></svg>);
    case 'design':
      return (<svg {...props}><path d="M14.5 2.5L17.5 5.5L6.5 16.5L2 18L3.5 13.5L14.5 2.5Z" /><line x1="12" y1="5" x2="15" y2="8" /></svg>);
    case 'ai':
      return (<svg {...props}><path d="M10 2L11.5 7L17 7L12.5 10.5L14 16L10 12.5L6 16L7.5 10.5L3 7L8.5 7L10 2Z" fill={color} fillOpacity="0.15" /></svg>);
    case 'regulatory':
      return (<svg {...props}><path d="M10 2L17 5V10C17 14.4 14 17.3 10 18.5C6 17.3 3 14.4 3 10V5L10 2Z" /><polyline points="7 10 9.5 12.5 13.5 7.5" /></svg>);
    case 'economic':
      return (<svg {...props}><rect x="2" y="10" width="3.5" height="8" rx="0.5" /><rect x="8.25" y="5" width="3.5" height="13" rx="0.5" /><rect x="14.5" y="2" width="3.5" height="16" rx="0.5" /></svg>);
    case 'timeline':
      return (<svg {...props}><circle cx="10" cy="10" r="8" /><polyline points="10 5 10 10 14 12" /></svg>);
    case 'vision':
      return (<svg {...props}><path d="M2 10C2 10 5 4 10 4C15 4 18 10 18 10C18 10 15 16 10 16C5 16 2 10 2 10Z" /><circle cx="10" cy="10" r="3" /></svg>);
    case 'scenarios':
      return (<svg {...props}><rect x="2" y="3" width="7" height="14" rx="1" /><rect x="11" y="3" width="7" height="14" rx="1" strokeDasharray="2 1.5" /><line x1="6" y1="7" x2="6" y2="13" /><line x1="15" y1="7" x2="15" y2="13" /></svg>);
    case 'moontrance':
      return (<svg {...props}><path d="M12 3C8.7 3 6 5.7 6 9C6 12.3 8.7 15 12 15C9.4 15 7 12.3 7 9C7 5.7 9.4 3 12 3Z" fill={color} fillOpacity={0.15} /><path d="M14 6L14.8 8.2L17 8.2L15.1 9.6L15.9 12L14 10.5L12.1 12L12.9 9.6L11 8.2L13.2 8.2L14 6Z" fill={color} fillOpacity={0.3} /></svg>);
    case 'collaboration':
      return (<svg {...props}><path d="M2 4C2 4 5 3 10 3C15 3 18 4 18 4V15C18 15 15 14 10 14C5 14 2 15 2 15V4Z" /><line x1="10" y1="3" x2="10" y2="14" /><path d="M7 17L10 14L13 17" /></svg>);
    case 'portal':
      return (<svg {...props}><circle cx="10" cy="10" r="8" /><ellipse cx="10" cy="10" rx="4" ry="8" /><line x1="2" y1="10" x2="18" y2="10" /><path d="M3.5 6H16.5" /><path d="M3.5 14H16.5" /></svg>);
    case 'templates':
      return (<svg {...props}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" strokeDasharray="2 1.5" /></svg>);
    case 'reporting':
      return (<svg {...props}><path d="M5 2H12L16 6V18H5V2Z" /><polyline points="12 2 12 6 16 6" /><line x1="8" y1="11" x2="13" y2="11" /><line x1="8" y1="14" x2="11" y2="14" /><path d="M10 16L10 19" /><polyline points="8 17.5 10 19 12 17.5" /></svg>);
    case 'fieldnotes':
      return (<svg {...props}><path d="M4 2H14L17 5V18H4V2Z" /><polyline points="14 2 14 5 17 5" /><line x1="7" y1="9" x2="14" y2="9" /><line x1="7" y1="12" x2="12" y2="12" /><circle cx="7" cy="15" r="1" fill={color} fillOpacity={0.4} /></svg>);
    case 'history':
      return (<svg {...props}><circle cx="10" cy="10" r="8" /><polyline points="10 5 10 10 7 13" /><path d="M3 10C3 6.1 6.1 3 10 3" strokeDasharray="2 1.5" /></svg>);
    case 'settings':
      return (<svg {...props}><circle cx="10" cy="10" r="3" /><path d="M10 1.5L11.2 4.2L14 3L13.2 6L16.5 6.8L14.5 9L17 11L14.2 12L15 15L12 13.8L10 16.5L8 13.8L5 15L5.8 12L3 11L5.5 9L3.5 6.8L6.8 6L6 3L8.8 4.2L10 1.5Z" fill={color} fillOpacity={0.1} /></svg>);
    default:
      return <span style={{ fontSize: 14, color }}>?</span>;
  }
}
