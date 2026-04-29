/**
 * MapTokenMissing — visitor-facing empty state when no MapTiler key is
 * resolved (neither localStorage nor VITE_MAPTILER_KEY). Lets the visitor
 * paste their own free key; we never see it.
 */

import { useState } from 'react';
import { setMaptilerKey, MAPTILER_KEY_STORAGE } from '../lib/maplibre.js';
import { earth, semantic } from '../lib/tokens.js';

export default function MapTokenMissing() {
  const hasStoredKey = (() => {
    try { return !!localStorage.getItem(MAPTILER_KEY_STORAGE); } catch { return false; }
  })();
  const [keyInput, setKeyInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { setSaveError('Paste a key first.'); return; }
    setMaptilerKey(trimmed);
    window.location.reload();
  };

  const onClear = () => {
    setMaptilerKey(null);
    window.location.reload();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--color-bg, #f6f4ee)',
        color: 'var(--color-text, #f2ede3)',
        padding: 40,
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.3 }}>{'\u{1F5FA}'}</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: semantic.sidebarActive, margin: 0 }}>
        Map needs a MapTiler API key
      </h2>
      <p style={{ fontSize: 13, color: semantic.sidebarIcon, maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
        Get a free key in about a minute at{' '}
        <a
          href="https://cloud.maptiler.com/account/keys/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: semantic.sidebarActive, textDecoration: 'underline' }}
        >
          cloud.maptiler.com
        </a>
        {' '}— paste it below to unlock the map. Your key stays in this browser only; we never see it.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={keyInput}
          onChange={(e) => { setKeyInput(e.target.value); setSaveError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
          placeholder="Paste MapTiler API key"
          style={{
            padding: '8px 12px',
            fontSize: 13,
            width: 320,
            border: '1px solid rgba(196,162,101,0.3)',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--color-text, #f2ede3)',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={onSave}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            border: `1px solid ${semantic.sidebarActive}`,
            borderRadius: 6,
            background: semantic.sidebarActive,
            color: '#1a1611',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Save & reload
        </button>
        {hasStoredKey && (
          <button
            onClick={onClear}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              border: '1px solid rgba(196,162,101,0.2)',
              borderRadius: 6,
              background: 'transparent',
              color: earth[800],
              cursor: 'pointer',
            }}
          >
            Clear saved key
          </button>
        )}
      </div>
      {saveError && (
        <span style={{ fontSize: 12, color: '#e07a6a', fontWeight: 500 }}>{saveError}</span>
      )}
    </div>
  );
}
