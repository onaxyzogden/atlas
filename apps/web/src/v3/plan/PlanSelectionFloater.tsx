/**
 * PlanSelectionFloater — Plan-stage analogue of Observe's SelectionFloater.
 * Renders a pill bar above the bottom rail when at least one Plan feature
 * is selected. Every action is sourced from the per-kind registry in
 * `planFeatureActions.ts` rather than hard-coded branches:
 *
 *   - Count label → the kind's rich inline editor when it has one
 *     (paddock / habitat / line); otherwise a plain label.
 *   - Quick actions → the kind's `quickActions` (e.g. Rename for the simple
 *     point/line kinds).
 *   - Edit vertices (only when exactly one polygon kind is selected) → sets
 *     the `planVertexEditStore.target` so `PlanVertexEditHandler` mounts a
 *     MapboxDraw `direct_select` instance for that feature.
 *   - Delete (any selection size) → removes each selected record via the
 *     registry's `remove`. Each removal lands as a separate undo step.
 *   - Clear (always) → drops the selection. Esc keydown also clears.
 *
 * Guild keeps two component-local concerns the registry can't own because they
 * need live store subscriptions: the "name · N members" count label and the
 * prop-driven "Open Guild Builder" button. The zone "Seeded" badge is likewise
 * a reactive read kept here.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, Trees, X } from 'lucide-react';
import { getFloaterStackRoot } from '../observe/components/floaterStackRoot.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import {
  usePlanSelectionStore,
  type PlanSelectionItem,
} from '../../store/planSelectionStore.js';
import {
  usePlanVertexEditStore,
  type PlanVertexEditKind,
} from '../../store/planVertexEditStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import {
  PLAN_FEATURE_ACTIONS,
  supportsVertexEditing,
} from './planFeatureActions.js';
import css from '../observe/components/SelectionFloater.module.css';

interface Props {
  onOpenGuildBuilder?: () => void;
}

export default function PlanSelectionFloater({ onOpenGuildBuilder }: Props = {}) {
  const items = usePlanSelectionStore((s) => s.items);
  const clear = usePlanSelectionStore((s) => s.clear);
  const setVertexTarget = usePlanVertexEditStore((s) => s.setTarget);

  const single = items.length === 1 ? items[0] : null;
  const guildId = single?.kind === 'guild' ? single.id : null;
  const guild = usePolycultureStore((s) =>
    guildId ? s.guilds.find((g) => g.id === guildId) ?? null : null,
  );
  const zoneId = single?.kind === 'zone' ? single.id : null;
  const selectedZoneSeeded = useZoneStore((s) =>
    zoneId
      ? s.zones.find((z) => z.id === zoneId)?.seedProvenance === 'ring-seed'
      : false,
  );

  useEffect(() => {
    if (items.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items.length, clear]);

  const stackRoot = getFloaterStackRoot();

  if (items.length === 0) return null;
  if (!stackRoot) return null;

  const vertexEnabled = Boolean(single && supportsVertexEditing(single));

  const onEditVertices = () => {
    if (!single) return;
    if (!supportsVertexEditing(single)) return;
    setVertexTarget({
      kind: single.kind as PlanVertexEditKind,
      id: single.id,
      projectId: single.projectId,
    });
  };

  const onDelete = () => {
    const n = items.length;
    const label =
      n === 1 && single
        ? PLAN_FEATURE_ACTIONS[single.kind].label.toLowerCase()
        : `${n} items`;
    if (!confirm(`Delete ${label}?`)) return;
    for (const item of items) {
      PLAN_FEATURE_ACTIONS[item.kind].remove(item);
    }
    clear();
  };

  const editHandler = single
    ? PLAN_FEATURE_ACTIONS[single.kind].getEditHandler?.(single) ?? null
    : null;

  const quickActions = single
    ? PLAN_FEATURE_ACTIONS[single.kind].quickActions?.(single) ?? []
    : [];

  const countLabel = single
    ? single.kind === 'guild' && guild
      ? `${guild.name || 'Guild'} · ${guild.members.length} member${
          guild.members.length === 1 ? '' : 's'
        }`
      : PLAN_FEATURE_ACTIONS[single.kind].label
    : `${items.length} selected`;

  return createPortal(
    <div
      className={css.floater}
      role="toolbar"
      aria-label="Plan selection actions"
      style={{ order: 2 }}
    >
      {editHandler ? (
        <button
          type="button"
          className={css.count}
          onClick={editHandler.run}
          title={editHandler.title}
          style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
        >
          {countLabel}
        </button>
      ) : (
        <span className={css.count}>{countLabel}</span>
      )}
      {selectedZoneSeeded ? (
        <span
          title="Ring-seed draft — edit its name/Z-level, reshape its vertices, or delete it like any zone"
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px dashed rgba(212,182,99,0.7)',
            color: 'rgba(212,182,99,0.95)',
          }}
        >
          Seeded
        </span>
      ) : null}
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip
        label={
          vertexEnabled
            ? 'Edit polygon vertices'
            : single
              ? 'Vertex edit only available for polygons'
              : 'Select a single polygon to edit its vertices'
        }
        position="top"
      >
        <button
          type="button"
          className={css.btn}
          onClick={onEditVertices}
          disabled={!vertexEnabled}
        >
          <Pencil aria-hidden="true" />
          <span>Edit vertices</span>
        </button>
      </DelayedTooltip>
      {single?.kind === 'guild' && onOpenGuildBuilder ? (
        <DelayedTooltip label="Open in Guild Builder" position="top">
          <button
            type="button"
            className={css.btn}
            onClick={onOpenGuildBuilder}
          >
            <Trees aria-hidden="true" />
            <span>Open Guild Builder</span>
          </button>
        </DelayedTooltip>
      ) : null}
      {quickActions.map((qa) => {
        const Icon = qa.icon;
        return (
          <DelayedTooltip key={qa.id} label={qa.label} position="top">
            <button type="button" className={css.btn} onClick={qa.run}>
              <Icon aria-hidden="true" />
              <span>{qa.label}</span>
            </button>
          </DelayedTooltip>
        );
      })}
      <DelayedTooltip label="Delete selected" position="top">
        <button
          type="button"
          className={`${css.btn} ${css.btnDanger}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          <span>Delete</span>
        </button>
      </DelayedTooltip>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip label="Clear selection (Esc)" position="top">
        <button type="button" className={css.btn} onClick={() => clear()}>
          <X aria-hidden="true" />
          <span>Clear</span>
        </button>
      </DelayedTooltip>
    </div>,
    stackRoot,
  );
}
