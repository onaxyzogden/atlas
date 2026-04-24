/**
 * GroupingToggle — compact segmented control for switching sidebar grouping
 * between 'phase' (workflow) and 'domain' (subject).
 *
 * Mounted at the top of both IconSidebar and DashboardSidebar so the
 * preference is discoverable and switchable in either mode. The preference
 * itself is persisted in uiStore, so toggling on either sidebar affects both.
 */

import { useUIStore, type SidebarGrouping } from '../../store/uiStore.js';
import { DelayedTooltip } from './DelayedTooltip.js';
import styles from './GroupingToggle.module.css';

export interface GroupingToggleProps {
  /** Optional extra class for container (e.g. to scope width in each sidebar). */
  className?: string;
  /** Size variant — 'compact' for IconSidebar's tighter chrome, 'default' otherwise. */
  size?: 'default' | 'compact';
}

const OPTIONS: Array<{ value: SidebarGrouping; label: string; title: string }> = [
  { value: 'phase',  label: 'Phase',  title: 'Group by workflow phase (P1–P4)' },
  { value: 'domain', label: 'Domain', title: 'Group by subject domain (hydrology, grazing, …)' },
];

export function GroupingToggle({ className, size = 'default' }: GroupingToggleProps) {
  const grouping = useUIStore((s) => s.sidebarGrouping);
  const setGrouping = useUIStore((s) => s.setSidebarGrouping);

  return (
    <div
      role="radiogroup"
      aria-label="Sidebar grouping"
      className={[styles.toggle, size === 'compact' ? styles.compact : '', className ?? ''].join(' ').trim()}
    >
      {OPTIONS.map((opt) => {
        const active = grouping === opt.value;
        return (
          <DelayedTooltip key={opt.value} label={opt.title}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.option} ${active ? styles.optionActive : ''}`}
              onClick={() => setGrouping(opt.value)}
            >
              {opt.label}
            </button>
          </DelayedTooltip>
        );
      })}
    </div>
  );
}

GroupingToggle.displayName = 'GroupingToggle';
