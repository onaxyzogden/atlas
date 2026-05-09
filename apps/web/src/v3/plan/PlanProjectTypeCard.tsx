/**
 * PlanProjectTypeCard — top-of-rail card in PlanChecklistAside that lets
 * the steward pick a project-type template (Regenerative Farm, Retreat
 * Center, Homestead, Educational Farm, Conservation, Multi-Enterprise) and
 * tick through type-specific design-prompt items.
 *
 * Independent of project.projectType — the picker lives on the card. State
 * (selected type + per-type checked indices) is persisted via
 * planProjectTypeChecklistStore, scoped per project.
 *
 * Reuses GuidanceCard.module.css for the bullet/check structure so the
 * checked-strikethrough behaviour matches the universal module cards below.
 */

import { useParams } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { usePlanProjectTypeChecklistStore } from '../../store/planProjectTypeChecklistStore.js';
import {
  PLAN_PROJECT_TYPE_KEYS,
  PLAN_PROJECT_TYPE_TEMPLATES,
  type PlanProjectTypeKey,
} from './data/planProjectTypeTemplates.js';
import css from './PlanProjectTypeCard.module.css';
import guidanceCss from '../_shared/components/GuidanceCard.module.css';

const EMPTY_CHECKS: readonly number[] = [];

export default function PlanProjectTypeCard() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const selectedType = usePlanProjectTypeChecklistStore(
    (s) => (projectId ? s.byProject[projectId]?.selectedType : null) ?? null,
  );
  const checkedList = usePlanProjectTypeChecklistStore(
    (s) =>
      (projectId && selectedType
        ? s.byProject[projectId]?.checks[selectedType]
        : null) ?? EMPTY_CHECKS,
  );
  const setSelectedType = usePlanProjectTypeChecklistStore(
    (s) => s.setSelectedType,
  );
  const toggle = usePlanProjectTypeChecklistStore((s) => s.toggle);

  const template = selectedType ? PLAN_PROJECT_TYPE_TEMPLATES[selectedType] : null;
  const dotColor = template?.color ?? 'var(--color-text-muted)';

  const style = { ['--group-dot' as never]: dotColor } as CSSProperties;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!projectId) return;
    const value = e.target.value;
    setSelectedType(
      projectId,
      value === '' ? null : (value as PlanProjectTypeKey),
    );
  };

  return (
    <section className={css.card} style={style} aria-label="Project type template checklist">
      <header className={css.header}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.label}>Project Type</span>
      </header>

      <select
        className={css.picker}
        value={selectedType ?? ''}
        onChange={handleSelect}
        disabled={!projectId}
        aria-label="Select project type template"
      >
        <option value="">Select a project type…</option>
        {PLAN_PROJECT_TYPE_KEYS.map((key) => (
          <option key={key} value={key}>
            {PLAN_PROJECT_TYPE_TEMPLATES[key].label}
          </option>
        ))}
      </select>

      {!template && (
        <p className={css.placeholder}>
          Pick a template to see project-type-specific design prompts.
        </p>
      )}

      {template && template.items.length === 0 && (
        <p className={css.empty}>
          Coming soon — checklist items for {template.label} are still being drafted.
        </p>
      )}

      {template && template.items.length > 0 && (
        <div className={guidanceCss.howBlock}>
          <span className={guidanceCss.blockLabel}>Checklist</span>
          <ul className={guidanceCss.howList}>
            {template.items.map((item, i) => {
              const checked = checkedList.includes(i);
              return (
                <li key={i} className={guidanceCss.howItem}>
                  <label
                    className={`${guidanceCss.howCheck} ${checked ? guidanceCss.howCheckDone : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!projectId}
                      onChange={() =>
                        projectId && selectedType && toggle(projectId, selectedType, i)
                      }
                    />
                    <span className={guidanceCss.howText}>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
