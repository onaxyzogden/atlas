/**
 * EmbedCodeModal — copyable iframe embed snippet for the portal.
 */

import { useEffect, useState } from 'react';
import { confidence, semantic, zIndex } from '../../lib/tokens.js';

interface Props {
  url: string;
  onClose: () => void;
}

export default function EmbedCodeModal({ url, onClose }: Props) {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" style="border: 1px solid rgba(196,162,101,0.2); border-radius: 8px;" allowfullscreen></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // a11y: Escape key closes the embed modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        background: 'var(--color-panel-bg, #1a1611)', borderRadius: 12,
        padding: 24, maxWidth: 480, width: '90%',
        border: '1px solid rgba(196,162,101,0.15)',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-title, #d4af5f)', marginBottom: 16 }}>
          Embed Portal
        </h3>

        {/* Dimensions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--color-panel-muted, #9a8a74)' }}>Width</span>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} style={{
              width: '100%', padding: '6px 8px', fontSize: 12, marginTop: 4,
              background: 'var(--color-panel-subtle, rgba(255,255,255,0.05))',
              border: '1px solid var(--color-panel-card-border, rgba(255,255,255,0.08))',
              borderRadius: 4, color: 'var(--color-panel-text, #f2ede3)', fontFamily: 'monospace',
              outline: 'none', boxSizing: 'border-box',
            }} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--color-panel-muted, #9a8a74)' }}>Height</span>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{
              width: '100%', padding: '6px 8px', fontSize: 12, marginTop: 4,
              background: 'var(--color-panel-subtle, rgba(255,255,255,0.05))',
              border: '1px solid var(--color-panel-card-border, rgba(255,255,255,0.08))',
              borderRadius: 4, color: 'var(--color-panel-text, #f2ede3)', fontFamily: 'monospace',
              outline: 'none', boxSizing: 'border-box',
            }} />
          </label>
        </div>

        {/* Code preview */}
        <pre style={{
          padding: 12, borderRadius: 8,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(196,162,101,0.1)',
          fontSize: 11, color: '#c4b49a', fontFamily: 'monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
          margin: '0 0 16px',
        }}>
          {embedCode}
        </pre>

        {/* Preview */}
        <div style={{
          padding: 12, borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(196,162,101,0.05)',
          textAlign: 'center', fontSize: 11, color: 'var(--color-panel-muted, #6b5b4a)',
          marginBottom: 16,
        }}>
          Preview: {width} x {height}px iframe
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCopy} style={{
            flex: 1, padding: '10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6,
            background: copied ? 'rgba(45,122,79,0.15)' : 'rgba(196,162,101,0.15)',
            color: copied ? confidence.high : semantic.sidebarActive, cursor: 'pointer',
          }}>
            {copied ? '\u2713 Copied!' : 'Copy Embed Code'}
          </button>
          <button onClick={onClose} style={{
            padding: '10px 16px', fontSize: 12,
            border: '1px solid var(--color-panel-card-border, rgba(255,255,255,0.08))',
            borderRadius: 6, background: 'transparent',
            color: 'var(--color-panel-muted, #9a8a74)', cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
