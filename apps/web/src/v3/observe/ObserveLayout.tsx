/**
 * ObserveLayout — route component for /v3/project/$projectId/observe/$module.
 *
 * Composes the four scaffold pieces built earlier in Phase A:
 *   - LevelNavigator (top)        — switches between Observe / Plan / Act
 *   - ObserveTools  (left)        — module-aware tools panel
 *   - canvas placeholder (center) — Phase B will fill with real module surfaces
 *   - ObserveBottomRail + ModuleSlideUp (bottom) — module tile rail + sheet
 *
 * URL is the source of truth for the active module. Slide-up open/closed is
 * local state — closing the sheet does not navigate.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import LevelNavigator, {
  type Level,
  type LevelNavigatorProps,
} from '../../components/LevelNavigator/index.js';
import ObserveTools from './tools/ObserveTools.js';
import ObserveBottomRail from './components/ObserveBottomRail.js';
import ModuleSlideUp from './components/ModuleSlideUp.js';
import {
  OBSERVE_MODULE_LABEL,
  isObserveModule,
  type ObserveModule,
} from './types.js';
import css from './ObserveLayout.module.css';

const LEVELS: Level[] = [
  {
    key: 'observe',
    label: 'Observe',
    title: 'Observe',
    subtitle: 'See the land',
    desc: 'Map context, climate, terrain, water, ecology, and synthesis before designing.',
    routeSuffix: 'observe/human-context',
  },
  {
    key: 'plan',
    label: 'Plan',
    title: 'Plan',
    subtitle: 'Design the response',
    desc: 'Translate observation into a coherent design and proof plan.',
    routeSuffix: 'plan',
  },
  {
    key: 'act',
    label: 'Act',
    title: 'Act',
    subtitle: 'Build and operate',
    desc: 'Execute, run, and report on the design in the field.',
    routeSuffix: 'act',
  },
];

export default function ObserveLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    module?: string;
  };
  const navigate = useNavigate();

  const moduleParam = params.module ?? '';
  const validModule: ObserveModule | null = isObserveModule(moduleParam)
    ? moduleParam
    : null;

  useEffect(() => {
    if (!validModule && params.projectId) {
      navigate({
        to: '/v3/project/$projectId/observe/$module',
        params: { projectId: params.projectId, module: 'human-context' },
        replace: true,
      });
    }
  }, [validModule, params.projectId, navigate]);

  const [slideUpOpen, setSlideUpOpen] = useState(false);

  const handleSelectModule = (mod: ObserveModule) => {
    if (params.projectId) {
      navigate({
        to: '/v3/project/$projectId/observe/$module',
        params: { projectId: params.projectId, module: mod },
      });
    }
    setSlideUpOpen(true);
  };

  const handleLevelChange: NonNullable<LevelNavigatorProps['onLevelChange']> = (
    key,
  ) => {
    if (!params.projectId) return;
    if (key === 'observe') {
      navigate({
        to: '/v3/project/$projectId/observe/$module',
        params: {
          projectId: params.projectId,
          module: validModule ?? 'human-context',
        },
      });
    } else if (key === 'plan') {
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId: params.projectId },
      });
    } else if (key === 'act') {
      navigate({
        to: '/v3/project/$projectId/act',
        params: { projectId: params.projectId },
      });
    }
  };

  if (!validModule) return null;

  return (
    <div className={css.layout}>
      <div className={css.top}>
        <LevelNavigator
          levels={LEVELS}
          controlledLevel="observe"
          onLevelChange={handleLevelChange}
          compact
        />
      </div>

      <div className={css.body}>
        <aside className={css.left} aria-label="Observe tools">
          <ObserveTools activeModule={validModule} />
        </aside>
        <main className={css.canvas} aria-label="Observe canvas">
          <div className={css.canvasInner}>
            <span className={css.canvasEyebrow}>Observe</span>
            <h1 className={css.canvasTitle}>{OBSERVE_MODULE_LABEL[validModule]}</h1>
            <p className={css.canvasHint}>
              Module canvas placeholder. Click the module tile below to open the
              detail page, or use the left tools panel for module-specific
              actions. Real canvases arrive in Phase B.
            </p>
          </div>
        </main>
      </div>

      <div className={css.bottom}>
        <ObserveBottomRail
          activeModule={validModule}
          onSelectModule={handleSelectModule}
        />
      </div>

      <ModuleSlideUp
        module={validModule}
        open={slideUpOpen}
        onClose={() => setSlideUpOpen(false)}
      />
    </div>
  );
}
