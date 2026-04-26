import React from 'react';
import type { SidebarView } from '../IconSidebar.js';
import styles from './RailPanelShell.module.css';

/* -------------------------------------------------------------------------- */
/*  RailPanelShell — shared chrome above every right-rail panel.              */
/*                                                                            */
/*  UX goal (per design scholar critique #2): give every rail view a          */
/*  consistent wayfinding header so users always know which domain they are   */
/*  looking at, independent of what the panel body chooses to render.         */
/*  Deliberately thin — it sits ABOVE each panel's existing internal title    */
/*  without competing with it.                                                */
/* -------------------------------------------------------------------------- */

export interface RailPanelShellProps {
  view: SidebarView;
  onClose?: () => void;
  /** When true, the body is hidden and the shell renders as a thin
   *  icon strip with only an "expand" affordance. The outer .rightPanel
   *  container is responsible for the width transition. */
  collapsed?: boolean;
  /** Click handler for the collapse/expand chevron. Omit to hide the
   *  control entirely (e.g., on mobile where the slide-up panel is used). */
  onToggleCollapsed?: () => void;
  children: React.ReactNode;
}

// Human-readable label for every SidebarView. Keep in sync with the
// SidebarView union in ../IconSidebar.tsx.
const VIEW_LABELS: Record<Exclude<SidebarView, null>, string> = {
  layers: 'Map Layers',
  intelligence: 'Site Intelligence',
  hydrology: 'Hydrology',
  design: 'Design Tools',
  ai: 'Atlas AI',
  regulatory: 'Regulatory',
  feasibility: 'Feasibility',
  energy: 'Energy & Off-Grid',
  infrastructure: 'Utilities & Infrastructure',
  economic: 'Economics',
  timeline: 'Timeline',
  vision: 'Vision',
  moontrance: 'Moontrance',
  scenarios: 'Scenarios',
  history: 'Version History',
  collaboration: 'Collaboration',
  portal: 'Portal',
  templates: 'Templates',
  reporting: 'Reporting',
  fieldnotes: 'Field Notes',
  livestock: 'Livestock',
  educational: 'Educational Atlas',
  spiritual: 'Spiritual',
  zoning: 'Zones',
  siting: 'Siting Rules',
  settings: 'Project Settings',
  terrain: 'Terrain',
  cartographic: 'Cartographic',
  ecological: 'Ecological',
  stewardship: 'Stewardship',
  climate: 'Solar & Climate',
  planting: 'Planting Tool',
  forest: 'Forest Hub',
  carbon: 'Carbon Diagnostic',
  nursery: 'Nursery Ledger',
  paddockDesign: 'Paddock Design',
  herdRotation: 'Herd Rotation',
  grazingAnalysis: 'Grazing Analysis',
  livestockInventory: 'Livestock Inventory',
  unmapped: 'Not Wired',
};

export const RailPanelShell: React.FC<RailPanelShellProps> = ({
  view,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  children,
}) => {
  if (!view) return <>{children}</>;

  const label = VIEW_LABELS[view] ?? view;

  // Collapsed: render a thin icon strip with an expand chevron and a
  // vertical label. The close button is retained so users can dismiss
  // the panel without first expanding it.
  if (collapsed) {
    // Entire strip is the click target — rendered as <button> when a
    // toggle handler is provided. Falls back to a plain div otherwise.
    const CollapsedTag = onToggleCollapsed ? 'button' : 'div';
    const collapsedProps = onToggleCollapsed
      ? ({
          type: 'button' as const,
          onClick: onToggleCollapsed,
          'aria-label': 'Expand panel',
          title: 'Expand panel',
        })
      : {};
    return (
      <CollapsedTag
        className={`${styles.shell} ${styles.shellCollapsed}`}
        {...collapsedProps}
      >
        <span className={styles.collapseBtn} aria-hidden="true">
          {/* Chevron pointing left (into the panel) */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 3 L4 7 L9 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.verticalLabel}>{label}</span>
      </CollapsedTag>
    );
  }

  // Header is rendered as a full-width <button> so clicking anywhere in
  // the bar (label or chevron) collapses the panel. The chevron is kept
  // as a visual affordance but is no longer the sole click target.
  const HeaderTag = onToggleCollapsed ? 'button' : 'div';
  const headerProps = onToggleCollapsed
    ? ({
        type: 'button' as const,
        onClick: onToggleCollapsed,
        'aria-label': 'Collapse panel',
        title: 'Collapse panel',
      })
    : {};

  return (
    <div className={styles.shell}>
      <HeaderTag className={styles.header} {...headerProps}>
        <div className={styles.eyebrow}>
          <span className={styles.label}>{label}</span>
        </div>
        <div className={styles.headerActions}>
          {onToggleCollapsed && (
            <span
              className={styles.collapseBtn}
              aria-hidden="true"
            >
              {/* Chevron pointing right (out of the panel) */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3 L10 7 L5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
      </HeaderTag>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

RailPanelShell.displayName = 'RailPanelShell';
