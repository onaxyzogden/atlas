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
 *
 * 2026-05-24 — Stage Compass focus (Goal 6, mirrors Observe/Plan): the rail
 * follows the compass's single-objective focus. With an objective active it
 * renders ONLY that module's quick-log button(s); the five modules without a
 * quick-log fall back to an honest "Open module" slide-up button. With no
 * objective selected, a quiet prompt links back to the Act Compass. All
 * existing render paths are preserved (gated on the active module), not removed.
 */

import { useState } from 'react';
import { Sprout, Droplet, Shuffle, FolderOpen } from 'lucide-react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  useMapToolStore,
  type MapToolId,
} from '../observe/components/measure/useMapToolStore.js';
import { ACT_MODULE_FULL_LABEL, type ActModule } from './types.js';
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
    id: 'plants-food',
    label: 'Log harvest',
    hint: 'Drop a yield entry on a crop area or paddock',
    Icon: Sprout,
    module: 'plants-food',
    toolId: 'act.harvest.log-entry',
  },
  {
    id: 'water',
    label: 'Log water check',
    hint: 'Click a swale, cistern, or pond to log a maintenance event',
    Icon: Droplet,
    module: 'built-infrastructure',
    toolId: 'act.maintain.log-event',
  },
  {
    id: 'animals-livestock',
    label: 'Log livestock move',
    hint: 'Click a paddock to log a move-in / out / rotate-through',
    Icon: Shuffle,
    module: 'animals-livestock',
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
  const navigate = useNavigate();
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

  // 2026-05-24 — Stage Compass focus: with no objective selected, show a quiet
  // prompt back to the Act compass instead of every module's quick-log. Mirrors
  // ObserveTools / PlanTools.
  if (activeModule === null) {
    return (
      <div className={css.strip} aria-label="Quick log">
        <div className={css.emptyPrompt}>
          <p className={css.emptyText}>No objective selected.</p>
          <p className={css.emptyHint}>
            Pick one from the module bar below, or open the Act Compass to
            choose your next objective.
          </p>
          {projectId && (
            <button
              type="button"
              className={css.compassLink}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/act/compass',
                  params: { projectId },
                })
              }
            >
              Open Act Compass
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quick-logs for the active objective (3 of 8 modules have one). The other
  // five fall back to an honest "Open module" slide-up button below.
  const moduleQuickLogs = QUICK_LOGS.filter((q) => q.module === activeModule);

  return (
    <div className={css.strip} aria-label="Quick log">
      <header className={css.stripHeader}>
        <span className={css.stripHeaderLabel}>
          {ACT_MODULE_FULL_LABEL[activeModule]}
        </span>
        <span className={css.stripHeaderHint}>
          {moduleQuickLogs.length > 0 ? 'In-field entries' : 'Open to log'}
        </span>
      </header>
      {moduleQuickLogs.length > 0 ? (
        moduleQuickLogs.map((q) => {
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
        })
      ) : (
        <DelayedTooltip
          label={
            !projectId
              ? 'Open module — open a project to use'
              : `Open ${ACT_MODULE_FULL_LABEL[activeModule]}`
          }
          position="right"
        >
          <button
            type="button"
            className={css.openModuleBtn}
            disabled={!projectId}
            onClick={() => {
              if (!projectId) return;
              onSelectModule(activeModule);
              onOpenSlideUp?.();
            }}
          >
            <FolderOpen size={16} strokeWidth={1.7} />
            <span>Open module</span>
          </button>
        </DelayedTooltip>
      )}
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
