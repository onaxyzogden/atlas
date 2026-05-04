/**
 * SlideUpPanel — mobile slide-up sheet for right panel content.
 * Draggable between collapsed (peek), half, and full height.
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { zIndex } from '../lib/tokens.js';

type PanelHeight = 'peek' | 'half' | 'full';

interface SlideUpPanelProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Initial drag-state when the panel opens. Defaults to `half`. */
  initialHeight?: PanelHeight;
}

export default function SlideUpPanel({
  children,
  isOpen,
  onClose,
  title,
  initialHeight = 'half',
}: SlideUpPanelProps) {
  const [height, setHeight] = useState<PanelHeight>(initialHeight);
  const dragStartY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // `full` is sized to clear the host page's top chrome only — by default
  // the slide-up rises until just below the dashboard's top header (~120px
  // of app chrome + hub hero is left visible). Tweak via `--slide-up-full`
  // on a parent if a host wants a different ceiling.
  const heightValues: Record<PanelHeight, string> = {
    peek: '15vh',
    half: '50vh',
    full: 'calc(100vh - 120px)',
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
          zIndex: zIndex.modal,
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(960px, 100vw)',
          height: heightValues[height],
          background: 'var(--color-panel-bg, #1a1611)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: zIndex.modal + 1,
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
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
