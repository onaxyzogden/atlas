import React from 'react';
import { Skeleton } from './Skeleton.js';

/**
 * PanelLoader — lightweight loading placeholder for lazy-loaded panels.
 * Use as a Suspense fallback or when a panel is waiting for map readiness.
 *
 * Renders a panel-shaped skeleton (title + content rows) with a shimmer
 * animation rather than a centered spinner. The skeleton shape approximates
 * the real panel layout so the Suspense → loaded transition is less jarring
 * (no layout shift, no "pop in" — the eye tracks the same silhouette as the
 * shimmer resolves into real content).
 */
export const PanelLoader: React.FC<{ label?: string }> = ({ label = 'Loading panel' }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '16px 18px',
      minHeight: 160,
    }}
    role="status"
    aria-label={label}
  >
    {/* Eyebrow / title line */}
    <Skeleton width="45%" height="11px" variant="text" />
    <Skeleton width="78%" height="18px" variant="text" />

    {/* Content rows */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
      <Skeleton width="100%" height="12px" variant="text" />
      <Skeleton width="92%"  height="12px" variant="text" />
      <Skeleton width="85%"  height="12px" variant="text" />
    </div>

    {/* Card block */}
    <Skeleton width="100%" height="72px" variant="rectangular" />

    {/* Trailing rows */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton width="70%" height="12px" variant="text" />
      <Skeleton width="55%" height="12px" variant="text" />
    </div>
  </div>
);

PanelLoader.displayName = 'PanelLoader';
