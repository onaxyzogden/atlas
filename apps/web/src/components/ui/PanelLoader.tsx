import React from 'react';
import { Spinner } from './Spinner.js';

/**
 * PanelLoader — lightweight loading placeholder for lazy-loaded panels.
 * Use as a Suspense fallback or when a panel is waiting for map readiness.
 */
export const PanelLoader: React.FC<{ label?: string }> = ({ label = 'Loading panel...' }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '2rem',
      minHeight: 120,
      color: 'var(--color-text-secondary, #9a8a74)',
    }}
    role="status"
  >
    <Spinner size="lg" />
    <span style={{ fontSize: 13 }}>{label}</span>
  </div>
);

PanelLoader.displayName = 'PanelLoader';
