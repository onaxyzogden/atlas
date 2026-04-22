/**
 * DashboardSectionSkeleton — shimmer placeholder for a dashboard section
 * while `siteData` is being fetched.
 *
 * Replaces the old "centered spinner" loading state. A card-shaped skeleton
 * gives the user an immediate sense of the layout that will appear and
 * removes the "is anything happening?" gap between route mount and first
 * data frame (UX scholar #5: passive indicators beat silent empty states).
 *
 * Shape intentionally generic — header row, chip row, two content cards —
 * so it reads plausibly for every dashboard (site intelligence, ecological,
 * hydrology, terrain, energy, etc.) without per-page tuning.
 */

import React from 'react';
import { Skeleton } from './Skeleton.js';
import css from './DashboardSectionSkeleton.module.css';

export interface DashboardSectionSkeletonProps {
  /** How many content cards to render (default 2). */
  cards?: number;
  /** How many rows inside each card (default 3). */
  rowsPerCard?: number;
  /** Optional accessible label announced to screen readers. */
  label?: string;
}

export const DashboardSectionSkeleton: React.FC<DashboardSectionSkeletonProps> = ({
  cards = 2,
  rowsPerCard = 3,
  label = 'Loading dashboard section',
}) => {
  return (
    <div
      className={css.wrapper}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={css.srOnly}>{label}</span>

      {/* Header row: title + action/score chip */}
      <div className={css.headerRow} aria-hidden="true">
        <Skeleton height="22px" width="55%" />
        <Skeleton variant="rectangular" height="28px" width="72px" />
      </div>

      {/* Chip row: 3 short tags (confidence / last fetched / badge) */}
      <div className={css.chipRow} aria-hidden="true">
        <Skeleton variant="rectangular" height="20px" width="84px" />
        <Skeleton variant="rectangular" height="20px" width="112px" />
        <Skeleton variant="rectangular" height="20px" width="68px" />
      </div>

      {/* Content cards */}
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={css.card} aria-hidden="true">
          <div className={css.cardHeader}>
            <Skeleton height="16px" width="40%" />
            <Skeleton variant="circular" height="24px" />
          </div>
          <div className={css.cardRows}>
            {Array.from({ length: rowsPerCard }).map((_, j) => (
              <Skeleton
                key={j}
                height="12px"
                width={`${100 - (j * 14)}%`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

DashboardSectionSkeleton.displayName = 'DashboardSectionSkeleton';
