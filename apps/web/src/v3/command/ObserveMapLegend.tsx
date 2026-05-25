/**
 * ObserveMapLegend — the colour key for the Observe Command Centre site map. A
 * thin wrapper over the shared `CommandCentreMapLegend`, injecting the Observe
 * module list + label/dot palettes. When a module lens is active the shared
 * legend narrows to that single domain.
 */

import CommandCentreMapLegend from './shell/CommandCentreMapLegend.js';
import { OBSERVE_MODULES, OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';

interface Props {
  active: ObserveModule | null;
}

export default function ObserveMapLegend({ active }: Props) {
  return (
    <CommandCentreMapLegend
      active={active}
      title="Observation modules"
      modules={OBSERVE_MODULES}
      moduleLabel={OBSERVE_MODULE_LABEL}
      moduleDot={OBSERVE_MODULE_DOT}
    />
  );
}
