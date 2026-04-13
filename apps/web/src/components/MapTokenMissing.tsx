/**
 * MapTokenMissing — shown when VITE_MAPTILER_KEY is not set.
 * Provides clear instructions for the developer.
 */

import { earth, semantic } from '../lib/tokens.js';

export default function MapTokenMissing() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--color-bg, #1a1611)',
        color: 'var(--color-text, #f2ede3)',
        padding: 40,
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.3 }}>{'\u{1F5FA}'}</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: semantic.sidebarActive, margin: 0 }}>
        MapTiler Key Required
      </h2>
      <p style={{ fontSize: 13, color: semantic.sidebarIcon, maxWidth: 400, lineHeight: 1.6, margin: 0 }}>
        The map requires a MapTiler API key to render.
        Create a <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 3 }}>.env</code> file
        in <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 3 }}>apps/web/</code> with:
      </p>
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '12px 20px',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 12,
          color: semantic.sidebarActive,
          border: '1px solid rgba(196,162,101,0.2)',
        }}
      >
        VITE_MAPTILER_KEY=your_key_here
      </div>
      <p style={{ fontSize: 11, color: earth[800], maxWidth: 350, lineHeight: 1.5 }}>
        Get a free key at{' '}
        <a
          href="https://cloud.maptiler.com/account/keys/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: semantic.sidebarActive, textDecoration: 'underline' }}
        >
          cloud.maptiler.com
        </a>
      </p>
    </div>
  );
}
