/**
 * ObserveBottomRail — collapsible bottom rail of 6 module tiles.
 *
 * Click a tile → onSelectModule(module) → consumer navigates AND opens the
 * slide-up. Collapsed state persisted to
 * localStorage['atlas.observe.bottomRail.collapsed'].
 */

import { useEffect, useState } from 'react';
import {
  Users,
  CloudLightning,
  Mountain,
  Droplets,
  Compass,
  Layers,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveBottomRail.module.css';

const STORAGE_KEY = 'atlas.observe.bottomRail.collapsed';

const MODULE_ICON: Record<ObserveModule, LucideIcon> = {
  'human-context': Users,
  'macroclimate-hazards': CloudLightning,
  topography: Mountain,
  'earth-water-ecology': Droplets,
  'sectors-zones': Compass,
  'swot-synthesis': Layers,
};

interface Props {
  activeModule?: ObserveModule;
  onSelectModule: (module: ObserveModule) => void;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* swallow */
  }
}

export default function ObserveBottomRail({ activeModule, onSelectModule }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed());

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  return (
    <div className={`${css.rail} ${collapsed ? css.collapsed : ''}`}>
      <button
        type="button"
        className={css.handle}
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand modules' : 'Collapse modules'}
      >
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span className={css.handleLabel}>{collapsed ? 'Modules' : 'Hide modules'}</span>
      </button>
      {!collapsed && (
        <div className={css.tiles} role="toolbar" aria-label="Observe modules">
          {OBSERVE_MODULES.map((mod) => {
            const Icon = MODULE_ICON[mod];
            const isActive = activeModule === mod;
            return (
              <button
                key={mod}
                type="button"
                role="button"
                aria-pressed={isActive}
                className={`${css.tile} ${isActive ? css.tileActive : ''}`}
                onClick={() => onSelectModule(mod)}
              >
                <Icon size={20} strokeWidth={1.6} className={css.tileIcon} />
                <span className={css.tileLabel}>{OBSERVE_MODULE_LABEL[mod]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
