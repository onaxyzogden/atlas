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

export const RailPanelShell: React.FC<RailPanelShellProps> = ({ view, onClose, children }) => {
  if (!view) return <>{children}</>;

  const label = VIEW_LABELS[view] ?? view;

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          <span className={styles.label}>{label}</span>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close panel"
            title="Close panel"
          >
            {/* Simple X glyph — avoids pulling in a new icon dep */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3 L11 11 M11 3 L3 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

RailPanelShell.displayName = 'RailPanelShell';
