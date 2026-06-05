/**
 * ActModuleTabs — the Act Command Centre's top module strip. A thin wrapper over
 * the shared `CommandCentreModuleTabs`: it keeps the Act prop interface and
 * injects the Act aria label, the short `ACT_MODULE_LABEL` map (so the eight tabs
 * stay compact), and the "done" status word.
 */

import CommandCentreModuleTabs from '../../command/shell/CommandCentreModuleTabs.js';
import type { CompassData } from '../../compass/compassTypes.js';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';

interface Props {
  data: CompassData;
  active: ActModule | null;
  onSelect: (module: ActModule | null) => void;
  onBackToCompass: () => void;
}

export default function ActModuleTabs(props: Props) {
  return (
    <CommandCentreModuleTabs
      {...props}
      ariaLabel="Act modules"
      moduleLabel={ACT_MODULE_LABEL}
      statusWord="done"
    />
  );
}
