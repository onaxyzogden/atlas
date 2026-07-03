// ActOpsHubMetricStrip.tsx
//
// "Today on the Land" — the at-a-glance metric row of the Operations Hub. Four
// tiles backed by REAL field-action counts (useFieldActions, the same composed
// read the field-action dashboard uses), so the strip never drifts from the
// task lists below it. Styled after the Observe LandStateSummary tiles but with
// OLOS dark tokens.
//
// Phase 4: each tile is a button. Clicking a tile filters the hub's work
// surface down to that status bucket (the hub swaps the "Work by area" grid for
// a list of just the matching tasks) via the hub's `onSelect`. `activeKey`
// reflects which tile is currently driving that filter so the pressed tile reads
// as selected. The tile `key` is the bucket id the hub filters on.

import { AlertTriangle, CheckCircle2, ListTodo, Loader } from 'lucide-react';
import { useFieldActions } from '../field-action/useFieldActions.js';
import css from './ActOpsHubMetricStrip.module.css';

interface Props {
  projectId: string | null;
  /** Click a tile → filter the hub's work surface to that status bucket. Omit
   *  to render the strip as inert display tiles. */
  onSelect?: (key: string) => void;
  /** The currently-selected tile key (drives the pressed/selected styling).
   *  `null`/undefined → no tile selected. */
  activeKey?: string | null;
}

interface Tile {
  key: string;
  label: string;
  value: number;
  Icon: typeof ListTodo;
  tone: 'todo' | 'active' | 'alert' | 'done';
}

function countTasks(groups: ReadonlyArray<{ tasks: ReadonlyArray<unknown> }>): number {
  return groups.reduce((sum, group) => sum + group.tasks.length, 0);
}

export default function ActOpsHubMetricStrip({ projectId, onSelect, activeKey }: Props) {
  const { readyToStart, active, blockedDiverged, completedToday } =
    useFieldActions(projectId);

  const tiles: Tile[] = [
    {
      key: 'todo',
      label: 'Ready to start',
      value: countTasks(readyToStart),
      Icon: ListTodo,
      tone: 'todo',
    },
    {
      key: 'active',
      label: 'In progress',
      value: countTasks(active),
      Icon: Loader,
      tone: 'active',
    },
    {
      key: 'blocked',
      label: 'Needs attention',
      value: blockedDiverged.length,
      Icon: AlertTriangle,
      tone: 'alert',
    },
    {
      key: 'done',
      label: 'Done today',
      value: completedToday.length,
      Icon: CheckCircle2,
      tone: 'done',
    },
  ];

  return (
    <div className={css.strip} role="group" aria-label="Today on the land">
      {tiles.map(({ key, label, value, Icon, tone }) => (
        <button
          key={key}
          type="button"
          className={css.tile}
          data-tone={tone}
          data-interactive={onSelect ? true : undefined}
          data-selected={onSelect && activeKey === key ? true : undefined}
          aria-pressed={onSelect ? activeKey === key : undefined}
          disabled={!onSelect}
          onClick={() => onSelect?.(key)}
        >
          <span className={css.icon} aria-hidden="true">
            <Icon size={16} strokeWidth={1.75} />
          </span>
          <span className={css.value}>{value}</span>
          <span className={css.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
