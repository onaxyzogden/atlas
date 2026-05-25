/**
 * OpenWorkItemsPanel — the Act stage's "Open Work Items" launch surface,
 * rendered as the dashboard shell's bottom tray: a horizontal carousel of open
 * (todo / in-progress / blocked) work items awaiting action. Modelled on
 * `OpenPlanDecisionsPanel` (Plan) — each card is itself the launch button
 * (whole-tile `role="button"` + Enter/Space), deep-linking into the Act module
 * the item belongs to (via `actWorkItemModule`).
 *
 * The tracker spine is often sparse under a module lens, so the empty state is
 * first-class: a prompt + a "Go to Tracker" escape into the execution tracker
 * rather than a blank tray. The header hosts the live count, the active-module
 * chip, and a "View all" escape that clears the module lens.
 */

import { ArrowUpRight, ListChecks } from 'lucide-react';
import type { WorkItem } from '@ogden/shared';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';
import { actWorkItemModule } from './actWorkItemModule.js';
import css from '../../command/shell/CommandCentreShell.module.css';

const STATUS_LABEL: Partial<Record<WorkItem['status'], string>> = {
  todo: 'To do',
  'in-progress': 'In progress',
  blocked: 'Blocked',
};

interface Props {
  items: WorkItem[];
  /** Currently highlighted item (reserved for future map/timeline sync). */
  selectedId?: string | null;
  /** Active module lens — drives the header chip + "View all" escape. */
  activeModule: ActModule | null;
  onClearFilter: () => void;
  onLaunch: (item: WorkItem) => void;
  onGoTracker: () => void;
}

/** Compact "scheduled" / "updated" meta line for a work-item tile. */
function metaLine(item: WorkItem): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  };
  if (item.scheduledStart) {
    const start = fmt(item.scheduledStart);
    const end = item.scheduledEnd ? fmt(item.scheduledEnd) : null;
    if (start) return end && end !== start ? `${start} – ${end}` : `Starts ${start}`;
  }
  if (item.updatedAt) {
    const u = fmt(item.updatedAt);
    if (u) return `Updated ${u}`;
  }
  return null;
}

export default function OpenWorkItemsPanel({
  items,
  selectedId,
  activeModule,
  onClearFilter,
  onLaunch,
  onGoTracker,
}: Props) {
  return (
    <>
      <div className={css.trayHead}>
        <p className="eyebrow">Open Work Items</p>
        {activeModule && (
          <span className={css.trayChip}>
            <span
              className={css.filterChipDot}
              style={{ background: ACT_MODULE_DOT[activeModule] }}
            />
            {ACT_MODULE_LABEL[activeModule]}
          </span>
        )}
        <span className={css.trayCount}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        <span className={css.traySpacer} />
        {activeModule && (
          <button type="button" className={css.clearFilterBtn} onClick={onClearFilter}>
            View all items
          </button>
        )}
        <button type="button" className={css.raiseBtn} onClick={onGoTracker}>
          <ListChecks size={14} strokeWidth={2} /> Go to Tracker
        </button>
      </div>

      {items.length === 0 ? (
        <div className={css.emptyNote}>
          {activeModule
            ? `No open work items for ${ACT_MODULE_LABEL[activeModule]}. `
            : 'No open work items yet. '}
          <button type="button" className={css.clearFilterBtn} onClick={onGoTracker}>
            Go to Tracker →
          </button>
        </div>
      ) : (
        <div className={css.carousel} aria-label="Open work items">
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            const module = actWorkItemModule(item);
            const title = item.title.trim() || 'Untitled work item';
            const meta = metaLine(item);
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Open work item: ${title}`}
                className={`${css.objCard} ${isSelected ? css.objCardActive : ''}`}
                onClick={() => onLaunch(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLaunch(item);
                  }
                }}
              >
                <span className={css.objCardTop}>
                  <span
                    className={css.objCardDot}
                    style={{ background: ACT_MODULE_DOT[module] }}
                  />
                  <span className={css.objCardModule}>
                    {ACT_MODULE_LABEL[module]}
                  </span>
                  <span
                    className={css.objStatus}
                    style={
                      item.status === 'blocked'
                        ? { color: '#c2533f' }
                        : undefined
                    }
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </span>

                <span className={css.objCardTitle}>{title}</span>

                <span className={css.objCardMeta}>
                  {meta && <span className={css.objMetaItem}>{meta}</span>}
                  <span className={css.objMetaItem}>
                    Open module <ArrowUpRight size={13} strokeWidth={2} />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
