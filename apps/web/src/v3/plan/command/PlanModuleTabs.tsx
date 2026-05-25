/**
 * PlanModuleTabs — the Plan Command Centre's top module strip. A thin wrapper over
 * the shared `CommandCentreModuleTabs`: it keeps the Plan prop interface and
 * injects the Plan aria label, the short `PLAN_MODULE_LABEL` map (so fifteen tabs
 * stay compact), and the "verified" status word.
 */

import CommandCentreModuleTabs from '../../command/shell/CommandCentreModuleTabs.js';
import type { CompassData } from '../../compass/compassTypes.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';

interface Props {
  data: CompassData;
  active: PlanModule | null;
  onSelect: (module: PlanModule | null) => void;
  onBackToCompass: () => void;
}

export default function PlanModuleTabs(props: Props) {
  return (
    <CommandCentreModuleTabs
      {...props}
      ariaLabel="Plan modules"
      moduleLabel={PLAN_MODULE_LABEL}
      statusWord="verified"
    />
  );
}
