/**
 * CommandPalette — quick search and action bar (Cmd+K / Ctrl+K).
 *
 * P1 features from Section 0h:
 *   - Search bar
 *   - Project search
 *   - Feature search
 *   - Keyboard shortcuts
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '../store/uiStore.js';
import { zIndex } from '../lib/tokens.js';
import { useProjectStore } from '../store/projectStore.js';
import { useMapStore } from '../store/mapStore.js';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: 'navigation' | 'project' | 'map' | 'settings';
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const projects = useProjectStore((s) => s.projects);
  const { setStyle, setMeasuring } = useMapStore();
  const { setColorScheme, colorScheme, undo, redo, canUndo, canRedo } = useUIStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      { id: 'nav-home', label: 'Go to Home', category: 'navigation', shortcut: 'Ctrl+H', action: () => { navigate({ to: '/' }); close(); } },
      { id: 'nav-new', label: 'New Project', category: 'navigation', shortcut: 'Ctrl+N', action: () => { navigate({ to: '/new' }); close(); } },

      // Projects
      ...projects.map((p) => ({
        id: `project-${p.id}`,
        label: `Open: ${p.name}`,
        description: p.address ?? p.projectType ?? undefined,
        category: 'project' as const,
        action: () => { navigate({ to: '/project/$projectId', params: { projectId: p.id } }); close(); },
      })),

      // Map
      { id: 'map-satellite', label: 'Map: Satellite View', category: 'map', action: () => { setStyle('satellite'); close(); } },
      { id: 'map-terrain', label: 'Map: Terrain View', category: 'map', action: () => { setStyle('terrain'); close(); } },
      { id: 'map-street', label: 'Map: Street View', category: 'map', action: () => { setStyle('street'); close(); } },
      { id: 'map-measure', label: 'Toggle Measure Mode', category: 'map', shortcut: 'M', action: () => { setMeasuring(true); close(); } },

      // Settings
      {
        id: 'theme-toggle',
        label: colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        category: 'settings',
        shortcut: 'Ctrl+Shift+D',
        action: () => { setColorScheme(colorScheme === 'dark' ? 'light' : 'dark'); close(); },
      },
    ];

    // Undo/redo
    if (canUndo) {
      items.push({ id: 'undo', label: 'Undo', category: 'settings', shortcut: 'Ctrl+Z', action: () => { undo(); close(); } });
    }
    if (canRedo) {
      items.push({ id: 'redo', label: 'Redo', category: 'settings', shortcut: 'Ctrl+Shift+Z', action: () => { redo(); close(); } });
    }

    return items;
  }, [projects, navigate, close, setStyle, setMeasuring, setColorScheme, colorScheme, undo, redo, canUndo, canRedo]);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset selection on query change
  useEffect(() => setSelectedIndex(0), [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex((i) => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, close, filtered, selectedIndex]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.overlay,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '90vw',
          maxHeight: 400,
          background: 'var(--color-surface, rgba(26, 22, 17, 0.98))',
          border: '1px solid var(--color-border, #3d3328)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Search input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border, #3d3328)' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, projects..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--color-text, #f2ede3)',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted, #9a8a74)', fontSize: 13 }}>
              No results
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={item.action}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                background: i === selectedIndex ? 'rgba(125, 97, 64, 0.2)' : 'transparent',
                color: 'var(--color-text, #f2ede3)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div>
                <div style={{ fontWeight: i === selectedIndex ? 500 : 400 }}>{item.label}</div>
                {item.description && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted, #9a8a74)' }}>{item.description}</div>
                )}
              </div>
              {item.shortcut && (
                <kbd
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--color-text-muted, #9a8a74)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
