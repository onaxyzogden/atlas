/**
 * LevelNavigatorBar — title card + side peek tiles for the AppShell header.
 *
 * Reads state from LevelNavigatorContext. Renders nothing when no provider
 * is mounted (so AppShell stays empty on routes outside `/v3/project/...`).
 *
 * Compact horizontal layout sized to the 48 px AppShell header. Title
 * truncates with ellipsis on narrow viewports; side peek tiles hold their
 * intrinsic width.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLevelNavigator } from './LevelNavigatorContext.js';
import './LevelNavigatorBar.css';

export default function LevelNavigatorBar() {
  const ctx = useLevelNavigator();
  if (!ctx) return null;
  const { active, prev, next, slideDir, goPrev, goNext } = ctx;

  return (
    <div className="fln-bar">
      <div
        className={`fln-bar__side fln-bar__side--left${prev ? ' fln-bar__side--active' : ''}`}
        onClick={() => prev && goPrev()}
        role={prev ? 'button' : undefined}
        tabIndex={prev ? 0 : undefined}
        aria-label={prev ? `Navigate to previous level: ${prev.title}` : undefined}
        onKeyDown={prev ? (e) => e.key === 'Enter' && goPrev() : undefined}
      >
        {prev ? (
          <>
            <ChevronLeft
              className="fln-bar__chevron"
              style={{ color: prev.color }}
              size={14}
              strokeWidth={1.75}
            />
            <span className="fln-bar__side-label" style={{ color: prev.color }}>
              {prev.label}
            </span>
          </>
        ) : null}
      </div>

      <div
        className={`fln-bar__center${slideDir ? ` fln-bar__center--${slideDir}` : ''}`}
        aria-live="polite"
        key={active.key}
      >
        <span className="fln-bar__title">{active.title}</span>
        {active.subtitle && (
          <span className="fln-bar__subtitle">{active.subtitle}</span>
        )}
      </div>

      <div
        className={`fln-bar__side fln-bar__side--right${next ? ' fln-bar__side--active' : ''}`}
        onClick={() => next && goNext()}
        role={next ? 'button' : undefined}
        tabIndex={next ? 0 : undefined}
        aria-label={next ? `Navigate to next level: ${next.title}` : undefined}
        onKeyDown={next ? (e) => e.key === 'Enter' && goNext() : undefined}
      >
        {next ? (
          <>
            <span className="fln-bar__side-label" style={{ color: next.color }}>
              {next.label}
            </span>
            <ChevronRight
              className="fln-bar__chevron"
              style={{ color: next.color }}
              size={14}
              strokeWidth={1.75}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
