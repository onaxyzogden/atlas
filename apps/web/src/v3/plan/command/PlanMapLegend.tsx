/**
 * PlanMapLegend — the colour key for the Plan Command Centre site map. A thin
 * wrapper over the shared `CommandCentreMapLegend`, injecting the Plan module list
 * + the `PLAN_MODULE_DOT` palette. When a module lens is active the shared legend
 * narrows to that single module.
 */

import CommandCentreMapLegend from '../../command/shell/CommandCentreMapLegend.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';

interface Props {
  active: PlanModule | null;
}

export default function PlanMapLegend({ active }: Props) {
  return (
    <CommandCentreMapLegend
      active={active}
      title="Plan modules"
      modules={PLAN_MODULES}
      moduleLabel={PLAN_MODULE_LABEL}
      moduleDot={PLAN_MODULE_DOT}
    />
  );
}
