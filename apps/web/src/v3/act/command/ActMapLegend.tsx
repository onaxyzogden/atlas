/**
 * ActMapLegend — the colour key for the Act Command Centre site map. A thin
 * wrapper over the shared `CommandCentreMapLegend`, injecting the Act module list
 * + the `ACT_MODULE_DOT` palette. When a module lens is active the shared legend
 * narrows to that single module.
 */

import CommandCentreMapLegend from '../../command/shell/CommandCentreMapLegend.js';
import { ACT_MODULES, ACT_MODULE_LABEL, type ActModule } from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';

interface Props {
  active: ActModule | null;
}

export default function ActMapLegend({ active }: Props) {
  return (
    <CommandCentreMapLegend
      active={active}
      title="Act modules"
      modules={ACT_MODULES}
      moduleLabel={ACT_MODULE_LABEL}
      moduleDot={ACT_MODULE_DOT}
    />
  );
}
