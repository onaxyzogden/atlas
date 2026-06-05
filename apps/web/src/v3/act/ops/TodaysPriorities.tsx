/**
 * TodaysPriorities — derives a "what's due today" list from existing
 * Act-stage stores. Module-aware: when the user has a module selected,
 * filters to that domain; when nothing is active, shows an aggregated
 * view (all-domain Operations Hub style).
 *
 * Project-type-aware ranking: when the project has an effective project
 * type (Plan picker selection or wizard seed), items re-rank by per-type
 * Act-module affinity before slicing. Falls back to source-append order
 * when the project type is null.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useActTelemetry } from '../../../lib/actInteractionLog.js';
import { useHarvestLogStore } from '../../../store/harvestLogStore.js';
import { useSuccessionStore } from '../../../store/successionStore.js';
import { useCommunityEventStore } from '../../../store/communityEventStore.js';
import type { FieldTaskCategory } from '../../../store/fieldTaskStore.js';
import { useEffectivePlanProjectType } from '../../plan/hooks/useEffectivePlanProjectType.js';
import { getModuleAffinityRank } from '../data/projectTypeModuleAffinity.js';
import type { ActModule } from '../types.js';
import css from './ActOpsAside.module.css';

interface PriorityRow {
  id: string;
  title: string;
  meta?: string;
  module: ActModule | null;
  _appendOrder: number;
}

interface Props {
  projectId: string | null;
  activeModule: ActModule | null;
}

function isToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fieldTaskModule(category: FieldTaskCategory): ActModule | null {
  switch (category) {
    case 'ops':
      return 'built-infrastructure';
    case 'weather':
    case 'regulation':
      return 'monitoring-records';
    case 'team':
    case 'education':
      return 'people-governance';
    default:
      return null;
  }
}

export default function TodaysPriorities({ projectId, activeModule }: Props) {
  const workItems = useWorkItemStore((s) => s.items);
  const harvestEntries = useHarvestLogStore((s) => s.entries);
  const milestones = useSuccessionStore((s) => s.milestones);
  const events = useCommunityEventStore((s) => s.events);

  const { effectiveType } = useEffectivePlanProjectType(projectId);

  const rows = useMemo<PriorityRow[]>(() => {
    if (!projectId) return [];

    const acc: PriorityRow[] = [];
    let order = 0;
    const push = (row: Omit<PriorityRow, '_appendOrder'>) => {
      acc.push({ ...row, _appendOrder: order++ });
    };

    const wantBuild =
      activeModule === null || activeModule === 'built-infrastructure';
    const wantMaintain =
      activeModule === null || activeModule === 'built-infrastructure';
    const wantLivestock =
      activeModule === null || activeModule === 'animals-livestock';
    const wantHarvest =
      activeModule === null || activeModule === 'plants-food';
    const wantReview =
      activeModule === null || activeModule === 'monitoring-records';
    const wantNetwork =
      activeModule === null || activeModule === 'people-governance';

    if (wantBuild || wantMaintain || wantLivestock || wantReview) {
      for (const w of workItems) {
        if (w.projectId !== projectId) continue;
        if (w.source !== 'field-task') continue;
        if (w.status === 'done') continue;
        const due = w.scheduledEnd ?? '';
        if (!isToday(due)) continue;
        push({
          id: `ft-${w.id}`,
          title: w.title,
          meta: `${w.category} · ${formatTime(due)}`,
          module: w.category ? fieldTaskModule(w.category) : null,
        });
      }
    }

    if (wantMaintain) {
      for (const w of workItems) {
        if (w.projectId !== projectId) continue;
        if (w.source !== 'maintenance') continue;
        if (w.recurrenceFrequency !== 'daily') continue;
        const last = w.doneAt ? new Date(w.doneAt) : null;
        const dueToday =
          !last ||
          last.toDateString() !== new Date().toDateString();
        if (!dueToday) continue;
        push({
          id: `mt-${w.id}`,
          title: w.title,
          meta: `Maintenance · daily`,
          module: 'built-infrastructure',
        });
      }
    }

    if (wantHarvest) {
      const today = harvestEntries
        .filter((e) => e.projectId === projectId && isToday(e.date))
        .slice(0, 5);
      for (const e of today) {
        push({
          id: `hv-${e.id}`,
          title: `Harvest logged · ${e.quantity} ${e.unit}`,
          meta: e.sourceKind === 'crop' ? 'Crop area' : 'Paddock',
          module: 'plants-food',
        });
      }
      const dueMilestones = milestones.filter(
        (m) => m.projectId === projectId && m.year === new Date().getFullYear(),
      );
      for (const m of dueMilestones.slice(0, 3)) {
        push({
          id: `sx-${m.id}`,
          title: m.observation || `Succession check · ${m.phase}`,
          meta: `Succession ${m.year}`,
          module: 'plants-food',
        });
      }
    }

    if (wantNetwork) {
      const week = 7 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() + week;
      for (const e of events) {
        if (e.projectId !== projectId) continue;
        const t = new Date(e.date).getTime();
        if (Number.isNaN(t)) continue;
        if (t < Date.now() || t > cutoff) continue;
        push({
          id: `ev-${e.id}`,
          title: e.title,
          meta: `Event · ${new Date(e.date).toLocaleDateString()}`,
          module: 'people-governance',
        });
      }
    }

    if (effectiveType) {
      acc.sort((a, b) => {
        const ra = getModuleAffinityRank(effectiveType, a.module);
        const rb = getModuleAffinityRank(effectiveType, b.module);
        if (ra !== rb) return ra - rb;
        return a._appendOrder - b._appendOrder;
      });
    }

    return acc.slice(0, 8);
  }, [
    projectId,
    activeModule,
    workItems,
    harvestEntries,
    milestones,
    events,
    effectiveType,
  ]);

  // panel_row_visible: emit only when the visible row-id set changes.
  // Hash-dedupe prevents emit-storm on store updates that produce an
  // identical visible set.
  const record = useActTelemetry({
    projectId: projectId ?? '',
    projectType: effectiveType,
  });
  const lastHashRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || rows.length === 0) return;
    const hash = rows.map((r) => r.id).join('|');
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;
    // Module bucketed against the active filter, not per-row, so the
    // aggregate stays one row per (panel, hash). Per-row module data is
    // preserved in the payload for later breakdowns.
    record({
      module: activeModule ?? 'monitoring-records',
      eventType: 'panel_row_visible',
      payload: {
        panel: 'priorities',
        modules: rows.map((r) => r.module),
        rowIds: rows.map((r) => r.id),
      },
    });
  }, [rows, projectId, activeModule, record]);

  return (
    <section className={css.panel}>
      <header className={css.panelHeader}>
        <h3 className={css.panelTitle}>Today's Priorities</h3>
        <span className={css.panelSubtitle}>
          {new Date().toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className={css.empty}>No priorities logged for today.</p>
      ) : (
        <ol className={css.priorityList}>
          {rows.map((r, i) => (
            <li key={r.id} className={css.priorityItem}>
              <span className={css.priorityIndex}>{i + 1}</span>
              <div>
                <div className={css.priorityTitle}>{r.title}</div>
                {r.meta ? <div className={css.priorityMeta}>{r.meta}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
