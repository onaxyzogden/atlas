/**
 * ObserveMapSidebar — the Observe Command Centre's left control rail. A thin
 * wrapper over the shared `CommandCentreMapSidebar`: it keeps the Observe prop
 * interface and injects the Observe brand, palettes, the two layer toggles
 * (observation markers + site boundary), and the forward CTA into Plan.
 */

import CommandCentreMapSidebar from './shell/CommandCentreMapSidebar.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';

interface Props {
  active: ObserveModule | null;
  onClearModule: () => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  showMarkers: boolean;
  onToggleMarkers: (next: boolean) => void;
  markerCount: number;
  ready: boolean;
  onGoPlan: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ObserveMapSidebar({
  active,
  onClearModule,
  showBoundary,
  onToggleBoundary,
  showMarkers,
  onToggleMarkers,
  markerCount,
  ready,
  onGoPlan,
  collapsed,
  onToggleCollapsed,
}: Props) {
  return (
    <CommandCentreMapSidebar
      active={active}
      onClearModule={onClearModule}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      ready={ready}
      ariaLabel="Observe controls"
      brand={{
        name: 'Observe',
        blurb: 'Capture and update land intelligence across the site.',
        href: 'https://docs.ogden.ag/observe',
      }}
      moduleLabel={OBSERVE_MODULE_LABEL}
      moduleDot={OBSERVE_MODULE_DOT}
      layers={[
        {
          key: 'markers',
          label: 'Observation markers',
          checked: showMarkers,
          onToggle: onToggleMarkers,
          count: markerCount,
        },
        {
          key: 'boundary',
          label: 'Site boundary',
          checked: showBoundary,
          onToggle: onToggleBoundary,
        },
      ]}
      nextStageLabel="Plan"
      inProgressText="Observation in progress"
      onGoNext={onGoPlan}
    />
  );
}
