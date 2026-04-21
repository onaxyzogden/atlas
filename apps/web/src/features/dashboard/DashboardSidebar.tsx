/**
 * DashboardSidebar — domain-grouped navigation for the dashboard view.
 */

import { group } from '../../lib/tokens.js';
import css from './DashboardSidebar.module.css';

export interface DashboardSection {
  id: string;
  label: string;
}

interface DashboardGroup {
  group: string;
  color: string;
  items: DashboardSection[];
}

const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    group: 'Site Overview',
    color: group.hydrology,
    items: [
      { id: 'site-intelligence', label: 'Site Intelligence' },
      { id: 'map-layers', label: 'Map Layers' },
    ],
  },
  {
    group: 'Grazing & Livestock',
    color: group.livestock,
    items: [
      { id: 'paddock-design', label: 'Paddock Design' },
      { id: 'herd-rotation', label: 'Herd Rotation' },
      { id: 'grazing-analysis', label: 'Grazing Analysis' },
      { id: 'livestock-inventory', label: 'Inventory & Health Ledger' },
    ],
  },
  {
    group: 'Forestry',
    color: group.forestry,
    items: [
      { id: 'planting-tool', label: 'Planting Tool' },
      { id: 'forest-hub', label: 'Forest Hub' },
      { id: 'carbon-diagnostic', label: 'Carbon Diagnostic' },
      { id: 'nursery-ledger', label: 'Nursery Ledger' },
    ],
  },
  {
    group: 'Hydrology & Terrain',
    color: group.hydrology,
    items: [
      { id: 'cartographic', label: 'Cartographic' },
      { id: 'hydrology-dashboard', label: 'Hydrology' },
      { id: 'ecological', label: 'Ecological' },
      { id: 'terrain-dashboard', label: 'Terrain' },
      { id: 'stewardship', label: 'Stewardship' },
      { id: 'climate', label: 'Solar & Climate' },
    ],
  },
  {
    group: 'Finance',
    color: group.finance,
    items: [
      { id: 'economics', label: 'Economics' },
      { id: 'scenarios', label: 'Scenarios' },
      { id: 'investor-summary', label: 'Investor Summary' },
    ],
  },
  {
    group: 'Compliance',
    color: group.compliance,
    items: [
      { id: 'regulatory', label: 'Regulatory' },
    ],
  },
  {
    group: 'Reporting & Portal',
    color: group.reporting,
    items: [
      { id: 'reporting', label: 'Reports & Export' },
      { id: 'portal', label: 'Public Portal' },
      { id: 'educational', label: 'Educational Atlas' },
    ],
  },
  {
    group: 'General',
    color: group.general,
    items: [
      { id: 'biomass', label: 'Biomass' },
      { id: 'siting-rules', label: 'Siting Rules' },
      { id: 'dashboard-settings', label: 'Settings' },
      { id: 'archive', label: 'Archive' },
    ],
  },
];

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export default function DashboardSidebar({ activeSection, onSectionChange }: DashboardSidebarProps) {
  return (
    <nav className={css.sidebar}>
      <div className={css.scrollArea}>
        {DASHBOARD_GROUPS.map((group) => (
          <div key={group.group} className={css.group}>
            <div className={css.groupHeader}>
              <span className={css.groupDot} style={{ backgroundColor: group.color }} />
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  className={`${css.item} ${isActive ? css.itemActive : ''}`}
                  style={isActive ? { borderLeftColor: group.color } : undefined}
                  onClick={() => onSectionChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <DashboardIcon id={item.id} active={isActive} color={group.color} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

function DashboardIcon({ id, active, color }: { id: string; active: boolean; color: string }) {
  const stroke = active ? color : 'rgba(180, 165, 140, 0.4)';
  const p = {
    width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none',
    stroke, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 } as const,
  };

  switch (id) {
    case 'site-intelligence':
      return <svg {...p}><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="3"/><circle cx="7" cy="7" r="1" fill={stroke}/><line x1="7" y1="0.5" x2="7" y2="2"/><line x1="7" y1="12" x2="7" y2="13.5"/><line x1="0.5" y1="7" x2="2" y2="7"/><line x1="12" y1="7" x2="13.5" y2="7"/></svg>;
    case 'map-layers':
      return <svg {...p}><polygon points="7 1.5 12.5 4.25 7 7 1.5 4.25 7 1.5"/><polyline points="1.5 7 7 9.75 12.5 7"/><polyline points="1.5 9.75 7 12.5 12.5 9.75"/></svg>;
    case 'paddock-design':
      return <svg {...p}><rect x="1" y="1" width="12" height="12" rx="1"/><line x1="1" y1="6" x2="7" y2="6"/><line x1="7" y1="1" x2="7" y2="13"/></svg>;
    case 'herd-rotation':
      return <svg {...p}><circle cx="7" cy="7" r="5"/><path d="M7 2C9.8 2 12 4.2 12 7"/><polyline points="10 5 12 7 14 5"/></svg>;
    case 'grazing-analysis':
      return <svg {...p}><polyline points="1 11 4 5 7 8 10 3 13 11"/><line x1="1" y1="11" x2="13" y2="11"/></svg>;
    case 'livestock-inventory':
      return <svg {...p}><ellipse cx="7" cy="8" rx="4" ry="3"/><circle cx="4.5" cy="5.5" r="1.5"/><line x1="3" y1="11" x2="3" y2="13"/><line x1="11" y1="11" x2="11" y2="13"/></svg>;
    case 'planting-tool':
      return <svg {...p}><line x1="7" y1="13" x2="7" y2="5"/><path d="M7 9C7 9 5 7 3 7"/><path d="M7 7C7 7 9 5 11 5"/><path d="M7 5C7 5 5 3 4 2"/></svg>;
    case 'forest-hub':
      return <svg {...p}><path d="M7 1L3 6H5L2 11H12L9 6H11L7 1Z"/><line x1="7" y1="11" x2="7" y2="13"/></svg>;
    case 'carbon-diagnostic':
      return <svg {...p}><circle cx="7" cy="7" r="5.5"/><path d="M4 7L6 9L10 5"/></svg>;
    case 'nursery-ledger':
      return <svg {...p}><rect x="2" y="8" width="10" height="5" rx="1"/><path d="M5 8V6C5 4 7 2 7 2C7 2 9 4 9 6V8"/></svg>;
    case 'cartographic':
      return <svg {...p}><path d="M1 3L5 1V11L1 13V3Z"/><path d="M5 1L9 3V13L5 11V1Z"/><path d="M9 3L13 1V11L9 13V3Z"/></svg>;
    case 'hydrology-dashboard':
      return <svg {...p}><path d="M7 1C7 1 3 6 3 9C3 11.2 4.8 13 7 13C9.2 13 11 11.2 11 9C11 6 7 1 7 1Z"/></svg>;
    case 'ecological':
      return <svg {...p}><path d="M7 12C7 12 3 9 3 5.5C3 3.5 4.8 2 7 2C9.2 2 11 3.5 11 5.5C11 9 7 12 7 12Z"/><line x1="7" y1="12" x2="7" y2="13"/></svg>;
    case 'terrain-dashboard':
      return <svg {...p}><polyline points="1 12 4 6 7 9 10 4 13 12"/></svg>;
    case 'stewardship':
      return <svg {...p}><path d="M7 1L13 3.5V7C13 10.5 10.5 12.5 7 13.5C3.5 12.5 1 10.5 1 7V3.5L7 1Z"/></svg>;
    case 'climate':
      return <svg {...p}><circle cx="7" cy="4" r="2.5"/><path d="M3 8C3 8 5 6 7 6C9 6 11 8 11 8"/><path d="M2 11C2 11 5 9 7 9C9 9 12 11 12 11"/></svg>;
    case 'biomass':
      return <svg {...p}><rect x="1" y="8" width="3" height="5" rx="0.3"/><rect x="5.5" y="5" width="3" height="8" rx="0.3"/><rect x="10" y="2" width="3" height="11" rx="0.3"/></svg>;
    case 'dashboard-settings':
      return <svg {...p}><circle cx="7" cy="7" r="2"/><path d="M7 1.5L8 3.5L10 2.7L9.7 4.8L11.8 5.3L10.5 7L11.8 8.7L9.7 9.2L10 11.3L8 10.5L7 12.5L6 10.5L4 11.3L4.3 9.2L2.2 8.7L3.5 7L2.2 5.3L4.3 4.8L4 2.7L6 3.5L7 1.5Z"/></svg>;
    case 'archive':
      return <svg {...p}><rect x="1" y="1" width="12" height="4" rx="1"/><path d="M2 5V12C2 12.6 2.4 13 3 13H11C11.6 13 12 12.6 12 12V5"/><line x1="5" y1="8" x2="9" y2="8"/></svg>;
    case 'siting-rules':
      return <svg {...p}><path d="M7 1L13 3.5V7C13 10.5 10.5 12.5 7 13.5C3.5 12.5 1 10.5 1 7V3.5L7 1Z"/><path d="M5 7L6.5 8.5L9.5 5.5"/></svg>;
    case 'economics':
      return <svg {...p}><rect x="1" y="9" width="2.5" height="4" rx="0.3"/><rect x="5.5" y="6" width="2.5" height="7" rx="0.3"/><rect x="10" y="3" width="2.5" height="10" rx="0.3"/><polyline points="1 7 5 4 9 6 13 2"/></svg>;
    case 'scenarios':
      return <svg {...p}><line x1="2" y1="7" x2="6" y2="7"/><line x1="6" y1="7" x2="9" y2="4"/><line x1="6" y1="7" x2="9" y2="10"/><line x1="9" y1="4" x2="12" y2="4"/><line x1="9" y1="10" x2="12" y2="10"/></svg>;
    case 'investor-summary':
      return <svg {...p}><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="7.5" x2="10" y2="7.5"/><path d="M4 10L5.5 11.5L8.5 9"/></svg>;
    case 'regulatory':
      return <svg {...p}><path d="M7 1L12 3V7C12 10 10 12 7 13C4 12 2 10 2 7V3L7 1Z"/><line x1="7" y1="5" x2="7" y2="8"/><circle cx="7" cy="9.5" r="0.7" fill={stroke}/></svg>;
    case 'reporting':
      return <svg {...p}><rect x="2" y="1" width="10" height="12" rx="1"/><line x1="4" y1="4" x2="10" y2="4"/><line x1="4" y1="6.5" x2="10" y2="6.5"/><line x1="4" y1="9" x2="8" y2="9"/></svg>;
    case 'portal':
      return <svg {...p}><circle cx="7" cy="7" r="5.5"/><line x1="1.5" y1="7" x2="12.5" y2="7"/><ellipse cx="7" cy="7" rx="2.5" ry="5.5"/></svg>;
    case 'educational':
      return <svg {...p}><path d="M7 1L1 4L7 7L13 4L7 1Z"/><polyline points="1 4 1 9"/><path d="M3.5 5.3V10C3.5 11 5 12.5 7 12.5C9 12.5 10.5 11 10.5 10V5.3"/></svg>;
    default:
      return <svg {...p}><circle cx="7" cy="7" r="3"/></svg>;
  }
}
