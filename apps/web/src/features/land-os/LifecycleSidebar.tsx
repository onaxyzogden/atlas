/**
 * LifecycleSidebar — stage-grouped left rail for the LandOs workspace.
 *
 * Always groups items by the 5-step lifecycle (S1..S5). Reads the existing
 * uiStore selection state (activeDashboardSection / activeMapView /
 * activeMapSubItem) — no new persisted keys, no derived selection state.
 *
 * Click handler:
 *   - In dashboard tabs (overview / intelligence / report) → setActiveDashboardSection
 *   - In design-map tab → setActiveMapView + setActiveMapSubItem (and mirror
 *     the dashboard section via resolveDashboardSectionFromRail, matching the
 *     legacy ProjectPage behavior so DomainFloatingToolbar tints stay aligned).
 */

import { useUIStore } from '../../store/uiStore.js';
import type { ProjectTab } from '../../components/ProjectTabBar.js';
import type { SidebarView, SubItemId } from '../../components/IconSidebar.js';
import {
  NAV_ITEMS,
  STAGE_META,
  STAGE_ORDER,
  groupByStage,
  resolveDashboardSectionFromRail,
  type NavItem,
} from '../navigation/taxonomy.js';
import { LIFECYCLE_STAGES, deriveActiveBanner } from './lifecycle.js';
import css from './LifecycleSidebar.module.css';

export interface LifecycleSidebarProps {
  activeTab: ProjectTab;
}

const isMapTab = (t: ProjectTab) => t === 'design-map';

export default function LifecycleSidebar({ activeTab }: LifecycleSidebarProps) {
  const activeDashboardSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);
  const activeMapView = useUIStore((s) => s.activeMapView);
  const setActiveMapView = useUIStore((s) => s.setActiveMapView);
  const activeMapSubItem = useUIStore((s) => s.activeMapSubItem);
  const setActiveMapSubItem = useUIStore((s) => s.setActiveMapSubItem);

  const mapMode = isMapTab(activeTab);

  // Filter items: in map mode show only items with a panel; otherwise drop mapOnly items.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (mapMode) return Boolean(item.panel) && !item.dashboardOnly;
    return !item.mapOnly;
  });

  const grouped = groupByStage(visibleItems);

  const isItemActive = (item: NavItem): boolean => {
    if (mapMode) {
      const sub = (item.mapSubItem ?? item.id) as SubItemId;
      if (activeMapSubItem !== sub) return false;
      return item.panel ? activeMapView === (item.panel as SidebarView) : true;
    }
    const sectionId = item.dashboardRoute ?? item.id;
    return activeDashboardSection === sectionId;
  };

  const handleClick = (item: NavItem) => {
    if (mapMode && item.panel) {
      const sub = (item.mapSubItem ?? item.id) as SubItemId;
      const panel = item.panel as Exclude<SidebarView, null>;
      setActiveMapSubItem(sub);
      setActiveMapView(panel);
      const mirrored = resolveDashboardSectionFromRail(sub, panel);
      if (mirrored) setActiveDashboardSection(mirrored);
    } else if (!mapMode) {
      const sectionId = item.dashboardRoute ?? item.id;
      setActiveDashboardSection(sectionId);
    }
  };

  const activeBanner = deriveActiveBanner(activeDashboardSection);

  return (
    <nav aria-label="Lifecycle stages" className={css.sidebar}>
      <header className={css.title}>Lifecycle</header>
      <ol className={css.banner} aria-label="Project lifecycle">
        {LIFECYCLE_STAGES.map((stage) => {
          const active = activeBanner === stage.id;
          return (
            <li key={stage.id} className={css.bannerItem}>
              <button
                type="button"
                className={`${css.bannerPill} ${active ? css.bannerPillActive : ''}`}
                onClick={() => setActiveDashboardSection(stage.section)}
                aria-current={active ? 'step' : undefined}
              >
                {stage.label}
              </button>
            </li>
          );
        })}
      </ol>
      <div className={css.scroll}>
        {STAGE_ORDER.map((stage, idx) => {
          const items = grouped[stage];
          if (items.length === 0) return null;
          const meta = STAGE_META[stage];
          return (
            <section key={stage} className={css.stage}>
              <div className={css.stageHeader}>
                <span className={css.stageBadge} style={{ backgroundColor: meta.color + '33', color: meta.color, borderColor: meta.color + '55' }}>
                  {idx + 1}
                </span>
                <div className={css.stageMeta}>
                  <span className={css.stageName}>{meta.name}</span>
                  <span className={css.stageDesc}>{meta.desc}</span>
                </div>
              </div>
              <ul className={css.items}>
                {items.map((item) => {
                  const active = isItemActive(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`${css.item} ${active ? css.itemActive : ''}`}
                        style={active ? { borderLeftColor: meta.color } : undefined}
                        onClick={() => handleClick(item)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className={css.itemDot} style={{ backgroundColor: active ? meta.color : 'transparent', borderColor: meta.color + '88' }} />
                        <span className={css.itemLabel}>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
