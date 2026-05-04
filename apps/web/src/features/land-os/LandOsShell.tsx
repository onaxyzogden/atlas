/**
 * LandOsShell — five-column lifecycle workspace layout mirroring the
 * MILOS `.col-edge` pattern.
 *
 *   sidebar | col-edge | content | col-edge | rail
 *      Wsb     28 px     1fr        28 px     Wrl
 *
 * Each 28 px col-edge column is the click-to-collapse and drag-to-resize
 * hit target. The chevron toggle inside is purely decorative
 * (`pointer-events: none`) so all gestures funnel through the edge
 * column. Click toggles collapsed; drag horizontally live-resizes
 * between MIN_W and MAX_W. Releasing under MIN_W snaps collapsed
 * (content track → 0; the 28 px edge alone stays visible).
 *
 * Layout-only — no data fetching, no store mutation. The content area
 * keeps the existing `position: absolute; inset: 0` tabPanel pattern so
 * MapLibre's resize observer is undisturbed when DashboardView/MapView
 * swap visibility.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import css from './LandOsShell.module.css';

export interface LandOsShellProps {
  sidebar: ReactNode;
  rail: ReactNode;
  children: ReactNode;
}

const EDGE_W = 28;
const COLLAPSED_W = 0;
const MIN_W = 200;
const MAX_W = 480;
const DRAG_THRESHOLD = 4;
const NUDGE = 32;
const DEFAULT_SIDEBAR = 260;
const DEFAULT_RAIL = 320;

type Side = 'left' | 'right';

export default function LandOsShell({ sidebar, rail, children }: LandOsShellProps) {
  const [sidebarW, setSidebarW] = useState(DEFAULT_SIDEBAR);
  const [railW, setRailW] = useState(DEFAULT_RAIL);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  // Mirror state into a ref so the pointer handler closures always read the
  // latest value without re-attaching listeners every render.
  const stateRef = useRef({ sidebarW, railW, sidebarCollapsed, railCollapsed });
  useEffect(() => {
    stateRef.current = { sidebarW, railW, sidebarCollapsed, railCollapsed };
  }, [sidebarW, railW, sidebarCollapsed, railCollapsed]);

  const left = sidebarCollapsed ? `${COLLAPSED_W}px` : `${sidebarW}px`;
  const right = railCollapsed ? `${COLLAPSED_W}px` : `${railW}px`;
  const shellStyle: CSSProperties = {
    gridTemplateColumns: `${left} ${EDGE_W}px 1fr ${EDGE_W}px ${right}`,
  };

  const onHandlePointerDown = (side: Side) => (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const snap = stateRef.current;
    const startW = side === 'left' ? snap.sidebarW : snap.railW;
    const startCollapsed = side === 'left' ? snap.sidebarCollapsed : snap.railCollapsed;
    let dragged = false;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const beginDrag = () => {
      dragged = true;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    };
    const endDrag = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!dragged && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!dragged) beginDrag();

      // sidebar grows with positive dx; rail grows with negative dx.
      const raw = side === 'left' ? startW + dx : startW - dx;
      const clamped = Math.max(0, Math.min(MAX_W, raw));

      if (clamped < MIN_W) {
        if (side === 'left') {
          setSidebarCollapsed(true);
        } else {
          setRailCollapsed(true);
        }
      } else if (side === 'left') {
        setSidebarCollapsed(false);
        setSidebarW(clamped);
      } else {
        setRailCollapsed(false);
        setRailW(clamped);
      }
    };

    const onUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endDrag();
      // Pure click (no drag) → toggle collapsed.
      if (!dragged) {
        if (side === 'left') setSidebarCollapsed(!startCollapsed);
        else setRailCollapsed(!startCollapsed);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onHandleKeyDown = (side: Side) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (side === 'left') setSidebarCollapsed((v) => !v);
      else setRailCollapsed((v) => !v);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const grow = side === 'left' ? dir : -dir;
      if (side === 'left') {
        setSidebarCollapsed(false);
        setSidebarW((w) => Math.max(MIN_W, Math.min(MAX_W, w + grow * NUDGE)));
      } else {
        setRailCollapsed(false);
        setRailW((w) => Math.max(MIN_W, Math.min(MAX_W, w + grow * NUDGE)));
      }
    }
  };

  const sidebarChevron = sidebarCollapsed ? (
    <ChevronRight size={12} />
  ) : (
    <ChevronLeft size={12} />
  );
  const railChevron = railCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />;

  return (
    <div className={css.shell} style={shellStyle}>
      <aside
        className={`${css.sidebar} ${sidebarCollapsed ? css.collapsed : ''}`}
        aria-label="Lifecycle navigation"
      >
        {!sidebarCollapsed && <div className={css.paneBody}>{sidebar}</div>}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Sidebar — drag to resize, click to ${sidebarCollapsed ? 'expand' : 'collapse'}`}
        className={css.colEdge}
        tabIndex={0}
        onPointerDown={onHandlePointerDown('left')}
        onKeyDown={onHandleKeyDown('left')}
      >
        <div className={css.colEdgeLine} aria-hidden="true" />
        <button
          type="button"
          className={css.colEdgeToggle}
          tabIndex={-1}
          aria-hidden="true"
        >
          {sidebarChevron}
        </button>
      </div>

      <section className={css.content} aria-label="Workspace content">
        {children}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Rail — drag to resize, click to ${railCollapsed ? 'expand' : 'collapse'}`}
        className={css.colEdge}
        tabIndex={0}
        onPointerDown={onHandlePointerDown('right')}
        onKeyDown={onHandleKeyDown('right')}
      >
        <div className={css.colEdgeLine} aria-hidden="true" />
        <button
          type="button"
          className={css.colEdgeToggle}
          tabIndex={-1}
          aria-hidden="true"
        >
          {railChevron}
        </button>
      </div>

      <aside
        className={`${css.rail} ${railCollapsed ? css.collapsed : ''}`}
        aria-label="Lifecycle decision rail"
      >
        {!railCollapsed && <div className={css.paneBody}>{rail}</div>}
      </aside>
    </div>
  );
}
