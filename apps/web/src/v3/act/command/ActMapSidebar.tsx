/**
 * ActMapSidebar — the Act Command Centre's left control rail. A thin wrapper over
 * the shared `CommandCentreMapSidebar`: it keeps the Act prop interface and
 * injects the Act brand, palettes, the two layer toggles (Act execution + site
 * boundary — Act has no design layer), and the forward CTA into Report.
 */

import CommandCentreMapSidebar from '../../command/shell/CommandCentreMapSidebar.js';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';

interface Props {
  active: ActModule | null;
  onClearModule: () => void;
  showData: boolean;
  onToggleData: (next: boolean) => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  ready: boolean;
  onGoReport: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ActMapSidebar({
  active,
  onClearModule,
  showData,
  onToggleData,
  showBoundary,
  onToggleBoundary,
  ready,
  onGoReport,
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
      ariaLabel="Act controls"
      brand={{
        name: 'Act',
        blurb: 'Run the land and track execution across every Act module.',
        href: 'https://docs.ogden.ag/act',
      }}
      moduleLabel={ACT_MODULE_LABEL}
      moduleDot={ACT_MODULE_DOT}
      layers={[
        {
          key: 'data',
          label: 'Act execution',
          checked: showData,
          onToggle: onToggleData,
        },
        {
          key: 'boundary',
          label: 'Site boundary',
          checked: showBoundary,
          onToggle: onToggleBoundary,
        },
      ]}
      nextStageLabel="Report"
      inProgressText="Execution in progress"
      onGoNext={onGoReport}
    />
  );
}
