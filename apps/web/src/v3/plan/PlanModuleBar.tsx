/**
 * PlanModuleBar — Plan-stage wrapper over the shared ModuleBar.
 *
 * Click semantics + tile chrome live in `_shared/moduleNav/ModuleBar.tsx`.
 */

import { ModuleBar } from '../_shared/moduleNav/index.js';
import type { PlanModule } from './types.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL } from './types.js';

interface Props {
  activeModule: PlanModule | null;
  onSelectModule: (module: PlanModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function PlanModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  return (
    <ModuleBar<PlanModule>
      modules={PLAN_MODULES}
      labelFor={(m) => PLAN_MODULE_LABEL[m]}
      activeModule={activeModule}
      slideUpOpen={slideUpOpen}
      onSelectModule={onSelectModule}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      toolbarLabel="Plan modules"
      columns={PLAN_MODULES.length}
    />
  );
}
