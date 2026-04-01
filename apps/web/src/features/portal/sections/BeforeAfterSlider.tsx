/**
 * BeforeAfterSlider [MT] — CSS clip-path drag slider comparing two images.
 */

import { useState, useRef, useCallback } from 'react';
import type { BeforeAfterPair } from '../../../store/portalStore.js';

interface Props { pair: BeforeAfterPair }

export default function BeforeAfterSlider({ pair }: Props) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = () => { dragging.current = true; };
  const onMouseUp = () => { dragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => { if (e.touches[0]) handleMove(e.touches[0].clientX); };

  // Placeholder images if none provided
  const beforeSrc = pair.beforeUrl || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect fill="#2a2117" width="800" height="400"/><text x="400" y="200" text-anchor="middle" fill="#6b5b4a" font-size="20">Before</text></svg>');
  const afterSrc = pair.afterUrl || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect fill="#1a3020" width="800" height="400"/><text x="400" y="200" text-anchor="middle" fill="#4A7C3F" font-size="20">After</text></svg>');

  return (
    <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
      {pair.caption && (
        <h3 style={{ fontSize: 16, fontWeight: 400, color: '#c4b49a', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
          {pair.caption}
        </h3>
      )}

      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchStart={onMouseDown}
        onTouchEnd={onMouseUp}
        style={{
          position: 'relative', width: '100%', height: 400,
          borderRadius: 12, overflow: 'hidden', cursor: 'col-resize',
          border: '1px solid rgba(196,162,101,0.15)',
          userSelect: 'none',
        }}
      >
        {/* After (full) */}
        <img src={afterSrc} alt="After" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        }} />

        {/* Before (clipped) */}
        <img src={beforeSrc} alt="Before" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }} />

        {/* Divider line */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${position}%`, width: 3,
          background: '#c4a265', transform: 'translateX(-50%)',
        }}>
          {/* Handle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: '#c4a265', border: '3px solid #f2ede3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#1a1611', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {'\u2194'}
          </div>
        </div>

        {/* Labels */}
        <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 4, background: 'rgba(26,22,17,0.7)', fontSize: 11, color: '#9a8a74', fontWeight: 600 }}>
          BEFORE
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 4, background: 'rgba(26,22,17,0.7)', fontSize: 11, color: '#4A7C3F', fontWeight: 600 }}>
          AFTER
        </div>
      </div>
    </section>
  );
}
