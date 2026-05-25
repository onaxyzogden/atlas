/**
 * ObserveModuleTabs — the Observe Command Centre's top module strip. A thin
 * wrapper over the shared `CommandCentreModuleTabs`: it keeps the Observe prop
 * interface and injects the Observe aria label + "verified" status word. Observe
 * uses the compass objective label directly (no short-label map).
 */

import CommandCentreModuleTabs from './shell/CommandCentreModuleTabs.js';
import type { CompassData } from '../compass/useCompassData.js';
import type { ObserveModule } from '../observe/types.js';

interface Props {
  data: CompassData;
  active: ObserveModule | null;
  onSelect: (module: ObserveModule | null) => void;
  onBackToCompass: () => void;
}

export default function ObserveModuleTabs(props: Props) {
  return (
    <CommandCentreModuleTabs
      {...props}
      ariaLabel="Observe modules"
      statusWord="verified"
    />
  );
}
