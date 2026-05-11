/**
 * ActTools — Quick Log strip for the Act stage.
 *
 * Was: a per-module bento with map tools (Plan/Observe-shaped).
 * Was (briefly): an Operate-nav rail.
 * Now: 3 large-tap field-log buttons. Module nav lives in
 * V3LifecycleSidebar; this rail is purely for in-field logging.
 *
 * Each button selects the matching Act module + opens its slide-up so
 * the steward can log via the existing card forms. Where a map tool
 * already exists (`act.harvest.log-entry`), it is activated too.
 */

import { useState } from 'react';
import { Sprout, Droplet, Shuffle } from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  useMapToolStore,
  type MapToolId,
} from '../observe/components/measure/useMapToolStore.js';
import type { ActModule } from './types.js';
import { useActTelemetry } from '../../lib/actInteractionLog.js';
import { useEffectivePlanProjectType } from '../plan/hooks/useEffectivePlanProjectType.js';
import { useV3Project } from '../data/useV3Project.js';
import CreateFieldTaskDialog from '../components/CreateFieldTaskDialog.js';
import LogObservationDialog from '../components/LogObservationDialog.js';
import QuickActions from './ops/QuickActions.js';
import css from './ActTools.module.css';

const FALLBACK_CENTER: [number, number] = [-78.20, 44.50];

interface QuickLog {
  id: string;
  label: string;
  hint: string;
  Icon: typeof Sprout;
  module: ActModule;
  toolId?: MapToolId;
}

const QUICK_LOGS: QuickLog[] = [
  {
    id: 'harvest',
    label: 'Log harvest',
    hint: 'Drop a yield entry on a crop area or paddock',
    Icon: Sprout,
    module: 'harvest',
    toolId: 'act.harvest.log-entry',
  },
  {
    id: 'water',
    label: 'Log water check',
    hint: 'Click a swale, cistern, or pond to log a maintenance event',
    Icon: Droplet,
    module: 'maintain',
    toolId: 'act.maintain.log-event',
  },
  {
    id: 'livestock',
    label: 'Log livestock move',
    hint: 'Click a paddock to log a move-in / out / rotate-through',
    Icon: Shuffle,
    module: 'livestock',
    toolId: 'act.livestock.log-move',
  },
];

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (m: ActModule | null) => void;
  onOpenSlideUp?: () => void;
}

export default function ActTools({
  activeModule,
  onSelectModule,
  onOpenSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;
  const project = useV3Project(projectId ?? undefined);

  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const { effectiveType } = useEffectivePlanProjectType(projectId);
  const record = useActTelemetry({
    projectId: projectId ?? '',
    projectType: effectiveType,
  });

  const [taskOpen, setTaskOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const handleClick = (q: QuickLog) => {
    if (!projectId) return;
    record({
      module: q.module,
      eventType: 'quick_log_click',
      payload: { toolId: q.toolId ?? q.id },
    });
    onSelectModule(q.module);
    onOpenSlideUp?.();
    if (q.toolId) {
      setActiveTool(q.toolId);
    }
  };

  return (
    <div className={css.strip} aria-label="Quick log">
      <header className={css.stripHeader}>
        <span className={css.stripHeaderLabel}>Quick Log</span>
        <span className={css.stripHeaderHint}>In-field entries</span>
      </header>
      {QUICK_LOGS.map((q) => {
        const isActive = activeModule === q.module;
        const Icon = q.Icon;
        return (
          <DelayedTooltip
            key={q.id}
            label={!projectId ? `${q.label} — open a project to use` : q.hint}
            position="right"
          >
            <button
              type="button"
              className={css.logBtn}
              data-kind={q.id}
              data-active={isActive ? 'true' : 'false'}
              disabled={!projectId}
              onClick={() => handleClick(q)}
            >
              <span className={css.logGlyph} aria-hidden="true">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <span className={css.logBody}>
                <span className={css.logLabel}>{q.label}</span>
                <span className={css.logHint}>{q.hint}</span>
              </span>
            </button>
          </DelayedTooltip>
        );
      })}
      <QuickActions
        disabled={!projectId || !project}
        onCreateTask={() => setTaskOpen(true)}
        onLogObservation={() => setLogOpen(true)}
      />

      {taskOpen && project && (
        <CreateFieldTaskDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={FALLBACK_CENTER}
          onClose={() => setTaskOpen(false)}
        />
      )}

      {logOpen && project && (
        <LogObservationDialog
          projectId={project.id}
          boundary={project.location.boundary}
          fallbackCenter={FALLBACK_CENTER}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}
