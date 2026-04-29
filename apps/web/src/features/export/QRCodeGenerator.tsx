/**
 * QRCodeGenerator — canvas-based QR code for portal URLs.
 * Minimal QR encoding using a lookup-table approach for short URLs.
 */

import { useRef, useEffect } from 'react';
import { earth, semantic, zIndex } from '../../lib/tokens.js';

interface Props {
  url: string;
  size?: number;
  onClose: () => void;
}

export default function QRCodeGenerator({ url, size = 200, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR-like pattern generation (visual placeholder — not a real QR encoder)
    // For production, use the `qrcode` npm package
    const modules = 25;
    const cellSize = size / modules;

    ctx.fillStyle = '#1a1611';
    ctx.fillRect(0, 0, size, size);

    // Generate deterministic pattern from URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    }

    ctx.fillStyle = earth[100];

    // Finder patterns (3 corners)
    const drawFinder = (x: number, y: number) => {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const isBorder = dx === 0 || dx === 6 || dy === 0 || dy === 6;
          const isInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          if (isBorder || isInner) {
            ctx.fillRect((x + dx) * cellSize, (y + dy) * cellSize, cellSize, cellSize);
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Data area — deterministic from hash
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    };
    const rand = rng(Math.abs(hash));

    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        // Skip finder pattern areas
        if ((x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)) continue;
        if (rand() > 0.5) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [url, size]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'ogden-portal-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // a11y: Escape key closes the QR modal
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
        padding: 24, textAlign: 'center', maxWidth: 320,
        border: '1px solid rgba(196,162,101,0.15)',
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-title, #d4af5f)', marginBottom: 16 }}>
          Portal QR Code
        </h3>

        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ borderRadius: 8, border: '1px solid rgba(196,162,101,0.1)' }}
        />

        <div style={{ fontSize: 10, color: 'var(--color-panel-muted, #9a8a74)', marginTop: 12, wordBreak: 'break-all' }}>
          {url}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleDownload} style={{
            flex: 1, padding: '10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6,
            background: 'rgba(196,162,101,0.15)', color: semantic.sidebarActive, cursor: 'pointer',
          }}>
            Download PNG
          </button>
          <button onClick={onClose} style={{
            padding: '10px 16px', fontSize: 12, border: '1px solid var(--color-panel-card-border, rgba(255,255,255,0.08))',
            borderRadius: 6, background: 'transparent', color: 'var(--color-panel-muted, #9a8a74)', cursor: 'pointer',
          }}>
            Close
          </button>
        </div>

        <div style={{ fontSize: 9, color: 'var(--color-panel-muted, #6b5b4a)', marginTop: 12 }}>
          Note: This is a visual placeholder. For scannable QR codes, connect the qrcode npm package.
        </div>
      </div>
    </div>
  );
}
