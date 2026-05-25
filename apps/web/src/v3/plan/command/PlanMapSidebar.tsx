/**
 * PlanMapSidebar — the Plan Command Centre's left control rail. A thin wrapper
 * over the shared `CommandCentreMapSidebar`: it keeps the Plan prop interface and
 * injects the Plan brand, palettes, the three layer toggles (Plan data + design
 * elements + site boundary), and the forward CTA into Act.
 */

import CommandCentreMapSidebar from '../../command/shell/CommandCentreMapSidebar.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';

interface Props {
  active: PlanModule | null;
  onClearModule: () => void;
  showData: boolean;
  onToggleData: (next: boolean) => void;
  showDesign: boolean;
  onToggleDesign: (next: boolean) => void;
  showBoundary: boolean;
  onToggleBoundary: (next: boolean) => void;
  ready: boolean;
  onGoAct: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function PlanMapSidebar({
  active,
  onClearModule,
  showData,
  onToggleData,
  showDesign,
  onToggleDesign,
  showBoundary,
  onToggleBoundary,
  ready,
  onGoAct,
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
      ariaLabel="Plan controls"
      brand={{
        name: 'Plan',
        blurb: 'Design the land and weigh the decisions across every Plan module.',
        href: 'https://docs.ogden.ag/plan',
      }}
      moduleLabel={PLAN_MODULE_LABEL}
      moduleDot={PLAN_MODULE_DOT}
      layers={[
        {
          key: 'data',
          label: 'Plan data',
          checked: showData,
          onToggle: onToggleData,
        },
        {
          key: 'design',
          label: 'Design elements',
          checked: showDesign,
          onToggle: onToggleDesign,
        },
        {
          key: 'boundary',
          label: 'Site boundary',
          checked: showBoundary,
          onToggle: onToggleBoundary,
        },
      ]}
      nextStageLabel="Act"
      inProgressText="Planning in progress"
      onGoNext={onGoAct}
    />
  );
}
