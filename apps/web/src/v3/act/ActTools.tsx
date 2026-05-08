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

import { Sprout, Droplet, Beef } from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import {
  useMapToolStore,
  type MapToolId,
} from '../observe/components/measure/useMapToolStore.js';
import type { ActModule } from './types.js';
import css from './ActTools.module.css';

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
    hint: 'Open Maintenance · Irrigation Manager',
    Icon: Droplet,
    module: 'maintain',
  },
  {
    id: 'livestock',
    label: 'Log livestock move',
    hint: 'Open Livestock · Rotation schedule',
    Icon: Beef,
    module: 'livestock',
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

  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  const handleClick = (q: QuickLog) => {
    if (!projectId) return;
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
          <button
            key={q.id}
            type="button"
            className={css.logBtn}
            data-kind={q.id}
            data-active={isActive ? 'true' : 'false'}
            disabled={!projectId}
            title={!projectId ? `${q.label} — open a project to use` : q.hint}
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
        );
      })}
    </div>
  );
}
