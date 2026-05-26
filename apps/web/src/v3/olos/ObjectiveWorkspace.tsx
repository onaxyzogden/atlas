/**
 * ObjectiveWorkspace — the focused workspace for one Stage × Domain ×
 * Objective cell. Implements the dev-spec map-view + side-panel pattern.
 *
 * Left: map view + overlay bundle (Phase 1.4 wires the real map; for now
 * this is a placeholder).
 * Right: side panel — header, focused question, required inputs, checklist,
 * evidence / proof capture, status output, handoff emitter.
 *
 * Phase 1.3 ships the layout shell with read-only data driven by the
 * universal Objective catalogue. Phase 1.4 mounts the map; Phase 1.5 wires
 * Zustand record stores so checklist completion + status persist; Phase 1.6
 * adds the handoff emitter; Phase 1.7 ships the StatusPicker. The shell is
 * the harness that holds those pieces.
 */

import { useState } from 'react';
import {
  STAGE_LABELS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_OVERLAY_LABELS,
  STATUS_LABELS,
  type Objective,
  type ChecklistItem,
} from '@ogden/shared';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import type { Project } from '../types.js';
import OverlayBundleStrip from './map/OverlayBundleStrip.js';
import ObjectiveMap from './map/ObjectiveMap.js';
import css from './ObjectiveWorkspace.module.css';

export interface ObjectiveWorkspaceProps {
  projectId: string;
  project: Project | null;
  objective: Objective;
  checklist: readonly ChecklistItem[];
}

export default function ObjectiveWorkspace({
  projectId: _projectId,
  project,
  objective,
  checklist,
}: ObjectiveWorkspaceProps) {
  const accent = OBSERVE_MODULE_DOT[objective.domain] ?? '#9CA3AF';
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [status, setStatus] = useState<string>('');
  const [activeOverlayIds, setActiveOverlayIds] = useState<string[]>([
    ...objective.defaultOverlayBundle,
  ]);

  const toggleItem = (id: string) => {
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOverlay = (overlayId: string) => {
    setActiveOverlayIds((prev) =>
      prev.includes(overlayId)
        ? prev.filter((id) => id !== overlayId)
        : [...prev, overlayId],
    );
  };

  const completedCount = checklist.filter((i) =>
    completedItemIds.has(i.id),
  ).length;
  const totalRequired = checklist.filter((i) => i.required).length;

  return (
    <div className={css.shell}>
      <section className={css.map} aria-label="Map view">
        <OverlayBundleStrip
          stage={objective.stage}
          bundle={objective.defaultOverlayBundle}
          activeOverlayIds={activeOverlayIds}
          onToggle={toggleOverlay}
        />
        <div className={css.mapBody}>
          <ObjectiveMap
            stage={objective.stage}
            domain={objective.domain}
            project={project}
            activeOverlayIds={activeOverlayIds}
          />
        </div>
      </section>
      <aside className={css.panel} aria-label="Objective side panel">
        <header className={css.panelHeader}>
          <div className={css.crumb}>
            <span
              className={css.dot}
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <span className={css.stage}>{STAGE_LABELS[objective.stage]}</span>
            <span className={css.sep}>·</span>
            <span className={css.domain}>
              {UNIVERSAL_DOMAIN_LABELS[objective.domain]}
            </span>
          </div>
          <h1 className={css.title}>{objective.title}</h1>
          <p className={css.focused}>{objective.focusedQuestion}</p>
        </header>

        <section className={css.section}>
          <h2 className={css.sectionTitle}>Required inputs</h2>
          {objective.requiredInputs.length === 0 ? (
            <p className={css.muted}>
              None — this is an entry-point objective.
            </p>
          ) : (
            <ul className={css.inputs}>
              {objective.requiredInputs.map((req, idx) => (
                <li
                  key={`${req.kind}-${idx}`}
                  className={css.inputRow}
                >
                  <span className={css.inputKind}>{req.kind}</span>
                  <span className={css.inputLabel}>
                    {req.description ?? req.objectiveId ?? '—'}
                  </span>
                  {/* Phase 1.5 will check upstream store state and flag
                      whether the input is satisfied. */}
                  <span className={css.inputBadgePending}>pending</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={css.section}>
          <div className={css.sectionRow}>
            <h2 className={css.sectionTitle}>Checklist</h2>
            <span className={css.progress}>
              {completedCount} / {totalRequired}
            </span>
          </div>
          <ol className={css.checklist}>
            {checklist.map((item) => {
              const done = completedItemIds.has(item.id);
              return (
                <li key={item.id} className={css.checklistItem}>
                  <label className={css.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className={done ? css.itemTextDone : css.itemText}>
                      {item.instruction}
                    </span>
                  </label>
                  <div className={css.itemMeta}>
                    <span className={css.kind}>{item.requiredInputType}</span>
                    {item.linkedOverlayId ? (
                      <span className={css.overlay}>
                        ↳ {UNIVERSAL_OVERLAY_LABELS[item.linkedOverlayId]}
                      </span>
                    ) : null}
                    {!item.required ? (
                      <span className={css.optional}>optional</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={css.section}>
          <h2 className={css.sectionTitle}>Evidence / Proof</h2>
          <p className={css.muted}>
            Per-item capture lands in Phase 1.5 (photos, notes,
            measurements, receipts, tests, inspections).
          </p>
        </section>

        <section className={css.section}>
          <h2 className={css.sectionTitle}>Status</h2>
          <select
            className={css.statusPicker}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Set status…</option>
            {objective.allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </section>

        <section className={css.section}>
          <h2 className={css.sectionTitle}>Handoff</h2>
          <button type="button" className={css.handoffBtn} disabled>
            Emit handoff (Phase 1.6)
          </button>
        </section>
      </aside>
    </div>
  );
}
