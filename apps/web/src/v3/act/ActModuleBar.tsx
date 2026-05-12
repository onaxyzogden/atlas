/**
 * ActModuleBar — Act-stage wrapper over the shared ModuleBar.
 *
 * Click semantics + tile chrome live in `_shared/moduleNav/ModuleBar.tsx`.
 * The Act stage adds telemetry — passed via `onTileInteraction`.
 */

import { useParams } from '@tanstack/react-router';
import { ModuleBar } from '../_shared/moduleNav/index.js';
import type { ActModule } from './types.js';
import { ACT_MODULES, ACT_MODULE_LABEL } from './types.js';
import { useActTelemetry } from '../../lib/actInteractionLog.js';
import { useEffectivePlanProjectType } from '../plan/hooks/useEffectivePlanProjectType.js';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ActModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const { effectiveType } = useEffectivePlanProjectType(params.projectId ?? null);
  const record = useActTelemetry({
    projectId: params.projectId ?? '',
    projectType: effectiveType,
  });

  return (
    <ModuleBar<ActModule>
      modules={ACT_MODULES}
      labelFor={(m) => ACT_MODULE_LABEL[m]}
      activeModule={activeModule}
      slideUpOpen={slideUpOpen}
      onSelectModule={onSelectModule}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      toolbarLabel="Act modules"
      columns={ACT_MODULES.length}
      onTileInteraction={(module, eventType) => record({ module, eventType })}
    />
  );
}
