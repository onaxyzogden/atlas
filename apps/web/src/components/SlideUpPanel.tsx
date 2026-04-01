/**
 * SlideUpPanel — mobile slide-up sheet for right panel content.
 * Draggable between collapsed (peek), half, and full height.
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';

interface SlideUpPanelProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

type PanelHeight = 'peek' | 'half' | 'full';

export default function SlideUpPanel({ children, isOpen, onClose, title }: SlideUpPanelProps) {
  const [height, setHeight] = useState<PanelHeight>('half');
  const dragStartY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const heightValues: Record<PanelHeight, string> = {
    peek: '15vh',
    half: '50vh',
    full: '85vh',
  };

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    dragStartY.current = clientY;
  }, []);

  const handleDragEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'changedTouches' in e ? e.changedTouches[0]!.clientY : e.clientY;
    const delta = clientY - dragStartY.current;

    if (delta > 80) {
      // Dragged down
      if (height === 'full') setHeight('half');
      else if (height === 'half') setHeight('peek');
      else onClose();
    } else if (delta < -80) {
      // Dragged up
      if (height === 'peek') setHeight('half');
      else if (height === 'half') setHeight('full');
    }
  }, [height, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 49,
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: heightValues[height],
          background: 'var(--color-panel-bg, #1a1611)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 250ms ease',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          style={{
            padding: '10px 0 6px',
            cursor: 'grab',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
          {title && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-panel-text)', letterSpacing: '0.04em' }}>
              {title}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  );
}
