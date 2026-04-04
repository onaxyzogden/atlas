/**
 * DashboardSidebar — domain-grouped navigation for the dashboard view.
 */

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
    group: 'Grazing & Livestock',
    color: '#c4a265',
    items: [
      { id: 'paddock-design', label: 'Paddock Design' },
      { id: 'herd-rotation', label: 'Herd Rotation' },
      { id: 'grazing-analysis', label: 'Grazing Analysis' },
      { id: 'livestock-inventory', label: 'Inventory & Health Ledger' },
    ],
  },
  {
    group: 'Forestry',
    color: '#8a9a74',
    items: [
      { id: 'planting-tool', label: 'Planting Tool' },
      { id: 'forest-hub', label: 'Forest Hub' },
      { id: 'carbon-diagnostic', label: 'Carbon Diagnostic' },
      { id: 'nursery-ledger', label: 'Nursery Ledger' },
    ],
  },
  {
    group: 'Hydrology & Terrain',
    color: '#7a8a9a',
    items: [
      { id: 'cartographic', label: 'Cartographic' },
      { id: 'hydrology-dashboard', label: 'Hydrology' },
      { id: 'ecological', label: 'Ecological' },
      { id: 'terrain-dashboard', label: 'Terrain' },
      { id: 'stewardship', label: 'Stewardship' },
    ],
  },
  {
    group: 'General',
    color: '#9a7a8a',
    items: [
      { id: 'biomass', label: 'Biomass' },
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
    case 'biomass':
      return <svg {...p}><rect x="1" y="8" width="3" height="5" rx="0.3"/><rect x="5.5" y="5" width="3" height="8" rx="0.3"/><rect x="10" y="2" width="3" height="11" rx="0.3"/></svg>;
    case 'dashboard-settings':
      return <svg {...p}><circle cx="7" cy="7" r="2"/><path d="M7 1.5L8 3.5L10 2.7L9.7 4.8L11.8 5.3L10.5 7L11.8 8.7L9.7 9.2L10 11.3L8 10.5L7 12.5L6 10.5L4 11.3L4.3 9.2L2.2 8.7L3.5 7L2.2 5.3L4.3 4.8L4 2.7L6 3.5L7 1.5Z"/></svg>;
    case 'archive':
      return <svg {...p}><rect x="1" y="1" width="12" height="4" rx="1"/><path d="M2 5V12C2 12.6 2.4 13 3 13H11C11.6 13 12 12.6 12 12V5"/><line x1="5" y1="8" x2="9" y2="8"/></svg>;
    default:
      return <svg {...p}><circle cx="7" cy="7" r="3"/></svg>;
  }
}
